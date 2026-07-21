<?php

declare(strict_types=1);

namespace HighlightSignal\Integration\GoogleAnalytics;

use HighlightSignal\Http\NotFoundException;
use mysqli;

final class GaIntegrationRepository
{
    private $database;

    public function __construct(mysqli $database)
    {
        $this->database = $database;
    }

    public function listByWorkspace(int $workspaceId, bool $includeInactive): array
    {
        // V09-03: scoped directly by ga_connections.workspace_id (backfilled by
        // migrations/016) rather than joining through workspaces.owner_member_id, which
        // was wrong for any member of a workspace they don't own.
        $sql = 'SELECT gc.id, gc.property_id, gc.account_name, gc.status
                FROM ga_connections gc
                INNER JOIN workspaces w ON w.id = gc.workspace_id
                WHERE gc.workspace_id = ? AND w.deleted_at IS NULL';

        if (!$includeInactive) {
            $sql .= ' AND gc.status = 1';
        }

        $sql .= ' ORDER BY gc.created_at DESC';
        $statement = $this->database->prepare($sql);
        $statement->bind_param('i', $workspaceId);
        $statement->execute();

        $rows = $statement->get_result()->fetch_all(MYSQLI_ASSOC);
        foreach ($rows as &$row) {
            $row['id'] = (int) $row['id'];
            $row['status'] = (int) $row['status'];
        }
        unset($row);

        return $rows;
    }

    public function updateStatus(int $workspaceId, int $connectionId, int $status): array
    {
        $workspaceStatement = $this->database->prepare(
            'SELECT id FROM workspaces WHERE id = ? AND deleted_at IS NULL LIMIT 1'
        );
        $workspaceStatement->bind_param('i', $workspaceId);
        $workspaceStatement->execute();
        $workspace = $workspaceStatement->get_result()->fetch_assoc();

        if (!is_array($workspace)) {
            throw new NotFoundException('Workspace not found.');
        }

        $update = $this->database->prepare(
            'UPDATE ga_connections SET status = ? WHERE id = ? AND workspace_id = ?'
        );
        $update->bind_param('iii', $status, $connectionId, $workspaceId);
        $update->execute();

        $select = $this->database->prepare(
            'SELECT id, property_id, account_name, status FROM ga_connections WHERE id = ? AND workspace_id = ? LIMIT 1'
        );
        $select->bind_param('ii', $connectionId, $workspaceId);
        $select->execute();
        $row = $select->get_result()->fetch_assoc();

        if (!is_array($row)) {
            throw new NotFoundException('GA connection not found.');
        }

        return array(
            'id' => (int) $row['id'],
            'property_id' => (string) $row['property_id'],
            'account_name' => (string) $row['account_name'],
            'status' => (int) $row['status'],
        );
    }
}
