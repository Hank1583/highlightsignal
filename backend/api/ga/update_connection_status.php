<?php

declare(strict_types=1);

use HighlightSignal\Audit\AuditLogger;
use HighlightSignal\Workspace\AuthorizationException;
use HighlightSignal\Workspace\WorkspaceAccessPolicy;
use HighlightSignal\Workspace\WorkspacePermissions;

require_once __DIR__ . "/../db_connect.php";
require_once __DIR__ . "/../legacy_auth.php";

header("Content-Type: application/json; charset=utf-8");

$member_id = hs_require_service_member($conn);
// V09-05: this legacy flat file mutates the exact same field
// (ga_connections.status) that GaIntegrationService::updateConnectionStatus()
// gates behind an owner/admin/manager role check -- this was a shadow
// endpoint with no workspace or role check at all, letting any signed member
// (viewer included) flip a connection's active status. Brought in line with
// the new-architecture path: resolve workspace_id server-side, require
// active membership, then enforce the same central permission matrix.
$workspace_id = hs_resolve_member_workspace_id($conn, $member_id);

try {
    $membership = (new WorkspaceAccessPolicy($conn))->requireActiveMembership($workspace_id, $member_id);
    WorkspacePermissions::requirePermission($membership, 'integrations.manage');
} catch (AuthorizationException $error) {
    http_response_code(403);
    echo json_encode([
        "ok" => false,
        "message" => "Workspace role cannot update integrations."
    ]);
    exit;
}

$input = json_decode(file_get_contents("php://input"), true);
$connection_id = intval($input["connection_id"] ?? 0);
$status = isset($input["status"]) ? intval($input["status"]) : -1;

if ($connection_id <= 0 || !in_array($status, [0, 1], true)) {
  http_response_code(400);
  echo json_encode([
    "ok" => false,
    "message" => "Invalid connection settings"
  ]);
  exit;
}

// V11-07: UPDATE + its audit row now share one transaction -- previously a
// crash between the UPDATE and (a not-yet-existing) audit write could leave
// the status change persisted with no trace of who did it.
$conn->begin_transaction();
try {
    $stmt = $conn->prepare("
      UPDATE ga_connections
      SET status = ?
      WHERE id = ? AND workspace_id = ?
    ");
    $stmt->bind_param("iii", $status, $connection_id, $workspace_id);
    $stmt->execute();

    $check = $conn->prepare("
      SELECT id, status
      FROM ga_connections
      WHERE id = ? AND workspace_id = ?
      LIMIT 1
    ");
    $check->bind_param("ii", $connection_id, $workspace_id);
    $check->execute();
    $connection = $check->get_result()->fetch_assoc();

    if (!$connection) {
        $conn->rollback();
        http_response_code(404);
        echo json_encode([
            "ok" => false,
            "message" => "GA connection not found"
        ]);
        exit;
    }

    // Same mutation GaIntegrationService::updateConnectionStatus() already
    // audits under 'integration.ga_status_updated' -- this legacy shadow
    // endpoint mutates the exact same field through a different code path,
    // so it gets the same event_type rather than a separate untracked one.
    (new AuditLogger($conn))->record(
        $workspace_id,
        $member_id,
        'integration.ga_status_updated',
        'WorkspaceIntegration',
        (string) $connection_id,
        array('status' => $status)
    );
    $conn->commit();
} catch (Throwable $error) {
    $conn->rollback();
    throw $error;
}

echo json_encode([
  "ok" => true,
  "data" => $connection
]);
