<?php

declare(strict_types=1);

$helperPath = __DIR__ . '/../api_helpers.php';
require_once $helperPath;

$dbPath = __DIR__ . '/../db_connect.php';
if (!is_file($dbPath)) {
    hs_json(['ok' => false, 'message' => 'Dashboard AI planner missing db_connect.php.'], 500);
}

require_once $dbPath;

function dashboard_plan_db(): mysqli
{
    global $conn;

    if (!($conn instanceof mysqli)) {
        hs_json(['ok' => false, 'message' => 'Database connection is not available.'], 500);
    }

    $conn->set_charset('utf8mb4');
    return $conn;
}

function dashboard_plan_config(string $constant, string $env, string $fallback = ''): string
{
    if (defined($constant)) {
        return (string)constant($constant);
    }

    $value = getenv($env);
    return $value !== false && $value !== '' ? (string)$value : $fallback;
}

function dashboard_plan_ai_enabled(): bool
{
    return dashboard_plan_config('SI_AI_API_KEY', 'SI_AI_API_KEY', '') !== ''
        && dashboard_plan_config('SI_AI_MODEL', 'SI_AI_MODEL', '') !== ''
        && function_exists('curl_init');
}

function dashboard_plan_requested_days(string $question): int
{
    if (preg_match('/(\d+)\s*(天|日|days?)/iu', $question, $matches)) {
        return max(1, min(365, (int)$matches[1]));
    }

    return 30;
}

function dashboard_plan_fallback(string $question): array
{
    $days = dashboard_plan_requested_days($question);
    $lower = strtolower($question);
    $modules = [
        [
            'id' => 'ai_narrative',
            'title' => 'AI 分析方向',
            'dataSource' => 'ai.narrative',
            'params' => [],
        ],
        [
            'id' => 'ga_kpi_summary',
            'title' => 'GA 核心指標',
            'dataSource' => 'ga.summary',
            'params' => ['metrics' => ['users', 'sessions', 'conversions']],
        ],
    ];

    if (strpos($lower, 'seo') !== false) {
        $modules[] = [
            'id' => 'seo_health_summary',
            'title' => 'SEO 健康狀態',
            'dataSource' => 'seo.summary',
            'params' => [],
        ];
        $modules[] = [
            'id' => 'seo_issue_list',
            'title' => 'SEO 待處理問題',
            'dataSource' => 'seo.issues',
            'params' => [],
        ];
    } else {
        $modules[] = [
            'id' => 'ga_trend_chart',
            'title' => '用戶與會話趨勢',
            'dataSource' => 'ga.daily',
            'params' => ['metrics' => ['users', 'sessions']],
        ];
    }

    $modules[] = [
        'id' => 'ai_recommended_actions',
        'title' => 'AI 建議行動',
        'dataSource' => 'ai.actions',
        'params' => [],
    ];

    return [
        'intent' => 'dashboard_analysis',
        'range' => ['type' => 'relative', 'days' => $days],
        'narrative' => [
            'title' => 'AI 分析方向',
            'text' => 'AI 會先選擇需要顯示的 dashboard 模塊，再由系統取得真實 GA 與 SEO 資料。',
        ],
        'modules' => $modules,
    ];
}

function dashboard_plan_allowed_modules(): array
{
    return [
        'ai_narrative',
        'ga_kpi_summary',
        'ga_trend_chart',
        'ga_conversion_summary',
        'seo_health_summary',
        'seo_issue_list',
        'seo_opportunity_list',
        'ai_recommended_actions',
    ];
}

function dashboard_plan_validate($plan): bool
{
    if (!is_array($plan) || empty($plan['modules']) || !is_array($plan['modules'])) {
        return false;
    }

    $allowed = dashboard_plan_allowed_modules();
    foreach ($plan['modules'] as $module) {
        if (!is_array($module) || empty($module['id']) || !in_array((string)$module['id'], $allowed, true)) {
            return false;
        }
    }

    return true;
}

