<?php

declare(strict_types=1);

use HighlightSignal\Workspace\AuthorizationException;
use HighlightSignal\Workspace\WorkspaceAccessPolicy;
use HighlightSignal\Workspace\WorkspacePermissions;

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . "/../db_connect.php";
require_once __DIR__ . "/../legacy_auth.php";

$input = json_decode(file_get_contents("php://input"), true);
$user_id = hs_require_service_member($conn, $input['user_id'] ?? 0);

if ($user_id <= 0) {
    echo json_encode([
        'success' => false,
        'message' => 'user_id 錯誤'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// V09-08: ga_report_schedules/*.php never picked up the V09-03/04 workspace_id
// migration -- this resolves the caller's workspace server-side (active
// membership required) and requires it below, rather than trusting user_id
// alone as the tenant boundary.
$workspace_id = hs_resolve_member_workspace_id($conn, $user_id);

try {
    $membership = (new WorkspaceAccessPolicy($conn))->requireActiveMembership($workspace_id, $user_id);
    WorkspacePermissions::requirePermission($membership, 'read');
} catch (AuthorizationException $error) {
    echo json_encode([
        'success' => false,
        'message' => 'Workspace access denied.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$stmt = $conn->prepare("
SELECT
    r.*,
    GROUP_CONCAT(c.id ORDER BY c.id ASC) AS connection_id_list,
    GROUP_CONCAT(c.account_name ORDER BY c.id ASC SEPARATOR '|||') AS connection_name_list
FROM ga_report_schedules r
LEFT JOIN ga_connections c
    ON c.workspace_id = r.workspace_id
   AND FIND_IN_SET(
        c.id,
        REPLACE(REPLACE(REPLACE(REPLACE(r.connection_ids, '\"', ''), '[', ''), ']', ''), ' ', '')
   )
WHERE r.user_id = ? AND r.workspace_id = ?
GROUP BY r.id
ORDER BY r.id DESC
");

if (!$stmt) {
    echo json_encode([
        'success' => false,
        'message' => 'SQL 錯誤',
        'error' => $conn->error
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$stmt->bind_param('ii', $user_id, $workspace_id);
$stmt->execute();
$result = $stmt->get_result();

if (!$result) {
    echo json_encode([
        'success' => false,
        'message' => 'SQL 錯誤',
        'error' => $conn->error
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$rows = [];

while ($row = $result->fetch_assoc()) {
    $row['connection_ids'] = json_decode($row['connection_ids'] ?: '[]', true);
    if (!is_array($row['connection_ids'])) {
        $row['connection_ids'] = [];
    }

    $row['email_list'] = json_decode($row['email_list'] ?? '[]', true);
    if (!is_array($row['email_list'])) {
        $row['email_list'] = [];
    }

    $row['section_list'] = json_decode($row['section_list'] ?? '[]', true);
    if (!is_array($row['section_list'])) {
        $row['section_list'] = [];
    }

    $row['connection_names'] = !empty($row['connection_name_list'])
        ? explode('|||', $row['connection_name_list'])
        : [];

    unset($row['connection_id_list'], $row['connection_name_list']);

    $rows[] = $row;
}

echo json_encode([
    'success' => true,
    'data' => $rows
], JSON_UNESCAPED_UNICODE);
