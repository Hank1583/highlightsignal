<?php

declare(strict_types=1);

namespace HighlightSignal\Tests\Support;

use HighlightSignal\Action\ActionRepository;
use HighlightSignal\Dashboard\WorkflowRepository;
use HighlightSignal\Dashboard\WorkflowService;
use HighlightSignal\Evaluation\EvaluationRepository;
use HighlightSignal\Evaluation\EvaluationService;
use HighlightSignal\Evidence\EvidenceRepository;
use HighlightSignal\Execution\ExecutionResultRepository;
use HighlightSignal\Execution\ExecutionResultService;
use HighlightSignal\Explanation\ExplanationRepository;
use HighlightSignal\Notification\NotificationRepository;
use HighlightSignal\Notification\NotificationService;
use HighlightSignal\Outcome\BusinessOutcomeMetricRepository;
use HighlightSignal\Outcome\BusinessOutcomeMetricService;
use HighlightSignal\Queue\QueueRepository;
use HighlightSignal\Queue\QueueService;
use HighlightSignal\Signal\SignalRepository;
use HighlightSignal\Workspace\WorkspaceProvisioningService;
use mysqli;

/**
 * V12-02: mirrors the EXACT wiring `backend/api/public/index.php` uses for
 * `WorkflowService` -- one place tests build it, instead of every test
 * class re-deriving the (currently 10-parameter) constructor. If
 * `WorkflowService`'s constructor grows again, this is the one place to
 * update, not every test file.
 */
final class ServiceFactory
{
    public static function workspaceProvisioning(mysqli $db): WorkspaceProvisioningService
    {
        return new WorkspaceProvisioningService($db);
    }

    public static function signalRepository(mysqli $db): SignalRepository
    {
        return new SignalRepository($db);
    }

    public static function workflowService(mysqli $db): WorkflowService
    {
        $signalRepository = new SignalRepository($db);
        $evidenceRepository = new EvidenceRepository($db);
        $explanationRepository = new ExplanationRepository($db);
        $actionRepository = new ActionRepository($db);
        $executionResultService = new ExecutionResultService(new ExecutionResultRepository($db));
        $businessOutcomeMetricService = new BusinessOutcomeMetricService(new BusinessOutcomeMetricRepository($db));
        $evaluationService = new EvaluationService(new EvaluationRepository($db), $db);
        $queueService = new QueueService(new QueueRepository($db), $db, $executionResultService);
        $notificationService = new NotificationService(new NotificationRepository($db), $queueService, $db);

        return new WorkflowService(
            $db,
            new WorkflowRepository($db),
            $signalRepository,
            $evidenceRepository,
            $explanationRepository,
            $actionRepository,
            $executionResultService,
            $businessOutcomeMetricService,
            $evaluationService,
            $notificationService
        );
    }
}