function dashboard_plan_ai(string $question)
{
    if (!dashboard_plan_ai_enabled()) {
        return null;
    }

    $apiKey = dashboard_plan_config('SI_AI_API_KEY', 'SI_AI_API_KEY', '');
    $model = dashboard_plan_config('SI_AI_MODEL', 'SI_AI_MODEL', 'gpt-4.1-mini');
    $url = dashboard_plan_config('SI_AI_API_URL', 'SI_AI_API_URL', 'https://api.openai.com/v1/chat/completions');

    $messages = [
        [
            'role' => 'system',
            'content' => '你是 Highlight Signal 的 Dashboard Planner。你只能回傳 JSON 組裝計畫，不可以回傳任何 GA/SEO 數字、chart bars、假資料或 Markdown。你只能從 allowedModules 選 module id。module 需要包含 id、title、dataSource、params。range.days 要根據問題判斷，預設 30。dataSource 可用 ai.narrative、ai.actions、ga.summary、ga.daily、ga.conversions、seo.summary、seo.issues、seo.opportunities。',
        ],
        [
            'role' => 'user',
            'content' => json_encode([
                'question' => $question,
                'allowedModules' => dashboard_plan_allowed_modules(),
                'requiredShape' => [
                    'intent' => 'string',
                    'range' => ['type' => 'relative', 'days' => 'number'],
                    'narrative' => ['title' => 'string', 'text' => 'string'],
                    'modules' => [
                        ['id' => 'allowed module id', 'title' => 'string', 'dataSource' => 'string', 'params' => new stdClass()],
                    ],
                ],
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ],
    ];

    $payload = [
        'model' => $model,
        'messages' => $messages,
        'temperature' => 0.1,
        'response_format' => ['type' => 'json_object'],
    ];

    $ch = curl_init($url);
    if (!$ch) {
        return null;
    }

    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 20);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey,
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

    $raw = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($raw === false || $status < 200 || $status >= 300) {
        return null;
    }

    $json = json_decode((string)$raw, true);
    $content = $json['choices'][0]['message']['content'] ?? '';
    $plan = json_decode((string)$content, true);

    return dashboard_plan_validate($plan) ? $plan : null;
}

function dashboard_plan_ensure_table(mysqli $conn)
{
    $sql = "CREATE TABLE IF NOT EXISTS dashboard_ai_plan_logs (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
        question TEXT NOT NULL,
        plan_json LONGTEXT NULL,
        model VARCHAR(80) NULL,
        source VARCHAR(30) NOT NULL DEFAULT 'ai',
        status VARCHAR(30) NOT NULL DEFAULT 'success',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_dashboard_ai_plan_logs_user_created (user_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

    $conn->query($sql);
}

function dashboard_plan_cache(mysqli $conn, int $userId, string $question)
{
    dashboard_plan_ensure_table($conn);

    $stmt = $conn->prepare(
        "SELECT plan_json, model, created_at
         FROM dashboard_ai_plan_logs
         WHERE user_id = ?
           AND question = ?
           AND status = 'success'
           AND created_at >= CURDATE()
           AND created_at < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
         ORDER BY id DESC
         LIMIT 1"
    );

    if (!$stmt) {
        return null;
    }

    $stmt->bind_param('is', $userId, $question);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result ? $result->fetch_assoc() : null;

    if (!$row || empty($row['plan_json'])) {
        return null;
    }

    $plan = json_decode((string)$row['plan_json'], true);
    if (!dashboard_plan_validate($plan)) {
        return null;
    }

    return [
        'ok' => true,
        'source' => 'cache',
        'cached' => true,
        'cached_at' => (string)($row['created_at'] ?? ''),
        'cached_model' => (string)($row['model'] ?? ''),
        'plan' => $plan,
    ];
}

function dashboard_plan_log(mysqli $conn, int $userId, string $question, array $plan, string $source)
{
    dashboard_plan_ensure_table($conn);

    $planJson = json_encode($plan, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $model = dashboard_plan_config('SI_AI_MODEL', 'SI_AI_MODEL', 'rule-plan');
    $status = 'success';

    $stmt = $conn->prepare(
        'INSERT INTO dashboard_ai_plan_logs
         (user_id, question, plan_json, model, source, status)
         VALUES (?, ?, ?, ?, ?, ?)'
    );

    if (!$stmt) {
        return;
    }

    $stmt->bind_param('isssss', $userId, $question, $planJson, $model, $source, $status);
    $stmt->execute();
}

$input = hs_input();
$user = hs_request_user($input);
$question = trim((string)($input['question'] ?? ''));

if ($question === '') {
    hs_json(['ok' => false, 'message' => 'question is required'], 400);
}

$conn = dashboard_plan_db();
$cached = dashboard_plan_cache($conn, (int)$user['id'], $question);

if ($cached) {
    hs_json($cached);
}

$plan = dashboard_plan_ai($question);
$source = 'ai';

if (!$plan) {
    $plan = dashboard_plan_fallback($question);
    $source = 'rules';
}

dashboard_plan_log($conn, (int)$user['id'], $question, $plan, $source);

hs_json([
    'ok' => true,
    'source' => $source,
    'plan' => $plan,
]);
