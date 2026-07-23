<?php

declare(strict_types=1);

namespace HighlightSignal\Tests\Integration\Workspace;

use HighlightSignal\Auth\ServiceIdentity;
use HighlightSignal\Tests\Support\DatabaseTestCase;
use HighlightSignal\Tests\Support\ServiceFactory;

/**
 * V12-02: this task's own required "cross-workspace" scenario, made a
 * permanent regression test. Every prior V10/V11 rehearsal proved this once,
 * by hand, then deleted the script -- this is the durable version.
 */
final class CrossWorkspaceIsolationTest extends DatabaseTestCase
{
    public function testSignalsCreatedInOneWorkspaceAreInvisibleFromAnother(): void
    {
        $provisioning = ServiceFactory::workspaceProvisioning($this->db());
        $wsA = $provisioning->provisionDefaultForNewMember($this->freshMemberId());
        $wsB = $provisioning->provisionDefaultForNewMember($this->freshMemberId());

        $signalService = new \HighlightSignal\Signal\SignalService($this->db(), ServiceFactory::signalRepository($this->db()));
        $signalService->runSeoTechnicalIssueDetection((int) $wsA['id'], 9001, [
            ['type' => 'missing_title', 'url' => '/isolation-test', 'severity' => 'high', 'message' => 'x'],
        ], []);

        $listA = $signalService->listForWorkspace((int) $wsA['id'], [], 1, 50);
        $listB = $signalService->listForWorkspace((int) $wsB['id'], [], 1, 50);

        $this->assertGreaterThan(0, $listA['total']);
        $this->assertSame(0, $listB['total'], 'workspace B must never see workspace A\'s signals');
    }

    public function testWorkflowMutationsAreScopedPerWorkspace(): void
    {
        $provisioning = ServiceFactory::workspaceProvisioning($this->db());
        $memberA = $this->freshMemberId();
        $memberB = $this->freshMemberId();
        $wsA = $provisioning->provisionDefaultForNewMember($memberA);
        $wsB = $provisioning->provisionDefaultForNewMember($memberB);

        $workflowService = ServiceFactory::workflowService($this->db());
        $identityA = new ServiceIdentity($memberA, (int) $wsA['id'], bin2hex(random_bytes(16)));
        $identityB = new ServiceIdentity($memberB, (int) $wsB['id'], bin2hex(random_bytes(16)));

        $contextKey = 'isolation-ctx-' . $memberA;
        $workflowService->mutate($identityA, $contextKey, [
            'title' => 'Workspace A Recommendation',
            'action' => 'save_decision',
            'decision' => 'accepted',
        ]);

        // The SAME context_key under workspace B's identity must resolve to
        // a COMPLETELY SEPARATE Recommendation row, never A's.
        $resultB = $workflowService->get((int) $wsB['id'], $contextKey);
        $this->assertNull($resultB['decision'], 'workspace B must never see workspace A\'s Decision for the same context_key');

        $resultA = $workflowService->get((int) $wsA['id'], $contextKey);
        $this->assertNotNull($resultA['decision']);
        $this->assertSame('accepted', $resultA['decision']['decision']);
    }
}
