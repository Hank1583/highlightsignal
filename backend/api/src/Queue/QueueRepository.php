<?php

declare(strict_types=1);

namespace HighlightSignal\Queue;

use mysqli;

/**
 * V11-02: persistence only (spec section 10: Repository only does
 * persistence, rules live in the Service). This class never knows what a
 * job_type's payload means or how to execute it -- that is entirely the
 * caller-supplied handler registry's job (QueueService::runBatch()).
 */
final class QueueRepository
{
    private $database;

    public function __construct(mysqli $database)
    {
        $this->database = $database;
    }

    public function findByIdempotencyKey(int $workspaceId, string $idempotencyKey)
    {
        $statement = $this->database->prepare(
            'SELECT * FROM queue_jobs WHERE workspace_id = ? AND idempotency_key = ? LIMIT 1'
        );
        $statement->bind_param('is', $workspaceId, $idempotencyKey);
        $statement->execute();
        $row = $statement->get_result()->fetch_assoc();
        return is_array($row) ? $row : null;
    }

    public function findByPublicId(int $workspaceId, string $publicId)
    {
        $statement = $this->database->prepare(
            'SELECT * FROM queue_jobs WHERE workspace_id = ? AND public_id = ? LIMIT 1'
        );
        $statement->bind_param('is', $workspaceId, $publicId);
        $statement->execute();
        $row = $statement->get_result()->fetch_assoc();
        return is_array($row) ? $row : null;
    }

