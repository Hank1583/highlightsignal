<?php

declare(strict_types=1);

namespace HighlightSignal\Retention;

use mysqli;

/**
 * V11-08: persistence only (spec section 10: Repository only does
 * persistence, rules -- retention windows, dry-run/delete decision, owner
 * approval gating -- live in RetentionCleanupService). Every "find eligible
 * rows" query here is ORDER BY id ASC LIMIT $limit -- a bounded batch, never
 * an unbounded sweep, and safe to call again on retry: rows already deleted
 * simply stop matching, never a duplicate delete.
 */
final class RetentionRepository
{
    private $database;

    public function __construct(mysqli $database)
    {
        $this->database = $database;
    }

    /** @return array<int, string> nonce values */
    public function findExpiredNonces(int $olderThanDays, int $limit): array
    {
        $statement = $this->database->prepare(
            'SELECT nonce FROM service_request_nonces
             WHERE expires_at < DATE_SUB(NOW(), INTERVAL ? DAY)
             ORDER BY expires_at ASC LIMIT ?'
        );
        $statement->bind_param('ii', $olderThanDays, $limit);
        $statement->execute();
        $rows = $statement->get_result()->fetch_all(MYSQLI_ASSOC);
        return array_map(static function (array $row) { return (string) $row['nonce']; }, $rows);
    }

    public function deleteNoncesByValues(array $nonces): int
    {
        if (count($nonces) === 0) {
            return 0;
        }
        $placeholders = implode(',', array_fill(0, count($nonces), '?'));
        $statement = $this->database->prepare("DELETE FROM service_request_nonces WHERE nonce IN ($placeholders)");
        $types = str_repeat('s', count($nonces));
        $this->bindDynamic($statement, $types, $nonces);
        $statement->execute();
        return $statement->affected_rows;
    }

    /**
     * Excludes any job still referenced by `execution_results.queue_job_id`
     * or `notification_deliveries.queue_job_id` (both `ON DELETE RESTRICT`,
     * migrations/032 and /035) -- deleting a referenced job would simply
     * fail the DELETE with an FK violation. A job effectively stays around
     * until whichever referencing record ages out too, which is the
     * correct behavior (never delete a job while telemetry about it still
     * exists), not a bug to work around.
     *
     * @param array<int, string> $statuses
     * @return array<int, array{id: int, workspace_id: int}>
     */
    public function findEligibleQueueJobs(array $statuses, int $olderThanDays, int $limit): array
    {
        if (count($statuses) === 0) {
            return array();
        }
        $statusPlaceholders = implode(',', array_fill(0, count($statuses), '?'));
        $statement = $this->database->prepare(
            "SELECT qj.id, qj.workspace_id FROM queue_jobs qj
             LEFT JOIN execution_results er ON er.queue_job_id = qj.id
             LEFT JOIN notification_deliveries nd ON nd.queue_job_id = qj.id
             WHERE qj.status IN ($statusPlaceholders)
               AND qj.updated_at < DATE_SUB(NOW(), INTERVAL ? DAY)
               AND er.id IS NULL AND nd.id IS NULL
             ORDER BY qj.id ASC LIMIT ?"
        );
        $types = str_repeat('s', count($statuses)) . 'ii';
        $params = array_merge($statuses, array($olderThanDays, $limit));
        $this->bindDynamic($statement, $types, $params);
        $statement->execute();
        return $this->normalizeIdWorkspaceRows($statement->get_result()->fetch_all(MYSQLI_ASSOC));
    }

    public function deleteQueueJobsByIds(array $ids): int
    {
        return $this->deleteByIds('queue_jobs', $ids);
    }

    /** @return array<int, array{id: int, workspace_id: int}> */
    public function findEligibleExecutionResults(int $olderThanDays, int $limit): array
    {
        $statement = $this->database->prepare(
            'SELECT id, workspace_id FROM execution_results
             WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
             ORDER BY id ASC LIMIT ?'
        );
        $statement->bind_param('ii', $olderThanDays, $limit);
        $statement->execute();
        return $this->normalizeIdWorkspaceRows($statement->get_result()->fetch_all(MYSQLI_ASSOC));
    }

    public function deleteExecutionResultsByIds(array $ids): int
    {
        return $this->deleteByIds('execution_results', $ids);
    }

    /**
     * Never touches `status = 'unread'` -- an unread notification still
     * needs the recipient's attention regardless of age, so it is
     * structurally excluded from this query, not just by a wide retention
     * window.
     *
     * @return array<int, array{id: int, workspace_id: int}>
     */
    public function findEligibleReadOrDismissedNotifications(int $olderThanDays, int $limit): array
    {
        $statement = $this->database->prepare(
            "SELECT id, workspace_id FROM notifications
             WHERE status IN ('read', 'dismissed')
               AND COALESCE(dismissed_at, read_at) < DATE_SUB(NOW(), INTERVAL ? DAY)
             ORDER BY id ASC LIMIT ?"
        );
        $statement->bind_param('ii', $olderThanDays, $limit);
        $statement->execute();
        return $this->normalizeIdWorkspaceRows($statement->get_result()->fetch_all(MYSQLI_ASSOC));
    }

