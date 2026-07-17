<?php

declare(strict_types=1);

$helperPath = __DIR__ . '/../api_helpers.php';
require_once $helperPath;

$dbPath = __DIR__ . '/../db_connect.php';
if (!is_file($dbPath)) {
    hs_json([
        'ok' => false,
        'message' => 'Dashboard AI API missing db_connect.php.',
    ], 500);
}

require_once $dbPath;

function dashboard_db(): mysqli
{
    global $conn;

    if (!($conn instanceof mysqli)) {
        hs_json(['ok' => false, 'message' => 'Database connection is not available.'], 500);
    }

    $conn->set_charset('utf8mb4');
    return $conn;
}

function dashboard_config_value(string $constant, string $env, string $fallback = ''): string
{
    if (defined($constant)) {
        return (string)constant($constant);
    }

    $value = getenv($env);
    return $value !== false && $value !== '' ? (string)$value : $fallback;
}

function dashboard_ai_enabled(): bool
{
    $apiKey = dashboard_config_value('SI_AI_API_KEY', 'SI_AI_API_KEY', '');
    $model = dashboard_config_value('SI_AI_MODEL', 'SI_AI_MODEL', '');

    return $apiKey !== '' && $model !== '' && function_exists('curl_init');
}

function dashboard_contains(string $haystack, string $needle): bool
{
    return $needle !== '' && strpos($haystack, $needle) !== false;
}

function dashboard_lens(string $question): string
{
    $q = strtolower($question);

    if (dashboard_contains($q, '流量') || dashboard_contains($q, 'traffic') || dashboard_contains($q, '下降')) {
        return 'traffic';
    }

    if (dashboard_contains($q, '優先') || dashboard_contains($q, '先做') || dashboard_contains($q, 'priority')) {
        return 'priority';
    }

    if (dashboard_contains($q, 'seo') || dashboard_contains($q, '修復') || dashboard_contains($q, '問題')) {
        return 'seo';
    }

    if (dashboard_contains($q, 'aeo') || dashboard_contains($q, 'geo') || dashboard_contains($q, '曝光') || dashboard_contains($q, 'visibility')) {
        return 'visibility';
    }

    return 'overview';
}

function dashboard_requested_days(string $question): int
{
    if (preg_match('/(\d+)\s*(天|日|days?)/iu', $question, $matches)) {
        return (int)$matches[1];
    }

    return 0;
}

function dashboard_context_days(array $context): int
{
    $rangeLabel = (string)($context['rangeLabel'] ?? '');

    if (!preg_match('/(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})/', $rangeLabel, $matches)) {
        return 0;
    }

    try {
        $start = new DateTime($matches[1]);
        $end = new DateTime($matches[2]);
        return (int)$start->diff($end)->days;
    } catch (Exception $error) {
        return 0;
    }
}

function dashboard_has_range_mismatch(string $question, array $context): bool
{
    $requestedDays = dashboard_requested_days($question);
    $contextDays = dashboard_context_days($context);

    return $requestedDays > 0 && $contextDays > 0 && $requestedDays !== $contextDays;
}

function dashboard_num($value): int
{
    return is_numeric($value) ? (int)$value : 0;
}

function dashboard_format_num($value): string
{
    return number_format(dashboard_num($value));
}

function dashboard_clamp(int $value, int $min, int $max): int
{
    return min(max($value, $min), $max);
}

function dashboard_bars(int $users): array
{
    $base = dashboard_clamp((int)round($users / 16), 18, 86);
    $ratios = [0.44, 0.68, 0.58, 0.83, 0.74, 1, 0.81];
    $bars = [];

    foreach ($ratios as $index => $ratio) {
        $bars[] = [
            'label' => 'D-' . (6 - $index),
            'value' => dashboard_clamp((int)round($base * $ratio + $index * 2), 12, 96),
        ];
    }

    return $bars;
}

