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

    public function ensureDefaultForMember(int $memberId)
    {
        $this->database->begin_transaction();
        try {
            $mapped = $this->database->prepare(
                'SELECT workspace_id FROM legacy_member_workspace_map WHERE member_id = ? LIMIT 1'
            );
            $mapped->bind_param('i', $memberId);
            $mapped->execute();
            $row = $mapped->get_result()->fetch_assoc();

            if (is_array($row)) {
                $workspaceId = (int) $row['workspace_id'];
                $role = 'owner';
                $status = 'active';
                $membership = $this->database->prepare(
                    'INSERT INTO workspace_members (workspace_id, member_id, role, status, joined_at)
                     VALUES (?, ?, ?, ?, NOW())
                     ON DUPLICATE KEY UPDATE role = VALUES(role), status = VALUES(status), joined_at = COALESCE(joined_at, NOW())'
                );
                $membership->bind_param('iiss', $workspaceId, $memberId, $role, $status);
                $membership->execute();
                $this->database->commit();
                return;
            }

            $publicId = $this->uuid();
            $name = 'My Workspace';
            $slug = 'member-' . $memberId;
            $workspace = $this->database->prepare(
                'INSERT INTO workspaces (public_id, owner_member_id, name, slug, status)
                 VALUES (?, ?, ?, ?, \'active\')'
            );
            $workspace->bind_param('siss', $publicId, $memberId, $name, $slug);
            $workspace->execute();
            $workspaceId = (int) $workspace->insert_id;

            $role = 'owner';
            $memberStatus = 'active';
            $membership = $this->database->prepare(
                'INSERT INTO workspace_members (workspace_id, member_id, role, status, joined_at)
                 VALUES (?, ?, ?, ?, NOW())'
            );
            $membership->bind_param('iiss', $workspaceId, $memberId, $role, $memberStatus);
            $membership->execute();

            $locale = 'zh-TW';
            $timezone = 'Asia/Taipei';
            $settings = $this->database->prepare(
                'INSERT INTO workspace_settings (workspace_id, locale, timezone) VALUES (?, ?, ?)'
            );
            $settings->bind_param('iss', $workspaceId, $locale, $timezone);
            $settings->execute();

            $mapping = $this->database->prepare(
                'INSERT INTO legacy_member_workspace_map (member_id, workspace_id) VALUES (?, ?)'
            );
            $mapping->bind_param('ii', $memberId, $workspaceId);
            $mapping->execute();
            $this->database->commit();
        } catch (\Throwable $error) {
            $this->database->rollback();
            throw $error;
        }
    }

    private function uuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
        $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
