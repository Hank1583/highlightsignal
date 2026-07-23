<?php

declare(strict_types=1);

namespace HighlightSignal\Audit;

use mysqli;

/**
 * V11-07: read-only, Workspace-scoped access to `audit_logs` -- there is no
 * update/delete method on this class, and none should ever be added (see
 * AuditLogger's own header). This is the ONLY class that ever SELECTs from
 * `audit_logs` for API consumption; incident investigation and operational
 * review both go through `search()`.
 */
final class AuditRepository
{
    private $database;

    public function __construct(mysqli $database)
    {
        $this->database = $database;
    }

    /**
     * @param array{event_type?: string, entity_type?: string, entity_id?: string, actor_member_id?: int, from?: string, to?: string} $filters
     * @return array{items: array<int, array>, total: int}
     */
    public function search(int $workspaceId, array $filters, int $page, int $perPage): array
    {
        $conditions = array('workspace_id = ?');
        $types = 'i';
        $params = array($workspaceId);

        if (isset($filters['event_type']) && $filters['event_type'] !== '') {
            $conditions[] = 'event_type = ?';
            $types .= 's';
            $params[] = (string) $filters['event_type'];
        }
        if (isset($filters['entity_type']) && $filters['entity_type'] !== '') {
            $conditions[] = 'entity_type = ?';
            $types .= 's';
            $params[] = (string) $filters['entity_type'];
        }
        if (isset($filters['entity_id']) && $filters['entity_id'] !== '') {
            $conditions[] = 'entity_id = ?';
            $types .= 's';
            $params[] = (string) $filters['entity_id'];
        }
        if (isset($filters['actor_member_id']) && (int) $filters['actor_member_id'] > 0) {
            $conditions[] = 'actor_member_id = ?';
            $types .= 'i';
            $params[] = (int) $filters['actor_member_id'];
        }
        if (isset($filters['from']) && $filters['from'] !== '') {
            $conditions[] = 'created_at >= ?';
            $types .= 's';
            $params[] = (string) $filters['from'];
        }
        if (isset($filters['to']) && $filters['to'] !== '') {
            $conditions[] = 'created_at <= ?';
            $types .= 's';
            $params[] = (string) $filters['to'];
        }

        $where = implode(' AND ', $conditions);
        $offset = max(0, ($page - 1) * $perPage);

        $countStatement = $this->database->prepare("SELECT COUNT(*) AS total FROM audit_logs WHERE $where");
        $this->bindDynamic($countStatement, $types, $params);
        $countStatement->execute();
        $total = (int) ($countStatement->get_result()->fetch_assoc()['total'] ?? 0);

        $listStatement = $this->database->prepare(
            "SELECT * FROM audit_logs WHERE $where ORDER BY id DESC LIMIT ? OFFSET ?"
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
}
