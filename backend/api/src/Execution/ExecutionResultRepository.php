<?php

declare(strict_types=1);

namespace HighlightSignal\Execution;

use mysqli;

/**
 * V11-03: persistence only. `execution_results` supports EITHER a Task OR a
 * Queue Job as its source, never both/neither -- enforced by
 * ExecutionResultService (MySQL 5.6 cannot enforce a CHECK constraint), not
 * here. This class has no idea what "success" or "failure" means for any
 * particular job_type/task -- it only stores whatever the Service already
 * decided and redacted.
 */
final class ExecutionResultRepository
{
    private $database;

    public function __construct(mysqli $database)
    {
        $this->database = $database;
    }

    public function findForTaskAttempt(int $workspaceId, int $taskId, int $attempt)
    {
        $statement = $this->database->prepare(
            'SELECT * FROM execution_results WHERE workspace_id = ? AND task_id = ? AND attempt = ? LIMIT 1'
        );
        $statement->bind_param('iii', $workspaceId, $taskId, $attempt);
        $statement->execute();
        $row = $statement->get_result()->fetch_assoc();
        return is_array($row) ? $row : null;
    }

    public function findForQueueJobAttempt(int $workspaceId, int $queueJobId, int $attempt)
    {
        $statement = $this->database->prepare(
            'SELECT * FROM execution_results WHERE workspace_id = ? AND queue_job_id = ? AND attempt = ? LIMIT 1'
        );
        $statement->bind_param('iii', $workspaceId, $queueJobId, $attempt);
        $statement->execute();
        $row = $statement->get_result()->fetch_assoc();
        return is_array($row) ? $row : null;
    }

    /**
     * Idempotent on (task_id, attempt) via the UNIQUE key (migrations/032)
     * -- a repeat call for the same Task+attempt returns the existing row.
     *
     * @param mixed $outputSummary string|null; $outputReference string|null; $errorCode string|null; $errorMessage string|null; $handlerVersion string|null
     */
    public function recordForTask(
        int $workspaceId,
        int $taskId,
        string $status,
        int $attempt,
        string $startedAt,
        string $completedAt,
        int $durationMs,
        $outputSummary,
        $outputReference,
        $errorCode,
        $errorMessage,
        $handlerVersion
    ): array {
        $existing = $this->findForTaskAttempt($workspaceId, $taskId, $attempt);
        if (is_array($existing)) {
            return $existing;
        }

        $publicId = $this->uuid();
        $statement = $this->database->prepare(
            'INSERT INTO execution_results (
                public_id, workspace_id, task_id, status, attempt, started_at, completed_at, duration_ms,
                output_summary, output_reference, error_code, error_message, handler_version
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $statement->bind_param(
            'siisississsss',
            $publicId,
            $workspaceId,
            $taskId,
            $status,
            $attempt,
            $startedAt,
            $completedAt,
            $durationMs,
            $outputSummary,
            $outputReference,
            $errorCode,
            $errorMessage,
            $handlerVersion
        );
        $statement->execute();

        return $this->findForTaskAttempt($workspaceId, $taskId, $attempt);
    }

    /** @param mixed $outputSummary string|null; $outputReference string|null; $errorCode string|null; $errorMessage string|null; $handlerVersion string|null */
    public function recordForQueueJob(
        int $workspaceId,
        int $queueJobId,
        string $status,
        int $attempt,
        string $startedAt,
        string $completedAt,
        int $durationMs,
        $outputSummary,
        $outputReference,
        $errorCode,
        $errorMessage,
        $handlerVersion
    ): array {
        $existing = $this->findForQueueJobAttempt($workspaceId, $queueJobId, $attempt);
        if (is_array($existing)) {
            return $existing;
        }

        $publicId = $this->uuid();
        $statement = $this->database->prepare(
            'INSERT INTO execution_results (
                public_id, workspace_id, queue_job_id, status, attempt, started_at, completed_at, duration_ms,
                output_summary, output_reference, error_code, error_message, handler_version
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $statement->bind_param(
            'siisississsss',
            $publicId,
            $workspaceId,
            $queueJobId,
            $status,
            $attempt,
            $startedAt,
            $completedAt,
            $durationMs,
            $outputSummary,
            $outputReference,
            $errorCode,
            $errorMessage,
            $handlerVersion
        );
        $statement->execute();

        return $this->findForQueueJobAttempt($workspaceId, $queueJobId, $attempt);
    }

    /** @return array<int, array> newest first */
    public function listForTask(int $workspaceId, int $taskId): array
    {
        $statement = $this->database->prepare(
            'SELECT * FROM execution_results WHERE workspace_id = ? AND task_id = ? ORDER BY attempt DESC'
        );
        $statement->bind_param('ii', $workspaceId, $taskId);
        $statement->execute();
        return $statement->get_result()->fetch_all(MYSQLI_ASSOC);
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

        $where = implode(' AND ', $conditions);
        $offset = max(0, ($page - 1) * $perPage);

        $countStatement = $this->database->prepare("SELECT COUNT(*) AS total FROM execution_results WHERE $where");
        $this->bindDynamic($countStatement, $types, $params);
        $countStatement->execute();
        $total = (int) ($countStatement->get_result()->fetch_assoc()['total'] ?? 0);

        $listStatement = $this->database->prepare(
            "SELECT * FROM execution_results WHERE $where ORDER BY completed_at DESC LIMIT ? OFFSET ?"
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
