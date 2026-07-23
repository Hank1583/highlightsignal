<?php

declare(strict_types=1);

namespace HighlightSignal\Signal;

use HighlightSignal\Audit\AuditLogger;
use HighlightSignal\Auth\ServiceIdentity;
use HighlightSignal\Http\NotFoundException;
use HighlightSignal\Http\ValidationException;
use HighlightSignal\Signal\Detector\GaTrafficAnomalyDetector;
use HighlightSignal\Signal\Detector\SeoTechnicalIssueDetector;
use HighlightSignal\Workspace\WorkspacePermissions;
use mysqli;

/**
 * V10-01: Signal only answers "what happened" (spec section 6). This class
 * must never create a Recommendation or Decision, and detection methods here
 * are system-triggered (called from si/seo/summary.php after a scan, not
 * behind a human permission check) -- only the human-facing updateStatus()
 * goes through WorkspacePermissions.
 */
final class SignalService
{
    /** Human PATCH may only move a Signal into one of these -- 'new' and
     *  'resolved' are system-controlled states (initial detection / recurrence
     *  no longer observed), not something a human directly sets. No
     *  visibility keyword on purpose -- modifiers on class constants are
     *  PHP 7.1+ only, and this project targets PHP 7.0. */
    const HUMAN_SETTABLE_STATUSES = array('acknowledged', 'dismissed');

    private $database;
    private $repository;
    private $auditLogger;

    public function __construct(mysqli $database, SignalRepository $repository)
    {
        $this->database = $database;
        $this->repository = $repository;
        $this->auditLogger = new AuditLogger($database);
    }

    public function listForWorkspace(int $workspaceId, array $filters, int $page, int $perPage): array
    {
        $page = max(1, $page);
        $perPage = max(1, min(100, $perPage));
        $result = $this->repository->listForWorkspace($workspaceId, $filters, $page, $perPage);

        return array(
            'items' => array_map(array($this, 'normalize'), $result['items']),
            'total' => $result['total'],
            'page' => $page,
            'per_page' => $perPage,
        );
    }

    public function updateStatus(ServiceIdentity $identity, array $membership, int $signalId, string $status): array
    {
        WorkspacePermissions::requirePermission($membership, 'workflow.mutate');

        if (!in_array($status, self::HUMAN_SETTABLE_STATUSES, true)) {
            throw new ValidationException('Signal status must be acknowledged or dismissed.');
        }

        $existing = $this->repository->findForWorkspace($identity->workspaceId, $signalId);
        if (!is_array($existing)) {
            throw new NotFoundException('Signal not found.');
        }

        $this->database->begin_transaction();
        try {
            $this->repository->updateStatus($identity->workspaceId, $signalId, $status);
            $this->auditLogger->record(
                $identity->workspaceId,
                $identity->memberId,
                'signal.' . $status,
                'Signal',
                (string) $existing['public_id'],
                array('from_status' => $existing['status'], 'to_status' => $status),
                $identity->nonce
            );
            $this->database->commit();
        } catch (\Throwable $error) {
            $this->database->rollback();
            throw $error;
        }

        $updated = $this->repository->findForWorkspace($identity->workspaceId, $signalId);
        return $this->normalize($updated);
    }

    /**
     * System-triggered: called from si/seo/summary.php right after a new
     * seo_scan_history row is written (see that file for why -- synchronous,
     * not a queued job, since V11-02's Queue Worker doesn't exist yet).
     * No ServiceIdentity/permission check -- this is not a human mutation,
     * it is the AI/rule-based detection capability the spec explicitly says
     * does not require Human Review to execute (only a Decision does).
     *
     * @param array<int, array<string, mixed>> $currentIssues
     * @param array<int, array<string, mixed>> $previousIssues
     * @return array{created: int, reopened: int, bumped: int, resolved: int}
     */
    public function runSeoTechnicalIssueDetection(
        int $workspaceId,
        int $siteId,
        array $currentIssues,
        array $previousIssues
    ): array {
        $detector = new SeoTechnicalIssueDetector();
        return $this->applyDetectionPlan($workspaceId, $detector->diff($siteId, $currentIssues, $previousIssues));
    }

