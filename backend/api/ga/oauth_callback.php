<?php

use HighlightSignal\Config\Environment;

require_once __DIR__ . '/../db_connect.php'; // 資料庫連線

// Step 1: Google 回傳的 code
if (!isset($_GET["code"])) {
    die("Missing code");
}

$code = $_GET["code"];
$rawState = (string) ($_GET['state'] ?? '');
$stateParts = explode('.', $rawState, 2);
if (count($stateParts) !== 2) {
    http_response_code(400);
    die('Invalid OAuth state');
}

list($encodedState, $providedStateSignature) = $stateParts;
$expectedStateSignature = hash_hmac('sha256', $encodedState, Environment::require('SERVICE_AUTH_SECRET'));
if (!hash_equals($expectedStateSignature, $providedStateSignature)) {
    http_response_code(400);
    die('Invalid OAuth state');
}

$padding = strlen($encodedState) % 4;
if ($padding > 0) {
    $encodedState .= str_repeat('=', 4 - $padding);
}
$state = json_decode(base64_decode(strtr($encodedState, '-_', '+/'), true), true);
$member_id = isset($state["member_id"]) ? intval($state["member_id"]) : 0;
$stateTimestamp = isset($state['ts']) ? (int) $state['ts'] : 0;

if ($member_id <= 0 || $stateTimestamp <= 0 || abs(time() - $stateTimestamp) > 600) {
    http_response_code(400);
    die('Expired OAuth state');
}

// Provider configuration is checked only after untrusted callback state has
// been authenticated. Invalid state must fail closed even on a host where the
// optional Google OAuth integration is not configured yet.
$client_id = (string) getenv("GOOGLE_CLIENT_ID");
$client_secret = (string) getenv("GOOGLE_CLIENT_SECRET");
$redirect_uri = (string) getenv("GOOGLE_OAUTH_REDIRECT_URI");

if ($client_id === '' || $client_secret === '' || $redirect_uri === '') {
    http_response_code(500);
    die('Google OAuth configuration is incomplete');
}

// Step 2: 用 code 換 access_token + refresh_token
$tokenData = file_get_contents("https://oauth2.googleapis.com/token", false, stream_context_create([
    "http" => [
        "method" => "POST",
        "header" => "Content-Type: application/x-www-form-urlencoded",
        "content" => http_build_query([
            "code" => $code,
            "client_id" => $client_id,
            "client_secret" => $client_secret,
            "redirect_uri" => $redirect_uri,
            "grant_type" => "authorization_code"
        ])
    ]
]));

$tokens = json_decode((string) $tokenData, true);

if (!is_array($tokens) || empty($tokens['access_token']) || empty($tokens['refresh_token'])) {
    http_response_code(502);
    die('Google token exchange failed');
}

$access_token = $tokens["access_token"];
$refresh_token = $tokens["refresh_token"]; // 之後排程抓 GA 必用！


// =============== Helper ===================
function callGA($url, $access_token)
{
    $ch = curl_init();

    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Authorization: Bearer $access_token",
        "Accept: application/json"
    ]);

    $response = curl_exec($ch);

    if (curl_errno($ch)) {
        error_log(curl_error($ch));
        return null;
    }

    curl_close($ch);

    return json_decode($response, true);
}


// ==============================================
// Step 3：取得帳戶列表（accounts）
// ==============================================

$accounts = callGA("https://analyticsadmin.googleapis.com/v1beta/accounts", $access_token);

// 找到正確 account ＝ Highlight (237829758)
$realAccountId = null;
foreach ($accounts["accounts"] as $acc) {
    if ($acc["name"] === "accounts/237829758") {
        $realAccountId = "237829758";
        break;
    }
}

if (!$realAccountId) {
    die("Cannot find correct GA account");
}


// ==============================================
// Step 4：取得 Properties（GA4 資源）
// ==============================================

$properties = callGA(
    "https://analyticsadmin.googleapis.com/v1beta/properties?filter=parent:accounts/$realAccountId",
    $access_token
);

if (!isset($properties["properties"])) {
    die("No GA properties found");
}


// ==============================================
// Step 5：處理每個 Property（通常只有一個）
// ==============================================

foreach ($properties["properties"] as $prop) {

    $property_id = str_replace("properties/", "", $prop["name"]);
    $property_name = $prop["displayName"];

    // 抓 Data Streams ＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝
    $streams = callGA(
        "https://analyticsadmin.googleapis.com/v1beta/properties/$property_id/dataStreams",
        $access_token
    );

    $stream_list = json_encode($streams["dataStreams"] ?? []);

    // 假設你有 member_id（登入使用者）
    // 寫進 DB
    $stmt = $conn->prepare("
        INSERT INTO ga_connections 
        (member_id, property_id, account_name, refresh_token, streams_json, status)
        VALUES (?, ?, ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE 
            refresh_token = VALUES(refresh_token),
            streams_json = VALUES(streams_json)
    ");

    $stmt->bind_param("issss", $member_id, $property_id, $property_name, $refresh_token, $stream_list);
    $stmt->execute();
}


// ==============================================
// Step 6：導回成功頁
// ==============================================

header("Location: https://highlightsignal.com/ga?connected=1");
exit;

?>