    /**
     * Opt-in idempotent enqueue -- same NULL-is-distinct design as
     * `decisions.idempotency_key` (migrations/028): a caller that supplies
     * one and it already matches an existing job in this workspace gets
     * that existing job back untouched, never a duplicate enqueue. A caller
     * that omits it is completely unaffected (plain insert every time).
     *
     * @param mixed $idempotencyKey string|null (no ?string type hint -- PHP 7.1+ only, project targets 7.0)
     * @param mixed $scheduledAt string|null 'Y-m-d H:i:s' or null for "now"
     * @param mixed $handlerVersion string|null
     */
    public function enqueue(
        int $workspaceId,
        string $jobType,
        string $payloadJson,
        int $priority,
        int $maxAttempts,
        $idempotencyKey = null,
        $scheduledAt = null,
        $handlerVersion = null
    ): array {
        if ($idempotencyKey !== null) {
            $existing = $this->findByIdempotencyKey($workspaceId, $idempotencyKey);
            if (is_array($existing)) {
                return $existing;
            }
        }

        $publicId = $this->uuid();
        $statement = $this->database->prepare(
            'INSERT INTO queue_jobs (
                public_id, workspace_id, job_type, idempotency_key, payload_TEXT, handler_version,
                priority, max_attempts, scheduled_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, NOW()))'
        );
        $statement->bind_param(
            'sissssiis',
            $publicId,
            $workspaceId,
            $jobType,
            $idempotencyKey,
            $payloadJson,
            $handlerVersion,
            $priority,
            $maxAttempts,
            $scheduledAt
        );
        $statement->execute();

        return $this->findByPublicId($workspaceId, $publicId);
    }

    /**
     * Recovers jobs a crashed/killed worker left stuck in 'processing' --
     * a job whose `locked_at` is older than $staleSeconds is either
     * requeued (if it has retry budget left) or dead-lettered (if not),
     * clearing `locked_at`/`locked_by` either way so it stops counting as
     * "in flight". Called at the start of every `runBatch()` cycle, not on
     * a separate schedule -- there is no daemon to run one.
     *
     * V11-07: now returns WHICH jobs were dead-lettered (not just a count) --
     * `QueueService::runBatch()` needs the individual `id`/`workspace_id`/
     * `job_type` to audit each one (this stale-lease path is a SECOND
     * dead-letter path alongside `executeClaimedJob()`'s own, and was
     * completely unaudited before this task). The requeue branch stays a
     * plain count -- a job going back to 'queued' still has retry budget
     * left, it is not yet the "needs human attention" event.
     *
     * @return array{requeued: int, dead_lettered: array<int, array<string, mixed>>}
     */
    public function recoverStuckJobs(int $staleSeconds): array
    {
        $requeue = $this->database->prepare(
            "UPDATE queue_jobs
             SET status = 'queued', locked_at = NULL, locked_by = NULL
             WHERE status = 'processing'
               AND locked_at < DATE_SUB(NOW(), INTERVAL ? SECOND)
               AND attempts < max_attempts"
        );
        $requeue->bind_param('i', $staleSeconds);
        $requeue->execute();
        $requeued = (int) $requeue->affected_rows;

        // Selected BEFORE the UPDATE so we know exactly which rows were
        // dead-lettered -- a concurrent worker could in principle move one of
        // these between the SELECT and the UPDATE below (it would then just
        // not match the UPDATE's WHERE and stay untouched, never double
        // dead-lettered), which is an acceptable race for a maintenance
        // sweep that already only fires on a stale (crashed-worker) lease.
        $candidates = $this->database->prepare(
            "SELECT id, workspace_id, job_type FROM queue_jobs
             WHERE status = 'processing'
               AND locked_at < DATE_SUB(NOW(), INTERVAL ? SECOND)
               AND attempts >= max_attempts"
        );
        $candidates->bind_param('i', $staleSeconds);
        $candidates->execute();
        $deadLetterCandidates = $candidates->get_result()->fetch_all(MYSQLI_ASSOC);

        $deadLetter = $this->database->prepare(
            "UPDATE queue_jobs
             SET status = 'dead_letter', locked_at = NULL, locked_by = NULL,
                 last_error = 'Worker lease expired without completion (stuck job recovery).'
             WHERE status = 'processing'
               AND locked_at < DATE_SUB(NOW(), INTERVAL ? SECOND)
               AND attempts >= max_attempts"
        );
        $deadLetter->bind_param('i', $staleSeconds);
        $deadLetter->execute();

        return array('requeued' => $requeued, 'dead_lettered' => $deadLetterCandidates);
    }

    /**
     * Atomic claim, safe under concurrent workers on MySQL 5.6 (no
     * `SELECT ... FOR UPDATE SKIP LOCKED`, which is 8.0+ only): a single
     * `UPDATE ... ORDER BY ... LIMIT 1` is one atomic statement -- InnoDB's
     * row locking means two workers racing this exact query can never both
     * update the same row, because the second worker's UPDATE re-evaluates
     * `WHERE status = 'queued'` after acquiring the row lock and finds it
     * already changed. `$claimToken` (a fresh random value per attempt, NOT
     * a static worker id) disambiguates which specific row THIS call just
     * claimed when re-selecting it afterward.
     */
    public function claimNext(string $claimToken)
    {
        $claim = $this->database->prepare(
            "UPDATE queue_jobs
             SET status = 'processing', locked_at = NOW(), locked_by = ?
             WHERE status = 'queued' AND scheduled_at <= NOW()
             ORDER BY priority ASC, id ASC
             LIMIT 1"
        );
        $claim->bind_param('s', $claimToken);
        $claim->execute();

        if ($claim->affected_rows !== 1) {
            return null;
        }

        $statement = $this->database->prepare(
            "SELECT * FROM queue_jobs WHERE locked_by = ? AND status = 'processing' ORDER BY id DESC LIMIT 1"
        );
        $statement->bind_param('s', $claimToken);
        $statement->execute();
        $row = $statement->get_result()->fetch_assoc();
        return is_array($row) ? $row : null;
    }

    public function markCompleted(int $jobId)
    {
        $statement = $this->database->prepare(
            "UPDATE queue_jobs SET status = 'completed', completed_at = NOW(), locked_at = NULL, locked_by = NULL WHERE id = ?"
        );
        $statement->bind_param('i', $jobId);
        $statement->execute();
    }

    /**
     * @param int $newAttempts the attempt count AFTER this failure (caller's responsibility to compute -- $job['attempts'] + 1)
     * @param mixed $nextScheduledAt string|null 'Y-m-d H:i:s' -- required when $deadLetter is false, ignored when true
     */
    public function markFailed(int $jobId, string $errorMessage, int $newAttempts, bool $deadLetter, $nextScheduledAt)
    {
        if ($deadLetter) {
            $statement = $this->database->prepare(
                "UPDATE queue_jobs
                 SET status = 'dead_letter', attempts = ?, last_error = ?, locked_at = NULL, locked_by = NULL
                 WHERE id = ?"
            );
            $statement->bind_param('isi', $newAttempts, $errorMessage, $jobId);
            $statement->execute();
            return;
        }

        $statement = $this->database->prepare(
            "UPDATE queue_jobs
             SET status = 'queued', attempts = ?, last_error = ?, scheduled_at = ?, locked_at = NULL, locked_by = NULL
             WHERE id = ?"
        );
        $statement->bind_param('issi', $newAttempts, $errorMessage, $nextScheduledAt, $jobId);
        $statement->execute();
    }

    /** Only a still-'queued' job can be cancelled -- one already claimed/processing/terminal is left alone. */
    public function cancel(int $workspaceId, int $jobId): bool
    {
        $statement = $this->database->prepare(
            "UPDATE queue_jobs SET status = 'cancelled' WHERE id = ? AND workspace_id = ? AND status = 'queued'"
        );
        $statement->bind_param('ii', $jobId, $workspaceId);
        $statement->execute();
        return $statement->affected_rows > 0;
    }

    /** @return array{items: array<int, array>, total: int} */
    public function listForWorkspace(int $workspaceId, array $filters, int $page, int $perPage): array
    {
        $conditions = array('workspace_id = ?');
        $types = 'i';
        $params = array($workspaceId);

        if (isset($filters['status']) && $filters['status'] !== '') {
            $conditions[] = 'status = ?';
            $types .= 's';
            $params[] = (string) $filters['status'];
        }
        if (isset($filters['job_type']) && $filters['job_type'] !== '') {
            $conditions[] = 'job_type = ?';
            $types .= 's';
            $params[] = (string) $filters['job_type'];
        }

        $where = implode(' AND ', $conditions);
        $offset = max(0, ($page - 1) * $perPage);

        $countStatement = $this->database->prepare("SELECT COUNT(*) AS total FROM queue_jobs WHERE $where");
        $this->bindDynamic($countStatement, $types, $params);
        $countStatement->execute();
        $total = (int) ($countStatement->get_result()->fetch_assoc()['total'] ?? 0);

        $listStatement = $this->database->prepare(
            "SELECT * FROM queue_jobs WHERE $where ORDER BY created_at DESC LIMIT ? OFFSET ?"
        );
        $listTypes = $types . 'ii';
        $listParams = $params;
        $listParams[] = $perPage;
        $listParams[] = $offset;
        $this->bindDynamic($listStatement, $listTypes, $listParams);
        $listStatement->execute();
        $items = $listStatement->get_result()->fetch_all(MYSQLI_ASSOC);

        return array('items' => $items, 'total' => $total);
    }

    /** Same call_user_func_array + by-reference pattern as every other Repository's dynamic bind_param (PHP 7.0 target, no execute(array)). */
    private function bindDynamic(\mysqli_stmt $statement, string $types, array $params)
    {
        $arguments = array($types);
        foreach ($params as $index => $value) {
            $arguments[] = &$params[$index];
        }
        call_user_func_array(array($statement, 'bind_param'), $arguments);
    }

    private function uuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
        $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