function dashboard_rule_compose(string $question, array $context): array
{
    $lens = dashboard_lens($question);
    $ga = is_array($context['ga'] ?? null) ? $context['ga'] : [];
    $seo = is_array($context['seo'] ?? null) ? $context['seo'] : [];

    $gaConnected = !empty($ga['connected']);
    $seoConnected = !empty($seo['connected']);
    $users = dashboard_num($ga['users'] ?? 0);
    $sessions = dashboard_num($ga['sessions'] ?? 0);
    $conversions = dashboard_num($ga['conversions'] ?? 0);
    $seoIssues = dashboard_num($seo['issues'] ?? 0);
    $seoOpportunities = dashboard_num($seo['opportunities'] ?? 0);
    $seoScore = $seo['score'] ?? null;
    $visibilityRisk = $seoConnected ? dashboard_clamp($seoIssues * 4, 8, 28) : 18;

    if ($lens === 'traffic') {
        return [
            'lens' => $lens,
            'blocks' => [
                [
                    'type' => 'narrative',
                    'eyebrow' => 'AI 流量診斷',
                    'text' => $gaConnected
                        ? 'AI 判斷：這題需要先看流量節奏、工作階段與轉換品質，再判斷是否要下鑽來源或頁面層級。'
                        : 'AI 判斷：目前 GA 尚未連接，流量診斷缺少最重要的基準資料。',
                ],
                [
                    'type' => 'metricHero',
                    'label' => '近 30 天工作階段',
                    'value' => dashboard_format_num($sessions),
                    'sub' => $gaConnected ? '可用於來源品質與轉換診斷' : (string)($ga['message'] ?? '尚未連接 GA。'),
                    'badge' => $gaConnected ? '資料就緒' : '缺少資料來源',
                    'badgeTone' => $gaConnected ? 'green' : 'rose',
                    'asideValue' => dashboard_format_num($conversions),
                    'asideLabel' => '轉換數',
                ],
                [
                    'type' => 'chart',
                    'title' => '流量脈衝',
                    'sub' => 'AI 會用這個趨勢判斷是否需要下鑽來源或頁面層級資料。',
                    'highlightIndex' => $gaConnected ? 5 : null,
                    'bars' => dashboard_bars($users),
                ],
            ],
        ];
    }

    if ($lens === 'seo') {
        return [
            'lens' => $lens,
            'blocks' => [
                [
                    'type' => 'narrative',
                    'eyebrow' => 'AI SEO 風險分析',
                    'text' => $seoConnected
                        ? 'AI 判斷：SEO 健康度的重點不是分數本身，而是哪些底層問題會阻礙索引、Schema 理解與 AI 摘要引用。'
                        : 'AI 判斷：目前缺少 SEO 站點，無法建立健康分數、索引覆蓋或 Schema 完整度。',
                ],
                [
                    'type' => 'metricHero',
                    'label' => 'SEO 健康分數',
                    'value' => $seoScore === null ? '-' : (string)$seoScore,
                    'sub' => $seoConnected ? '偵測到 ' . $seoIssues . ' 個技術問題' : (string)($seo['message'] ?? '尚未新增 SEO 站點。'),
                    'badge' => $seoConnected ? '需要檢查' : '尚未設定',
                    'badgeTone' => $seoConnected && $seoIssues > 0 ? 'amber' : 'rose',
                    'asideValue' => (string)$seoOpportunities,
                    'asideLabel' => '內容機會',
                ],
                [
                    'type' => 'issues',
                    'title' => 'AI 排序的 SEO 問題',
                    'items' => [
                        [
                            'severity' => $seoIssues > 0 ? 'high' : 'low',
                            'name' => $seoIssues > 0 ? '影響搜尋理解的技術問題' : '未偵測到重大技術問題',
                            'status' => $seoIssues > 0 ? '需要處理' : '持續觀察',
                            'impact' => $seoIssues > 0 ? '-' . $visibilityRisk . '%' : '穩定',
                            'href' => '/si/seo',
                        ],
                    ],
                ],
            ],
        ];
    }

    if ($lens === 'priority') {
        return [
            'lens' => $lens,
            'blocks' => [
                [
                    'type' => 'narrative',
                    'eyebrow' => 'AI 優先順序編排',
                    'text' => $seoConnected
                        ? 'AI 判斷：今天最值得先處理的是會影響搜尋理解的技術問題，而不是先看更多報表。'
                        : 'AI 判斷：優先事項是建立資料基準。沒有 SEO 站點時，AI 無法判斷搜尋與 AI 能見度風險。',
                ],
                [
                    'type' => 'action',
                    'urgent' => true,
                    'num' => 1,
                    'title' => $seoConnected ? '修復 SEO 技術問題' : '建立第一個 SEO 站點',
                    'desc' => $seoConnected
                        ? '此問題正在影響索引品質與 AI 搜尋對內容的理解，建議優先修復。'
                        : '建立站點後才能產生 SEO health、technical issue 與內容機會。',
                    'href' => '/si/seo',
                    'tags' => [
                        ['text' => '高影響', 'tone' => 'impact'],
                        ['text' => '約 30 分鐘', 'tone' => 'time'],
                        ['text' => $seoConnected ? '-' . $visibilityRisk . '% 能見度風險' : '需要資料基準', 'tone' => 'warn'],
                    ],
                ],
            ],
        ];
    }

    if ($lens === 'visibility') {
        return [
            'lens' => $lens,
            'blocks' => [
                [
                    'type' => 'narrative',
                    'eyebrow' => 'AI 能見度編排',
                    'text' => $seoConnected
                        ? 'AI 判斷：SEO 基礎資料已可用，下一步應檢查內容是否能被 AI 搜尋摘要、問答與引用場景正確理解。'
                        : 'AI 判斷：AEO / GEO 依賴 SEO 站點資料。請先建立站點，再產生 AI 能見度分析。',
                ],
                [
                    'type' => 'metrics',
                    'columns' => 3,
                    'items' => [
                        ['label' => 'AEO', 'value' => $seoConnected ? '可分析' : '-', 'sub' => '問答內容優化', 'tone' => 'blue'],
                        ['label' => 'GEO', 'value' => $seoConnected ? '可分析' : '-', 'sub' => 'AI 引用就緒度', 'tone' => 'green'],
                        ['label' => '驗證資料', 'value' => $gaConnected ? 'GA 已連接' : '缺少 GA', 'sub' => '追蹤成效影響', 'tone' => $gaConnected ? 'green' : 'amber'],
                    ],
                ],
            ],
        ];
    }

    return [
        'lens' => 'overview',
        'blocks' => [
            [
                'type' => 'narrative',
                'eyebrow' => 'AI 高階摘要',
                'text' => 'AI 判斷：這不是單一數字的 dashboard。決策順序應該是資料完整度、SEO 技術風險、AI 能見度擴展，最後才看一般流量報表。',
            ],
            [
                'type' => 'metrics',
                'columns' => 4,
                'items' => [
                    ['label' => '使用者', 'value' => dashboard_format_num($users), 'sub' => $gaConnected ? 'GA 已連接' : (string)($ga['message'] ?? '缺少 GA'), 'tone' => $gaConnected ? 'blue' : 'amber'],
                    ['label' => '工作階段', 'value' => dashboard_format_num($sessions), 'sub' => '近 30 天基準', 'tone' => 'green'],
                    ['label' => '轉換', 'value' => dashboard_format_num($conversions), 'sub' => '品質訊號', 'tone' => $conversions > 0 ? 'green' : 'amber'],
                    ['label' => 'SEO 健康度', 'value' => $seoScore === null ? '-' : (string)$seoScore, 'sub' => $seoConnected ? $seoIssues . ' 個問題' : (string)($seo['message'] ?? '缺少 SEO'), 'tone' => $seoConnected ? 'blue' : 'rose'],
                ],
            ],
        ],
    ];
}

