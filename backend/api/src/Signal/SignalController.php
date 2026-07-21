<?php

declare(strict_types=1);

namespace HighlightSignal\Signal;

use HighlightSignal\Auth\ServiceIdentity;
use HighlightSignal\Http\Request;
use HighlightSignal\Http\ValidationException;

final class SignalController
{
    private $service;
    private $identity;
    private $membership;

    public function __construct(SignalService $service, ServiceIdentity $identity, array $membership)
    {
        $this->service = $service;
        $this->identity = $identity;
        $this->membership = $membership;
    }

    public function index(Request $request, array $parameters): array
    {
        $workspaceId = $this->requireMatchingWorkspace($parameters);

        $filters = array(
            'status' => isset($_GET['status']) ? (string) $_GET['status'] : '',
            'severity' => isset($_GET['severity']) ? (string) $_GET['severity'] : '',
        );
        $page = isset($_GET['page']) ? (int) $_GET['page'] : 1;
        $perPage = isset($_GET['per_page']) ? (int) $_GET['per_page'] : 20;

        return array('ok' => true, 'data' => $this->service->listForWorkspace($workspaceId, $filters, $page, $perPage));
    }

    public function update(Request $request, array $parameters): array
    {
        $this->requireMatchingWorkspace($parameters);
        $signalId = isset($parameters['signalId']) ? (int) $parameters['signalId'] : 0;
        if ($signalId <= 0) {
            throw new ValidationException('Invalid signal id.');
        }

        $input = $request->json();
        $status = isset($input['status']) ? (string) $input['status'] : '';

        return array(
            'ok' => true,
            'data' => $this->service->updateStatus($this->identity, $this->membership, $signalId, $status),
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
