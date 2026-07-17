<?php

declare(strict_types=1);

require_once __DIR__ . '/db_connect.php';
require_once __DIR__ . '/legacy_auth.php';

$hsServiceIdentity = hs_require_service_identity($conn);

header('Content-Type: application/json; charset=utf-8');

function hs_json($payload, $status = 200) {
  http_response_code($status);
  echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function hs_input() {
  $raw = file_get_contents('php://input');
  if (!$raw) return [];
  $data = json_decode($raw, true);
  return is_array($data) ? $data : [];
}

function hs_header($name, $default = '') {
  $key = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
  return isset($_SERVER[$key]) ? trim((string)$_SERVER[$key]) : $default;
}

function hs_member_id($input = []) {
  global $conn;
  $claimed = (int)($input['member_id'] ?? $input['user_id'] ?? ($_GET['member_id'] ?? $_GET['user_id'] ?? 0));
  return hs_require_service_member($conn, $claimed);
}

function hs_request_user($input = []) {
  return [
    'id' => hs_member_id($input),
    'email' => '',
    'name' => 'User',
    'role' => 'member',
    'enabledProducts' => ['dashboard'],
  ];
}

function hs_table_exists($conn, $table) {
  $stmt = $conn->prepare('SELECT COUNT(*) AS total FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?');
  if (!$stmt) return false;
  $stmt->bind_param('s', $table);
  $stmt->execute();
  $row = $stmt->get_result()->fetch_assoc();
  return (int)($row['total'] ?? 0) > 0;
}

function hs_column_exists($conn, $table, $column) {
  $stmt = $conn->prepare('SELECT COUNT(*) AS total FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?');
  if (!$stmt) return false;
  $stmt->bind_param('ss', $table, $column);
  $stmt->execute();
  $row = $stmt->get_result()->fetch_assoc();
  return (int)($row['total'] ?? 0) > 0;
}
