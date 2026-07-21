<?php
ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . "/../../db_connect.php";
require_once __DIR__ . "/../../legacy_auth.php";

$input = json_decode(file_get_contents("php://input"), true);

/*
 * 這裡 user_id 由 Next.js 傳進來
 * 不再用 session
 */
$user_id = hs_require_service_member($conn, $input['user_id'] ?? 0);

if (!$user_id) {
  echo json_encode([
    'ok' => false,
    'message' => 'user_id missing'
  ]);
  exit;
}

// V09-04: scope by workspace_id (resolved server-side, not the signed
// x-hs-workspace-id header -- see legacy_auth.php's
// hs_resolve_member_workspace_id() for why) in addition to the existing
// user_id check.
$workspace_id = hs_resolve_member_workspace_id($conn, $user_id);

/*
 * ⚠️ 請確認 table / column 名稱
 * 下面假設與 add.php 一致
 */
$stmt = $conn->prepare("
  SELECT
    id,
    site_name,
    site_url
  FROM seo_sites
  WHERE user_id = ? AND workspace_id = ?
  ORDER BY id DESC
");

if ($stmt === false) {
  echo json_encode([
    'ok' => false,
    'message' => 'Prepare failed',
    'sql_error' => $conn->error
  ]);
  exit;
}

$stmt->bind_param("ii", $user_id, $workspace_id);
$stmt->execute();

$result = $stmt->get_result();
$rows = [];

while ($row = $result->fetch_assoc()) {
  $rows[] = $row;
}

echo json_encode([
  'ok' => true,
  'data' => $rows
]);
