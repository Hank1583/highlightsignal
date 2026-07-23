<?php

declare(strict_types=1);

namespace HighlightSignal\Audit;

use HighlightSignal\Auth\ServiceIdentity;
use HighlightSignal\Http\Request;
use HighlightSignal\Http\ValidationException;
use HighlightSignal\Workspace\WorkspacePermissions;

/**
 * V11-07: read-only by design -- no create/update/delete action exists here,
 * and none is registered in public/index.php. Gated behind the
 * `audit.read` permission (owner/admin only, see WorkspacePermissions) rather
 * than plain active-membership `read`, since an audit trail exposes every
 * OTHER member's actions, not just the caller's own.
 */
final class AuditController
{
    private $repository;
    private $identity;
    private $membership;

    public function __construct(AuditRepository $repository, ServiceIdentity $identity, array $membership)
    {
        $this->repository = $repository;
        $this->identity = $identity;
        $this->membership = $membership;
    }

    public function index(Request $request, array $parameters): array
    {
        $this->requireMatchingWorkspace($parameters);
        WorkspacePermissions::requirePermission($this->membership, 'audit.read');

        $filters = array(
            'event_type' => isset($_GET['event_type']) ? (string) $_GET['event_type'] : '',
            'entity_type' => isset($_GET['entity_type']) ? (string) $_GET['entity_type'] : '',
            'entity_id' => isset($_GET['entity_id']) ? (string) $_GET['entity_id'] : '',
            'actor_member_id' => isset($_GET['actor_member_id']) ? (int) $_GET['actor_member_id'] : 0,
            'from' => isset($_GET['from']) ? (string) $_GET['from'] : '',
            'to' => isset($_GET['to']) ? (string) $_GET['to'] : '',
        );
        $page = isset($_GET['page']) ? max(1, (int) $_GET['page']) : 1;
        $perPage = isset($_GET['per_page']) ? max(1, min(100, (int) $_GET['per_page'])) : 20;

        return array('ok' => true, 'data' => $this->repository->search($this->identity->workspaceId, $filters, $page, $perPage));
    }

    private function requireMatchingWorkspace(array $parameters)
    {
        $workspaceId = isset($parameters['workspaceId']) ? (int) $parameters['workspaceId'] : 0;
        if ($workspaceId <= 0 || $workspaceId !== $this->identity->workspaceId) {
            throw new ValidationException('Workspace path does not match signed context.');
        }
    }
}
