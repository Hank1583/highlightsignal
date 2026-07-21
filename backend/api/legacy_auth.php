<?php

declare(strict_types=1);

use HighlightSignal\Auth\AuthenticationException;
use HighlightSignal\Auth\ServiceIdentity;
use HighlightSignal\Auth\ServiceRequestAuthenticator;
use HighlightSignal\Http\Request;

require_once __DIR__ . '/config/bootstrap.php';

// Signed responses must never be served from a shared/browser cache. A cached
// response would bypass the nonce claim performed by PHP on the next request.
header('Cache-Control: no-store, private, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

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

/**
 * V09-04: resolves the Workspace a legacy-flat-file endpoint should scope its
 * query by, for a VERIFIED member id (i.e. the return value of
 * hs_require_service_member(), never raw client input).
 *
 * This deliberately does NOT trust hs_service_workspace_id() (the signed
 * x-hs-workspace-id header) for these endpoints. Today only
 * si/seo/pagespeed.php's caller (app/api/seo/pagespeed/route.ts) resolves a
 * real Workspace context before signing its request; every other SEO/SI/
 * dashboard-AI BFF route calls signedPhpFetch() with only a memberId, and
 * lib/signedPhpFetch.ts's `workspaceId: identity.workspaceId ?? identity.memberId`
 * fallback then signs the member's own numeric id AS IF it were a
 * workspaces.id -- which is a different id space entirely and is exactly the
 * "member_id === workspace_id" guess the V09-04 task packet forbids relying
 * on. Resolving server-side from legacy_member_workspace_map (the same
 * source of truth migrations/014/019 backfill from) is correct for today's
 * reality (every member has exactly one owned Workspace, confirmed by
 * V09-02's postflight), and is a strictly narrower trust boundary than the
 * client-supplied header. When real multi-member Workspace switching reaches
 * these legacy endpoints (V09-06+), this needs to become a real membership
 * check (like WorkspaceAccessPolicy does for the GA vertical slice), not a
 * wider version of this lookup -- tracked as a known gap, not solved here.
 *
 * Returns 0 if the member has no legacy mapping (should not happen per
 * V09-02's unmapped_count=0, but callers must fail closed on 0, never write
 * or query with it as if it were a real workspace id) -- or if the member's
 * workspace_members row is not status='active' (V09-05: pending/suspended/
 * removed members must be rejected here too, not just at membership-creation
 * time; before this fix, a suspended member's legacy_member_workspace_map row
 * still resolved a usable workspace_id, silently ignoring their status).
 */
function hs_resolve_member_workspace_id(mysqli $database, int $memberId): int
{
    static $cache = array();

    if (array_key_exists($memberId, $cache)) {
        return $cache[$memberId];
    }

    $statement = $database->prepare(
        'SELECT lmwm.workspace_id
         FROM legacy_member_workspace_map lmwm
         INNER JOIN workspace_members wm
           ON wm.workspace_id = lmwm.workspace_id
          AND wm.member_id = lmwm.member_id
          AND wm.status = "active"
         WHERE lmwm.member_id = ?
         LIMIT 1'
    );
    $statement->bind_param('i', $memberId);
    $statement->execute();
    $row = $statement->get_result()->fetch_assoc();

    $workspaceId = is_array($row) ? (int) $row['workspace_id'] : 0;
    $cache[$memberId] = $workspaceId;

    return $workspaceId;
}
