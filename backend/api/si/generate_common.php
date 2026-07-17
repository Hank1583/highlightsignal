<?php

declare(strict_types=1);

require_once __DIR__ . '/save_common.php';

function si_handle_generate_summary($module)
{
    $body = si_input();
    $userId = si_positive_int($body, 'user_id');
    $siteId = si_positive_int($body, 'site_id');
    $tabKey = si_clean_key($body['tab'] ?? 'overview');

    si_ensure_site($userId, $siteId);

    $seo = si_load_seo_summary($userId, $siteId);
    $payload = $module === 'geo'
        ? si_build_geo_payload($userId, $siteId, $tabKey, $seo)
        : si_build_aeo_payload($userId, $siteId, $tabKey, $seo);

    si_create_summary_payload($payload, $module);
    si_success(si_latest_summary($module, $userId, $siteId, $tabKey));
}

function si_ensure_site($userId, $siteId)
{
    $conn = si_db();

    $stmt = $conn->prepare('SELECT id FROM si_sites WHERE id = ? AND user_id = ? LIMIT 1');
    if (!$stmt) {
        si_fail('SQL_PREPARE_FAILED', $conn->error, 500);
    }
    $stmt->bind_param('ii', $siteId, $userId);
    $stmt->execute();
    if ($stmt->get_result()->fetch_assoc()) {
        return;
    }

    if (!si_table_exists('seo_sites')) {
        si_fail('SITE_NOT_FOUND', 'Site not found.', 404);
    }

    $seoStmt = $conn->prepare('SELECT id, site_name, site_url FROM seo_sites WHERE id = ? AND user_id = ? LIMIT 1');
    if (!$seoStmt) {
        si_fail('SQL_PREPARE_FAILED', $conn->error, 500);
    }
    $seoStmt->bind_param('ii', $siteId, $userId);
    $seoStmt->execute();
    $site = $seoStmt->get_result()->fetch_assoc();

    if (!$site) {
        si_fail('SITE_NOT_FOUND', 'Site not found.', 404);
    }

    $siteName = (string)($site['site_name'] ?: $site['site_url']);
    $siteUrl = (string)$site['site_url'];
    $isActive = 1;

    $insert = $conn->prepare(
        'INSERT INTO si_sites (id, user_id, site_name, site_url, is_active)
         VALUES (?, ?, ?, ?, ?)'
    );
    if (!$insert) {
        si_fail('SQL_PREPARE_FAILED', $conn->error, 500);
    }
    $insert->bind_param('iissi', $siteId, $userId, $siteName, $siteUrl, $isActive);
    $insert->execute();
}

function si_table_exists($table)
{
    $conn = si_db();
    $stmt = $conn->prepare(
        'SELECT COUNT(*) AS total FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?'
    );
    if (!$stmt) {
        return false;
    }
    $stmt->bind_param('s', $table);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    return (int)($row['total'] ?? 0) > 0;
}

