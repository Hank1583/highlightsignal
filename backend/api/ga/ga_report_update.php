<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . "/../db_connect.php";

$input = json_decode(file_get_contents("php://input"), true);

if (!$input) {
    echo json_encode([
        'success' => false,
        'message' => '無效的 JSON'
    ]);
    exit;
}

$id = intval($input['id'] ?? 0);
$user_id = intval($input['user_id'] ?? 0);

if ($id <= 0) {
    echo json_encode(['success' => false, 'message' => 'id 錯誤']);
    exit;
}

if ($user_id <= 0) {
    echo json_encode(['success' => false, 'message' => 'user_id 錯誤']);
    exit;
}

// === 其餘欄位（直接沿用你 save 的）===
$report_name    = trim($input['report_name'] ?? '');
$report_type    = $input['report_type'] ?? '';
$connection_ids = $input['connection_ids'] ?? [];

$send_weekday   = isset($input['send_weekday']) ? intval($input['send_weekday']) : null;
$send_monthday  = isset($input['send_monthday']) ? intval($input['send_monthday']) : null;
$send_time      = trim($input['send_time'] ?? '09:00');

$email_subject  = trim($input['email_subject'] ?? '');
$email_list     = $input['email_list'] ?? [];
$section_list   = $input['section_list'] ?? [];
$is_active      = !empty($input['is_active']) ? 1 : 0;

// === JSON encode ===
$connection_ids_json = json_encode($connection_ids);
$email_list_json     = json_encode($email_list);
$section_list_json   = json_encode($section_list);

// === UPDATE SQL ===
$stmt = $conn->prepare("
    UPDATE ga_report_schedules SET
        report_name = ?,
        report_type = ?,
        connection_ids = ?,
        send_weekday = ?,
        send_monthday = ?,
        send_time = ?,
        email_subject = ?,
        email_list = ?,
        section_list = ?,
        is_active = ?
    WHERE id = ?
      AND user_id = ?
");

$stmt->bind_param(
    "sssiissssiii",
    $report_name,
    $report_type,
    $connection_ids_json,
    $send_weekday,
    $send_monthday,
    $send_time,
    $email_subject,
    $email_list_json,
    $section_list_json,
    $is_active,
    $id,
    $user_id
);

$success = $stmt->execute();

if (!$success) {
    echo json_encode([
        'success' => false,
        'message' => '更新失敗',
        'error' => $stmt->error
    ]);
    exit;
}

echo json_encode([
    'success' => true,
    'message' => '更新成功'
]);