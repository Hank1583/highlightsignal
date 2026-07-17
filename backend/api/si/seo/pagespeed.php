<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

require_once __DIR__ . "/../../db_connect.php";

$pagespeedConfigPath = __DIR__ . "/../../pagespeed_config.php";
if (file_exists($pagespeedConfigPath)) {
  require_once $pagespeedConfigPath;
}

function pagespeed_success($data = [])
{
  echo json_encode([
    "ok" => true,
    "data" => $data
  ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function pagespeed_fail($message, $code = "BAD_REQUEST", $status = 400)
{
  http_response_code($status);
  echo json_encode([
    "ok" => false,
    "error" => [
      "code" => $code,
      "message" => $message
    ]
  ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function normalize_strategy($value)
{
  return $value === "desktop" ? "desktop" : "mobile";
}

function normalize_action($value)
{
  $action = strtolower(trim((string)$value));

  if (in_array($action, ["latest", "cache", "get"], true)) {
    return "latest";
  }

  if (in_array($action, ["history", "list"], true)) {
    return "history";
  }

  if (in_array($action, ["run", "refresh", "score", "pagespeed", "test"], true)) {
    return "run";
  }

  if ($action === "save") {
    return "save";
  }

  return "run";
}

function normalize_url($value)
{
  $url = trim((string)$value);
  if ($url === "") return "";

  if (!preg_match('#^https?://#i', $url)) {
    $url = "https://" . $url;
  }

  return $url;
}

function is_public_pagespeed_url($url)
{
  $parts = parse_url($url);
  if (!$parts || empty($parts["scheme"]) || empty($parts["host"])) {
    return false;
  }

  $host = strtolower($parts["host"]);
  if (
    $host === "localhost" ||
    $host === "127.0.0.1" ||
    $host === "::1" ||
    substr($host, -6) === ".local"
  ) {
    return false;
  }

  return in_array(strtolower($parts["scheme"]), ["http", "https"], true);
}

function pagespeed_api_key()
{
  $env = getenv("PAGESPEED_API_KEY");
  if (is_string($env) && trim($env) !== "") {
    return trim($env);
  }

  if (defined("PAGESPEED_API_KEY") && trim((string)PAGESPEED_API_KEY) !== "") {
    return trim((string)PAGESPEED_API_KEY);
  }

  return "";
}

function score_status($score)
{
  if ($score === null) return "unknown";
  if ($score >= 90) return "good";
  if ($score >= 50) return "average";
  return "poor";
}

function audit_status($score)
{
  if (!is_numeric($score)) return "unknown";
  return score_status((int)round(((float)$score) * 100));
}

function pagespeed_error_message($httpCode, $error)
{
  $code = isset($error["status"]) ? (string)$error["status"] : "PAGESPEED_FAILED";
  $raw = isset($error["message"]) ? (string)$error["message"] : "";
  $rawLower = strtolower($raw);

  if ($httpCode === 429 || $code === "RESOURCE_EXHAUSTED") {
    return [
      "code" => $code,
      "message" => "PageSpeed API 今日額度已用完，請明天再試；若尚未設定 API key，請在 PHP 專案建立 pagespeed_config.php 並定義 PAGESPEED_API_KEY。"
    ];
  }

  if ($code === "UNKNOWN_ERROR" || strpos($rawLower, "puppeteer") !== false || strpos($rawLower, "something went wrong") !== false) {
    return [
      "code" => $code,
      "message" => "Google Lighthouse 這次執行失敗。請確認網址是公開可連線的正式網址，沒有登入牆或過多跳轉；也可以稍後再重新跑分。"
    ];
  }

  if ($code === "INVALID_ARGUMENT") {
    return [
      "code" => $code,
      "message" => "PageSpeed 無法分析這個網址。請確認網址包含正確網域，且 Google 可以公開存取。"
    ];
  }

  return [
    "code" => $code,
    "message" => $raw !== "" ? $raw : "PageSpeed 跑分失敗。"
  ];
}

function run_google_pagespeed($url, $strategy)
{
  if (!function_exists("curl_init")) {
    pagespeed_fail("PHP cURL is not available.", "CURL_NOT_AVAILABLE", 500);
  }

  $params = [
    "url" => $url,
    "strategy" => $strategy,
    "category" => "performance"
  ];

  $apiKey = pagespeed_api_key();
  if ($apiKey !== "") {
    $params["key"] = $apiKey;
  }

  $endpoint = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?" . http_build_query($params);
  $ch = curl_init($endpoint);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 90,
    CURLOPT_CONNECTTIMEOUT => 20,
    CURLOPT_HTTPHEADER => ["Accept: application/json"]
  ]);

  $raw = curl_exec($ch);
  $curlError = curl_error($ch);
  $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);

  if ($raw === false || $raw === "") {
    pagespeed_fail($curlError ?: "PageSpeed API empty response.", "PAGESPEED_EMPTY_RESPONSE", 502);
  }

  $json = json_decode($raw, true);
  if (!is_array($json)) {
    pagespeed_fail("PageSpeed API did not return JSON.", "PAGESPEED_INVALID_JSON", 502);
  }

  if ($httpCode < 200 || $httpCode >= 300) {
    $mapped = pagespeed_error_message($httpCode, $json["error"] ?? []);
    pagespeed_fail($mapped["message"], $mapped["code"], $httpCode ?: 502);
  }

  $scoreRaw = $json["lighthouseResult"]["categories"]["performance"]["score"] ?? null;
  $score = is_numeric($scoreRaw) ? (int)round(((float)$scoreRaw) * 100) : null;
  $audits = $json["lighthouseResult"]["audits"] ?? [];
  $auditMap = [
    ["first-contentful-paint", "首次內容繪製"],
    ["largest-contentful-paint", "最大內容繪製"],
    ["total-blocking-time", "總阻塞時間"],
    ["cumulative-layout-shift", "累計版面位移"],
    ["speed-index", "速度指標"]
  ];

  $metrics = [];
  foreach ($auditMap as $item) {
    $id = $item[0];
    $audit = isset($audits[$id]) && is_array($audits[$id]) ? $audits[$id] : [];
    $auditScore = $audit["score"] ?? null;

    $metrics[] = [
      "id" => $id,
      "label" => $item[1],
      "value" => isset($audit["displayValue"]) ? (string)$audit["displayValue"] : "-",
      "numericValue" => isset($audit["numericValue"]) && is_numeric($audit["numericValue"]) ? (float)$audit["numericValue"] : null,
      "score" => is_numeric($auditScore) ? (int)round(((float)$auditScore) * 100) : null,
      "status" => audit_status($auditScore)
    ];
  }

  return [
    "url" => $url,
    "strategy" => $strategy,
    "score" => $score,
    "status" => score_status($score),
    "metrics" => $metrics,
    "fetchedAt" => date("Y-m-d H:i:s"),
    "cached" => false
  ];
}

function save_pagespeed_row($conn, $user_id, $site_id, $data)
{
  $metricsJson = json_encode($data["metrics"], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  if ($metricsJson === false) {
    pagespeed_fail("metrics encode failed", "JSON_ENCODE_FAILED");
  }

  $stmt = $conn->prepare("
    INSERT INTO seo_pagespeed_cache
      (user_id, site_id, strategy, url, score, status, metrics_json, fetched_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      url = VALUES(url),
      score = VALUES(score),
      status = VALUES(status),
      metrics_json = VALUES(metrics_json),
      fetched_at = VALUES(fetched_at),
      updated_at = CURRENT_TIMESTAMP
  ");

  if (!$stmt) {
    pagespeed_fail($conn->error, "SQL_PREPARE_FAILED", 500);
  }

  $rowStrategy = $data["strategy"];
  $rowUrl = $data["url"];
  $score = $data["score"];
  $rowStatus = $data["status"];
  $rowFetchedAt = $data["fetchedAt"];
  $stmt->bind_param(
    "iississs",
    $user_id,
    $site_id,
    $rowStrategy,
    $rowUrl,
    $score,
    $rowStatus,
    $metricsJson,
    $rowFetchedAt
  );
  $stmt->execute();

  save_pagespeed_history_row($conn, $user_id, $site_id, $data);
}

function page_row($row)
{
  $metrics = json_decode($row["metrics_json"] ?? "[]", true);
  if (!is_array($metrics)) {
    $metrics = [];
  }

  return [
    "url" => $row["url"],
    "strategy" => $row["strategy"],
    "score" => $row["score"] === null ? null : (int)$row["score"],
    "status" => $row["status"],
    "metrics" => $metrics,
    "fetchedAt" => $row["fetched_at"],
    "cached" => true
  ];
}

function ensure_pagespeed_table($conn)
{
  $sql = "
    CREATE TABLE IF NOT EXISTS seo_pagespeed_cache (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      site_id BIGINT UNSIGNED NOT NULL,
      strategy ENUM('mobile', 'desktop') NOT NULL,
      url VARCHAR(500) NOT NULL,
      score TINYINT UNSIGNED NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'unknown',
      metrics_json LONGTEXT NOT NULL,
      fetched_at DATETIME NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_seo_pagespeed_lookup (user_id, site_id, strategy),
      KEY idx_seo_pagespeed_site_id (site_id),
      KEY idx_seo_pagespeed_fetched_at (fetched_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  ";

  if (!$conn->query($sql)) {
    pagespeed_fail($conn->error, "TABLE_CREATE_FAILED", 500);
  }
}

function ensure_pagespeed_history_table($conn)
{
  $sql = "
    CREATE TABLE IF NOT EXISTS seo_pagespeed_history (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      site_id BIGINT UNSIGNED NOT NULL,
      strategy ENUM('mobile', 'desktop') NOT NULL,
      url VARCHAR(500) NOT NULL,
      score TINYINT UNSIGNED NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'unknown',
      metrics_json LONGTEXT NOT NULL,
      fetched_at DATETIME NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_seo_pagespeed_history_lookup (user_id, site_id, strategy, fetched_at),
      KEY idx_seo_pagespeed_history_site_id (site_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  ";

  if (!$conn->query($sql)) {
    pagespeed_fail($conn->error, "HISTORY_TABLE_CREATE_FAILED", 500);
  }

  $conn->query("
    INSERT INTO seo_pagespeed_history
      (user_id, site_id, strategy, url, score, status, metrics_json, fetched_at)
    SELECT c.user_id, c.site_id, c.strategy, c.url, c.score, c.status, c.metrics_json, c.fetched_at
    FROM seo_pagespeed_cache c
    WHERE NOT EXISTS (
      SELECT 1
      FROM seo_pagespeed_history h
      WHERE h.user_id = c.user_id
        AND h.site_id = c.site_id
        AND h.strategy = c.strategy
    )
  ");
}

function save_pagespeed_history_row($conn, $user_id, $site_id, $data)
{
  $metricsJson = json_encode($data["metrics"], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  if ($metricsJson === false) {
    pagespeed_fail("metrics encode failed", "JSON_ENCODE_FAILED");
  }

  $stmt = $conn->prepare("
    INSERT INTO seo_pagespeed_history
      (user_id, site_id, strategy, url, score, status, metrics_json, fetched_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ");

  if (!$stmt) {
    pagespeed_fail($conn->error, "SQL_PREPARE_FAILED", 500);
  }

  $rowStrategy = $data["strategy"];
  $rowUrl = $data["url"];
  $rowScore = $data["score"];
  $rowStatus = $data["status"];
  $rowFetchedAt = $data["fetchedAt"];
  $stmt->bind_param(
    "iississs",
    $user_id,
    $site_id,
    $rowStrategy,
    $rowUrl,
    $rowScore,
    $rowStatus,
    $metricsJson,
    $rowFetchedAt
  );
  $stmt->execute();
}

$input = json_decode(file_get_contents("php://input"), true);

if (!is_array($input)) {
  pagespeed_fail("Invalid JSON body", "INVALID_JSON");
}

$user_id = intval($input["user_id"] ?? 0);
$site_id = intval($input["site_id"] ?? 0);
$strategy = normalize_strategy($input["strategy"] ?? "mobile");
$action = normalize_action($input["action"] ?? "latest");

if (!$user_id || !$site_id) {
  pagespeed_fail("user_id or site_id missing", "MISSING_PARAMS");
}

ensure_pagespeed_table($conn);
ensure_pagespeed_history_table($conn);

$siteStmt = $conn->prepare("
  SELECT id, site_url
  FROM seo_sites
  WHERE id = ? AND user_id = ?
  LIMIT 1
");

if (!$siteStmt) {
  pagespeed_fail($conn->error, "SQL_PREPARE_FAILED", 500);
}

$siteStmt->bind_param("ii", $site_id, $user_id);
$siteStmt->execute();
$site = $siteStmt->get_result()->fetch_assoc();

if (!$site) {
  pagespeed_fail("site not found", "SITE_NOT_FOUND", 404);
}

if ($action === "latest") {
  $stmt = $conn->prepare("
    SELECT url, strategy, score, status, metrics_json, fetched_at
    FROM seo_pagespeed_cache
    WHERE user_id = ? AND site_id = ? AND strategy = ?
    LIMIT 1
  ");

  if (!$stmt) {
    pagespeed_fail($conn->error, "SQL_PREPARE_FAILED", 500);
  }

  $stmt->bind_param("iis", $user_id, $site_id, $strategy);
  $stmt->execute();
  $row = $stmt->get_result()->fetch_assoc();

  pagespeed_success($row ? page_row($row) : null);
}

if ($action === "history") {
  $limit = max(1, min(30, intval($input["limit"] ?? 10)));
  $stmt = $conn->prepare("
    SELECT url, strategy, score, status, metrics_json, fetched_at
    FROM seo_pagespeed_history
    WHERE user_id = ? AND site_id = ? AND strategy = ?
    ORDER BY fetched_at DESC, id DESC
    LIMIT ?
  ");

  if (!$stmt) {
    pagespeed_fail($conn->error, "SQL_PREPARE_FAILED", 500);
  }

  $stmt->bind_param("iisi", $user_id, $site_id, $strategy, $limit);
  $stmt->execute();
  $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
  pagespeed_success(array_map("page_row", $rows));
}

if ($action === "run") {
  $url = normalize_url($input["url"] ?? $site["site_url"]);

  if ($url === "" || !is_public_pagespeed_url($url)) {
    pagespeed_fail(
      "請輸入公開可連線的網址。localhost、內網或需要登入的網址無法用 Google PageSpeed 跑分。",
      "INVALID_URL"
    );
  }

  $data = run_google_pagespeed($url, $strategy);
  save_pagespeed_row($conn, $user_id, $site_id, $data);
  pagespeed_success($data);
}

if ($action !== "save") {
  pagespeed_fail("Unsupported action", "UNSUPPORTED_ACTION");
}

$url = normalize_url($input["url"] ?? $site["site_url"]);
$score = isset($input["score"]) && $input["score"] !== null ? intval($input["score"]) : null;
$status = trim((string)($input["status"] ?? "unknown"));
$metrics = $input["metrics"] ?? [];
$fetchedAt = trim((string)($input["fetched_at"] ?? date("Y-m-d H:i:s")));

if (!is_array($metrics)) {
  pagespeed_fail("metrics must be an array", "INVALID_METRICS");
}

$metricsJson = json_encode($metrics, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if ($metricsJson === false) {
  pagespeed_fail("metrics encode failed", "JSON_ENCODE_FAILED");
}

$stmt = $conn->prepare("
  INSERT INTO seo_pagespeed_cache
    (user_id, site_id, strategy, url, score, status, metrics_json, fetched_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE
    url = VALUES(url),
    score = VALUES(score),
    status = VALUES(status),
    metrics_json = VALUES(metrics_json),
    fetched_at = VALUES(fetched_at),
    updated_at = CURRENT_TIMESTAMP
");

if (!$stmt) {
  pagespeed_fail($conn->error, "SQL_PREPARE_FAILED", 500);
}

$stmt->bind_param(
  "iississs",
  $user_id,
  $site_id,
  $strategy,
  $url,
  $score,
  $status,
  $metricsJson,
  $fetchedAt
);
$stmt->execute();

save_pagespeed_history_row($conn, $user_id, $site_id, [
  "url" => $url,
  "strategy" => $strategy,
  "score" => $score,
  "status" => $status,
  "metrics" => $metrics,
  "fetchedAt" => $fetchedAt
]);

pagespeed_success([
  "url" => $url,
  "strategy" => $strategy,
  "score" => $score,
  "status" => $status,
  "metrics" => $metrics,
  "fetchedAt" => $fetchedAt,
  "cached" => true
]);
