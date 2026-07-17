<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, X-Member-Id, X-Member-Email, X-Member-Name, X-Member-Role, X-Enabled-Products');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

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
  $memberId = (int)(hs_header('X-Member-Id') ?: ($input['member_id'] ?? $input['user_id'] ?? ($_GET['member_id'] ?? $_GET['user_id'] ?? 0)));
  if ($memberId <= 0) {
    hs_json(['ok' => false, 'message' => 'Unauthorized: member_id missing'], 401);
  }
  return $memberId;
}

function hs_request_user($input = []) {
  $products = hs_header('X-Enabled-Products', '');
  $productList = array_values(array_filter(array_map('trim', explode(',', $products))));

  return [
    'id' => hs_member_id($input),
    'email' => hs_header('X-Member-Email', (string)($input['email'] ?? '')),
    'name' => hs_header('X-Member-Name', (string)($input['name'] ?? 'User')),
    'role' => hs_header('X-Member-Role', (string)($input['role'] ?? 'member')),
    'enabledProducts' => $productList ?: ['dashboard'],
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
