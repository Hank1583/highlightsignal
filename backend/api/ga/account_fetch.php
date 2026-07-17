<?php

declare(strict_types=1);

use HighlightSignal\Config\Environment;

require_once __DIR__ . '/../db_connect.php';
require_once __DIR__ . '/../legacy_auth.php';

$member_id = hs_require_service_member($conn, $_GET['member_id'] ?? 0);

$statePayload = rtrim(strtr(base64_encode(json_encode(array(
  'member_id' => $member_id,
  'ts' => time(),
))), '+/', '-_'), '=');
$stateSignature = hash_hmac('sha256', $statePayload, Environment::require('SERVICE_AUTH_SECRET'));
$state = $statePayload . '.' . $stateSignature;

$client_id = Environment::require('GOOGLE_CLIENT_ID');
$redirect_uri = Environment::require('GOOGLE_OAUTH_REDIRECT_URI');

$url = "https://accounts.google.com/o/oauth2/v2/auth?" . http_build_query(array(
    "client_id" => $client_id,
    "redirect_uri" => $redirect_uri,
    "response_type" => "code",
    "access_type" => "offline",        // 拿 refresh token 必須 offline
    "prompt" => "consent",             // 強制讓 Google 回 refresh_token
    "state" => $state,
    "scope" => "https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/analytics.edit https://www.googleapis.com/auth/analytics.manage.users.readonly"
));

header("Location: $url");
exit;
