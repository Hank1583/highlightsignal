<?php

declare(strict_types=1);

use HighlightSignal\Config\Environment;
use HighlightSignal\Workspace\AuthorizationException;
use HighlightSignal\Workspace\WorkspaceAccessPolicy;
use HighlightSignal\Workspace\WorkspacePermissions;

require_once __DIR__ . '/../db_connect.php';
require_once __DIR__ . '/../legacy_auth.php';

$member_id = hs_require_service_member($conn, $_GET['member_id'] ?? 0);
$workspace_id = hs_service_workspace_id($conn);

// V09-03: OAuth state is bound to the signed workspace, not just the member.
// Only roles allowed to mutate GA integrations may start a link flow, matching
// GaIntegrationService::updateConnectionStatus()'s existing role check.
try {
    $membership = (new WorkspaceAccessPolicy($conn))->requireActiveMembership($workspace_id, $member_id);
} catch (AuthorizationException $error) {
    http_response_code(403);
    die('Workspace access denied.');
}

try {
    WorkspacePermissions::requirePermission($membership, 'integrations.manage');
} catch (AuthorizationException $error) {
    http_response_code(403);
    die('Workspace role cannot link integrations.');
}

$oauthStateNonce = bin2hex(random_bytes(16));
$statePayload = rtrim(strtr(base64_encode(json_encode(array(
  'member_id' => $member_id,
  'workspace_id' => $workspace_id,
  'nonce' => $oauthStateNonce,
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
