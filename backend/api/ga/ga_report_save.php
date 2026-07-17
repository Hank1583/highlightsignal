<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . "/../db_connect.php";

$input = json_decode(file_get_contents("php://input"), true);

if (!$input) {
    echo json_encode(array(
        'success' => false,
        'message' => '無效的 JSON'
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

$user_id        = intval(isset($input['user_id']) ? $input['user_id'] : 0);
$report_name    = trim(isset($input['report_name']) ? $input['report_name'] : '');
$report_type    = isset($input['report_type']) ? $input['report_type'] : '';
$connection_ids = isset($input['connection_ids']) ? $input['connection_ids'] : array();

$send_weekday   = isset($input['send_weekday']) ? intval($input['send_weekday']) : null;
$send_monthday  = isset($input['send_monthday']) ? intval($input['send_monthday']) : null;
$send_time      = trim(isset($input['send_time']) ? $input['send_time'] : '09:00');

$email_subject  = trim(isset($input['email_subject']) ? $input['email_subject'] : '');
$email_list     = isset($input['email_list']) ? $input['email_list'] : array();
$section_list   = isset($input['section_list']) ? $input['section_list'] : array();
$is_active      = !empty($input['is_active']) ? 1 : 0;

if ($user_id <= 0) {
    echo json_encode(array('success' => false, 'message' => 'user_id 錯誤'), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($report_name === '') {
    echo json_encode(array('success' => false, 'message' => '請輸入報表名稱'), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($report_type !== 'weekly' && $report_type !== 'monthly') {
    echo json_encode(array('success' => false, 'message' => 'report_type 錯誤'), JSON_UNESCAPED_UNICODE);
    exit;
}

if (!is_array($connection_ids) || count($connection_ids) === 0) {
    echo json_encode(array('success' => false, 'message' => '請選擇 GA'), JSON_UNESCAPED_UNICODE);
    exit;
}

$connection_ids = array_values(array_unique(array_map('intval', $connection_ids)));
$connection_ids = array_values(array_filter($connection_ids, function($id) {
    return $id > 0;
}));

if (count($connection_ids) === 0) {
    echo json_encode(array('success' => false, 'message' => 'GA 選擇錯誤'), JSON_UNESCAPED_UNICODE);
    exit;
}

if (!is_array($email_list) || count($email_list) === 0) {
    echo json_encode(array('success' => false, 'message' => '請填寫 email'), JSON_UNESCAPED_UNICODE);
    exit;
}

if (!is_array($section_list) || count($section_list) === 0) {
    echo json_encode(array('success' => false, 'message' => '請選擇報表內容'), JSON_UNESCAPED_UNICODE);
    exit;
}

if (strlen($send_time) === 5) {
    $send_time .= ':00';
}

$stmt = $conn->prepare("
    INSERT INTO ga_report_schedules (
        user_id,
        report_name,
        report_type,
        connection_ids,
        send_weekday,
        send_monthday,
        send_time,
        email_subject,
        email_list,
        section_list,
        is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
");

if (!$stmt) {
    echo json_encode(array(
        'success' => false,
        'message' => 'prepare 失敗',
        'error' => $conn->error
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

$connection_ids_json = json_encode($connection_ids, JSON_UNESCAPED_UNICODE);
$email_list_json     = json_encode($email_list, JSON_UNESCAPED_UNICODE);
$section_list_json   = json_encode($section_list, JSON_UNESCAPED_UNICODE);

$stmt->bind_param(
    "isssiissssi",
    $user_id,
    $report_name,
    $report_type,
    $connection_ids_json,
    $send_weekday,
    $send_monthday,
    $send_time,
    $email_subject,
    $email_list_json,
    $section_list_json,
    $is_active
);

$success = $stmt->execute();

if (!$success) {
    echo json_encode(array(
        'success' => false,
        'message' => '新增失敗',
        'error' => $stmt->error
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode(array(
    'success' => true,
    'message' => '新增成功',
    'insert_id' => $stmt->insert_id
), JSON_UNESCAPED_UNICODE);