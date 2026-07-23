<?php

declare(strict_types=1);

namespace HighlightSignal\Notification;

use mysqli;

/**
 * V11-06: persistence only. `notifications`/`notification_deliveries` are
 * both create-or-return-existing (idempotent by their own UNIQUE keys,
 * migrations/035) -- this class never decides WHO to notify or WHETHER a
 * channel is enabled/configured, only writes/reads rows.
 */
final class NotificationRepository
{
    private $database;

    public function __construct(mysqli $database)
    {
        $this->database = $database;
    }

    public function findByDedupKey(int $workspaceId, int $recipientMemberId, string $dedupKey)
    {
        $statement = $this->database->prepare(
            'SELECT * FROM notifications WHERE workspace_id = ? AND recipient_member_id = ? AND dedup_key = ? LIMIT 1'
        );
        $statement->bind_param('iis', $workspaceId, $recipientMemberId, $dedupKey);
        $statement->execute();
        $row = $statement->get_result()->fetch_assoc();
        return is_array($row) ? $row : null;
    }

    public function findForWorkspace(int $workspaceId, int $notificationId)
    {
        $statement = $this->database->prepare(
            'SELECT * FROM notifications WHERE workspace_id = ? AND id = ? LIMIT 1'
        );
        $statement->bind_param('ii', $workspaceId, $notificationId);
        $statement->execute();
        $row = $statement->get_result()->fetch_assoc();
        return is_array($row) ? $row : null;
    }

