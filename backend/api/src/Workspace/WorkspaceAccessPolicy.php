<?php

declare(strict_types=1);

namespace HighlightSignal\Workspace;

use mysqli;

final class WorkspaceAccessPolicy
{
    private $database;

    public function __construct(mysqli $database)
    {
        $this->database = $database;
    }

    /** @return array{workspace_id: int, member_id: int, role: string, status: string} */
    public function requireActiveMembership(int $workspaceId, int $memberId): array
    {
        $statement = $this->database->prepare(
            "SELECT wm.workspace_id, wm.member_id, wm.role, wm.status,
                    COALESCE(lmwm.member_id, wm.member_id) AS legacy_owner_member_id
             FROM workspace_members wm
             LEFT JOIN legacy_member_workspace_map lmwm
               ON lmwm.workspace_id = wm.workspace_id
             WHERE wm.workspace_id = ? AND wm.member_id = ? AND wm.status = 'active'
             LIMIT 1"
        );
        $statement->bind_param('ii', $workspaceId, $memberId);
        $statement->execute();
        $row = $statement->get_result()->fetch_assoc();

        if (!is_array($row)) {
            throw new AuthorizationException('Workspace access denied.');
        }

        return [
            'workspace_id' => (int) $row['workspace_id'],
            'member_id' => (int) $row['member_id'],
            'role' => (string) $row['role'],
            'status' => (string) $row['status'],
            'legacy_owner_member_id' => (int) $row['legacy_owner_member_id'],
        ];
    }
}
