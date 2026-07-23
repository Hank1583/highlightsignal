<?php

declare(strict_types=1);

namespace HighlightSignal\Queue;

use HighlightSignal\Audit\AuditLogger;
use HighlightSignal\Execution\ExecutionResultService;
use HighlightSignal\Http\ValidationException;
use mysqli;

/**
 * V11-02: business rules for the MySQL Job Queue (ADR-004) -- Worker
 * dispatch, retry/backoff/dead-letter decisions, and job_type validation.
 * This class must never contain domain/business logic for what a job
 * actually DOES -- that lives entirely in the caller-supplied handler
 * registry (`array<string, callable>`, job_type => `function(array $payload): void`,
 * throws on failure). No handlers are registered by this task -- V11-02
 * only builds the reliable execution mechanics; the first real consumer is
 * V11-06 Notification delivery.
 */
final class QueueService
{
    // Exponential backoff: 30s, 60s, 120s, 240s, ... capped at 1 hour.
    const BACKOFF_BASE_SECONDS = 30;
    const BACKOFF_MAX_SECONDS = 3600;

    // A 'processing' job whose locked_at is older than this is presumed
    // stuck (the worker that claimed it crashed, timed out, or was killed
    // mid-job) -- recovered at the start of every runBatch() cycle.
    const STALE_PROCESSING_SECONDS = 300;

    const MAX_PAYLOAD_BYTES = 65536;

    private $repository;
    private $database;
    private $executionResultService;
    private $auditLogger;

    public function __construct(QueueRepository $repository, mysqli $database, ExecutionResultService $executionResultService)
    {
        $this->repository = $repository;
        $this->database = $database;
        $this->executionResultService = $executionResultService;
        $this->auditLogger = new AuditLogger($database);
    }

    /**
     * @param array<string, mixed> $payload
     * @param mixed $idempotencyKey string|null
     * @param mixed $scheduledAt string|null 'Y-m-d H:i:s', null for "now"
     */
    public function enqueue(
        int $workspaceId,
        string $jobType,
        array $payload,
        int $priority = 100,
        int $maxAttempts = 3,
        $idempotencyKey = null,
        $scheduledAt = null,
        $handlerVersion = null
    ): array {
        if (!preg_match('/^[a-z][a-z0-9_.]{2,99}$/', $jobType)) {
            throw new ValidationException('Invalid job_type.');
        }
        if ($priority < 0 || $priority > 999) {
            throw new ValidationException('Priority must be between 0 and 999.');
        }
        if ($maxAttempts < 1 || $maxAttempts > 20) {
            throw new ValidationException('max_attempts must be between 1 and 20.');
        }

        $payloadJson = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($payloadJson === false) {
            throw new ValidationException('Job payload could not be encoded.');
        }
        if (strlen($payloadJson) > self::MAX_PAYLOAD_BYTES) {
            throw new ValidationException('Job payload exceeds the size limit.');
        }

        return $this->repository->enqueue(
            $workspaceId,
            $jobType,
            $payloadJson,
            $priority,
            $maxAttempts,
            $idempotencyKey,
            $scheduledAt,
            $handlerVersion
        );
    }

    /**
     * V11-07: not currently wired to any HTTP route (no QueueController
     * exists yet) -- audited anyway so whenever a cancel endpoint IS added,
     * coverage already exists by construction rather than needing to be
     * remembered as a follow-up.
     *
     * @param mixed $actorMemberId int|null -- null when called from a non-human context
     */
    public function cancel(int $workspaceId, int $jobId, $actorMemberId = null): bool
    {
        $this->database->begin_transaction();
        try {
            $cancelled = $this->repository->cancel($workspaceId, $jobId);
            if ($cancelled) {
                $this->auditLogger->record($workspaceId, $actorMemberId, 'queue.job_cancelled', 'QueueJob', (string) $jobId, array());
            }
            $this->database->commit();
            return $cancelled;
        } catch (\Throwable $error) {
            $this->database->rollback();
            throw $error;
        }
    }

    public function listForWorkspace(int $workspaceId, array $filters, int $page, int $perPage): array
    {
        $page = max(1, $page);
        $perPage = max(1, min(100, $perPage));
        return $this->repository->listForWorkspace($workspaceId, $filters, $page, $perPage);
    }

