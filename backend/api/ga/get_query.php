<?php

declare(strict_types=1);

use HighlightSignal\Workspace\AuthorizationException;
use HighlightSignal\Workspace\WorkspaceAccessPolicy;
use HighlightSignal\Workspace\WorkspacePermissions;

header("Content-Type: application/json; charset=utf-8");
require_once __DIR__ . "/../db_connect.php";
require_once __DIR__ . "/../legacy_auth.php";
require_once __DIR__ . "/ownership.php";

/* =========================
   1️⃣ Read JSON Body
========================= */
$input = json_decode(file_get_contents("php://input"), true);
$memberId = hs_require_service_member($conn, isset($input['user_id']) ? $input['user_id'] : 0);

// V09-08: resolve workspace_id server-side and require active membership
// before touching any GA analytics data.
$workspaceId = hs_resolve_member_workspace_id($conn, $memberId);

try {
    $membership = (new WorkspaceAccessPolicy($conn))->requireActiveMembership($workspaceId, $memberId);
    WorkspacePermissions::requirePermission($membership, 'read');
} catch (AuthorizationException $error) {
    echo json_encode([
        "ok" => false,
        "message" => "Workspace access denied."
    ]);
    exit;
}

$type  = $input['type']  ?? null;
$ids   = $input['ids']   ?? [];
$start = $input['start'] ?? null;
$end   = $input['end']   ?? null;

if (
  !$type ||
  !is_array($ids) || empty($ids) ||
  !$start || !$end
) {
  echo json_encode([
    "ok" => false,
    "message" => "Invalid parameters"
  ]);
  exit;
}

/* =========================
   2️⃣ Prepare IDs
========================= */
$ids = array_map("intval", $ids);
$placeholders = implode(",", array_fill(0, count($ids), "?"));

ga_require_connection_ownership($conn, $workspaceId, $ids);

/* =========================
   3️⃣ Router by type
========================= */
switch ($type) {

  /* ===== DAILY ===== */
  case "daily":
    $sql = "
      SELECT
        date,
        connection_id,
        users,
        sessions,
        pageviews,
        events,
        new_users,
        avg_session_duration,
        bounce_rate
      FROM ga_daily_summary
      WHERE connection_id IN ($placeholders)
        AND date BETWEEN ? AND ?
      ORDER BY date ASC
    ";

    $types = str_repeat("i", count($ids)) . "ss";
    $params = array_merge($ids, [$start, $end]);
    break;

  /* ===== EVENTS ===== */
  case "events":
    $sql = "
      SELECT
        connection_id,
        event_name,
        SUM(event_count) AS event_count
      FROM ga_events
      WHERE connection_id IN ($placeholders)
        AND date BETWEEN ? AND ?
      GROUP BY connection_id, event_name
      ORDER BY event_count DESC
      LIMIT 20
    ";

    $types = str_repeat("i", count($ids)) . "ss";
    $params = array_merge($ids, [$start, $end]);
    break;

  /* ===== PAGES ===== */
  case "pages":
    $sql = "
      SELECT
        connection_id,
        page_path,
        page_title,
        SUM(pageviews) AS pageviews,
        SUM(users) AS users,
        ROUND(AVG(avg_time), 2) AS avg_time
      FROM ga_pages
      WHERE connection_id IN ($placeholders)
        AND date BETWEEN ? AND ?
      GROUP BY connection_id, page_path
      ORDER BY pageviews DESC
      LIMIT 20
    ";

    $types = str_repeat("i", count($ids)) . "ss";
    $params = array_merge($ids, [$start, $end]);
    break;

  /* ===== SOURCES ===== */
  case "sources":
    $sql = "
      SELECT
        connection_id,
        channel_group,
        device,
        SUM(sessions) AS sessions,
        SUM(users) AS users,
        SUM(conversions) AS conversions
      FROM ga_traffic_sources
      WHERE connection_id IN ($placeholders)
        AND date BETWEEN ? AND ?
      GROUP BY connection_id, channel_group, device
      ORDER BY sessions DESC
    ";

    $types = str_repeat("i", count($ids)) . "ss";
    $params = array_merge($ids, [$start, $end]);
    break;
  /* ===== CONVERSIONS ===== */
  case "conversions":
    $sql = "
      SELECT
        connection_id,
        conversion_name,
        SUM(count) AS count,
        SUM(value) AS value
      FROM ga_conversions
      WHERE connection_id IN ($placeholders)
        AND date BETWEEN ? AND ?
      GROUP BY connection_id, conversion_name
      ORDER BY count DESC
      LIMIT 20
    ";

    $types = str_repeat("i", count($ids)) . "ss";
    $params = array_merge($ids, [$start, $end]);
    break;
  default:
    echo json_encode([
      "ok" => false,
      "message" => "Invalid type"
    ]);
    exit;
}

/* =========================
   4️⃣ Execute
========================= */
$stmt = $conn->prepare($sql);
if (!$stmt) {
  echo json_encode([
    "ok" => false,
    "message" => "Database operation failed"
  ]);
  exit;
}

$stmt->bind_param($types, ...$params);
$stmt->execute();

$result = $stmt->get_result();
$rows = $result->fetch_all(MYSQLI_ASSOC);

/* =========================
   5️⃣ Response
========================= */
echo json_encode([
  "ok" => true,
  "type" => $type,
  "data" => $rows
]);
exit;