function dashboard_range_mismatch_compose(string $question, array $context): array
{
    $requestedDays = dashboard_requested_days($question);
    $contextDays = dashboard_context_days($context);
    $rangeLabel = (string)($context['rangeLabel'] ?? '目前載入區間');
    $result = dashboard_rule_compose($question, $context);

    array_unshift($result['blocks'], [
        'type' => 'narrative',
        'eyebrow' => 'AI 資料區間提醒',
        'text' => '你詢問的是近 ' . $requestedDays . ' 天資料，但目前 dashboard 實際載入區間是 ' . $rangeLabel . '，約 ' . $contextDays . ' 天。以下分析會以目前已載入資料為基準；若要精準查近 ' . $requestedDays . ' 天，需要先讓 GA 查詢區間同步切換。',
    ]);

    $result['lens'] = 'overview';
    return $result;
}

function dashboard_validate_blocks($result): bool
{
    if (!is_array($result) || !isset($result['blocks']) || !is_array($result['blocks'])) {
        return false;
    }

    $lens = (string)($result['lens'] ?? 'overview');
    if (!in_array($lens, ['overview', 'traffic', 'priority', 'seo', 'visibility'], true)) {
        return false;
    }

    foreach ($result['blocks'] as $block) {
        if (!is_array($block) || empty($block['type'])) {
            return false;
        }

        $type = (string)$block['type'];

        if ($type === 'narrative') {
            if (empty($block['eyebrow']) || empty($block['text'])) {
                return false;
            }
            continue;
        }

        if ($type === 'metricHero') {
            foreach (['label', 'value', 'sub', 'badge', 'asideValue', 'asideLabel'] as $field) {
                if (!isset($block[$field]) || $block[$field] === '') {
                    return false;
                }
            }
            continue;
        }

        if ($type === 'metrics') {
            if (empty($block['items']) || !is_array($block['items'])) {
                return false;
            }

            foreach ($block['items'] as $item) {
                if (!is_array($item) || empty($item['label']) || !isset($item['value']) || !isset($item['sub'])) {
                    return false;
                }
            }
            continue;
        }

        if ($type === 'chart') {
            if (empty($block['title']) || empty($block['bars']) || !is_array($block['bars'])) {
                return false;
            }

            foreach ($block['bars'] as $bar) {
                if (!is_array($bar) || empty($bar['label']) || !isset($bar['value'])) {
                    return false;
                }
            }
            continue;
        }

        if ($type === 'action') {
            foreach (['num', 'title', 'desc', 'href'] as $field) {
                if (!isset($block[$field]) || $block[$field] === '') {
                    return false;
                }
            }

            if (isset($block['tags']) && !is_array($block['tags'])) {
                return false;
            }
            continue;
        }

        if ($type === 'issues') {
            if (empty($block['title']) || empty($block['items']) || !is_array($block['items'])) {
                return false;
            }

            foreach ($block['items'] as $item) {
                foreach (['severity', 'name', 'status', 'impact', 'href'] as $field) {
                    if (!is_array($item) || !isset($item[$field]) || $item[$field] === '') {
                        return false;
                    }
                }
            }
            continue;
        }

        if ($type === 'scoreBreakdown') {
            if (empty($block['title']) || empty($block['items']) || !is_array($block['items'])) {
                return false;
            }

            foreach ($block['items'] as $item) {
                if (!is_array($item) || empty($item['label']) || !isset($item['value']) || empty($item['tone'])) {
                    return false;
                }
            }
            continue;
        }

        return false;
    }

    return true;
}

