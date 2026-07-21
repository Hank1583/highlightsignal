<?php

declare(strict_types=1);

namespace HighlightSignal\Evidence;

use HighlightSignal\Auth\ServiceIdentity;
use HighlightSignal\Http\Request;
use HighlightSignal\Http\ValidationException;

/**
 * V10-02: read-only on purpose -- Evidence is only ever written by system
 * detection (EvidenceService::recordSeoTechnicalIssueEvidence(), called from
 * si/seo/summary.php), never by a human PATCH/POST. There is no mutation
 * endpoint here to gate with WorkspacePermissions.
 */
final class EvidenceController
{
    private $service;
    private $identity;

    public function __construct(EvidenceService $service, ServiceIdentity $identity)
    {
        $this->service = $service;
        $this->identity = $identity;
    }

    public function index(Request $request, array $parameters): array
    {
        $workspaceId = $this->requireMatchingWorkspace($parameters);

        $filters = array(
            'source' => isset($_GET['source']) ? (string) $_GET['source'] : '',
            'evidence_type' => isset($_GET['evidence_type']) ? (string) $_GET['evidence_type'] : '',
        );
        $page = isset($_GET['page']) ? (int) $_GET['page'] : 1;
        $perPage = isset($_GET['per_page']) ? (int) $_GET['per_page'] : 20;

        return array('ok' => true, 'data' => $this->service->listForWorkspace($workspaceId, $filters, $page, $perPage));
    }

    public function forSignal(Request $request, array $parameters): array
    {
        $workspaceId = $this->requireMatchingWorkspace($parameters);
        $signalId = isset($parameters['signalId']) ? (int) $parameters['signalId'] : 0;
        if ($signalId <= 0) {
            throw new ValidationException('Invalid signal id.');
        }

        return array('ok' => true, 'data' => $this->service->listForSignal($workspaceId, $signalId));
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
