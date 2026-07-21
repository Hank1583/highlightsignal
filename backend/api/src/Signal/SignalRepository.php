<?php

declare(strict_types=1);

namespace HighlightSignal\Signal;

use mysqli;

/**
 * V10-01: persistence only, per spec section 10 (Controller -> Validator ->
 * Service -> Repository -> MySQL). Dedup and status-transition RULES live in
 * SignalService / the Detector classes, not here -- this class only knows how
 * to read/write rows.
 */
final class SignalRepository
{
    private $database;

    public function __construct(mysqli $database)
    {
        $this->database = $database;
    }

    public function findByDedupKey(int $workspaceId, string $dedupKey)
    {
        $statement = $this->database->prepare(
            'SELECT id, public_id, status, occurrence_count, source FROM signals
             WHERE workspace_id = ? AND dedup_key = ? LIMIT 1'
        );
        $statement->bind_param('is', $workspaceId, $dedupKey);
        $statement->execute();
        $row = $statement->get_result()->fetch_assoc();
        return is_array($row) ? $row : null;
    }

    /**
     * INSERT ... ON DUPLICATE KEY UPDATE on (workspace_id, dedup_key).
     * `status = IF(status = 'resolved', 'new', status)` is the reopen rule:
     * a Signal the detector previously marked resolved (system-inferred) is
     * reopened to 'new' when the same underlying issue is detected again.
     * A 'dismissed' Signal (a human's explicit call) is deliberately left
     * alone -- only a human un-dismisses it, recurrence alone doesn't
     * override that judgment. 'new'/'acknowledged' are simply left as-is;
     * only last_seen_at/occurrence_count/title/summary/severity refresh.
     *
     * Returns the row as it stands after the upsert, plus a `was_new` flag
     * the caller uses to decide whether to write an audit log entry --
     * bumping occurrence_count on an already-open Signal is not a status
     * transition worth auditing on every re-scan.
     */
    public function upsertByDedupKey(
        int $workspaceId,
        string $dedupKey,
        string $type,
        string $severity,
        string $source,
        $sourceRefType,
        $sourceRefId,
        string $title,
        string $summary
    ): array {
        $existing = $this->findByDedupKey($workspaceId, $dedupKey);
        $publicId = $this->uuid();

        $statement = $this->database->prepare(
            "INSERT INTO signals (
                public_id, workspace_id, type, severity, status, source,
                source_ref_type, source_ref_id, dedup_key, title, summary,
                detected_at, last_seen_at, occurrence_count
            ) VALUES (?, ?, ?, ?, 'new', ?, ?, ?, ?, ?, ?, NOW(), NOW(), 1)
            ON DUPLICATE KEY UPDATE
                type = VALUES(type),
                severity = VALUES(severity),
                title = VALUES(title),
                summary = VALUES(summary),
                last_seen_at = VALUES(last_seen_at),
                occurrence_count = occurrence_count + 1,
                status = IF(status = 'resolved', 'new', status)"
        );
        $statement->bind_param(
            'sissssisss',
            $publicId,
            $workspaceId,
            $type,
            $severity,
            $source,
            $sourceRefType,
            $sourceRefId,
            $dedupKey,
            $title,
            $summary
        );
        $statement->execute();

        $row = $this->findByDedupKey($workspaceId, $dedupKey);
        $wasReopened = is_array($existing) && $existing['status'] === 'resolved';

        return array(
            'row' => $row,
            'was_new' => !is_array($existing),
            'was_reopened' => $wasReopened,
        );
    }

    /**
     * Only transitions an open Signal (new/acknowledged) to resolved --
     * a 'dismissed' Signal is left alone (same reasoning as the reopen rule
     * above: a human decision isn't silently overwritten by the detector).
     * Returns true only if a row was actually flipped, so the caller knows
     * whether this is a real transition worth an audit log entry.
     */
    public function markResolvedByDedupKeyIfOpen(int $workspaceId, string $dedupKey): bool
    {
        $statement = $this->database->prepare(
            "UPDATE signals
             SET status = 'resolved', type = REPLACE(type, '.new', '.resolved')
             WHERE workspace_id = ? AND dedup_key = ? AND status IN ('new', 'acknowledged')"
        );
        $statement->bind_param('is', $workspaceId, $dedupKey);
        $statement->execute();
        return $this->database->affected_rows > 0;
    }

    public function findForWorkspace(int $workspaceId, int $signalId)
    {
        $statement = $this->database->prepare(
            'SELECT * FROM signals WHERE workspace_id = ? AND id = ? LIMIT 1'
        );
        $statement->bind_param('ii', $workspaceId, $signalId);
        $statement->execute();
        $row = $statement->get_result()->fetch_assoc();
        return is_array($row) ? $row : null;
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

        if (isset($filters['severity']) && $filters['severity'] !== '') {
            $conditions[] = 'severity = ?';
            $types .= 's';
            $params[] = (string) $filters['severity'];
        }

        $where = implode(' AND ', $conditions);
        $offset = max(0, ($page - 1) * $perPage);

        $countStatement = $this->database->prepare("SELECT COUNT(*) AS total FROM signals WHERE $where");
        $this->bindDynamic($countStatement, $types, $params);
        $countStatement->execute();
        $total = (int) ($countStatement->get_result()->fetch_assoc()['total'] ?? 0);

        $listStatement = $this->database->prepare(
            "SELECT * FROM signals WHERE $where
             ORDER BY FIELD(severity, 'critical', 'high', 'medium', 'low', 'info'), detected_at DESC
             LIMIT ? OFFSET ?"
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

    /**
     * mysqli_stmt::bind_param() binds its value arguments by reference, and
     * this project targets PHP 7.0 compatibility -- unpacking a plain array
     * with `...$params` does not satisfy that (and `execute(array $params)`
     * is PHP 8.1+ only). Mirrors the same call_user_func_array + by-reference
     * pattern already used by ga/ownership.php's
     * ga_require_connection_ownership() for a dynamic parameter count.
     */
    private function bindDynamic(\mysqli_stmt $statement, string $types, array $params): void
    {
        $arguments = array($types);
        foreach ($params as $index => $value) {
            $arguments[] = &$params[$index];
        }
        call_user_func_array(array($statement, 'bind_param'), $arguments);
    }

    public function updateStatus(int $workspaceId, int $signalId, string $status): bool
    {
        $statement = $this->database->prepare(
            'UPDATE signals SET status = ? WHERE workspace_id = ? AND id = ?'
        );
        $statement->bind_param('sii', $status, $workspaceId, $signalId);
        $statement->execute();
        return $this->database->affected_rows > 0;
    }

    private function uuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
        $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
