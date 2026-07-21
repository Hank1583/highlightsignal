<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../db_connect.php';
require_once __DIR__ . '/../../legacy_auth.php';

$pagespeedHistoryIdentity = hs_require_service_identity($conn);

function history_success($data = [])
{
  echo json_encode([
    'ok' => true,
    'data' => $data,
  ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function history_fail($message, $code = 'BAD_REQUEST', $status = 400)
{
  http_response_code($status);
  echo json_encode([
    'ok' => false,
    'error' => [
      'code' => $code,
      'message' => $message,
    ],
  ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function history_row(array $row): array
{
  $metrics = json_decode((string)($row['metrics_json'] ?? '[]'), true);

  return [
    'url' => $row['url'],
    'strategy' => $row['strategy'],
    'score' => $row['score'] === null ? null : (int)$row['score'],
    'status' => $row['status'],
    'metrics' => is_array($metrics) ? $metrics : [],
    'fetchedAt' => $row['fetched_at'],
    'cached' => true,
  ];
}

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
  history_fail('Invalid JSON body', 'INVALID_JSON');
}

$userId = hs_require_service_member($conn, $input['user_id'] ?? 0);
$siteId = (int)($input['site_id'] ?? 0);
$strategy = ($input['strategy'] ?? '') === 'desktop' ? 'desktop' : 'mobile';
$limit = max(1, min(30, (int)($input['limit'] ?? 10)));

if (!$userId || !$siteId) {
  history_fail('user_id or site_id missing', 'MISSING_PARAMS');
}

// V09-04: scope by workspace_id (resolved server-side, not the signed
// x-hs-workspace-id header -- see legacy_auth.php's
// hs_resolve_member_workspace_id() for why) in addition to the existing
// user_id check.
$workspaceId = hs_resolve_member_workspace_id($conn, $userId);

// seo_pagespeed_history is provisioned by backend/sql/migrations/013_runtime_ddl_extraction.sql.
// The table-create step is intentionally gone; the dedup backfill below still runs.
// workspace_id is copied straight from the cache row (V09-04).

$backfill = $conn->prepare("
  INSERT INTO seo_pagespeed_history
    (user_id, site_id, workspace_id, strategy, url, score, status, metrics_json, fetched_at)
  SELECT c.user_id, c.site_id, c.workspace_id, c.strategy, c.url, c.score, c.status, c.metrics_json, c.fetched_at
  FROM seo_pagespeed_cache c
  WHERE c.user_id = ? AND c.site_id = ? AND c.strategy = ?
    AND NOT EXISTS (
      SELECT 1
      FROM seo_pagespeed_history h
      WHERE h.user_id = c.user_id
        AND h.site_id = c.site_id
        AND h.strategy = c.strategy
    )
");

if (!$backfill) {
  history_fail($conn->error, 'SQL_PREPARE_FAILED', 500);
}

$backfill->bind_param('iis', $userId, $siteId, $strategy);
$backfill->execute();

$stmt = $conn->prepare("
  SELECT url, strategy, score, status, metrics_json, fetched_at
  FROM seo_pagespeed_history
  WHERE user_id = ? AND site_id = ? AND workspace_id = ? AND strategy = ?
  ORDER BY fetched_at DESC, id DESC
  LIMIT ?
");

if (!$stmt) {
  history_fail($conn->error, 'SQL_PREPARE_FAILED', 500);
}

$stmt->bind_param('iiisi', $userId, $siteId, $workspaceId, $strategy, $limit);
$stmt->execute();
$rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

history_success(array_map('history_row', $rows));