function si_load_seo_summary($userId, $siteId)
{
    if (!si_table_exists('seo_summary_cache')) {
        return [];
    }

    $conn = si_db();
    $stmt = $conn->prepare(
        'SELECT summary_json FROM seo_summary_cache
         WHERE site_id = ? AND user_id = ?
         ORDER BY updated_at DESC
         LIMIT 1'
    );
    if (!$stmt) {
        return [];
    }
    $stmt->bind_param('ii', $siteId, $userId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();

    if (!$row || empty($row['summary_json'])) {
        return [];
    }

    $data = json_decode((string)$row['summary_json'], true);
    return is_array($data) ? $data : [];
}

function si_site_label(array $seo)
{
    return (string)($seo['site_name'] ?? $seo['site'] ?? '此網站');
}

function si_issue_count(array $seo)
{
    return count($seo['technicalIssues'] ?? []);
}

function si_keyword_count(array $seo)
{
    return count($seo['keywords'] ?? []);
}

function si_keyword_from_item($item)
{
    if (is_array($item)) {
        return trim((string)($item['keyword'] ?? $item['query'] ?? $item['name'] ?? $item['title'] ?? ''));
    }

    return trim((string)$item);
}

function si_keyword_has_service_signal($keyword)
{
    return preg_match('/vr|ar|webar|web ar|虛擬|擴增|seo|aeo|geo|網站|行銷|互動|開發|費用|價格|報價|案例|展覽|教育|導入|系統|平台|公司|廠商|推薦|比較/ui', $keyword) === 1;
}

function si_keyword_is_noise($keyword)
{
    $keyword = trim((string)$keyword);
    if ($keyword === '') {
        return true;
    }

    $lower = strtolower($keyword);
    $isBrandTerm = preg_match('/highlight|hi-light|highlightsignal|亮點/u', $lower) === 1;
    $hasService = si_keyword_has_service_signal($keyword);

    if (preg_match('/官方網站|功能介绍|功能介紹|登入|login|下載|download|app store|google play/u', $keyword)) {
        return true;
    }

    if (preg_match('/\.(com|tw|ai|net|org)(\/)?$/i', $keyword) && !$hasService) {
        return true;
    }

    if ($isBrandTerm && !$hasService) {
        return true;
    }

    if ($isBrandTerm && preg_match('/公司|官方|官網/u', $keyword) && !preg_match('/vr|ar|seo|aeo|geo|行銷|開發|系統|平台/ui', $keyword)) {
        return true;
    }

    return false;
}

function si_keyword_cluster_key($keyword)
{
    $value = strtolower(trim((string)$keyword));
    $value = preg_replace('/\s+/u', '', $value);
    $value = str_replace(['臺灣', '台灣地區', '台灣'], '', $value);
    $value = str_replace(['公司', '廠商', '推薦', '哪家', '選擇', '怎麼選'], '', $value);
    $value = str_replace(['web-ar', 'web_ar', 'web ar'], 'webar', $value);

    if (preg_match('/webar|app.?ar|vr|ar|虛擬實境|擴增實境/ui', $value)) {
        $service = 'xr';
        if (preg_match('/webar/ui', $value)) $service = 'webar';
        if (preg_match('/app.?ar/ui', $value)) $service = 'appar';
        if (preg_match('/vr|虛擬實境/ui', $value)) $service = 'vr';
        if (preg_match('/ar|擴增實境/ui', $value) && $service === 'xr') $service = 'ar';

        $intent = 'info';
        if (preg_match('/費用|價格|報價|預算|多少/u', $value)) $intent = 'price';
        if (preg_match('/比較|差異|vs|哪個/u', $value)) $intent = 'compare';
        if (preg_match('/案例|展覽|教育|行銷|導入/u', $value)) $intent = 'usecase';
        if (preg_match('/公司|廠商|推薦|哪家|選擇|怎麼選/u', strtolower((string)$keyword))) $intent = 'vendor';

        return $service . ':' . $intent;
    }

    return $value;
}

function si_keyword_score($keyword)
{
    if (si_keyword_is_noise($keyword)) {
        return -100;
    }

    $score = 10;
    if (preg_match('/費用|價格|報價|預算|多少/u', $keyword)) $score += 35;
    if (preg_match('/比較|差異|vs|VS|哪個|選擇/u', $keyword)) $score += 30;
    if (preg_match('/公司|廠商|推薦|台灣/u', $keyword)) $score += 20;
    if (preg_match('/vr|ar|webar|web ar|虛擬|擴增/ui', $keyword)) $score += 25;
    if (preg_match('/案例|展覽|教育|行銷|導入/u', $keyword)) $score += 18;

    return $score;
}

function si_opportunities(array $seo)
{
    $pool = [];
    foreach (['topOpportunities', 'keywords'] as $key) {
        $items = $seo[$key] ?? [];
        if (!is_array($items)) {
            continue;
        }

        foreach ($items as $item) {
            $keyword = si_keyword_from_item($item);
            if ($keyword === '' || si_keyword_is_noise($keyword)) {
                continue;
            }

            $clusterKey = si_keyword_cluster_key($keyword);
            $score = si_keyword_score($keyword);
            if (!isset($pool[$clusterKey]) || $score > (int)$pool[$clusterKey]['score']) {
                $pool[$clusterKey] = [
                    'keyword' => $keyword,
                    'score' => $score,
                    'cluster' => $clusterKey,
                ];
            }
        }
    }

    $items = array_values($pool);
    usort($items, function ($a, $b) {
        return (int)$b['score'] - (int)$a['score'];
    });

    return array_slice($items, 0, 4);
}

function si_suggestions(array $seo)
{
    $items = $seo['suggestions'] ?? [];
    return is_array($items) ? array_slice($items, 0, 4) : [];
}

function si_has_gsc_data(array $seo)
{
    return !empty($seo['meta']['gsc']['ok']) && si_keyword_count($seo) > 0;
}

function si_confidence(array $seo)
{
    return si_has_gsc_data($seo) ? 'medium' : 'low';
}

function si_confidence_label(array $seo)
{
    if (si_has_gsc_data($seo)) {
        return '依據 Search Console 關鍵字、SEO 技術檢查與內容規則推估，信心程度中等。';
    }

    return '目前未讀到 Search Console 關鍵字資料，先以 SEO 技術檢查與通用搜尋意圖推估，信心程度偏低。';
}

function si_config_value($constant, $env, $fallback = '')
{
    if (defined($constant)) {
        return (string)constant($constant);
    }

    $value = getenv($env);
    if ($value !== false && $value !== '') {
        return (string)$value;
    }

    return $fallback;
}

function si_ai_polish_enabled()
{
    $enabled = strtolower(si_config_value('SI_AI_POLISH_ENABLED', 'SI_AI_POLISH_ENABLED', ''));
    $apiKey = si_config_value('SI_AI_API_KEY', 'SI_AI_API_KEY', '');
    $model = si_config_value('SI_AI_MODEL', 'SI_AI_MODEL', '');

    return in_array($enabled, ['1', 'true', 'yes', 'on'], true)
        && $apiKey !== ''
        && $model !== ''
        && function_exists('curl_init');
}

function si_ai_api_url()
{
    return si_config_value('SI_AI_API_URL', 'SI_AI_API_URL', 'https://api.openai.com/v1/chat/completions');
}

function si_ai_polish_items(array $items, array $seo, $tabKey)
{
    if (!si_ai_polish_enabled() || empty($items)) {
        return $items;
    }

    $polished = [];
    foreach ($items as $index => $item) {
        if ($index >= 6 || empty($item['title']) || empty($item['draft'])) {
            $polished[] = $item;
            continue;
        }

        $next = si_ai_polish_item($item, $seo, $tabKey);
        $polished[] = $next ?: $item;
    }

    return $polished;
}

function si_ai_polish_item(array $item, array $seo, $tabKey)
{
    $apiKey = si_config_value('SI_AI_API_KEY', 'SI_AI_API_KEY', '');
    $model = si_config_value('SI_AI_MODEL', 'SI_AI_MODEL', '');
    $url = si_ai_api_url();

    $input = [
        'site' => si_site_label($seo),
        'tab' => $tabKey,
        'keyword_intent' => (string)($item['intent'] ?? ''),
        'draft_mode' => (string)($item['draftMode'] ?? ''),
        'question' => (string)($item['title'] ?? ''),
        'draft' => (string)($item['draft'] ?? ''),
        'status' => (string)($item['status'] ?? ''),
    ];

    $messages = [
        [
            'role' => 'system',
            'content' => '你是台灣繁體中文 SEO/AEO 文案編輯。只做文字潤飾，不改變策略判斷，不新增未提供的數字、案例或保證。回傳嚴格 JSON，欄位只有 question、draft。',
        ],
        [
            'role' => 'user',
            'content' => json_encode([
                'task' => '請把 question 改成真人會問的自然問題，把 draft 潤飾成可讀、具體、適合上站的繁體中文。draft 請控制在 80 到 140 個中文字左右，偏網站首段文案，不要寫系統說明。若 draft_mode 是 guidance，請保留為改寫建議，不要假裝成已可發布內容。保留原文中已提供的費用、時程、流程等資訊。',
                'input' => $input,
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ],
    ];

    $payload = [
        'model' => $model,
        'messages' => $messages,
        'temperature' => 0.3,
        'response_format' => ['type' => 'json_object'],
    ];

    $ch = curl_init($url);
    if (!$ch) {
        return null;
    }

    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 12);
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
    if (!is_array($json)) {
        return null;
    }

    $content = $json['choices'][0]['message']['content'] ?? '';
    $result = json_decode((string)$content, true);
    if (!is_array($result)) {
        return null;
    }

    $question = trim((string)($result['question'] ?? ''));
    $draft = trim((string)($result['draft'] ?? ''));

    if ($question === '' || $draft === '') {
        return null;
    }

    $item['title'] = $question;
    $item['draft'] = $draft;

    $tags = $item['tags'] ?? [];
    if (is_array($tags) && !in_array('AI 潤飾', $tags, true)) {
        $tags[] = 'AI 潤飾';
        $item['tags'] = $tags;
    }

    return $item;
}

function si_score_level($score)
{
    $score = (int)$score;
    if ($score >= 80) return '高';
    if ($score >= 55) return '中';
    return '低';
}

function si_risk_level($score)
{
    $score = (int)$score;
    if ($score >= 55) return '高';
    if ($score >= 25) return '中';
    return '低';
}

function si_build_aeo_payload($userId, $siteId, $tabKey, array $seo)
{
    $issueCount = si_issue_count($seo);
    $keywordCount = si_keyword_count($seo);
    $opportunities = si_opportunities($seo);
    $suggestions = si_suggestions($seo);
    $clusterCount = count($opportunities);
    $faqCount = max(3, min(12, $clusterCount + count($suggestions)));
    $snippetCount = max(2, min(10, $clusterCount + count($suggestions) + 1));
    $coverage = max(30, min(92, 78 - ($issueCount * 6) + ($keywordCount * 2)));

    $titleMap = [
        'overview' => 'AEO 分析總覽',
        'faq' => '問題機會分析',
        'snippet' => 'AI 精選摘要候選',
        'gap' => '內容缺口分析',
    ];

    $panelTitleMap = [
        'overview' => 'AEO 優化重點',
        'faq' => '高意圖問題機會',
        'snippet' => '可被 AI 引用的短答案',
        'gap' => '內容缺口與補強方向',
    ];

    return [
        'user_id' => $userId,
        'site_id' => $siteId,
        'module' => 'aeo',
        'tab' => $tabKey,
        'title' => $titleMap[$tabKey] ?? 'AEO 分析',
        'desc' => si_aeo_desc($tabKey),
        'metrics' => si_build_aeo_metrics($tabKey, $faqCount, $coverage, $snippetCount, $issueCount, $seo),
        'panelTitle' => $panelTitleMap[$tabKey] ?? 'AEO 優化重點',
        'items' => si_build_aeo_items($tabKey, $opportunities, $suggestions, $seo),
        'actions' => si_build_aeo_actions($tabKey),
        'sideTitle' => si_aeo_side_title($tabKey),
        'sideItems' => [],
        'recommendation' => si_aeo_recommendation($tabKey),
        'source' => 'rule-based',
        'status' => 'ready',
    ];
}

function si_aeo_desc($tabKey)
{
    if ($tabKey === 'faq') {
        return '找出較適合被使用者與 AI 問到的問題，並標示來源、信心程度、搜尋意圖與建議放置頁面。';
    }
    if ($tabKey === 'snippet') {
        return '把重點關鍵字轉成 40 到 80 字左右的短答案草稿，降低 AI 擷取與引用成本。';
    }
    if ($tabKey === 'gap') {
        return '檢查目前內容還缺少哪些可回答、可比較、可證明的段落，避免只停留在一般 FAQ。';
    }
    return '整合 SEO 技術狀態、關鍵字資料與內容結構，評估目前網站是否容易被回答引擎理解與引用。';
}

function si_aeo_side_title($tabKey)
{
    if ($tabKey === 'faq') return '問題優先級';
    if ($tabKey === 'snippet') return '摘要撰寫規則';
    if ($tabKey === 'gap') return '補強優先順序';
    return 'AEO 判讀基準';
}

function si_aeo_recommendation($tabKey)
{
    if ($tabKey === 'faq') {
        return '先處理有商業意圖的問題，例如費用、流程、比較、適合對象，再把答案放到對應服務頁。';
    }
    if ($tabKey === 'snippet') {
        return '每個核心服務頁前半段都放一段短答案，格式採用一句定義、兩到三個重點、下一步行動。';
    }
    if ($tabKey === 'gap') {
        return '補內容時不要只新增 FAQ，也要補案例、流程、價格範圍、比較表與可驗證的經驗訊號。';
    }
    return '目前這份分析應作為內容結構與問題機會的優化工具，若要追蹤效果，仍需搭配 GSC 曝光、點擊與 AI 引用觀察。';
}

function si_build_aeo_metrics($tabKey, $faqCount, $coverage, $snippetCount, $issueCount, array $seo)
{
    $basis = si_confidence_label($seo);

    if ($tabKey === 'faq') {
        return [
            ['label' => '問題機會', 'value' => (string)$faqCount, 'note' => '候選 FAQ', 'basis' => $basis],
            ['label' => '高意圖題型', 'value' => (string)max(2, min(8, $faqCount - 1)), 'note' => '費用/比較/流程', 'basis' => '依關鍵字文字、SEO 機會與服務頁常見決策問題分類。'],
            ['label' => '內容可回答度', 'value' => si_score_level($coverage), 'note' => 'rule-based', 'basis' => '由 title、description、H1、canonical、技術問題數與關鍵字資料推估，顯示為等級而非精準 KPI。'],
        ];
    }

    if ($tabKey === 'snippet') {
        return [
            ['label' => '摘要候選', 'value' => (string)$snippetCount, 'note' => '短答案草稿', 'basis' => $basis],
            ['label' => '引用友善度', 'value' => si_score_level(max(30, min(90, $coverage - 5))), 'note' => '段落清楚度', 'basis' => '依內容是否可拆成定義、條列、用途與下一步行動推估，顯示為等級而非精準 KPI。'],
            ['label' => '需改寫段落', 'value' => (string)max(1, $snippetCount - 1), 'note' => '建議補在頁面前半段', 'basis' => 'AI 較容易引用短、清楚、獨立可讀的段落。'],
        ];
    }

    if ($tabKey === 'gap') {
        return [
            ['label' => '內容缺口', 'value' => (string)max(3, $faqCount), 'note' => '待補主題', 'basis' => $basis],
            ['label' => '基礎風險', 'value' => si_risk_level(max(8, 100 - $coverage)), 'note' => '技術與內容', 'basis' => '由 SEO 技術問題與缺少可引用內容的程度推估，顯示為等級而非精準 KPI。'],
            ['label' => '案例需求', 'value' => (string)max(2, $snippetCount), 'note' => '權威訊號', 'basis' => 'AEO 不只需要答案，也需要案例、經驗與可信來源支撐。'],
        ];
    }

    return [
        ['label' => 'AEO 準備度', 'value' => si_score_level($coverage), 'note' => 'rule-based', 'basis' => '由 SEO 技術欄位、內容結構、關鍵字數與問題數推估，並非實際排名或 AI 引用率。'],
        ['label' => '問題機會', 'value' => (string)$faqCount, 'note' => '可優先規劃 FAQ', 'basis' => $basis],
        ['label' => '摘要機會', 'value' => (string)$snippetCount, 'note' => $issueCount . ' 個技術問題會影響擷取', 'basis' => '依 SEO 機會與內容建議推估可補的短答案段落數。'],
    ];
}

function si_build_aeo_items($tabKey, array $opportunities, array $suggestions, array $seo)
{
    $items = [];
    $confidence = si_confidence($seo);
    $sourceLabel = si_has_gsc_data($seo) ? '資料來源：GSC / SEO 分析' : '資料來源：SEO 分析推估';

    if ($tabKey === 'faq') {
        foreach ($opportunities as $item) {
            $keyword = (string)($item['keyword'] ?? '核心服務');
            $draft = si_snippet_draft($keyword, $seo);
            $items[] = [
                'title' => si_keyword_to_question($keyword),
                'meta' => '問題機會',
                'status' => '這題應寫成決策答案，不只回答定義，還要補判斷條件、預算或案例入口。',
                'tags' => ['AEO', 'FAQ'],
                'sourceLabel' => $sourceLabel,
                'placement' => '建議放置：對應服務頁前半段或該服務頁 FAQ 區塊。',
                'draft' => $draft['text'],
                'draftMode' => $draft['mode'],
                'confidence' => $confidence,
                'intent' => si_keyword_intent($keyword),
                'basis' => '依「' . $keyword . '」推估使用者可能正在比較、詢價或確認服務適配度；品牌詞與官網導覽詞已排除為低優先。',
            ];
        }
        if (empty($items)) {
            $items[] = [
                'title' => '預算有限時，這項服務該怎麼規劃才有效？',
                'meta' => '問題機會',
                'status' => '目前缺少可用關鍵字，先建立偏轉換的決策問題，而不是泛用 FAQ。',
                'tags' => ['AEO', 'FAQ'],
                'sourceLabel' => '資料來源：SEO 技術檢查推估',
                'placement' => '建議放置：主要服務頁的 FAQ 區塊。',
                'draft' => '預算有限時，應先確認目標是品牌曝光、名單收集還是現場互動，再決定功能範圍。建議先做最小可行版本，保留核心互動、基本數據追蹤與後續擴充空間，避免一開始就投入過多客製功能。',
                'draftMode' => 'publishable',
                'confidence' => 'low',
                'intent' => '商業評估',
                'basis' => '未讀到 GSC 關鍵字，需用後續 Search Console 曝光與點擊驗證。',
            ];
        }
        return si_ai_polish_items($items, $seo, $tabKey);
    }

    if ($tabKey === 'snippet') {
        foreach ($opportunities as $item) {
            $keyword = (string)($item['keyword'] ?? '核心服務');
            $draft = si_snippet_draft($keyword, $seo);
            $items[] = [
                'title' => '為「' . $keyword . '」撰寫可引用短答案',
                'meta' => '精選摘要候選',
                'status' => '短答案應能獨立閱讀，避免只有形容詞或品牌口號。',
                'tags' => ['短答案', 'AI 引用'],
                'sourceLabel' => $sourceLabel,
                'placement' => '建議放置：H1 下方 300 字內或服務介紹第一段。',
                'draft' => $draft['text'],
                'draftMode' => $draft['mode'],
                'confidence' => $confidence,
                'intent' => si_keyword_intent($keyword),
                'basis' => '此類段落較容易被搜尋摘要與 AI 回答抽取，但仍需靠 GSC 與實際引用追蹤驗證。',
            ];
        }
        if (empty($items)) {
            $items[] = [
                'title' => '補一段核心服務的短答案定義',
                'meta' => '精選摘要候選',
                'status' => '先定義服務、適用情境與下一步行動，再依真實關鍵字更新。',
                'tags' => ['短答案'],
                'sourceLabel' => '資料來源：SEO 技術檢查推估',
                'placement' => '建議放置：首頁或主要服務頁前半段。',
                'draft' => si_snippet_draft('核心服務', $seo)['text'],
                'draftMode' => 'guidance',
                'confidence' => 'low',
                'intent' => '資訊查詢',
            ];
        }
        return si_ai_polish_items($items, $seo, $tabKey);
    }

    if ($tabKey === 'gap') {
        foreach ($opportunities as $item) {
            $keyword = (string)($item['keyword'] ?? '核心服務');
            $items[] = [
                'title' => '補強「' . $keyword . '」的決策內容',
                'meta' => '內容缺口',
                'status' => '除了 FAQ，建議補價格範圍、流程、比較、案例或成果證明，讓內容有可驗證資訊。',
                'tags' => ['內容缺口', '權威訊號'],
                'sourceLabel' => $sourceLabel,
                'placement' => '建議放置：服務頁主文、案例頁或比較型文章。',
                'draft' => si_content_gap_draft($keyword),
                'confidence' => $confidence,
                'intent' => si_keyword_intent($keyword),
                'basis' => '只有短答不足以建立權威，AI 更常引用有案例、流程與可驗證資訊的頁面。',
            ];
        }
        if (empty($items)) {
            $items[] = [
                'title' => '建立案例頁或服務流程頁',
                'meta' => '內容缺口',
                'status' => '目前關鍵字資料不足，先補能證明專業與經驗的內容。',
                'tags' => ['案例', 'E-E-A-T'],
                'sourceLabel' => '資料來源：SEO 技術檢查推估',
                'placement' => '建議放置：案例列表、服務頁下方或獨立案例頁。',
                'draft' => '案例頁建議包含客戶背景、需求問題、執行流程、使用技術、時程與成果。這些資訊比單純服務介紹更容易建立信任，也更容易被 AI 當成引用依據。',
                'confidence' => 'low',
                'intent' => '信任建立',
            ];
        }
        return $items;
    }

    $items[] = [
        'title' => '先補可回答的服務段落，再補 FAQ 與短答案',
        'meta' => 'AEO 優化',
        'status' => 'AEO 不是只寫 FAQ，還需要回答真實問題、給出證據與清楚下一步。',
        'tags' => ['AEO 總覽'],
        'sourceLabel' => $sourceLabel,
        'confidence' => $confidence,
        'basis' => si_confidence_label($seo),
    ];
    foreach (array_slice($suggestions, 0, 2) as $item) {
        $items[] = [
            'title' => (string)($item['title'] ?? '補強內容結構'),
            'meta' => 'SEO 建議',
            'status' => (string)($item['reason'] ?? '建議補強頁面主題、摘要與內部連結。'),
            'tags' => ['SEO 訊號'],
            'sourceLabel' => '資料來源：SEO 建議',
        ];
    }
    return $items;
}

function si_keyword_to_question($keyword)
{
    $keyword = trim((string)$keyword);
    if ($keyword === '') {
        return '這項服務能解決哪些商業問題？';
    }

    if (preg_match('/費用|價格|報價|預算|多少/u', $keyword)) {
        return $keyword . ' 怎麼估？預算要抓多少？';
    }

    if (preg_match('/台灣.*vr|vr.*公司|vr.*廠商|ar.*公司|ar.*廠商/ui', $keyword)) {
        return '選擇 ' . $keyword . ' 時，應該看哪些條件？';
    }

    if (preg_match('/webar|web ar|app ar/ui', $keyword)) {
        return 'WebAR 和 App AR 差在哪？該怎麼選？';
    }

    if (preg_match('/公司|廠商|推薦|哪家/u', $keyword)) {
        return '選擇 ' . $keyword . ' 時，要怎麼判斷是否可靠？';
    }

    if (preg_match('/差異|比較|vs|VS|哪個/u', $keyword)) {
        return $keyword . ' 的差異與適用情境是什麼？';
    }

    if (preg_match('/行銷|活動|展覽|教育/u', $keyword)) {
        return $keyword . ' 值得做嗎？適合哪些情境？';
    }

    return '使用者搜尋「' . $keyword . '」時，真正要決策的是什麼？';
}

function si_keyword_intent($keyword)
{
    if (preg_match('/費用|價格|報價|預算|多少/u', $keyword)) {
        return '價格評估';
    }
    if (preg_match('/公司|廠商|推薦|哪家|台灣/u', $keyword)) {
        return '供應商比較';
    }
    if (preg_match('/差異|比較|vs|VS|哪個/u', $keyword)) {
        return '方案比較';
    }
    if (preg_match('/案例|展覽|教育|行銷|導入/u', $keyword)) {
        return '導入評估';
    }
    return '資訊查詢';
}

function si_snippet_draft($keyword, array $seo)
{
    $keyword = trim((string)$keyword);

    if ($keyword === '') {
        $keyword = '核心服務';
    }

    if (preg_match('/費用|價格|報價|預算|多少/u', $keyword)) {
        return [
            'mode' => 'publishable',
            'text' => $keyword . ' 通常應依平台、互動深度、3D 素材量與後台功能估算。簡易 WebAR 可先抓 5 到 15 萬，客製 App 或大型展演常見會落在 15 到 50 萬以上，實際仍需依需求估價。',
        ];
    }

    if (preg_match('/台灣.*vr|vr.*公司|vr.*廠商|ar.*公司|ar.*廠商/ui', $keyword)) {
        return [
            'mode' => 'publishable',
            'text' => '選擇 ' . $keyword . ' 時，應優先確認是否有實際專案案例與透明報價。建議檢查是否有教育、行銷或展覽案例，是否能提供 WebAR 或 App 開發，以及是否清楚列出企劃、製作、測試、上線流程與費用區間。',
        ];
    }

    if (preg_match('/webar|web ar|app ar/ui', $keyword)) {
        return [
            'mode' => 'publishable',
            'text' => 'WebAR 不需下載 App，適合活動行銷、快速導入與短期體驗；App AR 較適合高互動、長期會員或需要裝置功能的專案。選擇時應比較預算、互動需求、維護成本與使用者進入門檻。',
        ];
    }

    if (preg_match('/行銷|活動|展覽|教育/u', $keyword)) {
        return [
            'mode' => 'publishable',
            'text' => $keyword . ' 是否值得做，應看目標是否需要互動體驗、停留時間或現場導流。適合新品展示、教育訓練、展覽互動與品牌活動，頁面應補上案例、執行流程與成效衡量方式。',
        ];
    }

    if (preg_match('/比較|差異|vs|VS|哪個/u', $keyword)) {
        return [
            'mode' => 'publishable',
            'text' => $keyword . ' 的比較應從使用情境、開發成本、維護難度與轉換目標判斷。建議用表格列出各方案適合的預算、時程、互動深度與限制，讓使用者能快速做決策。',
        ];
    }

    return [
        'mode' => 'guidance',
        'text' => '此關鍵字意圖還不夠明確，建議先補充實際服務資訊後再產生可發布草稿。頁面應回答適用情境、導入流程、預算範圍、案例證明與下一步諮詢入口。',
    ];
}

function si_content_gap_draft($keyword)
{
    $keyword = trim((string)$keyword);
    if ($keyword === '') {
        $keyword = '核心服務';
    }

    if (preg_match('/費用|價格|報價|預算|多少/u', $keyword)) {
        return '建議補一段費用說明，至少列出影響價格的 4 個因素：功能範圍、互動複雜度、素材製作、維護與後台需求。若不能公開固定價格，也可以用級距或估價流程降低使用者疑慮。';
    }

    if (preg_match('/公司|廠商|推薦|台灣/u', $keyword)) {
        return '建議補一段廠商選擇標準，列出案例、技術能力、報價透明度、交付流程與售後維護。這類內容比品牌自我介紹更適合用來承接高意圖搜尋。';
    }

    if (preg_match('/比較|差異|vs|VS|哪個/u', $keyword)) {
        return '建議新增比較表，直接列出不同方案的適用情境、成本、時程、限制與維護方式。比較內容能幫使用者做決策，也比一般 FAQ 更容易被摘要引用。';
    }

    return '建議補「決策資訊」而不是只補介紹文：包含適合對象、導入流程、常見預算、案例連結與下一步諮詢入口，讓使用者能判斷是否要進一步聯絡。';
}

function si_geo_draft($keyword, $mode)
{
    $keyword = trim((string)$keyword);
    if ($keyword === '') {
        $keyword = '核心服務';
    }

    if ($mode === 'citations') {
        if (preg_match('/公司|廠商|推薦|台灣|agency/ui', $keyword)) {
            return [
                'mode' => 'publishable',
                'text' => '若要讓 AI 引用「' . $keyword . '」相關內容，頁面應提供可驗證資訊：實際案例、服務流程、交付項目、時程與報價方式。這些內容比單純品牌介紹更容易成為 AI 回答中的引用依據。',
            ];
        }

        if (preg_match('/ai|人工智慧|virtual reality/ui', $keyword)) {
            return [
                'mode' => 'guidance',
                'text' => '此關鍵字較像技術或分類詞，建議先補一段技術定義與應用情境，再決定是否做成引用頁。內容可說明 AI 與 VR 如何結合、適合哪些場景、需要哪些資料與硬體條件。',
            ];
        }

        return [
            'mode' => 'publishable',
            'text' => '「' . $keyword . '」相關頁面應包含一句清楚定義、三到五個適用情境、服務流程與案例入口。這種結構能讓 AI 快速理解頁面主題，也較容易在回答中引用。',
        ];
    }

    if ($mode === 'visibility') {
        if (preg_match('/agency|virtual reality/ui', $keyword)) {
            return [
                'mode' => 'guidance',
                'text' => '此關鍵字帶有英文採購意圖，建議補英文或雙語服務頁，說明服務範圍、案例類型、合作流程與聯絡方式。若只放中文頁，AI 在英文查詢情境中較不容易引用。',
            ];
        }

        if (preg_match('/ai|人工智慧/ui', $keyword)) {
            return [
                'mode' => 'guidance',
                'text' => '此關鍵字可能在問 AI 與 VR 的技術結合，建議補應用情境段落，例如教育訓練、產品展示、模擬導覽與互動體驗，並說明導入前需確認資料、硬體與預算。',
            ];
        }

        return [
            'mode' => 'publishable',
            'text' => '若想提高「' . $keyword . '」的 AI 曝光，內容應直接回答使用者會問的情境：適合誰、能解決什麼問題、多久能完成、費用如何估算，以及有哪些案例可參考。',
        ];
    }

    return [
        'mode' => 'guidance',
        'text' => '此題建議補成可比較內容：列出品牌能力、案例類型、服務流程、費用透明度與售後維護，讓 AI 能判斷你和其他方案的差異。',
    ];
}

function si_geo_competitor_draft($title)
{
    $title = trim((string)$title);
    if ($title === '') {
        $title = '服務特色';
    }

    return '建議把「' . $title . '」改寫成可比較的差異段落，直接列出你的做法、適用情境、案例證據與使用者能得到的結果。避免只寫形容詞，應補上流程、交付內容或成果說明。';
}

function si_build_aeo_actions($tabKey)
{
    if ($tabKey === 'faq') {
        return [
            '先挑 3 到 5 個高商業意圖問題，不要只寫泛用 FAQ。',
            '每題使用「短答案、補充說明、行動入口」格式。',
            '把 FAQ 放到對應服務頁，而不是只集中在獨立 FAQ 頁。',
        ];
    }

    if ($tabKey === 'snippet') {
        return [
            '每個核心服務頁補一段 40 到 80 字短答案。',
            '短答案包含定義、適用情境、下一步行動。',
            '把短答案放在頁面前半段，方便搜尋與 AI 擷取。',
        ];
    }

    if ($tabKey === 'gap') {
        return [
            '補齊費用、流程、比較、案例與常見疑慮。',
            '用案例頁建立權威訊號，不只靠 FAQ。',
            '每次改版後用 GSC 觀察曝光、點擊與查詢詞變化。',
        ];
    }

    return [
        '把 AEO 指標視為內容結構檢查，不要當成實際引用率。',
        '優先補有商業意圖的問題與短答案。',
        '串接 GSC 後再把問題機會改成較可信的資料分析。',
    ];
}

function si_build_geo_payload($userId, $siteId, $tabKey, array $seo)
{
    $issueCount = si_issue_count($seo);
    $keywordCount = si_keyword_count($seo);
    $opportunities = si_opportunities($seo);
    $suggestions = si_suggestions($seo);
    $visibility = max(18, min(88, 45 + ($keywordCount * 2) - ($issueCount * 5)));
    $mentions = max(1, min(30, $keywordCount + count($opportunities) + 2));
    $citationPages = max(1, min(12, count($opportunities) + count($suggestions) + 1));

    $titleMap = [
        'overview' => 'GEO 分析總覽',
        'citations' => 'AI 引用來源',
        'visibility' => 'AI 曝光情境',
        'competitors' => '競品差異',
    ];

    $panelTitleMap = [
        'overview' => 'AI 曝光機會',
        'citations' => '引用候選來源',
        'visibility' => '可被提及的情境',
        'competitors' => '競品與差異化',
    ];

    return [
        'user_id' => $userId,
        'site_id' => $siteId,
        'module' => 'geo',
        'tab' => $tabKey,
        'title' => $titleMap[$tabKey] ?? 'GEO 分析',
        'desc' => si_geo_desc($tabKey),
        'metrics' => si_build_geo_metrics($tabKey, $visibility, $mentions, $citationPages, $issueCount),
        'panelTitle' => $panelTitleMap[$tabKey] ?? 'AI 曝光機會',
        'items' => si_build_geo_items($tabKey, $opportunities, $suggestions, $seo),
        'actions' => si_build_geo_actions($tabKey),
        'sideTitle' => si_geo_side_title($tabKey),
        'sideItems' => si_build_geo_side_items($tabKey, $seo, $visibility, $issueCount, $citationPages),
        'recommendation' => si_geo_recommendation($tabKey),
        'source' => 'rule-based',
        'status' => 'ready',
    ];
}

function si_geo_desc($tabKey)
{
    if ($tabKey === 'citations') {
        return '整理哪些頁面或內容最適合作為 AI 引用來源，包含服務頁、案例頁、FAQ 與比較內容。';
    }
    if ($tabKey === 'visibility') {
        return '找出品牌或服務可能被 AI 提及的搜尋情境，讓內容更貼近使用者提問方式。';
    }
    if ($tabKey === 'competitors') {
        return '檢查與競品相比，網站還缺少哪些可被 AI 辨識的差異化訊號。';
    }
    return '評估網站在 AI 搜尋回答中的可見度，並整理引用來源、曝光情境與品牌權威訊號。';
}

function si_geo_side_title($tabKey)
{
    if ($tabKey === 'citations') return '引用準備度';
    if ($tabKey === 'visibility') return '曝光情境';
    if ($tabKey === 'competitors') return '差異訊號';
    return 'GEO 判讀基準';
}

function si_geo_recommendation($tabKey)
{
    if ($tabKey === 'citations') {
        return '優先建立能被引用的來源頁：案例、服務定義、流程、FAQ 與可驗證成果。';
    }
    if ($tabKey === 'visibility') {
        return '把內容改成使用者會問的句型，例如費用、適合誰、怎麼做、與其他方案差在哪。';
    }
    if ($tabKey === 'competitors') {
        return '補強品牌獨特性，例如案例數、技術能力、產業經驗、服務流程與成果證明。';
    }
    return 'GEO 的核心不是塞關鍵字，而是讓 AI 找得到、看得懂、敢引用你的內容。';
}

function si_build_geo_metrics($tabKey, $visibility, $mentions, $citationPages, $issueCount)
{
    if ($tabKey === 'citations') {
        return [
            ['label' => '引用候選頁', 'value' => (string)$citationPages, 'note' => '服務/案例/FAQ'],
            ['label' => '引用友善度', 'value' => si_score_level(max(20, 55 + ($citationPages * 4))), 'note' => '內容結構', 'basis' => '依服務頁、案例頁、FAQ 與內容結構推估，顯示為等級而非精準 KPI。'],
            ['label' => '技術風險', 'value' => (string)$issueCount, 'note' => '會影響理解'],
        ];
    }

    if ($tabKey === 'visibility') {
        return [
            ['label' => 'AI 曝光度', 'value' => si_score_level($visibility), 'note' => 'rule-based', 'basis' => '依 SEO 關鍵字、技術問題與內容入口推估，並非實際 AI 提及率。'],
            ['label' => '曝光情境', 'value' => (string)$mentions, 'note' => '可能被問到'],
            ['label' => '內容入口', 'value' => (string)max(2, $citationPages), 'note' => '需補強頁面'],
        ];
    }

    if ($tabKey === 'competitors') {
        return [
            ['label' => '差異訊號', 'value' => (string)max(1, floor($mentions / 3)), 'note' => '品牌特色'],
            ['label' => '待補證據', 'value' => (string)max(2, $issueCount + 1), 'note' => '案例/數據'],
            ['label' => '比較內容', 'value' => (string)max(3, $citationPages), 'note' => '可新增題材'],
        ];
    }

    return [
        ['label' => 'AI 曝光度', 'value' => si_score_level($visibility), 'note' => 'rule-based', 'basis' => '依 SEO 關鍵字、技術問題與內容入口推估，並非實際 AI 提及率。'],
        ['label' => '曝光機會', 'value' => (string)$mentions, 'note' => '依 SEO 資料推估'],
        ['label' => '引用候選頁', 'value' => (string)$citationPages, 'note' => '建議補強'],
    ];
}

function si_build_geo_items($tabKey, array $opportunities, array $suggestions, array $seo)
{
    $items = [];
    $confidence = si_confidence($seo);
    $sourceLabel = si_has_gsc_data($seo) ? '資料來源：GSC / SEO 分析' : '資料來源：SEO 分析推估';

    if ($tabKey === 'citations') {
        foreach ($opportunities as $item) {
            $keyword = (string)($item['keyword'] ?? '核心服務');
            $draft = si_geo_draft($keyword, 'citations');
            $items[] = [
                'title' => '建立「' . $keyword . '」的引用候選頁',
                'source' => '引用來源',
                'status' => '內容要包含定義、服務流程、適用情境與案例入口，讓 AI 有明確來源可引用。',
                'tags' => ['引用候選', '案例', 'FAQ'],
                'sourceLabel' => $sourceLabel,
                'placement' => '建議放置：服務頁前半段、案例頁摘要或 FAQ 上方。',
                'draft' => $draft['text'],
                'draftMode' => $draft['mode'],
                'confidence' => $confidence,
                'intent' => si_keyword_intent($keyword),
                'basis' => '依「' . $keyword . '」推估可建立 AI 引用來源；已先排除品牌導覽詞與重複變體。',
            ];
        }
        if (empty($items)) {
            $items[] = [
                'title' => '建立服務定義頁與案例頁，讓 AI 有明確來源可引用',
                'source' => '引用來源',
                'status' => '目前缺少關鍵字資料，先補通用但可驗證的品牌內容。',
                'tags' => ['服務頁', '案例頁'],
                'sourceLabel' => '資料來源：SEO 技術檢查推估',
                'placement' => '建議放置：主要服務頁與案例列表頁。',
                'draft' => '服務頁應清楚說明提供什麼、適合誰、如何導入與有哪些案例。若能補上流程、時程、交付內容與案例連結，AI 較容易把該頁視為可引用來源。',
                'draftMode' => 'publishable',
                'confidence' => 'low',
                'intent' => '信任建立',
            ];
        }
        return si_ai_polish_items($items, $seo, $tabKey);
    }

    if ($tabKey === 'visibility') {
        foreach ($opportunities as $item) {
            $keyword = (string)($item['keyword'] ?? '核心服務');
            $draft = si_geo_draft($keyword, 'visibility');
            $items[] = [
                'title' => '讓「' . $keyword . '」出現在 AI 會回答的情境中',
                'source' => '曝光情境',
                'status' => '補上問題句、比較句與實際案例，提升被提及機率。',
                'tags' => ['AI 曝光', '搜尋情境'],
                'sourceLabel' => $sourceLabel,
                'placement' => '建議放置：服務頁 FAQ、比較段落或情境型文章。',
                'draft' => $draft['text'],
                'draftMode' => $draft['mode'],
                'confidence' => $confidence,
                'intent' => si_keyword_intent($keyword),
                'basis' => '依「' . $keyword . '」推估可能被 AI 回答或推薦的搜尋情境。',
            ];
        }
        if (empty($items)) {
            $items[] = [
                'title' => '補強品牌與服務的搜尋情境內容',
                'source' => '曝光情境',
                'status' => '以使用者會問的問題為主，不只描述公司自己想說的賣點。',
                'tags' => ['AI 曝光'],
                'sourceLabel' => '資料來源：SEO 技術檢查推估',
                'placement' => '建議放置：服務頁 FAQ 或使用情境段落。',
                'draft' => '品牌服務內容應改成使用者會問的情境，例如適合哪些產業、預算怎麼抓、多久能完成、和其他方案差在哪。這些問題比單純品牌介紹更容易被 AI 回答引用。',
                'draftMode' => 'publishable',
                'confidence' => 'low',
                'intent' => '資訊查詢',
            ];
        }
        return si_ai_polish_items($items, $seo, $tabKey);
    }

    if ($tabKey === 'competitors') {
        foreach (array_slice($suggestions, 0, 3) as $item) {
            $title = (string)($item['title'] ?? '內容優化');
            $items[] = [
                'title' => '把「' . $title . '」轉成可比較的差異',
                'source' => '競品差異',
                'status' => '補上與其他方案不同的能力、流程、經驗或案例證據。',
                'tags' => ['差異化', '證據'],
                'sourceLabel' => '資料來源：SEO 建議',
                'placement' => '建議放置：競品比較段落、服務頁中段或案例頁摘要。',
                'draft' => si_geo_competitor_draft($title),
                'draftMode' => 'guidance',
                'confidence' => $confidence,
                'intent' => '差異化比較',
                'basis' => 'GEO 需要清楚的差異訊號，AI 才較容易在推薦或比較回答中提及品牌。',
            ];
        }
        if (empty($items)) {
            $items[] = [
                'title' => '補強競品比較、服務流程與案例成果',
                'source' => '競品差異',
                'status' => 'AI 需要明確差異與可信證據，才容易把你列入推薦。',
                'tags' => ['比較', '案例'],
                'sourceLabel' => '資料來源：SEO 技術檢查推估',
                'placement' => '建議放置：服務頁比較區塊或案例頁。',
                'draft' => '若想提高 AI 推薦機率，頁面應清楚說明與一般廠商的差異，例如是否有完整企劃流程、跨產業案例、透明報價與上線後維護。這些訊號能幫助 AI 判斷品牌是否值得被列入候選。',
                'draftMode' => 'publishable',
                'confidence' => 'low',
                'intent' => '差異化比較',
            ];
        }
        return si_ai_polish_items($items, $seo, $tabKey);
    }

    $items[] = [
        'title' => '讓品牌內容更容易被 AI 找到、理解與引用',
        'source' => 'GEO 總覽',
        'status' => '先補服務定義、案例證據與 FAQ，再追蹤 AI 是否開始提及品牌。',
        'tags' => ['AI 可見度', '引用來源'],
        'sourceLabel' => $sourceLabel,
        'placement' => '建議放置：服務頁、案例頁與 FAQ 的核心段落。',
        'draft' => 'GEO 的重點是讓 AI 找得到、看得懂並敢引用品牌內容。建議先補服務定義、適用情境、案例證據、流程與 FAQ，再觀察 AI 回答中是否開始提及品牌或服務。',
        'draftMode' => 'publishable',
        'confidence' => $confidence,
        'intent' => '品牌曝光',
    ];
    foreach (array_slice($suggestions, 0, 2) as $item) {
        $items[] = [
            'title' => (string)($item['title'] ?? '補強 AI 曝光訊號'),
            'source' => 'SEO 建議',
            'status' => (string)($item['reason'] ?? '建議補強內容與內部連結。'),
            'tags' => ['SEO 訊號', 'GEO'],
        ];
    }
    return si_ai_polish_items($items, $seo, $tabKey);
}

function si_build_geo_actions($tabKey)
{
    if ($tabKey === 'citations') {
        return [
            '每個核心服務至少建立一個可引用段落。',
            '案例頁補上產業、需求、解法與成果。',
            'FAQ 與服務頁互相連結，形成清楚引用路徑。',
        ];
    }

    if ($tabKey === 'visibility') {
        return [
            '把內容改成使用者會問的情境句。',
            '補上費用、流程、適合對象與比較內容。',
            '觀察 ChatGPT、Perplexity、Google AI Overview 是否開始提及品牌。',
        ];
    }

    if ($tabKey === 'competitors') {
        return [
            '列出競品常見主張，再補自己的差異證據。',
            '用案例與數據支撐品牌特色。',
            '建立比較型內容，不只寫單向介紹。',
        ];
    }

    return [
        '先建立可引用頁，再追蹤 AI 是否提及。',
        '補案例與權威訊號，避免只有 FAQ。',
        '用 GSC 與 AI 實測結果驗證調整方向。',
    ];
}

function si_build_geo_side_items($tabKey, array $seo, $visibility, $issueCount, $citationPages)
{
    if ($tabKey === 'citations') {
        return [
            ['name' => '引用候選頁', 'score' => max(20, 55 + ($citationPages * 5))],
            ['name' => '技術可讀性', 'score' => max(20, 82 - ($issueCount * 8))],
            ['name' => '內容可信度', 'score' => max(20, 70 - ($issueCount * 5))],
        ];
    }

    if ($tabKey === 'visibility') {
        return [
            ['name' => '品牌曝光', 'score' => $visibility],
            ['name' => '問題覆蓋', 'score' => max(20, $visibility - 8)],
            ['name' => '搜尋情境', 'score' => max(20, $visibility - 14)],
        ];
    }

    if ($tabKey === 'competitors') {
        return [
            ['name' => si_site_label($seo), 'score' => $visibility],
            ['name' => '市場平均', 'score' => min(92, $visibility + 8)],
            ['name' => '差異缺口', 'score' => max(20, $visibility - 12)],
        ];
    }

    return [
        ['name' => si_site_label($seo), 'score' => $visibility],
        ['name' => '內容可讀性', 'score' => max(20, 80 - ($issueCount * 8))],
        ['name' => '引用友善度', 'score' => max(20, 55 + ($citationPages * 4))],
    ];
}
