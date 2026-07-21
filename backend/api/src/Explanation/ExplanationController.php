<?php

declare(strict_types=1);

namespace HighlightSignal\Explanation;

use HighlightSignal\Auth\ServiceIdentity;
use HighlightSignal\Http\Request;
use HighlightSignal\Http\NotFoundException;
use HighlightSignal\Http\ValidationException;

/**
 * V10-03: read-or-generate, no mutation endpoint -- same reasoning as
 * EvidenceController (this content is only ever produced by system
 * generation, never a human PATCH/POST).
 */
final class ExplanationController
{
    private $service;
    private $identity;

    public function __construct(ExplanationService $service, ServiceIdentity $identity)
    {
        $this->service = $service;
        $this->identity = $identity;
    }

    public function forSignal(Request $request, array $parameters): array
    {
        $workspaceId = $this->requireMatchingWorkspace($parameters);
        $signalId = isset($parameters['signalId']) ? (int) $parameters['signalId'] : 0;
        if ($signalId <= 0) {
            throw new ValidationException('Invalid signal id.');
        }

        $analysis = $this->service->readOrGenerateForSignal($workspaceId, $signalId);
        if ($analysis === null) {
            throw new NotFoundException('Signal not found.');
        }

        return array('ok' => true, 'data' => $analysis);
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
