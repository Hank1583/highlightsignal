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
    $sql = "CREATE TABLE IF NOT EXISTS dashboard_ai_logs (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
        question TEXT NOT NULL,
        lens VARCHAR(40) NOT NULL DEFAULT 'overview',
        context_json LONGTEXT NULL,
        response_json LONGTEXT NULL,
        model VARCHAR(80) NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'success',
        error_message TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_dashboard_ai_logs_user_created (user_id, created_at),
        KEY idx_dashboard_ai_logs_lens (lens)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

    $conn->query($sql);
}

function dashboard_usage_count(mysqli $conn, int $userId): int
{
    dashboard_usage_ensure_table($conn);

    $stmt = $conn->prepare(
        "SELECT COUNT(*) AS total
         FROM dashboard_ai_logs
         WHERE user_id = ?
           AND status = 'success'
           AND model = 'next-dashboard-ai'
           AND created_at >= CURDATE()
           AND created_at < DATE_ADD(CURDATE(), INTERVAL 1 DAY)"
    );

    if (!$stmt) {
        return 0;
    }

    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result ? $result->fetch_assoc() : null;

    return (int)($row['total'] ?? 0);
}

function dashboard_usage_record(mysqli $conn, int $userId, array $input)
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
         (user_id, question, lens, context_json, response_json, model, status, error_message)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );

    if (!$stmt) {
        return;
    }

    $stmt->bind_param('isssssss', $userId, $question, $lens, $contextJson, $responseJson, $model, $status, $source);
    $stmt->execute();
}

$input = hs_input();
$userId = hs_member_id($input);
$limit = max(1, min(500, (int)($input['limit'] ?? 3)));
$action = (string)($input['action'] ?? 'check');
$conn = dashboard_usage_db();

if ($action === 'record') {
    dashboard_usage_record($conn, $userId, $input);
}

$used = dashboard_usage_count($conn, $userId);
$remaining = max(0, $limit - $used);

hs_json([
    'ok' => true,
    'allowed' => $remaining > 0,
    'used' => $used,
    'limit' => $limit,
    'remaining' => $remaining,
]);
