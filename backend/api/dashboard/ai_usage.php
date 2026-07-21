<?php

declare(strict_types=1);

$helperPath = __DIR__ . '/../api_helpers.php';
require_once $helperPath;

$dbPath = __DIR__ . '/../db_connect.php';
if (!is_file($dbPath)) {
    hs_json(['ok' => false, 'message' => 'Dashboard AI usage API missing db_connect.php.'], 500);
}

require_once $dbPath;

function dashboard_usage_db(): mysqli
{
    global $conn;

    if (!($conn instanceof mysqli)) {
        hs_json(['ok' => false, 'message' => 'Database connection is not available.'], 500);
    }

    $conn->set_charset('utf8mb4');
    return $conn;
}

function dashboard_usage_ensure_table(mysqli $conn)
{
    // dashboard_ai_logs is provisioned by backend/sql/migrations/013_runtime_ddl_extraction.sql;
    // this is intentionally a no-op so callers can keep calling it defensively.
}

function dashboard_usage_count(mysqli $conn, int $userId, int $workspaceId): int
{
    dashboard_usage_ensure_table($conn);

    $stmt = $conn->prepare(
        "SELECT COUNT(*) AS total
         FROM dashboard_ai_logs
         WHERE user_id = ?
           AND workspace_id = ?
           AND status = 'success'
           AND model = 'next-dashboard-ai'
           AND created_at >= CURDATE()
           AND created_at < DATE_ADD(CURDATE(), INTERVAL 1 DAY)"
    );

    if (!$stmt) {
        return 0;
    }

    $stmt->bind_param('ii', $userId, $workspaceId);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result ? $result->fetch_assoc() : null;

    return (int)($row['total'] ?? 0);
}

function dashboard_usage_record(mysqli $conn, int $userId, int $workspaceId, array $input)
{
    dashboard_usage_ensure_table($conn);

    $question = trim((string)($input['question'] ?? ''));
    $lens = (string)($input['lens'] ?? 'overview');
    $contextJson = json_encode($input['context'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $responseJson = json_encode($input['response'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $model = 'next-dashboard-ai';
    $status = 'success';
    $source = (string)($input['source'] ?? '');

    $stmt = $conn->prepare(
        'INSERT INTO dashboard_ai_logs
         (user_id, workspace_id, question, lens, context_json, response_json, model, status, error_message)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );

    if (!$stmt) {
        return;
    }

    $stmt->bind_param('iisssssss', $userId, $workspaceId, $question, $lens, $contextJson, $responseJson, $model, $status, $source);
    $stmt->execute();
}

$input = hs_input();
$userId = hs_member_id($input);
// V09-04: resolved server-side, not the signed x-hs-workspace-id header --
// see legacy_auth.php's hs_resolve_member_workspace_id() for why.
$workspaceId = hs_member_workspace_id($userId);
$limit = max(1, min(500, (int)($input['limit'] ?? 3)));
$action = (string)($input['action'] ?? 'check');
$conn = dashboard_usage_db();

if ($action === 'record') {
    dashboard_usage_record($conn, $userId, $workspaceId, $input);
}

$used = dashboard_usage_count($conn, $userId, $workspaceId);
$remaining = max(0, $limit - $used);

hs_json([
    'ok' => true,
    'allowed' => $remaining > 0,
    'used' => $used,
    'limit' => $limit,
    'remaining' => $remaining,
]);
