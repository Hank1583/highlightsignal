<?php

declare(strict_types=1);

namespace HighlightSignal\Evidence;

use mysqli;

/**
 * V10-02: persistence only (spec section 10: Repository only does
 * persistence, rules live in the Service). Dedup/immutability rules are
 * enforced here via SQL (ON DUPLICATE KEY UPDATE never touches
 * payload_json/content_hash/observed_at), but the decision of WHAT counts as
 * "the same fact" lives in EvidenceService/the Detector, not here.
 */
final class EvidenceRepository
{
    private $database;

    public function __construct(mysqli $database)
    {
        $this->database = $database;
    }

    public function findByDedupKey(int $workspaceId, string $dedupKey)
    {
        $statement = $this->database->prepare(
            'SELECT * FROM evidence_items WHERE workspace_id = ? AND dedup_key = ? LIMIT 1'
        );
        $statement->bind_param('is', $workspaceId, $dedupKey);
        $statement->execute();
        $row = $statement->get_result()->fetch_assoc();
        return is_array($row) ? $row : null;
    }

    /**
     * INSERT ... ON DUPLICATE KEY UPDATE on (workspace_id, dedup_key). Only
     * source_ref_id/last_observed_at/title/summary refresh on a repeat hit --
     * payload_json/content_hash/observed_at are never included in the UPDATE
     * clause, so the original snapshot is frozen forever once captured
     * (Snapshot Immutability). A genuinely different fact produces a
     * different content_hash upstream, hence a different dedup_key, hence a
     * brand-new row here rather than overwriting this one.
     */
    public function upsertByDedupKey(
        int $workspaceId,
        string $dedupKey,
        string $evidenceType,
        string $source,
        $sourceRefType,
        $sourceRefId,
        string $title,
        string $summary,
        string $payloadJson,
        string $contentHash,
        string $observedAt
    ): array {
        $existing = $this->findByDedupKey($workspaceId, $dedupKey);
        $publicId = $this->uuid();

        $statement = $this->database->prepare(
            "INSERT INTO evidence_items (
                public_id, workspace_id, evidence_type, source, source_ref_type,
                source_ref_id, dedup_key, title, summary, payload_json,
                content_hash, observed_at, last_observed_at, captured_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE
                source_ref_type = VALUES(source_ref_type),
                source_ref_id = VALUES(source_ref_id),
                title = VALUES(title),
                summary = VALUES(summary),
                last_observed_at = VALUES(last_observed_at)"
        );
        $statement->bind_param(
            'sisssisssssss',
            $publicId,
            $workspaceId,
            $evidenceType,
            $source,
            $sourceRefType,
            $sourceRefId,
            $dedupKey,
            $title,
            $summary,
            $payloadJson,
            $contentHash,
            $observedAt,
            $observedAt
        );
        $statement->execute();

        $row = $this->findByDedupKey($workspaceId, $dedupKey);
        return array('row' => $row, 'was_new' => !is_array($existing));
    }

    public function findForWorkspace(int $workspaceId, int $evidenceId)
    {
        $statement = $this->database->prepare(
            'SELECT * FROM evidence_items WHERE workspace_id = ? AND id = ? LIMIT 1'
        );
        $statement->bind_param('ii', $workspaceId, $evidenceId);
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

        if (isset($filters['source']) && $filters['source'] !== '') {
            $conditions[] = 'source = ?';
            $types .= 's';
            $params[] = (string) $filters['source'];
        }

        if (isset($filters['evidence_type']) && $filters['evidence_type'] !== '') {
            $conditions[] = 'evidence_type = ?';
            $types .= 's';
            $params[] = (string) $filters['evidence_type'];
        }

        $where = implode(' AND ', $conditions);
        $offset = max(0, ($page - 1) * $perPage);

        $countStatement = $this->database->prepare("SELECT COUNT(*) AS total FROM evidence_items WHERE $where");
        $this->bindDynamic($countStatement, $types, $params);
        $countStatement->execute();
        $total = (int) ($countStatement->get_result()->fetch_assoc()['total'] ?? 0);

        $listStatement = $this->database->prepare(
            "SELECT * FROM evidence_items WHERE $where ORDER BY captured_at DESC LIMIT ? OFFSET ?"
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

    /** @return array<int, array> Evidence rows linked to a Signal, newest first. */
    public function listForSignal(int $workspaceId, int $signalId): array
    {
        $statement = $this->database->prepare(
            'SELECT e.*, sel.relationship_type
             FROM signal_evidence_links sel
             INNER JOIN evidence_items e ON e.id = sel.evidence_id
             WHERE sel.workspace_id = ? AND sel.signal_id = ?
             ORDER BY e.captured_at DESC'
        );
        $statement->bind_param('ii', $workspaceId, $signalId);
        $statement->execute();
        return $statement->get_result()->fetch_all(MYSQLI_ASSOC);
    }

    /**
     * INSERT IGNORE on (signal_id, evidence_id) -- re-running detection for
     * an already-linked pair is a silent no-op, not a duplicate row. Returns
     * true only if a new link was actually created.
     */
    public function linkSignalEvidence(int $workspaceId, int $signalId, int $evidenceId, string $relationshipType): bool
    {
        $statement = $this->database->prepare(
            'INSERT IGNORE INTO signal_evidence_links (workspace_id, signal_id, evidence_id, relationship_type)
             VALUES (?, ?, ?, ?)'
        );
        $statement->bind_param('iiis', $workspaceId, $signalId, $evidenceId, $relationshipType);
        $statement->execute();
        return $this->database->affected_rows > 0;
    }

    private function bindDynamic(\mysqli_stmt $statement, string $types, array $params): void
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
