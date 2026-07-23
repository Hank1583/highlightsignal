<?php

declare(strict_types=1);

use HighlightSignal\Action\ActionRepository;
use HighlightSignal\Audit\AuditController;
use HighlightSignal\Audit\AuditRepository;
use HighlightSignal\Auth\ServiceRequestAuthenticator;
use HighlightSignal\Auth\AuthenticationException;
use HighlightSignal\Config\Environment;
use HighlightSignal\Database\ConnectionFactory;
use HighlightSignal\Dashboard\WorkflowController;
use HighlightSignal\Dashboard\WorkflowRepository;
use HighlightSignal\Dashboard\WorkflowService;
use HighlightSignal\Http\JsonResponse;
use HighlightSignal\Http\NotFoundException;
use HighlightSignal\Http\Request;
use HighlightSignal\Http\Router;
use HighlightSignal\Http\ValidationException;
use HighlightSignal\Evaluation\EvaluationController;
use HighlightSignal\Evaluation\EvaluationRepository;
use HighlightSignal\Evaluation\EvaluationService;
use HighlightSignal\Evidence\EvidenceController;
use HighlightSignal\Evidence\EvidenceRepository;
use HighlightSignal\Evidence\EvidenceService;
use HighlightSignal\Execution\ExecutionResultRepository;
use HighlightSignal\Execution\ExecutionResultService;
use HighlightSignal\Explanation\ExplanationController;
use HighlightSignal\Explanation\ExplanationRepository;
use HighlightSignal\Explanation\ExplanationService;
use HighlightSignal\Integration\GoogleAnalytics\GaIntegrationController;
use HighlightSignal\Integration\GoogleAnalytics\GaIntegrationRepository;
use HighlightSignal\Integration\GoogleAnalytics\GaIntegrationService;
use HighlightSignal\Notification\EmailDeliveryHandler;
use HighlightSignal\Notification\NotificationController;
use HighlightSignal\Notification\NotificationRepository;
use HighlightSignal\Notification\NotificationService;
use HighlightSignal\Ops\OpsDashboardService;
use HighlightSignal\Outcome\BusinessOutcomeMetricRepository;
use HighlightSignal\Outcome\BusinessOutcomeMetricService;
use HighlightSignal\Queue\QueueRepository;
use HighlightSignal\Queue\QueueService;
use HighlightSignal\Queue\WorkerRequestAuthenticator;
use HighlightSignal\Retention\RetentionCleanupService;
use HighlightSignal\Retention\RetentionRepository;
use HighlightSignal\Signal\SignalController;
use HighlightSignal\Signal\SignalRepository;
use HighlightSignal\Signal\SignalService;
use HighlightSignal\Workspace\WorkspaceAccessPolicy;
use HighlightSignal\Workspace\AuthorizationException;
use HighlightSignal\Workspace\WorkspaceAlreadyProvisionedException;
use HighlightSignal\Workspace\WorkspaceController;
use HighlightSignal\Workspace\WorkspaceProvisioningService;
use HighlightSignal\Workspace\WorkspaceRepository;
use HighlightSignal\Workspace\WorkspaceService;

require dirname(__DIR__) . '/config/bootstrap.php';

