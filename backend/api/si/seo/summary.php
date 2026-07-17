<?php
// API responses must remain valid JSON. Send PHP diagnostics to the error log
// instead of mixing warnings into the response body.
ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . "/../../db_connect.php";
require_once __DIR__ . "/../../legacy_auth.php";

$seoServiceIdentity = hs_require_service_identity($conn);

/* ======================================================
 * CONFIG
 * ====================================================== */
define('GSC_SA_JSON', getenv('GOOGLE_APPLICATION_CREDENTIALS') ?: '');
define('GSC_SA_JSON_CONTENT', getenv('GOOGLE_SERVICE_ACCOUNT_JSON') ?: '');
define('GSC_SCOPE', 'https://www.googleapis.com/auth/webmasters.readonly');

/* ======================================================
 * RESPONSE HELPERS
 * ====================================================== */
function success($data = [])
{
  echo json_encode([
    "ok" => true,
    "data" => $data
  ], JSON_UNESCAPED_UNICODE);
  exit;
}

function fail($message, $code = "BAD_REQUEST", $extra = [], $status = 400)
{
  http_response_code($status);
  echo json_encode([
    "ok" => false,
    "error" => array_merge([
      "code" => $code,
      "message" => $message
    ], $extra)
  ], JSON_UNESCAPED_UNICODE);
  exit;
}

/* ======================================================
 * UTILS
 * ====================================================== */
function base64url($data)
{
  return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function normalize_site_url($url)
{
  $url = trim($url);
  if ($url === '') return false;

  if (!preg_match('#^https?://#i', $url)) {
    $url = 'https://' . $url;
  }

  $parts = parse_url($url);
  if (!$parts || empty($parts['scheme']) || empty($parts['host'])) {
    return false;
  }

  $scheme = strtolower($parts['scheme']);
  $host = strtolower($parts['host']);
  $path = isset($parts['path']) ? rtrim($parts['path'], '/') : '';

  return $scheme . '://' . $host . ($path ?: '') . '/';
}

/* ======================================================
 * SERVICE ACCOUNT → JWT → ACCESS TOKEN
 * ====================================================== */
function gsc_access_token()
{
  static $cached = null;

  if ($cached) return $cached;

  $rawServiceAccount = trim(GSC_SA_JSON_CONTENT);

  if ($rawServiceAccount === '') {
    $credentialsPath = trim(GSC_SA_JSON);

    // The @ prevents an open_basedir warning from corrupting the JSON API body.
    if ($credentialsPath === '' || !@is_file($credentialsPath) || !@is_readable($credentialsPath)) {
      fail("Google Search Console credentials are not configured", "GSC_CONFIG_ERROR", [], 500);
    }

    $rawServiceAccount = @file_get_contents($credentialsPath);
    if ($rawServiceAccount === false) {
      fail("Google Search Console credentials cannot be read", "GSC_CONFIG_ERROR", [], 500);
    }
  }

  $sa = json_decode($rawServiceAccount, true);
  if (!$sa) {
    fail("Invalid service account json", "GSC_CONFIG_ERROR", [], 500);
  }

  if (empty($sa['client_email']) || empty($sa['private_key'])) {
    fail("Service account json is missing required fields", "GSC_CONFIG_ERROR", [], 500);
  }

  $now = time();

  $header = base64url(json_encode([
    "alg" => "RS256",
    "typ" => "JWT"
  ]));

  $claim = base64url(json_encode([
    "iss"   => $sa["client_email"],
    "scope" => GSC_SCOPE,
    "aud"   => "https://oauth2.googleapis.com/token",
    "iat"   => $now,
    "exp"   => $now + 3600
  ]));

  $unsigned = $header . "." . $claim;

  $signed = openssl_sign($unsigned, $sig, $sa["private_key"], OPENSSL_ALGO_SHA256);
  if (!$signed) {
    fail("Failed to sign JWT", "GSC_JWT_SIGN_ERROR");
  }

  $jwt = $unsigned . "." . base64url($sig);

  $ch = curl_init("https://oauth2.googleapis.com/token");
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ["Content-Type: application/x-www-form-urlencoded"],
    CURLOPT_POSTFIELDS => http_build_query([
      "grant_type" => "urn:ietf:params:oauth:grant-type:jwt-bearer",
      "assertion"  => $jwt
    ]),
    CURLOPT_TIMEOUT => 20
  ]);

  $res = curl_exec($ch);
  $curlError = curl_error($ch);
  curl_close($ch);

  if ($res === false) {
    fail("Token request failed", "GSC_TOKEN_REQUEST_ERROR", [
      "detail" => $curlError
    ]);
  }

  $json = json_decode($res, true);
  if (!isset($json["access_token"])) {
    fail("Token error", "GSC_TOKEN_ERROR", [
      "raw" => $res
    ]);
  }

  $cached = $json["access_token"];
  return $cached;
}