    /**
     * Runs one short batch cycle: recovers any stuck jobs, then claims and
     * executes up to $maxJobs jobs (via the caller's handler registry)
     * within a wall-clock time budget. Designed to be called repeatedly by
     * an external scheduler hitting the signed HTTP trigger endpoint -- this
     * project's host has no SSH/cron for a long-running daemon, so "a short
     * batch runs every N minutes" is the actual operating model, not a
     * simplification.
     *
     * An unknown job_type (no handler registered) fails closed exactly like
     * a handler throwing an exception -- it goes through the same
     * attempt/backoff/dead-letter path, it is never silently skipped or
     * left claimed forever.
     *
     * @param array<string, callable> $handlerRegistry job_type => function(array $payload): void
     * @return array{recovered: int, claimed: int, completed: int, failed: int, dead_lettered: int}
     */
    public function runBatch(array $handlerRegistry, int $maxJobs, int $timeBudgetSeconds): array
    {
        $recovery = $this->repository->recoverStuckJobs(self::STALE_PROCESSING_SECONDS);
        foreach ($recovery['dead_lettered'] as $job) {
            // V11-07: this stale-lease dead-letter path was completely
            // unaudited before this task -- a stuck job silently vanishing
            // into 'dead_letter' with no audit trail is exactly the kind of
            // gap the coverage matrix flagged.
            $this->auditLogger->record(
                (int) $job['workspace_id'],
                null,
                'queue.job_dead_lettered',
                'QueueJob',
                (string) $job['id'],
                array('job_type' => (string) $job['job_type'], 'reason' => 'stale_lease_expired')
            );
        }

        $stats = array(
            'recovered' => $recovery['requeued'] + count($recovery['dead_lettered']),
            'claimed' => 0,
            'completed' => 0,
            'failed' => 0,
            'dead_lettered' => 0,
        );

        $deadline = time() + max(1, $timeBudgetSeconds);
        for ($i = 0; $i < $maxJobs; $i++) {
            if (time() >= $deadline) {
                break;
            }

            $claimToken = bin2hex(random_bytes(16));
            $job = $this->repository->claimNext($claimToken);
            if ($job === null) {
                break;
            }

            $stats['claimed']++;
            $this->executeClaimedJob($job, $handlerRegistry, $stats);
        }

        return $stats;
    }

    /**
     * V11-03: every claimed attempt gets an Execution Result -- success or
     * failure -- not just the final dead-lettered one; `attempt` (the same
     * number `queue_jobs.attempts` is about to become) is the natural
     * idempotency key, so re-processing the same claim can never double up.
     *
     * @param array<string, mixed> $job @param array<string, callable> $handlerRegistry @param array<string, int> $stats
     */
    private function executeClaimedJob(array $job, array $handlerRegistry, array &$stats)
    {
        $jobId = (int) $job['id'];
        $jobType = (string) $job['job_type'];
        $workspaceId = (int) $job['workspace_id'];
        $startedAtUnix = $job['locked_at'] !== null ? strtotime((string) $job['locked_at']) : time();

        try {
            if (!isset($handlerRegistry[$jobType]) || !is_callable($handlerRegistry[$jobType])) {
                throw new \RuntimeException('No handler registered for job_type: ' . $jobType);
            }

            $payload = json_decode((string) $job['payload_TEXT'], true);
            call_user_func($handlerRegistry[$jobType], is_array($payload) ? $payload : array());

            $this->repository->markCompleted($jobId);
            $stats['completed']++;
            $this->executionResultService->recordForQueueJob(
                $workspaceId,
                $jobId,
                true,
                (int) $job['attempts'] + 1,
                (int) $startedAtUnix,
                time(),
                null,
                null,
                null,
                null,
                $job['handler_version'] ?? null
            );
        } catch (\Throwable $error) {
            $newAttempts = (int) $job['attempts'] + 1;
            $maxAttempts = (int) $job['max_attempts'];
            $errorMessage = substr($error->getMessage(), 0, 2000);

            $deadLetter = $newAttempts >= $maxAttempts;
            if ($deadLetter) {
                $this->repository->markFailed($jobId, $errorMessage, $newAttempts, true, null);
                $stats['dead_lettered']++;
                $this->auditLogger->record(
                    $workspaceId,
                    null,
                    'queue.job_dead_lettered',
                    'QueueJob',
                    (string) $jobId,
                    array('job_type' => $jobType, 'attempts' => $newAttempts, 'error' => $errorMessage, 'reason' => 'handler_exception')
                );
            } else {
                $delaySeconds = min(self::BACKOFF_MAX_SECONDS, self::BACKOFF_BASE_SECONDS * (2 ** ($newAttempts - 1)));
                $nextScheduledAt = date('Y-m-d H:i:s', time() + $delaySeconds);
                $this->repository->markFailed($jobId, $errorMessage, $newAttempts, false, $nextScheduledAt);
                $stats['failed']++;
            }

            $this->executionResultService->recordForQueueJob(
                $workspaceId,
                $jobId,
                false,
                $newAttempts,
                (int) $startedAtUnix,
                time(),
                null,
                null,
                get_class($error),
                $error->getMessage(),
                $job['handler_version'] ?? null
            );
        }
    }

}
