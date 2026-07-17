<?php
header("Content-Type: application/json; charset=utf-8");
require_once __DIR__ . "/../db_connect.php";

/* =========================
   1️⃣ Read JSON Body
========================= */
$input = json_decode(file_get_contents("php://input"), true);

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
    "message" => "Invalid parameters",
    "debug" => $input
  ]);
  exit;
}

/* =========================
   2️⃣ Prepare IDs
========================= */
$ids = array_map("intval", $ids);
$placeholders = implode(",", array_fill(0, count($ids), "?"));

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
    "message" => "SQL prepare failed",
    "error" => $conn->error
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
