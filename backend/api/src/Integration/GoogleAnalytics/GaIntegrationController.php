<?php

declare(strict_types=1);

namespace HighlightSignal\Integration\GoogleAnalytics;

use HighlightSignal\Auth\ServiceIdentity;
use HighlightSignal\Http\Request;
use HighlightSignal\Http\ValidationException;

final class GaIntegrationController
{
    private $service;
    private $identity;
    private $membership;

    public function __construct(
        GaIntegrationService $service,
        ServiceIdentity $identity,
        array $membership
    ) {
        $this->service = $service;
        $this->identity = $identity;
        $this->membership = $membership;
    }

    public function index(Request $request, array $parameters): array
    {
        $workspaceId = $this->requireMatchingWorkspace($parameters);
        $includeInactive = isset($_GET['include_inactive']) && $_GET['include_inactive'] === '1';

        return array(
            'ok' => true,
            'data' => $this->service->listConnections($workspaceId, $includeInactive),
        );
    }

    public function update(Request $request, array $parameters): array
    {
        $this->requireMatchingWorkspace($parameters);
        $input = $request->json();
        $connectionId = isset($input['connection_id']) ? (int) $input['connection_id'] : 0;
        $status = isset($input['status']) ? (int) $input['status'] : -1;

        return array(
            'ok' => true,
            'data' => $this->service->updateConnectionStatus(
                $this->identity,
                $this->membership,
                $connectionId,
                $status
            ),
        );
    }

    private function requireMatchingWorkspace(array $parameters): int
    {
        $workspaceId = isset($parameters['workspaceId']) ? (int) $parameters['workspaceId'] : 0;
        if ($workspaceId <= 0 || $workspaceId !== $this->identity->workspaceId) {
            throw new ValidationException('Workspace path does not match signed context.');
        }

        return $workspaceId;
    }
}
