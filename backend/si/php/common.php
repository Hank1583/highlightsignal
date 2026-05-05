<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, X-Member-Id, X-Member-Email, X-Member-Name, X-Member-Role, X-Enabled-Products');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function si_json(array $payload, int $status = 200)
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function si_input(): array
{
    $raw = file_get_contents('php://input');

    if (!$raw) {
        return [];
    }

    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

$dbConnectPath = __DIR__ . '/../db_connect.php';

if (!file_exists($dbConnectPath)) {
    si_json([
        'ok' => false,
        'error' => [
            'code' => 'DB_CONFIG_NOT_FOUND',
            'message' => 'db_connect.php not found.',
        ],
    ], 500);
}

require_once $dbConnectPath;

function si_db(): mysqli
{
    global $conn;

    if (!($conn instanceof mysqli)) {
        si_json([
            'ok' => false,
            'error' => [
                'code' => 'DB_NOT_READY',
                'message' => 'Database connection is not available.',
            ],
        ], 500);
    }

    $conn->set_charset('utf8mb4');
    return $conn;
}

function si_success(array $data = [])
{
    si_json([
        'ok' => true,
        'data' => $data,
    ]);
}

function si_fail(string $code, string $message, int $status = 400)
{
    si_json([
        'ok' => false,
        'error' => [
            'code' => $code,
            'message' => $message,
        ],
    ], $status);
}

function si_positive_int(array $data, string $key): int
{
    $value = isset($data[$key]) ? (int)$data[$key] : 0;

    if ($value <= 0) {
        si_fail('MISSING_' . strtoupper($key), $key . ' is required.', 400);
    }

    return $value;
}

function si_clean_key($value, string $fallback = 'overview'): string
{
    $value = $value ?: $fallback;
    return preg_match('/^[a-zA-Z0-9_-]{1,40}$/', $value) ? $value : $fallback;
}

function si_latest_summary(string $module, int $userId, int $siteId, string $tabKey): array
{
    $conn = si_db();

    $stmt = $conn->prepare(
        'SELECT r.*, s.site_name, s.site_url
         FROM si_analysis_runs r
         INNER JOIN si_sites s ON s.id = r.site_id
         WHERE r.user_id = ?
           AND r.site_id = ?
           AND r.module = ?
           AND r.tab_key = ?
           AND s.is_active = 1
         ORDER BY r.analyzed_at DESC, r.id DESC
         LIMIT 1'
    );

    if (!$stmt) {
        si_fail('SQL_PREPARE_FAILED', $conn->error, 500);
    }

    $stmt->bind_param('iiss', $userId, $siteId, $module, $tabKey);
    $stmt->execute();
    $run = $stmt->get_result()->fetch_assoc();

    if (!$run) {
        return [
            'module' => $module,
            'tab' => $tabKey,
            'site' => null,
            'title' => '',
            'desc' => '',
            'metrics' => [],
            'panelTitle' => '',
            'items' => [],
            'actions' => [],
            'sideTitle' => '',
            'sideItems' => [],
            'recommendation' => '',
            'meta' => [
                'source' => 'empty',
                'analyzed_at' => null,
            ],
        ];
    }

    $runId = (int)$run['id'];

    return [
        'module' => $module,
        'tab' => $tabKey,
        'site' => [
            'id' => (int)$run['site_id'],
            'name' => $run['site_name'],
            'url' => $run['site_url'],
        ],
        'title' => $run['title'],
        'desc' => $run['description'] ?? '',
        'metrics' => si_rows_for('si_analysis_metrics', $runId, 'si_metric_mapper'),
        'panelTitle' => $run['panel_title'] ?? '',
        'items' => si_rows_for('si_analysis_items', $runId, 'si_item_mapper'),
        'actions' => array_map(
            'si_action_mapper',
            si_rows_for('si_analysis_actions', $runId, null)
        ),
        'sideTitle' => $run['side_title'] ?? '',
        'sideItems' => si_rows_for('si_analysis_side_items', $runId, 'si_side_item_mapper'),
        'recommendation' => $run['recommendation'] ?? '',
        'meta' => [
            'source' => $run['source'],
            'status' => $run['status'],
            'analyzed_at' => $run['analyzed_at'],
        ],
    ];
}

function si_rows_for(string $table, int $runId, $mapper): array
{
    $allowed = [
        'si_analysis_metrics',
        'si_analysis_items',
        'si_analysis_actions',
        'si_analysis_side_items',
    ];

    if (!in_array($table, $allowed, true)) {
        si_fail('INVALID_TABLE', 'Invalid internal table.', 500);
    }

    $conn = si_db();
    $stmt = $conn->prepare("SELECT * FROM {$table} WHERE run_id = ? ORDER BY sort_order ASC, id ASC");

    if (!$stmt) {
        si_fail('SQL_PREPARE_FAILED', $conn->error, 500);
    }

    $stmt->bind_param('i', $runId);
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

    return $mapper ? array_map($mapper, $rows) : $rows;
}

function si_metric_mapper(array $row): array
{
    return [
        'label' => $row['label'],
        'value' => $row['value'],
        'note' => $row['note'] ?? '',
        'basis' => $row['basis'] ?? '',
    ];
}

function si_action_mapper(array $row): string
{
    return $row['action_text'];
}

function si_item_mapper(array $row): array
{
    $tags = [];
    $extra = [];

    if (!empty($row['tags_json'])) {
        $decoded = json_decode((string)$row['tags_json'], true);
        if (is_array($decoded)) {
            if (isset($decoded['tags']) && is_array($decoded['tags'])) {
                $tags = array_values($decoded['tags']);
                $extra = $decoded;
                unset($extra['tags']);
            } else {
                $tags = array_values($decoded);
            }
        }
    }

    return array_merge([
        'title' => $row['title'],
        'meta' => $row['meta'] ?? '',
        'status' => $row['status'] ?? '',
        'source' => $row['source'] ?? '',
        'tags' => $tags,
    ], $extra);
}

function si_side_item_mapper(array $row): array
{
    return [
        'name' => $row['name'],
        'score' => (float)$row['score'],
    ];
}