    /**
     * "同一 event/recipient 重放不重複通知" -- the UNIQUE key on
     * (workspace_id, recipient_member_id, dedup_key) plus this early return
     * makes it a real guarantee: a repeat call for the same recipient+event
     * always returns the ORIGINAL notification, never creates a second one.
     *
     * @param mixed $body string|null; $entityType string|null; $entityId string|null
     */
    public function createIfNotExists(
        int $workspaceId,
        int $recipientMemberId,
        string $eventType,
        string $severity,
        string $title,
        $body,
        $entityType,
        $entityId,
        string $dedupKey
    ): array {
        $existing = $this->findByDedupKey($workspaceId, $recipientMemberId, $dedupKey);
        if (is_array($existing)) {
            return $existing;
        }

        $publicId = $this->uuid();
        $statement = $this->database->prepare(
            'INSERT INTO notifications (
                public_id, workspace_id, recipient_member_id, event_type, severity, title, body,
                entity_type, entity_id, dedup_key
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $statement->bind_param(
            'siisssssss',
            $publicId,
            $workspaceId,
            $recipientMemberId,
            $eventType,
            $severity,
            $title,
            $body,
            $entityType,
            $entityId,
            $dedupKey
        );
        $statement->execute();

        return $this->findByDedupKey($workspaceId, $recipientMemberId, $dedupKey);
    }

    public function markRead(int $workspaceId, int $recipientMemberId, int $notificationId): bool
    {
        $statement = $this->database->prepare(
            "UPDATE notifications SET status = 'read', read_at = NOW()
             WHERE id = ? AND workspace_id = ? AND recipient_member_id = ? AND status = 'unread'"
        );
        $statement->bind_param('iii', $notificationId, $workspaceId, $recipientMemberId);
        $statement->execute();
        return $statement->affected_rows > 0;
    }

    public function markDismissed(int $workspaceId, int $recipientMemberId, int $notificationId): bool
    {
        $statement = $this->database->prepare(
            "UPDATE notifications SET status = 'dismissed', dismissed_at = NOW()
             WHERE id = ? AND workspace_id = ? AND recipient_member_id = ? AND status <> 'dismissed'"
        );
        $statement->bind_param('iii', $notificationId, $workspaceId, $recipientMemberId);
        $statement->execute();
        return $statement->affected_rows > 0;
    }

    /** @return array{items: array<int, array>, total: int} */
    public function listForRecipient(int $workspaceId, int $recipientMemberId, array $filters, int $page, int $perPage): array
    {
        $conditions = array('workspace_id = ?', 'recipient_member_id = ?');
        $types = 'ii';
        $params = array($workspaceId, $recipientMemberId);

        if (isset($filters['status']) && $filters['status'] !== '') {
            $conditions[] = 'status = ?';
            $types .= 's';
            $params[] = (string) $filters['status'];
        }

        $where = implode(' AND ', $conditions);
        $offset = max(0, ($page - 1) * $perPage);

        $countStatement = $this->database->prepare("SELECT COUNT(*) AS total FROM notifications WHERE $where");
        $this->bindDynamic($countStatement, $types, $params);
        $countStatement->execute();
        $total = (int) ($countStatement->get_result()->fetch_assoc()['total'] ?? 0);

        $listStatement = $this->database->prepare(
            "SELECT * FROM notifications WHERE $where ORDER BY id DESC LIMIT ? OFFSET ?"
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

    // ---------------------------------------------------------------
    // Preferences
    // ---------------------------------------------------------------

    public function findPreference(int $workspaceId, int $memberId, string $eventType, string $channel)
    {
        $statement = $this->database->prepare(
            'SELECT * FROM notification_preferences WHERE workspace_id = ? AND member_id = ? AND event_type = ? AND channel = ? LIMIT 1'
        );
        $statement->bind_param('iiss', $workspaceId, $memberId, $eventType, $channel);
        $statement->execute();
        $row = $statement->get_result()->fetch_assoc();
        return is_array($row) ? $row : null;
    }

    public function setPreference(int $workspaceId, int $memberId, string $eventType, string $channel, bool $enabled)
    {
        $enabledValue = $enabled ? 1 : 0;
        $statement = $this->database->prepare(
            'INSERT INTO notification_preferences (workspace_id, member_id, event_type, channel, enabled)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE enabled = VALUES(enabled)'
        );
        $statement->bind_param('iissi', $workspaceId, $memberId, $eventType, $channel, $enabledValue);
        $statement->execute();
    }

    public function listPreferencesForMember(int $workspaceId, int $memberId): array
    {
        $statement = $this->database->prepare(
            'SELECT * FROM notification_preferences WHERE workspace_id = ? AND member_id = ?'
        );
        $statement->bind_param('ii', $workspaceId, $memberId);
        $statement->execute();
        return $statement->get_result()->fetch_all(MYSQLI_ASSOC);
    }

    // ---------------------------------------------------------------
    // Deliveries
    // ---------------------------------------------------------------

    public function findDelivery(int $workspaceId, int $notificationId, string $channel)
    {
        $statement = $this->database->prepare(
            'SELECT * FROM notification_deliveries WHERE workspace_id = ? AND notification_id = ? AND channel = ? LIMIT 1'
        );
        $statement->bind_param('iis', $workspaceId, $notificationId, $channel);
        $statement->execute();
        $row = $statement->get_result()->fetch_assoc();
        return is_array($row) ? $row : null;
    }

    /** Idempotent on (notification_id, channel) -- a repeat delivery attempt for the same pair returns the existing row untouched. */
    public function createDeliveryIfNotExists(
        int $workspaceId,
        int $notificationId,
        string $channel,
        string $status,
        $queueJobId,
        $errorMessage
    ): array {
        $existing = $this->findDelivery($workspaceId, $notificationId, $channel);
        if (is_array($existing)) {
            return $existing;
        }

        $publicId = $this->uuid();
        $deliveredAt = in_array($status, array('delivered', 'sent'), true) ? date('Y-m-d H:i:s') : null;
        $statement = $this->database->prepare(
            'INSERT INTO notification_deliveries (public_id, workspace_id, notification_id, channel, status, queue_job_id, error_message, delivered_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $statement->bind_param('siississ', $publicId, $workspaceId, $notificationId, $channel, $status, $queueJobId, $errorMessage, $deliveredAt);
        $statement->execute();

        return $this->findDelivery($workspaceId, $notificationId, $channel);
    }

    public function updateDeliveryStatus(int $workspaceId, int $deliveryId, string $status, int $attempt, $errorMessage)
    {
        $deliveredAt = in_array($status, array('delivered', 'sent'), true) ? date('Y-m-d H:i:s') : null;
        $statement = $this->database->prepare(
            'UPDATE notification_deliveries SET status = ?, attempt = ?, error_message = ?, delivered_at = COALESCE(?, delivered_at)
             WHERE id = ? AND workspace_id = ?'
        );
        $statement->bind_param('sissii', $status, $attempt, $errorMessage, $deliveredAt, $deliveryId, $workspaceId);
        $statement->execute();
    }

    /**
     * V11-06 recipient resolution rule: every ACTIVE member of the
     * workspace. A simple, defensible default -- per-member/per-event
     * opt-out (via `notification_preferences`) is what actually narrows who
     * gets bothered, not a role-based filter here.
     *
     * @return array<int, int>
     */
    public function listActiveWorkspaceMemberIds(int $workspaceId): array
    {
        $statement = $this->database->prepare(
            "SELECT member_id FROM workspace_members WHERE workspace_id = ? AND status = 'active'"
        );
        $statement->bind_param('i', $workspaceId);
        $statement->execute();
        $rows = $statement->get_result()->fetch_all(MYSQLI_ASSOC);
        return array_map(static function (array $row) { return (int) $row['member_id']; }, $rows);
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