/* ======================================================
 * FETCH HTML
 * ====================================================== */
function fetch_html($url)
{
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT => 15,
    CURLOPT_CONNECTTIMEOUT => 5,
    CURLOPT_USERAGENT => "HighlightSEO/1.0",
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
  ]);

  $html = curl_exec($ch);
  $curlError = curl_error($ch);
  $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $finalUrl = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
  $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);

  curl_close($ch);

  $ok = ($html !== false && $httpCode >= 200 && $httpCode < 400);

  return [
    "ok" => $ok,
    "html" => $html ?: '',
    "http_code" => $httpCode ?: 0,
    "final_url" => $finalUrl ?: $url,
    "content_type" => $contentType ?: '',
    "error" => $curlError ?: null
  ];
}

/* ======================================================
 * HTML ANALYSIS HELPERS
 * ====================================================== */
function get_title_text($html)
{
  if (preg_match('/<title[^>]*>(.*?)<\/title>/is', $html, $m)) {
    return trim(html_entity_decode(strip_tags($m[1]), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
  }
  return '';
}

function html_attr_value($tag, $attr)
{
  $attr = preg_quote($attr, '/');
  if (preg_match('/\s' . $attr . '\s*=\s*(["\'])(.*?)\1/is', $tag, $m)) {
    return html_entity_decode(trim($m[2]), ENT_QUOTES | ENT_HTML5, 'UTF-8');
  }

  if (preg_match('/\s' . $attr . '\s*=\s*([^\s>]+)/is', $tag, $m)) {
    return html_entity_decode(trim($m[1], "\"' \t\r\n"), ENT_QUOTES | ENT_HTML5, 'UTF-8');
  }

  return '';
}

function html_tags($html, $tagName)
{
  $tagName = preg_quote($tagName, '/');
  if (preg_match_all('/<' . $tagName . '\b[^>]*>/is', $html, $matches)) {
    return $matches[0];
  }

  return [];
}

function get_meta_description($html)
{
  foreach (html_tags($html, 'meta') as $tag) {
    $name = strtolower(html_attr_value($tag, 'name'));
    $property = strtolower(html_attr_value($tag, 'property'));

    if ($name === 'description' || $property === 'og:description') {
      $content = html_attr_value($tag, 'content');
      if ($content !== '') {
        return trim($content);
      }
    }
  }

  return '';
}

function get_h1_list($html)
{
  $h1s = [];
  if (preg_match_all('/<h1[^>]*>(.*?)<\/h1>/is', $html, $matches)) {
    foreach ($matches[1] as $raw) {
      $text = trim(html_entity_decode(strip_tags($raw), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
      if ($text !== '') $h1s[] = $text;
    }
  }
  return $h1s;
}

function has_canonical($html)
{
  return get_canonical_href($html) !== '';
}

function get_canonical_href($html)
{
  foreach (html_tags($html, 'link') as $tag) {
    $rel = strtolower(html_attr_value($tag, 'rel'));
    if (preg_match('/(^|\s)canonical(\s|$)/i', $rel)) {
      return trim(html_attr_value($tag, 'href'));
    }
  }

  return '';
}

function get_robots_meta($html)
{
  foreach (html_tags($html, 'meta') as $tag) {
    if (strtolower(html_attr_value($tag, 'name')) === 'robots') {
      return strtolower(trim(html_attr_value($tag, 'content')));
    }
  }

  return '';
}

function visible_text_length($html)
{
  $text = preg_replace('/<script\b[^>]*>(.*?)<\/script>/is', '', $html);
  $text = preg_replace('/<style\b[^>]*>(.*?)<\/style>/is', '', $text);
  $text = trim(html_entity_decode(strip_tags($text), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
  $text = preg_replace('/\s+/u', ' ', $text);
  return mb_strlen($text);
}

/* ======================================================
 * BASIC SEO CHECK
 * ====================================================== */
function analyze_tech($html, $url, $httpCode = 200, $contentType = '')
{
  $issues = [];

  if ($httpCode !== 200) {
    $issues[] = [
      "severity" => "HIGH",
      "type" => "BAD_STATUS_CODE",
      "url" => $url,
      "message" => "頁面狀態碼不是 200，目前為 {$httpCode}"
    ];
  }

  if ($contentType && stripos($contentType, 'text/html') === false) {
    $issues[] = [
      "severity" => "HIGH",
      "type" => "NON_HTML_CONTENT",
      "url" => $url,
      "message" => "頁面內容不是 HTML"
    ];
  }

  $title = get_title_text($html);
  if ($title === '') {
    $issues[] = [
      "severity" => "HIGH",
      "type" => "MISSING_TITLE",
      "url" => $url,
      "message" => "缺少 title"
    ];
  } else {
    $titleLen = mb_strlen($title);
    if ($titleLen < 10) {
      $issues[] = [
        "severity" => "MEDIUM",
        "type" => "TITLE_TOO_SHORT",
        "url" => $url,
        "message" => "title 過短，建議至少 10 字以上"
      ];
    } elseif ($titleLen > 70) {
      $issues[] = [
        "severity" => "MEDIUM",
        "type" => "TITLE_TOO_LONG",
        "url" => $url,
        "message" => "title 過長，可能被搜尋結果截斷"
      ];
    }
  }

  $description = get_meta_description($html);
  if ($description === '') {
    $issues[] = [
      "severity" => "MEDIUM",
      "type" => "MISSING_META_DESCRIPTION",
      "url" => $url,
      "message" => "缺少 meta description"
    ];
  } else {
    $descLen = mb_strlen($description);
    if ($descLen < 50) {
      $issues[] = [
        "severity" => "LOW",
        "type" => "META_DESCRIPTION_TOO_SHORT",
        "url" => $url,
        "message" => "meta description 過短，建議補足摘要內容"
      ];
    } elseif ($descLen > 160) {
      $issues[] = [
        "severity" => "LOW",
        "type" => "META_DESCRIPTION_TOO_LONG",
        "url" => $url,
        "message" => "meta description 過長，可能被搜尋結果截斷"
      ];
    }
  }

  if (!has_canonical($html)) {
    $issues[] = [
      "severity" => "HIGH",
      "type" => "MISSING_CANONICAL",
      "url" => $url,
      "message" => "缺少 canonical，可能造成權重分散"
    ];
  }

  $h1s = get_h1_list($html);
  if (count($h1s) === 0) {
    $issues[] = [
      "severity" => "MEDIUM",
      "type" => "MISSING_H1",
      "url" => $url,
      "message" => "首頁缺少 H1"
    ];
  } elseif (count($h1s) > 1) {
    $issues[] = [
      "severity" => "LOW",
      "type" => "MULTIPLE_H1",
      "url" => $url,
      "message" => "頁面有多個 H1，建議確認主題層級是否清楚"
    ];
  }

  $robots = get_robots_meta($html);
  if ($robots !== '' && strpos($robots, 'noindex') !== false) {
    $issues[] = [
      "severity" => "HIGH",
      "type" => "NOINDEX_FOUND",
      "url" => $url,
      "message" => "頁面含有 noindex，可能不會被搜尋引擎收錄"
    ];
  }

  $textLen = visible_text_length($html);
  if ($textLen < 120) {
    $issues[] = [
      "severity" => "LOW",
      "type" => "LOW_CONTENT_TEXT",
      "url" => $url,
      "message" => "頁面可見文字偏少，可能不利於內容理解與排名"
    ];
  }

  return $issues;
}

/* ======================================================
 * GSC KEYWORDS
 * ====================================================== */
function gsc_keywords($siteUrl, $days = 28, $limit = 50)
{
  try {
    $token = gsc_access_token();

    $end = new DateTime("yesterday");
    $start = (clone $end)->modify("-{$days} days");

    $payload = [
      "startDate" => $start->format("Y-m-d"),
      "endDate"   => $end->format("Y-m-d"),
      "dimensions" => ["query"],
      "rowLimit"  => $limit
    ];

    $url = "https://www.googleapis.com/webmasters/v3/sites/" .
      urlencode($siteUrl) . "/searchAnalytics/query";

    $ch = curl_init($url);
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_POST => true,
      CURLOPT_HTTPHEADER => [
        "Authorization: Bearer {$token}",
        "Content-Type: application/json"
      ],
      CURLOPT_POSTFIELDS => json_encode($payload),
      CURLOPT_TIMEOUT => 20
    ]);

    $res = curl_exec($ch);
    $curlError = curl_error($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($res === false) {
      return [
        "keywords" => [],
        "meta" => [
          "ok" => false,
          "message" => "GSC request failed",
          "detail" => $curlError
        ]
      ];
    }

    $json = json_decode($res, true);

    if ($httpCode >= 400) {
      return [
        "keywords" => [],
        "meta" => [
          "ok" => false,
          "message" => $json["error"]["message"] ?? "GSC http error",
          "http_code" => $httpCode
        ]
      ];
    }

    if (!isset($json["rows"])) {
      return [
        "keywords" => [],
        "meta" => [
          "ok" => true,
          "message" => "No keyword rows"
        ]
      ];
    }

    $out = [];
    foreach ($json["rows"] as $r) {
      $kw = $r["keys"][0] ?? "";
      if ($kw === '') continue;

      $position = isset($r["position"]) ? round((float)$r["position"], 1) : null;
      $ctr = isset($r["ctr"]) ? round($r["ctr"] * 100, 1) : 0.0;
      $clicks = isset($r["clicks"]) ? (int)$r["clicks"] : 0;
      $impressions = isset($r["impressions"]) ? (int)$r["impressions"] : 0;

      $action = "WATCH";
      if ($position !== null) {
        if ($position <= 5) {
          $action = "DEFEND";
        } elseif ($position <= 15) {
          $action = "PUSH";
        } else {
          $action = "WATCH";
        }
      }

      $out[] = [
        "keyword" => $kw,
        "position" => $position,
        "ctr" => $ctr,
        "clicks" => $clicks,
        "impressions" => $impressions,
        "action" => $action
      ];
    }

    return [
      "keywords" => $out,
      "meta" => [
        "ok" => true,
        "message" => "success"
      ]
    ];
  } catch (Throwable $e) {
    return [
      "keywords" => [],
      "meta" => [
        "ok" => false,
        "message" => $e->getMessage()
      ]
    ];
  }
}

/* ======================================================
 * KEYWORD GROUPING / SORTING
 * ====================================================== */
function sort_keywords_for_priority($keywords)
{
  usort($keywords, function ($a, $b) {
    $impA = (int)($a["impressions"] ?? 0);
    $impB = (int)($b["impressions"] ?? 0);

    $posA = (float)($a["position"] ?? 999);
    $posB = (float)($b["position"] ?? 999);

    $clickA = (int)($a["clicks"] ?? 0);
    $clickB = (int)($b["clicks"] ?? 0);

    if ($impA !== $impB) return $impB <=> $impA;
    if ($clickA !== $clickB) return $clickB <=> $clickA;
    return $posA <=> $posB;
  });

  return $keywords;
}

function build_keyword_groups($keywords)
{
  $push = [];
  $defend = [];
  $watch = [];

  foreach ($keywords as $k) {
    $action = $k["action"] ?? "WATCH";
    if ($action === "PUSH") $push[] = $k;
    elseif ($action === "DEFEND") $defend[] = $k;
    else $watch[] = $k;
  }

  $push = sort_keywords_for_priority($push);
  $defend = sort_keywords_for_priority($defend);
  $watch = sort_keywords_for_priority($watch);

  return [
    "pushKeywords" => $push,
    "defendKeywords" => $defend,
    "watchKeywords" => $watch
  ];
}

function build_top_opportunities($pushKeywords, $limit = 5)
{
  $out = [];

  foreach (array_slice($pushKeywords, 0, $limit) as $k) {
    $keyword = $k["keyword"] ?? "";
    $position = $k["position"] ?? null;

    $recommendation = "補強標題、段落文案與內部連結";
    if ($position !== null && $position <= 10) {
      $recommendation = "已接近首頁，優先補強首頁文案、案例頁與內部連結";
    } elseif ($position !== null && $position <= 15) {
      $recommendation = "可建立專門服務頁或案例頁，集中優化此關鍵字";
    }

    $out[] = [
      "keyword" => $keyword,
      "position" => $k["position"],
      "clicks" => $k["clicks"],
      "impressions" => $k["impressions"],
      "ctr" => $k["ctr"],
      "action" => $k["action"],
      "recommendation" => $recommendation
    ];
  }

  return $out;
}

/* ======================================================
 * HEALTH SCORE
 * ====================================================== */
function health_score($issues, $keywords, $gscMeta = [])
{
  $techScore = 100;

  foreach ($issues as $issue) {
    $severity = $issue["severity"] ?? "LOW";

    if ($severity === "HIGH") {
      $techScore -= 12;
    } elseif ($severity === "MEDIUM") {
      $techScore -= 6;
    } else {
      $techScore -= 3;
    }
  }

  $techScore = max(0, min(100, $techScore));

  $contentScore = null;

  if (!empty($gscMeta) && !empty($gscMeta["ok"])) {
    $contentScore = 0;

    if (!empty($keywords)) {
      $push = 0;
      $watch = 0;
      $defend = 0;
      $ctrSum = 0;

      foreach ($keywords as $k) {
        $action = $k["action"] ?? "WATCH";
        if ($action === "PUSH") $push++;
        if ($action === "WATCH") $watch++;
        if ($action === "DEFEND") $defend++;
        $ctrSum += (float)($k["ctr"] ?? 0);
      }

      $avgCtr = $ctrSum / count($keywords);

      $contentScore =
        min(40, $defend * 5) +
        min(30, $push * 3) +
        min(20, $avgCtr) -
        min(20, $watch * 2);

      $contentScore = max(0, min(100, (int)round($contentScore)));
    }
  }

  $finalScore = ($contentScore === null)
    ? $techScore
    : (int)round($techScore * 0.7 + $contentScore * 0.3);

  return [
    "score" => $finalScore,
    "breakdown" => [
      "tech" => $techScore,
      "content" => $contentScore
    ]
  ];
}

/* ======================================================
 * SUGGESTIONS
 * ====================================================== */
function build_suggestions($issues, $keywords, $gscMeta = [])
{
  $suggestions = [];
  $issueTypes = array_column($issues, 'type');

  if (
    in_array('MISSING_CANONICAL', $issueTypes) ||
    in_array('MISSING_H1', $issueTypes) ||
    in_array('MISSING_TITLE', $issueTypes) ||
    in_array('MISSING_META_DESCRIPTION', $issueTypes)
  ) {
    $suggestions[] = [
      "title" => "優先修復基礎技術欄位",
      "reason" => "canonical、title、description、H1 會直接影響搜尋引擎理解頁面主題與權重集中",
      "rule" => "TECH_FIX"
    ];
  }

  if (in_array('NOINDEX_FOUND', $issueTypes)) {
    $suggestions[] = [
      "title" => "確認是否誤設 noindex",
      "reason" => "若此頁需要排名，請移除 noindex，避免搜尋引擎不收錄",
      "rule" => "INDEXING_CHECK"
    ];
  }

  if (!empty($gscMeta) && empty($gscMeta["ok"])) {
    $suggestions[] = [
      "title" => "檢查 GSC 串接狀態",
      "reason" => "目前無法正確讀取 Search Console 關鍵字資料，建議確認網站是否已驗證與授權",
      "rule" => "GSC_CONNECT"
    ];
  } elseif (empty($keywords)) {
    $suggestions[] = [
      "title" => "補強可排名內容",
      "reason" => "目前查無關鍵字資料，建議先確認網站已收錄，並補足首頁與核心頁面的文字內容",
      "rule" => "CONTENT_BUILD"
    ];
  } else {
    foreach ($keywords as $k) {
      if (($k['action'] ?? '') === 'PUSH') {
        $suggestions[] = [
          "title" => "優先推進接近首頁的關鍵字",
          "reason" => "已有關鍵字排名接近前段，適合優先補強內容、標題與內部連結",
          "rule" => "PUSH_KEYWORDS"
        ];
        break;
      }
    }
  }

  if (empty($suggestions)) {
    $suggestions[] = [
      "title" => "持續觀察與定期更新",
      "reason" => "目前未發現明顯高風險問題，建議持續追蹤排名、CTR 與內容更新狀況",
      "rule" => "MONITOR"
    ];
  }

  return $suggestions;
}

/* ======================================================
 * API ENTRY
 * ====================================================== */
$input = json_decode(file_get_contents("php://input"), true);

if (!is_array($input)) {
  fail("Invalid JSON body", "INVALID_JSON");
}

$user_id = hs_require_service_member($conn, $input["user_id"] ?? 0);
$site_id = intval($input["site_id"] ?? 0);
$force = !empty($input["force"]);

if (!$user_id || !$site_id) {
  fail("user_id or site_id missing", "MISSING_PARAMS");
}

$stmt = $conn->prepare("
  SELECT id, site_name, site_url
  FROM seo_sites
  WHERE id = ? AND user_id = ?
  LIMIT 1
");

if ($stmt === false) {
  fail("Prepare failed", "SQL_PREPARE_FAILED", [
    "sql_error" => $conn->error
  ]);
}

$stmt->bind_param("ii", $site_id, $user_id);
$stmt->execute();
$result = $stmt->get_result();
$siteRow = $result->fetch_assoc();

if (!$siteRow) {
  fail("site not found", "SITE_NOT_FOUND");
}

$site = normalize_site_url($siteRow["site_url"]);
if ($site === false) {
  fail("invalid site_url in database", "INVALID_SITE_URL");
}

/* ======================================================
 * CACHE CHECK
 * ====================================================== */
$cacheTTL = 60 * 30; // 30 分鐘

if (!$force) {
  $cacheStmt = $conn->prepare("
    SELECT summary_json, updated_at
    FROM seo_summary_cache
    WHERE site_id = ? AND user_id = ?
    LIMIT 1
  ");

  if ($cacheStmt) {
    $cacheStmt->bind_param("ii", $site_id, $user_id);
    $cacheStmt->execute();
    $cacheResult = $cacheStmt->get_result();
    $cacheRow = $cacheResult->fetch_assoc();

    if ($cacheRow) {
      $updatedAtTs = strtotime($cacheRow["updated_at"]);
      $nowTs = time();

      if ($updatedAtTs && ($nowTs - $updatedAtTs) < $cacheTTL) {
        $cachedData = json_decode($cacheRow["summary_json"], true);

        if (is_array($cachedData)) {
          if (!isset($cachedData["meta"]) || !is_array($cachedData["meta"])) {
            $cachedData["meta"] = [];
          }

          $cachedData["meta"]["cache"] = true;
          $cachedData["meta"]["cache_updated_at"] = $cacheRow["updated_at"];

          success($cachedData);
        }
      }
    }
  }
}

$fetch = fetch_html($site);

if (!$fetch["ok"] && $fetch["html"] === '') {
  fail("crawl failed", "CRAWL_FAILED", [
    "detail" => [
      "http_code" => $fetch["http_code"],
      "error" => $fetch["error"],
      "final_url" => $fetch["final_url"]
    ]
  ]);
}

$issues = analyze_tech(
  $fetch["html"],
  $site,
  $fetch["http_code"],
  $fetch["content_type"]
);

$detectedTitle = get_title_text($fetch["html"]);
$detectedDescription = get_meta_description($fetch["html"]);
$detectedCanonical = get_canonical_href($fetch["html"]);

$gscResult = gsc_keywords($site, 28, 50);
$keywords = $gscResult["keywords"];
$gscMeta = $gscResult["meta"];

$keywordGroups = build_keyword_groups($keywords);
$pushKeywords = $keywordGroups["pushKeywords"];
$defendKeywords = $keywordGroups["defendKeywords"];
$watchKeywords = $keywordGroups["watchKeywords"];
$topOpportunities = build_top_opportunities($pushKeywords, 5);

$health = health_score($issues, $keywords, $gscMeta);
$suggestions = build_suggestions($issues, $keywords, $gscMeta);

function seo_issue_key($issue)
{
  return strtoupper((string)($issue['type'] ?? 'UNKNOWN')) . '|' . rtrim(strtolower((string)($issue['url'] ?? '')), '/');
}

function seo_issue_recommendation($type)
{
  $recommendations = [
    'BAD_STATUS_CODE' => '修正伺服器回應或重新導向，讓正式頁面回傳 HTTP 200。',
    'NON_HTML_CONTENT' => '確認網址指向可索引的 HTML 頁面，並修正 Content-Type。',
    'MISSING_TITLE' => '加入唯一且描述頁面主題的 title，建議控制在 10–70 字元。',
    'TITLE_TOO_SHORT' => '補充搜尋意圖、核心服務與品牌資訊，讓 title 更具辨識度。',
    'TITLE_TOO_LONG' => '精簡 title，將核心關鍵字與主要價值放在前段。',
    'MISSING_META_DESCRIPTION' => '加入能摘要頁面價值與行動誘因的 meta description。',
    'META_DESCRIPTION_TOO_SHORT' => '補充具體服務、受眾與行動誘因，提升搜尋結果可讀性。',
    'META_DESCRIPTION_TOO_LONG' => '精簡描述並保留核心價值，避免搜尋結果被截斷。',
    'MISSING_CANONICAL' => '加入指向正式版本網址的 rel="canonical"。',
    'MISSING_H1' => '加入一個清楚描述頁面主題的 H1。',
    'MULTIPLE_H1' => '保留單一主 H1，其他段落標題改用 H2/H3。',
    'NOINDEX_FOUND' => '確認頁面是否應被索引；若應公開，移除 noindex 並重新提交索引。',
    'LOW_CONTENT_TEXT' => '補充能回答搜尋意圖的原創內容、證據與明確下一步。'
  ];
  return $recommendations[strtoupper((string)$type)] ?? '檢查頁面來源並依搜尋引擎規範修正，完成後重新掃描驗證。';
}

foreach ($issues as &$issue) {
  $issue['recommendation'] = seo_issue_recommendation($issue['type'] ?? '');
}
unset($issue);

$previousScan = null;
$previousStmt = $conn->prepare('SELECT health_score, issue_count, issues_json, scanned_at FROM seo_scan_history WHERE site_id = ? AND user_id = ? ORDER BY id DESC LIMIT 1');
if ($previousStmt) {
  $previousStmt->bind_param('ii', $site_id, $user_id);
  $previousStmt->execute();
  $previousScan = $previousStmt->get_result()->fetch_assoc();
}

$previousIssues = $previousScan ? json_decode((string)$previousScan['issues_json'], true) : [];
$previousIssues = is_array($previousIssues) ? $previousIssues : [];
$previousByKey = [];
$currentByKey = [];
foreach ($previousIssues as $issue) $previousByKey[seo_issue_key($issue)] = $issue;
foreach ($issues as $issue) $currentByKey[seo_issue_key($issue)] = $issue;
$fixedItems = array_values(array_diff_key($previousByKey, $currentByKey));
$addedItems = array_values(array_diff_key($currentByKey, $previousByKey));
$remainingItems = array_values(array_intersect_key($currentByKey, $previousByKey));
$currentScannedAt = date('Y-m-d H:i:s');
$comparison = [
  'available' => is_array($previousScan),
  'previous_scanned_at' => $previousScan['scanned_at'] ?? null,
  'current_scanned_at' => $currentScannedAt,
  'health_score' => [
    'before' => (int)($previousScan['health_score'] ?? $health['score']),
    'after' => (int)$health['score'],
    'change' => (int)$health['score'] - (int)($previousScan['health_score'] ?? $health['score'])
  ],
  'issues' => [
    'before' => (int)($previousScan['issue_count'] ?? count($issues)),
    'after' => count($issues),
    'fixed' => count($fixedItems),
    'added' => count($addedItems),
    'remaining' => count($remainingItems),
    'fixed_items' => $fixedItems,
    'added_items' => $addedItems,
    'remaining_items' => $remainingItems
  ]
];

$finalData = [
  "site_id" => (int)$siteRow["id"],
  "site_name" => $siteRow["site_name"] !== '' ? $siteRow["site_name"] : null,
  "site" => $site,
  "health" => $health,
  "keywords" => $keywords,
  "pushKeywords" => $pushKeywords,
  "defendKeywords" => $defendKeywords,
  "watchKeywords" => $watchKeywords,
  "topOpportunities" => $topOpportunities,
  "technicalIssues" => $issues,
  "suggestions" => $suggestions,
  "comparison" => $comparison,
  "meta" => [
    "source" => "gsc+crawl",
    "updated_at" => $currentScannedAt,
    "http_code" => $fetch["http_code"],
    "final_url" => $fetch["final_url"],
    "content_type" => $fetch["content_type"],
    "detected_title" => $detectedTitle,
    "detected_description" => $detectedDescription,
    "detected_canonical" => $detectedCanonical,
    "gsc" => $gscMeta,
    "cache" => false
  ]
];

$scanJson = json_encode($finalData, JSON_UNESCAPED_UNICODE);
$issuesJson = json_encode($issues, JSON_UNESCAPED_UNICODE);
if ($scanJson !== false && $issuesJson !== false) {
  $scanStmt = $conn->prepare('INSERT INTO seo_scan_history (site_id, user_id, health_score, issue_count, issues_json, summary_json) VALUES (?, ?, ?, ?, ?, ?)');
  if ($scanStmt) {
    $healthScore = (int)$health['score'];
    $issueCount = count($issues);
    $scanStmt->bind_param('iiiiss', $site_id, $user_id, $healthScore, $issueCount, $issuesJson, $scanJson);
    $scanStmt->execute();
  }
}

/* ======================================================
 * SAVE CACHE
 * ====================================================== */
$cacheJson = json_encode($finalData, JSON_UNESCAPED_UNICODE);

if ($cacheJson !== false) {
  $saveStmt = $conn->prepare("
    INSERT INTO seo_summary_cache (site_id, user_id, summary_json)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE
      summary_json = VALUES(summary_json),
      updated_at = CURRENT_TIMESTAMP
  ");

  if ($saveStmt) {
    $saveStmt->bind_param("iis", $site_id, $user_id, $cacheJson);
    $saveStmt->execute();
  }
}

success($finalData);
