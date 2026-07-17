<?php

declare(strict_types=1);

use HighlightSignal\Auth\AuthenticationException;
use HighlightSignal\Auth\ServiceIdentity;
use HighlightSignal\Auth\ServiceRequestAuthenticator;
use HighlightSignal\Http\Request;

require_once __DIR__ . '/config/bootstrap.php';

function hs_legacy_auth_error($code, $message, $status)
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(array(
        'ok' => false,
        'error' => array('code' => $code, 'message' => $message),
    ), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function hs_require_service_identity(mysqli $database)
{
    static $identity = null;

    if ($identity instanceof ServiceIdentity) {
        return $identity;
    }

    if (strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) === 'OPTIONS') {
        hs_legacy_auth_error('CORS_ORIGIN_DENIED', 'Browser preflight is not allowed.', 403);
    }

    try {
        $identity = (new ServiceRequestAuthenticator($database))->authenticate(Request::fromGlobals());
        return $identity;
    } catch (AuthenticationException $error) {
        hs_legacy_auth_error('UNAUTHORIZED', 'Service authentication failed.', 401);
    } catch (mysqli_sql_exception $error) {
        if ((int) $error->getCode() === 1062) {
            hs_legacy_auth_error('REPLAY_DETECTED', 'Duplicate signed request.', 401);
        }
        error_log($error->getMessage());
        hs_legacy_auth_error('DATABASE_ERROR', 'Database operation failed.', 500);
    } catch (Throwable $error) {
        error_log($error->getMessage());
        hs_legacy_auth_error('INTERNAL_ERROR', 'Unexpected server error.', 500);
    }
}

function hs_require_service_member(mysqli $database, $claimedMemberId = 0)
{
    $identity = hs_require_service_identity($database);
    $claimed = (int) $claimedMemberId;

    if ($claimed > 0 && $claimed !== (int) $identity->memberId) {
        hs_legacy_auth_error('FORBIDDEN', 'Signed member does not match request data.', 403);
    }

    return (int) $identity->memberId;
}

function hs_service_workspace_id(mysqli $database)
{
    return (int) hs_require_service_identity($database)->workspaceId;
}