    /**
     * V10-07: first GA detection rule, proving the same Signal pipeline
     * generalizes beyond SEO -- called from `ga/data_sync.php` right after a
     * day's `ga_daily_summary` row is written, mirroring exactly how
     * `runSeoTechnicalIssueDetection()` is called from si/seo/summary.php.
     *
     * @return array{created: int, reopened: int, bumped: int, resolved: int}
     */
    public function runGaTrafficAnomalyDetection(
        int $workspaceId,
        int $connectionId,
        string $accountName,
        float $currentSessions,
        float $baselineAvgSessions,
        int $baselineDayCount
    ): array {
        $detector = new GaTrafficAnomalyDetector();
        return $this->applyDetectionPlan($workspaceId, $detector->diff(
            $connectionId,
            $accountName,
            $currentSessions,
            $baselineAvgSessions,
            $baselineDayCount
        ));
    }

    /**
     * V10-07: the single convergence point every detector's plan runs
     * through -- previously duplicated inline inside
     * runSeoTechnicalIssueDetection() alone. Any future source (AEO/GEO, or
     * a second GA rule) only needs to produce a
     * `{to_upsert, to_resolve}` plan in this same shape; the actual
     * dedup/upsert/reopen/resolve/audit mechanics are never re-implemented
     * per source.
     *
     * @param array{to_upsert: array<int, array<string, mixed>>, to_resolve: array<int, string>} $plan
     * @return array{created: int, reopened: int, bumped: int, resolved: int}
     */
    private function applyDetectionPlan(int $workspaceId, array $plan): array
    {
        $stats = array('created' => 0, 'reopened' => 0, 'bumped' => 0, 'resolved' => 0);

        // V11-07: this whole method used to run every upsert/resolve and its
        // audit row as separate autocommit statements -- a crash partway
        // through left signal state changes with no corresponding audit row.
        // One transaction per call (one call = one detector run for one
        // site/connection) makes "every signal state change this call made
        // is audited, or none of them persisted" a real guarantee.
        $this->database->begin_transaction();
        try {
            foreach ($plan['to_upsert'] as $item) {
                $result = $this->repository->upsertByDedupKey(
                    $workspaceId,
                    $item['dedup_key'],
                    $item['signal_type'],
                    $item['severity'],
                    $item['source'],
                    $item['source_ref_type'],
                    $item['source_ref_id'],
                    $item['title'],
                    $item['summary']
                );

                if ($result['was_new']) {
                    $stats['created']++;
                    $this->auditLogger->record(
                        $workspaceId,
                        null,
                        'signal.detected',
                        'Signal',
                        (string) $result['row']['public_id'],
                        array('type' => $item['signal_type'], 'source' => $item['source'])
                    );
                } elseif ($result['was_reopened']) {
                    $stats['reopened']++;
                    $this->auditLogger->record(
                        $workspaceId,
                        null,
                        'signal.reopened',
                        'Signal',
                        (string) $result['row']['public_id'],
                        array('type' => $item['signal_type'], 'source' => $item['source'])
                    );
                } else {
                    $stats['bumped']++;
                }
            }

            foreach ($plan['to_resolve'] as $dedupKey) {
                $existing = $this->repository->findByDedupKey($workspaceId, $dedupKey);
                if (!is_array($existing)) {
                    continue;
                }
                if ($this->repository->markResolvedByDedupKeyIfOpen($workspaceId, $dedupKey)) {
                    $stats['resolved']++;
                    $this->auditLogger->record(
                        $workspaceId,
                        null,
                        'signal.auto_resolved',
                        'Signal',
                        (string) $existing['public_id'],
                        array('source' => (string) ($existing['source'] ?? 'unknown'))
                    );
                }
            }

            $this->database->commit();
        } catch (\Throwable $error) {
            $this->database->rollback();
            throw $error;
        }

        return $stats;
    }

    private function normalize(array $row): array
    {
        return array(
            'id' => (int) $row['id'],
            'public_id' => (string) $row['public_id'],
            'type' => (string) $row['type'],
            'severity' => (string) $row['severity'],
            'status' => (string) $row['status'],
            'source' => (string) $row['source'],
            'source_ref_type' => $row['source_ref_type'],
            'source_ref_id' => $row['source_ref_id'] !== null ? (int) $row['source_ref_id'] : null,
            'title' => (string) $row['title'],
            'summary' => (string) ($row['summary'] ?? ''),
            'detected_at' => (string) $row['detected_at'],
            'last_seen_at' => (string) $row['last_seen_at'],
            'occurrence_count' => (int) $row['occurrence_count'],
            'updated_at' => (string) $row['updated_at'],
        );
    }

}
