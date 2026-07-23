<?php

declare(strict_types=1);

namespace HighlightSignal\Tests\Unit\Workspace;

use HighlightSignal\Workspace\AuthorizationException;
use HighlightSignal\Workspace\WorkspacePermissions;
use PHPUnit\Framework\TestCase;

/**
 * V12-02: the authorization test the task packet's own required work item #1
 * explicitly names ("role"). `WorkspacePermissions` is the single source of
 * truth for the entire permission matrix (V09-05) -- this is a pure, fast
 * unit test with no database, but it is the highest-leverage authorization
 * test in the whole suite: every domain Service's permission check goes
 * through this one class.
 */
final class WorkspacePermissionsTest extends TestCase
{
    public function testOwnerAllowedEverything(): void
    {
        $this->assertTrue(WorkspacePermissions::allows('owner', 'read'));
        $this->assertTrue(WorkspacePermissions::allows('owner', 'integrations.manage'));
        $this->assertTrue(WorkspacePermissions::allows('owner', 'workflow.mutate'));
        $this->assertTrue(WorkspacePermissions::allows('owner', 'audit.read'));
    }

    public function testViewerCanReadButNotMutate(): void
    {
        $this->assertTrue(WorkspacePermissions::allows('viewer', 'read'));
        $this->assertFalse(WorkspacePermissions::allows('viewer', 'workflow.mutate'));
        $this->assertFalse(WorkspacePermissions::allows('viewer', 'integrations.manage'));
    }

    public function testMemberCanMutateWorkflowButNotManageIntegrations(): void
    {
        $this->assertTrue(WorkspacePermissions::allows('member', 'workflow.mutate'));
        $this->assertFalse(WorkspacePermissions::allows('member', 'integrations.manage'));
    }

    /** Audit read is deliberately narrower than plain 'read' (V11-07) -- an audit trail exposes every OTHER member's actions. */
    public function testAuditReadIsOwnerAdminOnly(): void
    {
        $this->assertTrue(WorkspacePermissions::allows('owner', 'audit.read'));
        $this->assertTrue(WorkspacePermissions::allows('admin', 'audit.read'));
        $this->assertFalse(WorkspacePermissions::allows('manager', 'audit.read'));
        $this->assertFalse(WorkspacePermissions::allows('member', 'audit.read'));
        $this->assertFalse(WorkspacePermissions::allows('viewer', 'audit.read'));
    }

    public function testUnknownActionDeniesEveryRole(): void
    {
        $this->assertFalse(WorkspacePermissions::allows('owner', 'not_a_real_action'));
    }

    public function testUnknownRoleDeniesEverything(): void
    {
        $this->assertFalse(WorkspacePermissions::allows('not_a_real_role', 'read'));
    }

    public function testRequirePermissionThrowsForDeniedRole(): void
    {
        $this->expectException(AuthorizationException::class);
        WorkspacePermissions::requirePermission(['role' => 'viewer'], 'workflow.mutate');
    }

    public function testRequirePermissionPassesSilentlyForAllowedRole(): void
    {
        WorkspacePermissions::requirePermission(['role' => 'owner'], 'workflow.mutate');
        $this->addToAssertionCount(1); // reaching here without throwing IS the assertion
    }

    /**
     * Mutation-proof: this is the exact deliberate-defect scenario V12-02's
     * mandatory verification asks for ("故意引入 authorization... 缺陷時
     * gate 會失敗") -- documented here as a comment rather than actually
     * committed broken, since the real one-time proof run is recorded in
     * docs/releases/V12-02_AUTOMATED_TEST_SUITE_REPORT.md. If
     * WorkspacePermissions::MATRIX['workflow.mutate'] is ever widened to
     * include 'viewer', testViewerCanReadButNotMutate() above fails
     * immediately.
     */
    public function testViewerNeverGainsWorkflowMutateByAccident(): void
    {
        $this->assertFalse(WorkspacePermissions::allows('viewer', 'workflow.mutate'));
    }
}
