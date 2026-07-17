<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . "/../db_connect.php";
require_once __DIR__ . "/../legacy_auth.php";

$input = json_decode(file_get_contents("php://input"), true);

$user_id = hs_require_service_member($conn, $input['user_id'] ?? 0);
$id = intval($input['id'] ?? 0);

if ($user_id <= 0) {
    echo json_encode([
        'success' => false,
        'message' => 'user_id 錯誤'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($id <= 0) {
    echo json_encode([
        'success' => false,
        'message' => 'id 錯誤'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$sql = "
SELECT
    r.*,
    GROUP_CONCAT(c.id ORDER BY c.id ASC) AS connection_id_list,
    GROUP_CONCAT(c.account_name ORDER BY c.id ASC SEPARATOR '|||') AS connection_name_list
FROM ga_report_schedules r
LEFT JOIN ga_connections c
    ON c.member_id = r.user_id
   AND FIND_IN_SET(
        c.id,
        REPLACE(REPLACE(REPLACE(REPLACE(r.connection_ids, '\"', ''), '[', ''), ']', ''), ' ', '')
   )
WHERE r.user_id = {$user_id}
  AND r.id = {$id}
GROUP BY r.id
LIMIT 1
";

$result = $conn->query($sql);

if (!$result) {
    echo json_encode([
        'success' => false,
        'message' => 'SQL 錯誤',
        'error' => $conn->error
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$row = $result->fetch_assoc();

if (!$row) {
    echo json_encode([
        'success' => false,
        'message' => '找不到報表'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$row['connection_ids'] = json_decode($row['connection_ids'] ?: '[]', true);
if (!is_array($row['connection_ids'])) {
    $row['connection_ids'] = [];
}

$row['email_list'] = json_decode($row['email_list'] ?? '[]', true);
if (!is_array($row['email_list'])) {
    $row['email_list'] = [];
}

$row['section_list'] = json_decode($row['section_list'] ?? '[]', true);
if (!is_array($row['section_list'])) {
    $row['section_list'] = [];
}

$row['connection_names'] = !empty($row['connection_name_list'])
    ? explode('|||', $row['connection_name_list'])
    : [];

unset($row['connection_id_list'], $row['connection_name_list']);

echo json_encode([
    'success' => true,
    'data' => $row
], JSON_UNESCAPED_UNICODE);
