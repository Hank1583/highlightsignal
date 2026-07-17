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
        $sql = "SELECT gc.id, gc.property_id, gc.account_name, gc.status
                FROM ga_connections gc
                INNER JOIN workspaces w ON w.owner_member_id = gc.member_id
                WHERE w.id = ? AND w.deleted_at IS NULL";

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
        $ownerStatement = $this->database->prepare(
            'SELECT owner_member_id FROM workspaces WHERE id = ? AND deleted_at IS NULL LIMIT 1'
        );
        $ownerStatement->bind_param('i', $workspaceId);
        $ownerStatement->execute();
        $workspace = $ownerStatement->get_result()->fetch_assoc();

        if (!is_array($workspace)) {
            throw new NotFoundException('Workspace not found.');
        }

        $ownerMemberId = (int) $workspace['owner_member_id'];
        $update = $this->database->prepare(
            'UPDATE ga_connections SET status = ? WHERE id = ? AND member_id = ?'
        );
        $update->bind_param('iii', $status, $connectionId, $ownerMemberId);
        $update->execute();

        $select = $this->database->prepare(
            'SELECT id, property_id, account_name, status FROM ga_connections WHERE id = ? AND member_id = ? LIMIT 1'
        );
        $select->bind_param('ii', $connectionId, $ownerMemberId);
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