function dashboard_ai_compose(string $question, array $context)
{
    if (!dashboard_ai_enabled()) {
        return null;
    }

    $apiKey = dashboard_config_value('SI_AI_API_KEY', 'SI_AI_API_KEY', '');
    $model = dashboard_config_value('SI_AI_MODEL', 'SI_AI_MODEL', 'gpt-4.1-mini');
    $url = dashboard_config_value('SI_AI_API_URL', 'SI_AI_API_URL', 'https://api.openai.com/v1/chat/completions');

    $schemaInstruction = [
        'lens' => 'must be one exact value: overview, traffic, priority, seo, visibility',
        'blocks' => [
            [
                'type' => 'narrative',
                'required' => ['eyebrow', 'text'],
            ],
            [
                'type' => 'metrics',
                'required' => ['columns', 'items'],
                'item_required' => ['label', 'value', 'sub', 'tone'],
            ],
            [
                'type' => 'chart',
                'required' => ['title', 'sub', 'bars'],
                'bar_required' => ['label', 'value'],
            ],
            [
                'type' => 'action',
                'required' => ['num', 'title', 'desc', 'href', 'tags'],
                'tag_required' => ['text', 'tone'],
            ],
            [
                'type' => 'issues',
                'required' => ['title', 'items'],
                'item_required' => ['severity', 'name', 'status', 'impact', 'href'],
            ],
        ],
    ];

    $messages = [
        [
            'role' => 'system',
            'content' => '你是 Highlight Signal 的 AI dashboard composer。請根據問題與 context 回傳 JSON，不要回 Markdown。輸出必須是完整、可渲染的 dashboard blocks，不可以省略 required 欄位，也不可以自創欄位名稱。lens 只能是 overview、traffic、priority、seo、visibility 其中一個，不可以回傳列舉字串。請至少回傳 3 個 blocks，優先使用 narrative、metrics、chart、action、issues。所有使用者可見文案使用繁體中文，保留 GA、SEO、AEO、GEO、AI 等產品縮寫。href 只能使用內部路徑。metrics block 必須使用 items，不可使用 metrics 欄位；narrative block 必須使用 eyebrow 和 text，不可使用 note 和 content；action block 必須直接使用 title、desc、href、tags，不可使用 actions 陣列。',
        ],
        [
            'role' => 'user',
            'content' => json_encode([
                'question' => $question,
                'context' => $context,
                'required_shape' => $schemaInstruction,
                'supported_hrefs' => ['/ga', '/ga/account', '/ga/conversions', '/si/seo', '/si/aeo', '/si/geo'],
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ],
    ];

    $payload = [
        'model' => $model,
        'messages' => $messages,
        'temperature' => 0.2,
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
    $result = json_decode((string)$content, true);

    return dashboard_validate_blocks($result) ? $result : null;
}

function dashboard_ensure_log_table(mysqli $conn)
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

function dashboard_get_cached_response(mysqli $conn, int $userId, string $question, array $context)
{
    dashboard_ensure_log_table($conn);
    $contextJson = json_encode($context, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    $stmt = $conn->prepare(
        "SELECT response_json, model, created_at
         FROM dashboard_ai_logs
         WHERE user_id = ?
           AND question = ?
           AND context_json = ?
           AND status = 'success'
           AND created_at >= CURDATE()
           AND created_at < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
         ORDER BY id DESC
         LIMIT 1"
    );

    if (!$stmt) {
        return null;
    }

    $stmt->bind_param('iss', $userId, $question, $contextJson);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result ? $result->fetch_assoc() : null;

    if (!$row || empty($row['response_json'])) {
        return null;
    }

    $response = json_decode((string)$row['response_json'], true);
    if (!is_array($response) || !dashboard_validate_blocks($response)) {
        return null;
    }

    $response['source'] = 'cache';
    $response['cached'] = true;
    $response['cached_at'] = (string)($row['created_at'] ?? '');
    $response['cached_model'] = (string)($row['model'] ?? '');

    return $response;
}

function dashboard_log(mysqli $conn, int $userId, string $question, array $context, array $response, string $status, string $error = '')
{
    dashboard_ensure_log_table($conn);

    $lens = (string)($response['lens'] ?? 'overview');
    $contextJson = json_encode($context, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $responseJson = json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $model = dashboard_config_value('SI_AI_MODEL', 'SI_AI_MODEL', 'rule-compose');

    $stmt = $conn->prepare(
        'INSERT INTO dashboard_ai_logs
         (user_id, question, lens, context_json, response_json, model, status, error_message)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );

    if (!$stmt) {
        return;
    }

    $stmt->bind_param('isssssss', $userId, $question, $lens, $contextJson, $responseJson, $model, $status, $error);
    $stmt->execute();
}

$input = hs_input();
$user = hs_request_user($input);
$question = trim((string)($input['question'] ?? ''));
$context = is_array($input['context'] ?? null) ? $input['context'] : [];

if ($question === '') {
    hs_json(['ok' => false, 'message' => 'question is required'], 400);
}

$conn = dashboard_db();
$cachedResponse = dashboard_get_cached_response($conn, (int)$user['id'], $question, $context);

if ($cachedResponse) {
    hs_json($cachedResponse);
}

if (dashboard_has_range_mismatch($question, $context)) {
    $aiResult = dashboard_range_mismatch_compose($question, $context);
    $source = 'range_mismatch';
} else {
    $aiResult = dashboard_ai_compose($question, $context);
    $source = 'ai';
}

if (!$aiResult) {
    $aiResult = dashboard_rule_compose($question, $context);
    $source = 'rules';
}

$response = [
    'ok' => true,
    'source' => $source,
    'lens' => $aiResult['lens'] ?? 'overview',
    'blocks' => $aiResult['blocks'] ?? [],
];

dashboard_log($conn, (int)$user['id'], $question, $context, $response, 'success');

hs_json($response);
