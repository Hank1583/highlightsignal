<?php

declare(strict_types=1);

namespace HighlightSignal\Workspace;

use mysqli;
use mysqli_sql_exception;
use RuntimeException;
use Throwable;

/**
 * The only place that creates a member's first Workspace (V09-02). Never
 * invoked as a side effect of a read — WorkspaceService::listForMember() is
 * purely read-only. Each call is its own transaction with a bounded slug-
 * collision retry.
 */
final class WorkspaceProvisioningService
{
    const MAX_SLUG_ATTEMPTS = 5;

    private $database;

    public function __construct(mysqli $database)
    {
        $this->database = $database;
    }

    /** @return array{id: int, public_id: string, name: string, slug: string} */
    public function provisionDefaultForNewMember(int $memberId): array
    {
        $mapped = $this->database->prepare(
            'SELECT workspace_id FROM legacy_member_workspace_map WHERE member_id = ? LIMIT 1'
        );
        $mapped->bind_param('i', $memberId);
        $mapped->execute();
        $existing = $mapped->get_result()->fetch_assoc();

        if (is_array($existing)) {
            throw new WorkspaceAlreadyProvisionedException(sprintf(
                'Member %d already has a default Workspace; provisioning is one-time, not repeatable.',
                $memberId
            ));
        }

        $lastError = null;
        for ($attempt = 0; $attempt < self::MAX_SLUG_ATTEMPTS; $attempt++) {
            $slug = $attempt === 0
                ? ('member-' . $memberId)
                : ('member-' . $memberId . '-' . bin2hex(random_bytes(3)));

            $this->database->begin_transaction();
            try {
                $publicId = $this->uuid();
                $name = 'My Workspace';
                $workspace = $this->database->prepare(
                    'INSERT INTO workspaces (public_id, owner_member_id, name, slug, status) ' .
                    "VALUES (?, ?, ?, ?, 'active')"
                );
                $workspace->bind_param('siss', $publicId, $memberId, $name, $slug);
                $workspace->execute();
                $workspaceId = (int) $workspace->insert_id;

                $role = 'owner';
                $status = 'active';
                $membership = $this->database->prepare(
                    'INSERT INTO workspace_members (workspace_id, member_id, role, status, invited_at, joined_at) ' .
                    'VALUES (?, ?, ?, ?, NOW(), NOW())'
                );
                $membership->bind_param('iiss', $workspaceId, $memberId, $role, $status);
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

                return array(
                    'id' => $workspaceId,
                    'public_id' => $publicId,
                    'name' => $name,
                    'slug' => $slug,
                );
            } catch (Throwable $error) {
                $this->database->rollback();

                if ($this->isDuplicateKeyOn($error, 'uk_workspaces_slug') && $attempt < self::MAX_SLUG_ATTEMPTS - 1) {
                    $lastError = $error;
                    continue;
                }

                if ($this->isDuplicateKeyError($error)) {
                    // Not a slug clash: some other unique constraint (most likely
                    // legacy_member_workspace_map's member_id primary key) already has
                    // a row for this member — a concurrent call already provisioned
                    // them. Surface that distinctly rather than retrying forever.
                    throw new WorkspaceAlreadyProvisionedException(sprintf(
                        'Member %d already has a default Workspace (provisioned concurrently).',
                        $memberId
                    ), 0, $error);
                }

                throw $error;
            }
        }

        throw new RuntimeException(sprintf(
            'Unable to provision a Workspace for member %d after %d slug collisions.',
            $memberId,
            self::MAX_SLUG_ATTEMPTS
        ), 0, $lastError);
    }

    private function isDuplicateKeyError(Throwable $error): bool
    {
        return $error instanceof mysqli_sql_exception && (int) $error->getCode() === 1062;
    }

    private function isDuplicateKeyOn(Throwable $error, string $keyName): bool
    {
        return $this->isDuplicateKeyError($error) && strpos($error->getMessage(), $keyName) !== false;
    }

    private function uuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
        $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
