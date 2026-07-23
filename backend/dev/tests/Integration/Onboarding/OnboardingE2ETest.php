<?php

declare(strict_types=1);

namespace HighlightSignal\Tests\Integration\Onboarding;

use HighlightSignal\Auth\ServiceIdentity;
use HighlightSignal\Evidence\EvidenceRepository;
use HighlightSignal\Evidence\EvidenceService;
use HighlightSignal\Explanation\ExplanationRepository;
use HighlightSignal\Explanation\ExplanationService;
use HighlightSignal\Signal\SignalRepository;
use HighlightSignal\Signal\SignalService;
use HighlightSignal\Tests\Support\DatabaseTestCase;
use HighlightSignal\Tests\Support\ServiceFactory;

/**
 * V12-02: this task's own required "onboarding" scenario -- the permanent
 * regression version of V10-08's golden path (Signal -> Evidence ->
 * Explanation -> Recommendation -> Decision -> Task), starting from a
 * brand-new member with NO Workspace at all, exactly mirroring what V12-01's
 * registration BFF now triggers proactively.
 */
final class OnboardingE2ETest extends DatabaseTestCase
{
    public function testBrandNewMemberOnboardsThroughToATask(): void
    {
        $memberId = $this->freshMemberId();

        // Step 1: Workspace provisioning (what V12-01's register route calls
        // right after auto-login).
        $workspace = ServiceFactory::workspaceProvisioning($this->db())->provisionDefaultForNewMember($memberId);
        $workspaceId = (int) $workspace['id'];
        $this->assertGreaterThan(0, $workspaceId);

        // Step 2: a real Signal is detected (system-triggered, e.g. from a
        // scheduled SEO scan).
        $signalService = new SignalService($this->db(), ServiceFactory::signalRepository($this->db()));
        $siteId = 7001;
        $stats = $signalService->runSeoTechnicalIssueDetection($workspaceId, $siteId, [
            ['type' => 'missing_meta_description', 'url' => '/onboarding-test', 'severity' => 'high', 'message' => 'Missing meta description'],
        ], []);
        $this->assertSame(1, $stats['created']);

        $signals = $signalService->listForWorkspace($workspaceId, [], 1, 10);
        $this->assertSame(1, $signals['total']);
        $signalId = $signals['items'][0]['id'];

        // Step 3: Evidence recorded for that Signal.
        $evidenceService = new EvidenceService(new EvidenceRepository($this->db()), ServiceFactory::signalRepository($this->db()));
        $evidenceStats = $evidenceService->recordSeoTechnicalIssueEvidence($workspaceId, $siteId, [
            ['type' => 'missing_meta_description', 'url' => '/onboarding-test', 'severity' => 'high', 'message' => 'Missing meta description'],
        ], [], 1, date('Y-m-d H:i:s'));
        $this->assertGreaterThan(0, $evidenceStats['recorded'] + $evidenceStats['refreshed']);

        // Step 4: Business Impact / Explanation generated from Signal + Evidence.
        $explanationService = new ExplanationService(
            new ExplanationRepository($this->db()),
            ServiceFactory::signalRepository($this->db()),
            new EvidenceRepository($this->db())
        );
        $analysis = $explanationService->readOrGenerateForSignal($workspaceId, $signalId);
        $this->assertIsArray($analysis);

        // Step 5: a human reviews the Signal and formalizes+accepts it,
        // creating a real Task in one call (WorkflowService's own
        // save_decision-via-create_task path).
        $identity = new ServiceIdentity($memberId, $workspaceId, bin2hex(random_bytes(16)));
        $workflowService = ServiceFactory::workflowService($this->db());
        $contextKey = 'onboarding-e2e-' . $memberId;

        $result = $workflowService->mutate($identity, $contextKey, [
            'title' => 'Fix missing meta description',
            'action' => 'create_task',
            'signal_context' => ['signal_id' => $signalId],
            'steps' => [['title' => 'Add meta description to /onboarding-test']],
        ]);

        $this->assertNotNull($result['recommendation']);
        $this->assertSame((int) $signalId, $result['recommendation']['signal_id']);
        $this->assertNotNull($result['decision']);
        $this->assertSame('accepted', $result['decision']['decision']);
        $this->assertNotNull($result['task']);
        $this->assertNotNull($result['action']);

        // Step 6: complete the Task's only step -- the full loop closes with
        // a real Execution Result, matching V10-08's own golden path
        // definition of "end to end."
        $stepId = $result['task']['steps'][0]['id'];
        $completed = $workflowService->mutate($identity, $contextKey, [
            'title' => 'Fix missing meta description',
            'action' => 'update_step',
            'task_id' => $result['task']['id'],
            'step_id' => $stepId,
            'completed' => true,
        ]);

        $this->assertSame('completed', $completed['task']['status']);
    }
}
