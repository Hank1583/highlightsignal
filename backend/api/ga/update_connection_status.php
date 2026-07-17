<?php
require_once __DIR__ . "/../db_connect.php";
require_once __DIR__ . "/../auth.php";

header("Content-Type: application/json; charset=utf-8");

$member_id = getMemberId();
$input = json_decode(file_get_contents("php://input"), true);
$connection_id = intval($input["connection_id"] ?? 0);
$status = isset($input["status"]) ? intval($input["status"]) : -1;

if ($connection_id <= 0 || !in_array($status, [0, 1], true)) {
  http_response_code(400);
  echo json_encode([
    "ok" => false,
    "message" => "Invalid connection settings"
  ]);
  exit;
}

$stmt = $conn->prepare("
  UPDATE ga_connections
  SET status = ?
  WHERE id = ? AND member_id = ?
");
$stmt->bind_param("iii", $status, $connection_id, $member_id);
$stmt->execute();

$check = $conn->prepare("
  SELECT id, status
  FROM ga_connections
  WHERE id = ? AND member_id = ?
  LIMIT 1
");
$check->bind_param("ii", $connection_id, $member_id);
$check->execute();
$connection = $check->get_result()->fetch_assoc();

if (!$connection) {
  http_response_code(404);
  echo json_encode([
    "ok" => false,
    "message" => "GA connection not found"
  ]);
  exit;
}

echo json_encode([
  "ok" => true,
  "data" => $connection
]);
