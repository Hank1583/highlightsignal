<?php

declare(strict_types=1);

namespace HighlightSignal\Workspace;

use HighlightSignal\Auth\ServiceIdentity;
use HighlightSignal\Http\Request;

final class WorkspaceController
{
    private $service;
    private $identity;
    private $provisioningService;

    public function __construct(
        WorkspaceService $service,
        ServiceIdentity $identity,
        WorkspaceProvisioningService $provisioningService
    ) {
        $this->service = $service;
        $this->identity = $identity;
        $this->provisioningService = $provisioningService;
    }

    public function index(Request $request, array $parameters): array
    {
        return array(
            'ok' => true,
            'data' => $this->service->listForMember($this->identity->memberId),
        );
    }

    /**
     * Explicit, deliberate provisioning action — not a side effect of index().
     * The caller (onboarding flow) decides when a member needs their first
     * Workspace; this never runs implicitly off a GET.
     */
    public function create(Request $request, array $parameters): array
    {
        return array(
            'ok' => true,
            'data' => $this->provisioningService->provisionDefaultForNewMember($this->identity->memberId),
        );
    }
}
