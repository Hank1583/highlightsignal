<?php

declare(strict_types=1);

/**
 * V09-08: scopes by workspace_id (resolved server-side for a verified
 * member, active membership required -- see legacy_auth.php's
 * hs_resolve_member_workspace_id()), not member_id. Before this, a report
 * schedule could reference any ga_connections row the caller's own member_id
 * happened to be the legacy owner of, independent of Workspace membership --
 * the same "member_id === workspace_id" guess V09-03/04 already ruled out for
 * ga_connections itself (GaIntegrationRepository queries it by workspace_id
 * directly, never owner_member_id). This aligns the connection_ids ownership
 * check used by ga_report_save.php/ga_report_update.php/data_sync.php with
 * that same boundary.
 */
function ga_require_connection_ownership(mysqli $database, $workspaceId, array $connectionIds)
{
    $ids = array_values(array_unique(array_filter(array_map('intval', $connectionIds), static function ($id) {
        return $id > 0;
    })));

    if (count($ids) === 0) {
        return $ids;
    }

    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $statement = $database->prepare(
        "SELECT COUNT(*) AS total FROM ga_connections WHERE workspace_id = ? AND id IN ($placeholders)"
    );
    if (!$statement) {
        hs_legacy_auth_error('DATABASE_ERROR', 'Database operation failed.', 500);
    }

    $types = 'i' . str_repeat('i', count($ids));
    $params = array_merge(array((int) $workspaceId), $ids);
    $bindArguments = array($types);
    foreach ($params as $index => $value) {
        $bindArguments[] = &$params[$index];
    }
    call_user_func_array(array($statement, 'bind_param'), $bindArguments);
    $statement->execute();
    $row = $statement->get_result()->fetch_assoc();

    if ((int) ($row['total'] ?? 0) !== count($ids)) {
        hs_legacy_auth_error('FORBIDDEN', 'Connection access denied.', 403);
    }

    return $ids;
}
