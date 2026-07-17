<?php

declare(strict_types=1);

function ga_require_connection_ownership(mysqli $database, $memberId, array $connectionIds)
{
    $ids = array_values(array_unique(array_filter(array_map('intval', $connectionIds), static function ($id) {
        return $id > 0;
    })));

    if (count($ids) === 0) {
        return $ids;
    }

    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $statement = $database->prepare(
        "SELECT COUNT(*) AS total FROM ga_connections WHERE member_id = ? AND id IN ($placeholders)"
    );
    if (!$statement) {
        hs_legacy_auth_error('DATABASE_ERROR', 'Database operation failed.', 500);
    }

    $types = 'i' . str_repeat('i', count($ids));
    $params = array_merge(array((int) $memberId), $ids);
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
