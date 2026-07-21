<?php

declare(strict_types=1);

namespace HighlightSignal\Workspace;

use mysqli;

final class WorkspaceRepository
{
    private $database;

    public function __construct(mysqli $database)
    {
        $this->database = $database;
    }

    public function listForMember(int $memberId): array
    {
        $statement = $this->database->prepare(
            "SELECT
                w.id,
                w.public_id,
                w.name,
                w.slug,
                w.status,
                wm.role,
                ws.locale,
                ws.timezone
             FROM workspace_members wm
             INNER JOIN workspaces w ON w.id = wm.workspace_id
             LEFT JOIN workspace_settings ws ON ws.workspace_id = w.id
             WHERE wm.member_id = ?
               AND wm.status = 'active'
               AND w.status IN ('active', 'trial')
               AND w.deleted_at IS NULL
             ORDER BY (wm.role = 'owner') DESC, w.created_at ASC"
        );
        $statement->bind_param('i', $memberId);
        $statement->execute();
        $rows = $statement->get_result()->fetch_all(MYSQLI_ASSOC);

        foreach ($rows as &$row) {
            $row['id'] = (int) $row['id'];
            $row['public_id'] = (string) $row['public_id'];
            $row['name'] = (string) $row['name'];
            $row['slug'] = (string) $row['slug'];
            $row['status'] = (string) $row['status'];
            $row['role'] = (string) $row['role'];
            $row['locale'] = $row['locale'] === null ? 'zh-TW' : (string) $row['locale'];
            $row['timezone'] = $row['timezone'] === null ? 'Asia/Taipei' : (string) $row['timezone'];
        }
        unset($row);

        return $rows;
    }
}
