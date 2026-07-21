<?php

declare(strict_types=1);

namespace HighlightSignal\Workspace;

/**
 * V09-05: single source of truth for "which workspace_members.role values can
 * perform which action". Before this, GaIntegrationService and
 * WorkflowController each hardcoded their own in_array($membership['role'], [...])
 * check, and several legacy flat endpoints (backend/api/ga/*.php) duplicated
 * or simply omitted the same check. Every call site should go through
 * requirePermission() rather than re-implementing the matrix.
 *
 * Role set matches workspace_members.role's ENUM (backend/sql/migrations/010):
 * owner, admin, manager, member, viewer, billing, external_viewer.
 */
final class WorkspacePermissions
{
    /**
     * Action => roles allowed to perform it. `read` covers any endpoint that
     * only requires active membership (already enforced by
     * WorkspaceAccessPolicy::requireActiveMembership() before this matrix is
     * ever consulted) with no further role restriction.
     */
    private const MATRIX = array(
        'read' => array('owner', 'admin', 'manager', 'member', 'viewer', 'billing', 'external_viewer'),
        'integrations.manage' => array('owner', 'admin', 'manager'),
        'workflow.mutate' => array('owner', 'admin', 'manager', 'member'),
    );

    public static function allows(string $role, string $action): bool
    {
        return in_array($role, self::MATRIX[$action] ?? array(), true);
    }

    /** @param array{role: string} $membership */
    public static function requirePermission(array $membership, string $action): void
    {
        $role = (string) ($membership['role'] ?? '');
        if (!self::allows($role, $action)) {
            throw new AuthorizationException(sprintf(
                'Workspace role "%s" cannot perform "%s".',
                $role !== '' ? $role : '(none)',
                $action
            ));
        }
    }
}