// TEMP-DIAG: one-off env-resolution probe, no secret values exposed.
// Remove this block once the DB_HOST-missing cause is confirmed.
if (($_GET['diag'] ?? null) === 'env') {
    $override = getenv('HIGHLIGHT_SIGNAL_ENV_FILE');
    $resolvedFile = ($override !== false && trim($override) !== '')
        ? $override
        : dirname(dirname(__DIR__)) . '/private/.env';
    $fileExists = is_file($resolvedFile);
    $hasDbHostLine = false;
    $lineCount = null;
    if ($fileExists) {
        $contents = file($resolvedFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
        $lineCount = count($contents);
        foreach ($contents as $line) {
            if (preg_match('/^\s*DB_HOST\s*=/', $line)) {
                $hasDbHostLine = true;
                break;
            }
        }
    }
    header('Content-Type: application/json');
    echo json_encode([
        'ok' => true,
        'data' => [
            'HIGHLIGHT_SIGNAL_ENV_FILE_override' => $override === false ? null : $override,
            'resolved_env_file' => $resolvedFile,
            'file_exists' => $fileExists,
            'line_count' => $lineCount,
            'has_DB_HOST_line_in_file' => $hasDbHostLine,
            'getenv_DB_HOST_after_load' => getenv('DB_HOST') === false ? null : '(set, hidden)',
        ],
    ]);
    exit;
}

$request = Request::fromGlobals();
$allowedOrigins = array_values(array_filter(array_map(
    'trim',
    explode(',', Environment::get('APP_ALLOWED_ORIGINS', ''))
)));
$origin = $request->header('origin');

if ($origin !== null && in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}

if ($request->method === 'OPTIONS') {
    if ($origin === null || !in_array($origin, $allowedOrigins, true)) {
        JsonResponse::error('CORS_ORIGIN_DENIED', 'Origin is not allowed.', 403);
    }

    header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-HS-Timestamp, X-HS-Nonce, X-HS-Member-Id, X-HS-Workspace-Id, X-HS-Signature');
    header('Access-Control-Max-Age: 600');
    http_response_code(204);
    exit;
}

$router = new Router();
$router->add('GET', '/api/v1/health', static function () {
    return array(
        'ok' => true,
        'data' => array(
            'service' => 'highlight-signal-backend',
            'status' => 'healthy',
            'version' => 'v1',
        ),
    );
});

try {
    if ($request->routePath === '/api/v1/health') {
        JsonResponse::send($router->dispatch($request) ?? []);
    }

    // V11-02: the queue worker trigger deliberately bypasses
    // ServiceRequestAuthenticator (member/workspace identity has no meaning
    // for a batch that processes jobs across every workspace) -- it has its
    // own signed-request authenticator and its own secret
    // (QUEUE_WORKER_SECRET), same position in the request lifecycle as the
    // health check above. V11-06 Notification's email delivery is the
    // FIRST real handler registered here -- it always fails today
    // (EmailDeliveryHandler is a documented stub, no real provider wired
    // up), so it correctly exercises the real retry/dead-letter path
    // rather than proving nothing.
    if ($request->routePath === '/api/v1/queue/run') {
        if ($request->method !== 'POST') {
            JsonResponse::error('METHOD_NOT_ALLOWED', 'Method not allowed.', 405);
        }
        $database = ConnectionFactory::create();
        (new WorkerRequestAuthenticator($database))->authenticate($request);
        $executionResultService = new ExecutionResultService(new ExecutionResultRepository($database));
        $queueService = new QueueService(new QueueRepository($database), $database, $executionResultService);
        $notificationService = new NotificationService(new NotificationRepository($database), $queueService, $database);
        $emailDeliveryHandler = new EmailDeliveryHandler();
        $handlerRegistry = array(
            'notification.email' => static function (array $payload) use ($notificationService, $emailDeliveryHandler) {
                $notificationService->handleEmailDeliveryJob($payload, $emailDeliveryHandler);
            },
        );
        $stats = $queueService->runBatch(
            $handlerRegistry,
            Environment::integer('QUEUE_WORKER_BATCH_SIZE', 10),
            Environment::integer('QUEUE_WORKER_TIME_BUDGET_SECONDS', 20)
        );
        JsonResponse::send(array('ok' => true, 'data' => $stats));
    }

    // V11-08: same reasoning as /api/v1/queue/run above -- retention
    // cleanup sweeps across ALL workspaces, so it has no member/workspace
    // identity to authenticate against; reuses the SAME WorkerRequestAuthenticator
    // (its HMAC canonical string is bound to $request->path, so a signature
    // computed for this endpoint never validates against /api/v1/queue/run).
    // Defaults to dry_run for safety -- an external scheduler must pass
    // ?mode=delete explicitly to actually remove anything.
    if ($request->routePath === '/api/v1/retention/run') {
        if ($request->method !== 'POST') {
            JsonResponse::error('METHOD_NOT_ALLOWED', 'Method not allowed.', 405);
        }
        $database = ConnectionFactory::create();
        (new WorkerRequestAuthenticator($database))->authenticate($request);
        $retentionService = new RetentionCleanupService(new RetentionRepository($database), $database);
        $dryRun = !isset($_GET['mode']) || $_GET['mode'] !== 'delete';
        $summary = $retentionService->runAll($dryRun);
        JsonResponse::send(array('ok' => $summary['ok'], 'data' => array('mode' => $dryRun ? 'dry_run' : 'delete', 'results' => $summary['results'])));
    }

    // V12-04: same reasoning as /api/v1/queue/run and /api/v1/retention/run
    // above -- an operational snapshot across ALL workspaces has no single
    // member/workspace identity to authenticate against. An external
    // uptime/monitoring poller hits this on a schedule (this host has no
    // persistent agent/exporter to run one itself); see
    // docs/8.infrastructure/12_Observability_Runbook.md for the alert
    // thresholds evaluated against this endpoint's response.
    if ($request->routePath === '/api/v1/ops/dashboard') {
        if ($request->method !== 'GET') {
            JsonResponse::error('METHOD_NOT_ALLOWED', 'Method not allowed.', 405);
        }
        $database = ConnectionFactory::create();
        (new WorkerRequestAuthenticator($database))->authenticate($request);
        $opsDashboardService = new OpsDashboardService($database);
        JsonResponse::send(array('ok' => true, 'data' => $opsDashboardService->snapshot()));
    }

    $database = ConnectionFactory::create();
    $identity = (new ServiceRequestAuthenticator($database))->authenticate($request);

    $workspaceRepository = new WorkspaceRepository($database);
    $workspaceService = new WorkspaceService($workspaceRepository);
    $workspaceProvisioningService = new WorkspaceProvisioningService($database);
    $workspaceController = new WorkspaceController($workspaceService, $identity, $workspaceProvisioningService);
    $router->add('GET', '/api/v1/workspaces', array($workspaceController, 'index'));
    $router->add('POST', '/api/v1/workspaces', array($workspaceController, 'create'));

    if ($request->routePath === '/api/v1/workspaces') {
        $workspaceResponse = $router->dispatch($request);
        if ($workspaceResponse === null) {
            JsonResponse::error('METHOD_NOT_ALLOWED', 'Method not allowed.', 405);
        }
        JsonResponse::send($workspaceResponse);
    }

    $membership = (new WorkspaceAccessPolicy($database))->requireActiveMembership(
        $identity->workspaceId,
        $identity->memberId
    );

    $router->add('GET', '/api/v1/context', static function () use ($membership) {
        return array(
            'ok' => true,
            'data' => array(
                'workspace_id' => $membership['workspace_id'],
                'member_id' => $membership['member_id'],
                'role' => $membership['role'],
                'legacy_owner_member_id' => $membership['legacy_owner_member_id'],
            ),
        );
    });

    $gaRepository = new GaIntegrationRepository($database);
    $gaService = new GaIntegrationService($database, $gaRepository);
    $gaController = new GaIntegrationController($gaService, $identity, $membership);
    $router->add(
        'GET',
        '/api/v1/workspaces/{workspaceId}/integrations/ga',
        array($gaController, 'index')
    );
    $router->add(
        'PATCH',
        '/api/v1/workspaces/{workspaceId}/integrations/ga',
        array($gaController, 'update')
    );

    $signalRepository = new SignalRepository($database);
    $signalService = new SignalService($database, $signalRepository);
    $signalController = new SignalController($signalService, $identity, $membership);
    $router->add(
        'GET',
        '/api/v1/workspaces/{workspaceId}/signals',
        array($signalController, 'index')
    );
    $router->add(
        'PATCH',
        '/api/v1/workspaces/{workspaceId}/signals/{signalId}',
        array($signalController, 'update')
    );

    $evidenceRepository = new EvidenceRepository($database);
    $evidenceService = new EvidenceService($evidenceRepository, $signalRepository);
    $evidenceController = new EvidenceController($evidenceService, $identity);
    $router->add(
        'GET',
        '/api/v1/workspaces/{workspaceId}/evidence',
        array($evidenceController, 'index')
    );
    $router->add(
        'GET',
        '/api/v1/workspaces/{workspaceId}/signals/{signalId}/evidence',
        array($evidenceController, 'forSignal')
    );

    $explanationRepository = new ExplanationRepository($database);
    $explanationService = new ExplanationService($explanationRepository, $signalRepository, $evidenceRepository);
    $explanationController = new ExplanationController($explanationService, $identity);
    $router->add(
        'GET',
        '/api/v1/workspaces/{workspaceId}/signals/{signalId}/analysis',
        array($explanationController, 'forSignal')
    );

    $actionRepository = new ActionRepository($database);
    $executionResultService = new ExecutionResultService(new ExecutionResultRepository($database));
    $businessOutcomeMetricService = new BusinessOutcomeMetricService(new BusinessOutcomeMetricRepository($database));
    $evaluationService = new EvaluationService(new EvaluationRepository($database), $database);
    $notificationService = new NotificationService(
        new NotificationRepository($database),
        new QueueService(new QueueRepository($database), $database, $executionResultService),
        $database
    );
    $workflowRepository = new WorkflowRepository($database);
    $workflowService = new WorkflowService($database, $workflowRepository, $signalRepository, $evidenceRepository, $explanationRepository, $actionRepository, $executionResultService, $businessOutcomeMetricService, $evaluationService, $notificationService);
    $workflowController = new WorkflowController($workflowService, $identity, $membership);
    $router->add(
        'GET',
        '/api/v1/workspaces/{workspaceId}/dashboard/workflow',
        array($workflowController, 'show')
    );
    $router->add(
        'PATCH',
        '/api/v1/workspaces/{workspaceId}/dashboard/workflow',
        array($workflowController, 'update')
    );

    $evaluationController = new EvaluationController($evaluationService, $identity, $membership);
    $router->add(
        'GET',
        '/api/v1/workspaces/{workspaceId}/evaluations',
        array($evaluationController, 'index')
    );
    $router->add(
        'PATCH',
        '/api/v1/workspaces/{workspaceId}/evaluations',
        array($evaluationController, 'submitFeedback')
    );

    $notificationController = new NotificationController($notificationService, $identity);
    $router->add(
        'GET',
        '/api/v1/workspaces/{workspaceId}/notifications',
        array($notificationController, 'index')
    );
    $router->add(
        'PATCH',
        '/api/v1/workspaces/{workspaceId}/notifications/{notificationId}/read',
        array($notificationController, 'read')
    );
    $router->add(
        'PATCH',
        '/api/v1/workspaces/{workspaceId}/notifications/{notificationId}/dismiss',
        array($notificationController, 'dismiss')
    );
    $router->add(
        'GET',
        '/api/v1/workspaces/{workspaceId}/notifications/preferences',
        array($notificationController, 'preferencesIndex')
    );
    $router->add(
        'PATCH',
        '/api/v1/workspaces/{workspaceId}/notifications/preferences',
        array($notificationController, 'preferencesUpdate')
    );

    // V11-07: read-only, Workspace-scoped, owner/admin-only (see
    // WorkspacePermissions::MATRIX['audit.read']) -- no create/update/delete
    // route is registered here or anywhere else for this resource.
    $auditController = new AuditController(new AuditRepository($database), $identity, $membership);
    $router->add(
        'GET',
        '/api/v1/workspaces/{workspaceId}/audit-logs',
        array($auditController, 'index')
    );

    $response = $router->dispatch($request);
    if ($response === null) {
        JsonResponse::error('NOT_FOUND', 'Route not found.', 404);
    }

    JsonResponse::send($response);
} catch (InvalidArgumentException $error) {
    JsonResponse::error('INVALID_JSON', 'Request body is not valid JSON.', 400);
} catch (ValidationException $error) {
    JsonResponse::error('VALIDATION_ERROR', $error->getMessage(), 400);
} catch (NotFoundException $error) {
    JsonResponse::error('NOT_FOUND', $error->getMessage(), 404);
} catch (mysqli_sql_exception $error) {
    if ((int) $error->getCode() === 1062) {
        JsonResponse::error('REPLAY_DETECTED', 'Duplicate signed request.', 401);
    }

    error_log($error->getMessage());
    $debug = strtolower((string) Environment::get('APP_DEBUG', 'false')) === 'true';
    JsonResponse::error('DATABASE_ERROR', $debug ? $error->getMessage() : 'Database operation failed.', 500);
} catch (AuthenticationException $error) {
    JsonResponse::error('UNAUTHORIZED', $error->getMessage(), 401);
} catch (AuthorizationException $error) {
    JsonResponse::error('FORBIDDEN', $error->getMessage(), 403);
} catch (WorkspaceAlreadyProvisionedException $error) {
    JsonResponse::error('WORKSPACE_ALREADY_PROVISIONED', $error->getMessage(), 409);
} catch (RuntimeException $error) {
    error_log($error->getMessage());
    // TEMP-DIAG: unconditionally reveal the real message for live debugging;
    // revert to the APP_DEBUG-gated version once the cause is found.
    JsonResponse::error('CONFIGURATION_ERROR', '[diag] ' . $error->getMessage(), 500);
} catch (Throwable $error) {
    error_log($error->getMessage());
    $debug = strtolower((string) Environment::get('APP_DEBUG', 'false')) === 'true';
    JsonResponse::error(
        'INTERNAL_ERROR',
        $debug ? get_class($error) . ': ' . $error->getMessage() : 'Unexpected server error.',
        500
    );
}
