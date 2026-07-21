<?php

declare(strict_types=1);

namespace HighlightSignal\Dashboard;

use HighlightSignal\Auth\ServiceIdentity;
use HighlightSignal\Http\Request;
use HighlightSignal\Http\ValidationException;
use HighlightSignal\Workspace\WorkspacePermissions;

final class WorkflowController
{
    private $service;
    private $identity;
    private $membership;

    public function __construct(WorkflowService $service, ServiceIdentity $identity, array $membership)
    {
        $this->service = $service;
        $this->identity = $identity;
        $this->membership = $membership;
    }

    public function show(Request $request, array $parameters): array
    {
        $this->requireMatchingWorkspace($parameters);
        $contextKey = $this->contextKey((string) ($_GET['context_key'] ?? ''));
        return array('ok' => true, 'data' => $this->service->get($this->identity->workspaceId, $contextKey));
    }

    public function update(Request $request, array $parameters): array
    {
        $this->requireMatchingWorkspace($parameters);
        WorkspacePermissions::requirePermission($this->membership, 'workflow.mutate');
        $input = $request->json();
        $contextKey = $this->contextKey((string) ($input['context_key'] ?? ''));
        return array('ok' => true, 'data' => $this->service->mutate($this->identity, $contextKey, $input));
    }

    private function requireMatchingWorkspace(array $parameters)
    {
        $workspaceId = (int) ($parameters['workspaceId'] ?? 0);
        if ($workspaceId <= 0 || $workspaceId !== $this->identity->workspaceId) {
            throw new ValidationException('Workspace path does not match signed context.');
        }
    }

    private function contextKey(string $value): string
    {
        $value = trim($value);
        if ($value === '' || strlen($value) > 191 || !preg_match('/^[a-zA-Z0-9:_-]+$/', $value)) {
            throw new ValidationException('Invalid workflow context key.');
        }
        return $value;
    }
}
