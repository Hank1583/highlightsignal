<?php

declare(strict_types=1);

namespace HighlightSignal\Retention;

use HighlightSignal\Audit\AuditLogger;
use HighlightSignal\Config\Environment;
use mysqli;

/**
 * V11-08: business rules for retention/cleanup -- retention windows, the
 * owner-approval gate on dead-letter Queue Jobs, dry-run-by-default safety,
 * and batch+audit bookkeeping. `RetentionRepository` only knows how to find
 * and delete rows; this class decides WHICH rows are old enough and whether
 * a caller is even allowed to actually delete them.
 *
 * Deliberately does NOT touch: any domain/business record (Signal,
 * Recommendation, Decision, Action, Task, BusinessOutcome, Evaluation --
 * "不誤刪 active business records" is the task packet's own explicit
 * boundary), `audit_logs` (a separate, explicit exception -- see its own
 * class doc and VERIFICATION_RUNBOOK section 19), and any personal/member
 * data (a legal/GDPR-style deletion request is a manual, owner-approved
 * process, never an automated job).
 */
final class RetentionCleanupService
{
    const BATCH_LIMIT = 500;

    const NONCE_RETENTION_DAYS = 7;
    const QUEUE_JOB_RETENTION_DAYS = 30;
    const QUEUE_JOB_DEAD_LETTER_RETENTION_DAYS = 90;
    const EXECUTION_RESULT_RETENTION_DAYS = 180;
    const NOTIFICATION_RETENTION_DAYS = 90;

    // V12-05: dashboard_ai_logs stores free-text AI questions and provider
    // context/response payloads -- privacy-sensitive content with no prior
    // cleanup. 90 days matches NOTIFICATION_RETENTION_DAYS, the shortest
    // existing precedent for anything user-content-bearing.
    const DASHBOARD_AI_LOG_RETENTION_DAYS = 90;

    // A dead-lettered job is the "needs human attention" signal (V11-07's
    // own audit convention) -- automated deletion of that history requires
    // an explicit, documented owner opt-in via this env var, never a
    // default-on behavior. Unset/anything other than 'true' means dead
    // letters are simply never included in this cleanup, no matter how old.
    const DEAD_LETTER_CLEANUP_APPROVED_ENV = 'RETENTION_DEAD_LETTER_CLEANUP_APPROVED';

    private $repository;
    private $database;
    private $auditLogger;

    public function __construct(RetentionRepository $repository, mysqli $database)
    {
        $this->repository = $repository;
        $this->database = $database;
        $this->auditLogger = new AuditLogger($database);
    }

    /**
     * One data class failing does not block the others -- each is
     * independent, and retrying a failed one is always safe (the
     * eligibility query is re-evaluated fresh, never a stored cursor that
     * could desync). `ok=false` on the aggregate is this task's "alert"
     * signal: the external scheduler hitting `/api/v1/retention/run` sees
     * it in the response and can page/notify through whatever channel it
     * already has -- this codebase has no dedicated ops-alerting channel of
     * its own yet (Notification is member+workspace scoped, not a fit for
     * a system-wide job failure), so this is deliberately honest about that
     * gap rather than fabricating one.
     *
     * @return array{ok: bool, results: array<string, array<string, mixed>>}
     */
    public function runAll(bool $dryRun): array
    {
        $methods = array(
            'service_request_nonces' => 'cleanupNonces',
            'queue_jobs' => 'cleanupQueueJobs',
            'execution_results' => 'cleanupExecutionResults',
            'notifications' => 'cleanupNotifications',
            'dashboard_ai_logs' => 'cleanupDashboardAiLogs',
        );

        $results = array();
        $ok = true;
        foreach ($methods as $dataClass => $method) {
            try {
                $results[$dataClass] = $this->$method($dryRun);
            } catch (\Throwable $error) {
                $ok = false;
                $results[$dataClass] = array(
                    'data_class' => $dataClass,
                    'mode' => $dryRun ? 'dry_run' : 'delete',
                    'status' => 'failed',
                    'error' => $error->getMessage(),
                );
            }
        }

        return array('ok' => $ok, 'results' => $results);
    }

    /** Workspace-agnostic (`service_request_nonces` has no workspace_id) -- no audit_logs rows, only the `retention_cleanup_runs` ledger. */
    public function cleanupNonces(bool $dryRun): array
    {
        return $this->runBatch('service_request_nonces', $dryRun, function () use ($dryRun) {
            $nonces = $this->repository->findExpiredNonces(self::NONCE_RETENTION_DAYS, self::BATCH_LIMIT);
            $deleted = ($dryRun || count($nonces) === 0) ? 0 : $this->repository->deleteNoncesByValues($nonces);
            return array('matched' => count($nonces), 'deleted' => $deleted, 'workspaceCounts' => array());
        });
    }

    public function cleanupQueueJobs(bool $dryRun): array
    {
        return $this->runBatch('queue_jobs', $dryRun, function () use ($dryRun) {
            $statuses = array('completed', 'cancelled');
            $candidates = $this->repository->findEligibleQueueJobs($statuses, self::QUEUE_JOB_RETENTION_DAYS, self::BATCH_LIMIT);

            if (strtolower((string) Environment::get(self::DEAD_LETTER_CLEANUP_APPROVED_ENV, 'false')) === 'true') {
                $remainingLimit = self::BATCH_LIMIT - count($candidates);
                if ($remainingLimit > 0) {
                    $deadLetterCandidates = $this->repository->findEligibleQueueJobs(
                        array('dead_letter'),
                        self::QUEUE_JOB_DEAD_LETTER_RETENTION_DAYS,
                        $remainingLimit
                    );
                    $candidates = array_merge($candidates, $deadLetterCandidates);
                }
            }

            $ids = array_column($candidates, 'id');
            $deleted = ($dryRun || count($ids) === 0) ? 0 : $this->repository->deleteQueueJobsByIds($ids);
            return array('matched' => count($candidates), 'deleted' => $deleted, 'workspaceCounts' => $this->countByWorkspace($candidates));
        });
    }

