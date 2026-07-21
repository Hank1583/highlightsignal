<?php

declare(strict_types=1);

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
use HighlightSignal\Evidence\EvidenceController;
use HighlightSignal\Evidence\EvidenceRepository;
use HighlightSignal\Evidence\EvidenceService;
use HighlightSignal\Explanation\ExplanationController;
use HighlightSignal\Explanation\ExplanationRepository;
use HighlightSignal\Explanation\ExplanationService;
use HighlightSignal\Integration\GoogleAnalytics\GaIntegrationController;
use HighlightSignal\Integration\GoogleAnalytics\GaIntegrationRepository;
use HighlightSignal\Integration\GoogleAnalytics\GaIntegrationService;
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

    $workflowRepository = new WorkflowRepository($database);
    $workflowService = new WorkflowService($database, $workflowRepository, $signalRepository, $evidenceRepository, $explanationRepository);
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
    JsonResponse::error('CONFIGURATION_ERROR', 'Backend configuration is incomplete.', 500);
} catch (Throwable $error) {
    error_log($error->getMessage());
    $debug = strtolower((string) Environment::get('APP_DEBUG', 'false')) === 'true';
    JsonResponse::error(
        'INTERNAL_ERROR',
        $debug ? get_class($error) . ': ' . $error->getMessage() : 'Unexpected server error.',
        500
    );
}
