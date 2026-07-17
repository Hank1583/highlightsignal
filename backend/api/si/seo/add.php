<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . "/../../db_connect.php";

$input = json_decode(file_get_contents("php://input"), true);

$user_id   = intval($input['user_id'] ?? 0);
$site_url  = trim($input['site_url'] ?? '');
$site_name = trim($input['site_name'] ?? '');

if (!$user_id || !$site_url) {
  echo json_encode([
    'ok' => false,
    'message' => 'user_id or site_url missing'
  ]);
  exit;
}

$site_url = rtrim($site_url, '/');

/* duplicate check */
$stmt = $conn->prepare("
  SELECT id FROM seo_sites
  WHERE user_id = ? AND site_url = ?
");
$stmt->bind_param("is", $user_id, $site_url);
$stmt->execute();
$stmt->store_result();

if ($stmt->num_rows > 0) {
  echo json_encode([
    'ok' => false,
    'message' => 'site already exists'
  ]);
  exit;
}

/* insert */
$stmt = $conn->prepare("
  INSERT INTO seo_sites (user_id, site_name, site_url)
  VALUES (?, ?, ?)
");
$stmt->bind_param("iss", $user_id, $site_name, $site_url);
$stmt->execute();

$site_id = $stmt->insert_id;

/* init integration */
$stmt = $conn->prepare("
  INSERT INTO seo_site_integrations (site_id)
  VALUES (?)
");
$stmt->bind_param("i", $site_id);
$stmt->execute();

echo json_encode([
  'ok' => true,
  'data' => [
    'id' => $site_id,
    'site_name' => $site_name ?: null,
    'site_url' => $site_url
  ]
]);