    public function cleanupExecutionResults(bool $dryRun): array
    {
        return $this->runBatch('execution_results', $dryRun, function () use ($dryRun) {
            $candidates = $this->repository->findEligibleExecutionResults(self::EXECUTION_RESULT_RETENTION_DAYS, self::BATCH_LIMIT);
            $ids = array_column($candidates, 'id');
            $deleted = ($dryRun || count($ids) === 0) ? 0 : $this->repository->deleteExecutionResultsByIds($ids);
            return array('matched' => count($candidates), 'deleted' => $deleted, 'workspaceCounts' => $this->countByWorkspace($candidates));
        });
    }

    /** Never touches `status = 'unread'` -- see RetentionRepository::findEligibleReadOrDismissedNotifications(). */
    public function cleanupNotifications(bool $dryRun): array
    {
        return $this->runBatch('notifications', $dryRun, function () use ($dryRun) {
            $candidates = $this->repository->findEligibleReadOrDismissedNotifications(self::NOTIFICATION_RETENTION_DAYS, self::BATCH_LIMIT);
            $ids = array_column($candidates, 'id');
            $deleted = 0;
            if (!$dryRun && count($ids) > 0) {
                $this->repository->deleteNotificationDeliveriesByNotificationIds($ids);
                $deleted = $this->repository->deleteNotificationsByIds($ids);
            }
            return array('matched' => count($candidates), 'deleted' => $deleted, 'workspaceCounts' => $this->countByWorkspace($candidates));
        });
    }

    /**
     * `workspace_id` can be null on rows predating migrations/018's backfill
     * -- excluded from audit-trail grouping (audit_logs.workspace_id is
     * NOT NULL by design, V11-07) but still eligible for deletion; age is
     * the only real retention criterion for this data class.
     */
    public function cleanupDashboardAiLogs(bool $dryRun): array
    {
        return $this->runBatch('dashboard_ai_logs', $dryRun, function () use ($dryRun) {
            $candidates = $this->repository->findEligibleDashboardAiLogs(self::DASHBOARD_AI_LOG_RETENTION_DAYS, self::BATCH_LIMIT);
            $ids = array_column($candidates, 'id');
            $deleted = ($dryRun || count($ids) === 0) ? 0 : $this->repository->deleteDashboardAiLogsByIds($ids);
            $withWorkspace = array_values(array_filter($candidates, static function (array $row) {
                return $row['workspace_id'] !== null;
            }));
            return array('matched' => count($candidates), 'deleted' => $deleted, 'workspaceCounts' => $this->countByWorkspace($withWorkspace));
        });
    }

    public function listRuns(array $filters, int $page, int $perPage): array
    {
        $page = max(1, $page);
        $perPage = max(1, min(100, $perPage));
        return $this->repository->listRuns($filters, $page, $perPage);
    }

    /**
     * @param callable $work returns array{matched: int, deleted: int, workspaceCounts: array<int, int>}
     */
    private function runBatch(string $dataClass, bool $dryRun, callable $work): array
    {
        $mode = $dryRun ? 'dry_run' : 'delete';
        $startedAt = date('Y-m-d H:i:s');

        $this->database->begin_transaction();
        try {
            $result = $work();
            $hasMore = $result['matched'] >= self::BATCH_LIMIT;
            $completedAt = date('Y-m-d H:i:s');

            $run = $this->repository->recordRun(
                $dataClass,
                null,
                $mode,
                $result['matched'],
                $result['deleted'],
                $hasMore,
                'completed',
                null,
                $startedAt,
                $completedAt
            );

            // Workspace-scoped classes ALSO get one audit_logs row PER
            // DISTINCT workspace found in this batch -- workspace-agnostic
            // classes (empty workspaceCounts, e.g. nonces) get none;
            // audit_logs.workspace_id stays NOT NULL by design (V11-07).
            foreach ($result['workspaceCounts'] as $workspaceId => $count) {
                $this->auditLogger->record(
                    (int) $workspaceId,
                    null,
                    $dryRun ? 'retention.cleanup_dry_run' : 'retention.cleanup_executed',
                    'RetentionCleanupRun',
                    (string) $run['public_id'],
                    array('data_class' => $dataClass, 'matched_count' => $count, 'mode' => $mode)
                );
            }

            $this->database->commit();
            return array(
                'data_class' => $dataClass,
                'mode' => $mode,
                'matched_count' => (int) $result['matched'],
                'deleted_count' => (int) $result['deleted'],
                'has_more' => $hasMore,
            );
        } catch (\Throwable $error) {
            $this->database->rollback();
            $this->repository->recordRun($dataClass, null, $mode, 0, 0, false, 'failed', $error->getMessage(), $startedAt, date('Y-m-d H:i:s'));
            throw $error;
        }
    }

    /**
     * @param array<int, array{id: int, workspace_id: int}> $candidates
     * @return array<int, int> workspace_id => count
     */
    private function countByWorkspace(array $candidates): array
    {
        $counts = array();
        foreach ($candidates as $candidate) {
            $workspaceId = $candidate['workspace_id'];
            $counts[$workspaceId] = ($counts[$workspaceId] ?? 0) + 1;
        }
        return $counts;
    }
}