    /** Deliveries first -- `notification_deliveries.notification_id` is `ON DELETE RESTRICT` (migrations/035). */
    public function deleteNotificationDeliveriesByNotificationIds(array $notificationIds): int
    {
        if (count($notificationIds) === 0) {
            return 0;
        }
        $placeholders = implode(',', array_fill(0, count($notificationIds), '?'));
        $statement = $this->database->prepare("DELETE FROM notification_deliveries WHERE notification_id IN ($placeholders)");
        $types = str_repeat('i', count($notificationIds));
        $this->bindDynamic($statement, $types, $notificationIds);
        $statement->execute();
        return $statement->affected_rows;
    }

    public function deleteNotificationsByIds(array $ids): int
    {
        return $this->deleteByIds('notifications', $ids);
    }

    /**
     * V12-05: `dashboard_ai_logs` (migrations/013, workspace_id added by
     * migrations/018) stores free-text AI questions and provider
     * context/response payloads indefinitely -- a real privacy/data-
     * minimization gap this audit found (no cleanup existed for it before
     * this task, unlike every other operational data class). `workspace_id`
     * is nullable (018 added it without backfilling every historical row),
     * so rows are returned as-is rather than coerced to int like
     * normalizeIdWorkspaceRows() does -- age is the only real eligibility
     * criterion here; workspace_id is only used for audit-trail grouping.
     *
     * @return array<int, array{id: int, workspace_id: int|null}>
     */
    public function findEligibleDashboardAiLogs(int $olderThanDays, int $limit): array
    {
        $statement = $this->database->prepare(
            'SELECT id, workspace_id FROM dashboard_ai_logs
             WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
             ORDER BY id ASC LIMIT ?'
        );
        $statement->bind_param('ii', $olderThanDays, $limit);
        $statement->execute();
        $rows = $statement->get_result()->fetch_all(MYSQLI_ASSOC);
        return array_map(static function (array $row) {
            return array(
                'id' => (int) $row['id'],
                'workspace_id' => $row['workspace_id'] === null ? null : (int) $row['workspace_id'],
            );
        }, $rows);
    }

    public function deleteDashboardAiLogsByIds(array $ids): int
    {
        return $this->deleteByIds('dashboard_ai_logs', $ids);
    }

    /**
     * @param mixed $workspaceId int|null
     */
    public function recordRun(
        string $dataClass,
        $workspaceId,
        string $mode,
        int $matchedCount,
        int $deletedCount,
        bool $hasMore,
        string $status,
        $errorMessage,
        string $startedAt,
        string $completedAt
    ): array {
        $publicId = $this->uuid();
        $hasMoreValue = $hasMore ? 1 : 0;
        $statement = $this->database->prepare(
            'INSERT INTO retention_cleanup_runs (
                public_id, data_class, workspace_id, mode, matched_count, deleted_count,
                has_more, status, error_message, started_at, completed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $statement->bind_param(
            'ssisiiissss',
            $publicId,
            $dataClass,
            $workspaceId,
            $mode,
            $matchedCount,
            $deletedCount,
            $hasMoreValue,
            $status,
            $errorMessage,
            $startedAt,
            $completedAt
        );
        $statement->execute();

        $select = $this->database->prepare('SELECT * FROM retention_cleanup_runs WHERE public_id = ? LIMIT 1');
        $select->bind_param('s', $publicId);
        $select->execute();
        return $select->get_result()->fetch_assoc();
    }

    public function listRuns(array $filters, int $page, int $perPage): array
    {
        $conditions = array('1 = 1');
        $types = '';
        $params = array();

        if (isset($filters['data_class']) && $filters['data_class'] !== '') {
            $conditions[] = 'data_class = ?';
            $types .= 's';
            $params[] = (string) $filters['data_class'];
        }

        $where = implode(' AND ', $conditions);
        $offset = max(0, ($page - 1) * $perPage);

        $countStatement = $this->database->prepare("SELECT COUNT(*) AS total FROM retention_cleanup_runs WHERE $where");
        if (count($params) > 0) {
            $this->bindDynamic($countStatement, $types, $params);
        }
        $countStatement->execute();
        $total = (int) ($countStatement->get_result()->fetch_assoc()['total'] ?? 0);

        $listStatement = $this->database->prepare(
            "SELECT * FROM retention_cleanup_runs WHERE $where ORDER BY id DESC LIMIT ? OFFSET ?"
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

    /** @return array<int, array{id: int, workspace_id: int}> */
    private function normalizeIdWorkspaceRows(array $rows): array
    {
        return array_map(static function (array $row) {
            return array('id' => (int) $row['id'], 'workspace_id' => (int) $row['workspace_id']);
        }, $rows);
    }

    private function deleteByIds(string $table, array $ids): int
    {
        if (count($ids) === 0) {
            return 0;
        }
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $statement = $this->database->prepare("DELETE FROM $table WHERE id IN ($placeholders)");
        $types = str_repeat('i', count($ids));
        $this->bindDynamic($statement, $types, $ids);
        $statement->execute();
        return $statement->affected_rows;
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
