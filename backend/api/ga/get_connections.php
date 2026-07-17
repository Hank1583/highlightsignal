<?php
require_once __DIR__ . "/../db_connect.php";
require_once __DIR__ . "/../auth.php";

header("Content-Type: application/json; charset=utf-8");

$member_id = getMemberId();
$include_inactive = ($_SERVER["HTTP_X_INCLUDE_INACTIVE"] ?? "") === "1";

$sql = "
SELECT id, property_id, account_name, status
FROM ga_connections
WHERE member_id = ?
";

if (!$include_inactive) {
  $sql .= " AND status = 1";
}

$sql .= " ORDER BY created_at DESC";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $member_id);
$stmt->execute();

$result = $stmt->get_result();

// $fakeData = [
//     [
//         "id" => 9991,
//         "property_id" => "GA-FAKE-001",
//         "account_name" => "假資料帳戶 A"
//     ],
//     [
//         "id" => 9992,
//         "property_id" => "GA-FAKE-002",
//         "account_name" => "假資料帳戶 B"
//     ],
//         [
//         "id" => 9993,
//         "property_id" => "GA-FAKE-003",
//         "account_name" => "假資料帳戶 C"
//         ],    [
//         "id" => 9994,
//         "property_id" => "GA-FAKE-004",
//         "account_name" => "假資料帳戶 D"
//         ],    [
//         "id" => 9995,
//         "property_id" => "GA-FAKE-005",
//         "account_name" => "假資料帳戶 E"
//     ]
// ];
$dbData = $result->fetch_all(MYSQLI_ASSOC);
// $data = array_merge($dbData, $fakeData);
echo json_encode([
  "ok" => true,
  "data" => $dbData 
]);
