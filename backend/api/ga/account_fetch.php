<?php

$member_id = (int)($_GET['member_id'] ?? 0);

if (!$member_id) {
  http_response_code(400);
  echo "Missing member_id";
  exit;
}

$state = base64_encode(json_encode([
  "member_id" => $member_id,
  "ts" => time()
]));

$client_id = "893008545922-ocsml8rtal9miu7mu2pdhn392r6s0a47.apps.googleusercontent.com";
$redirect_uri = "https://www.highlight.url.tw/highlightsignal/ga/oauth_callback.php";

$scope = urlencode("https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/analytics.edit https://www.googleapis.com/auth/analytics.manage.users.readonly");

$url = "https://accounts.google.com/o/oauth2/v2/auth?" . http_build_query([
    "client_id" => $client_id,
    "redirect_uri" => $redirect_uri,
    "response_type" => "code",
    "access_type" => "offline",        // 拿 refresh token 必須 offline
    "prompt" => "consent",             // 強制讓 Google 回 refresh_token
    "state" => $state,
    "scope" => "https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/analytics.edit https://www.googleapis.com/auth/analytics.manage.users.readonly"
]);

header("Location: $url");
exit;
