<?php

declare(strict_types=1);

namespace HighlightSignal\Workspace;

final class WorkspaceService
{
    private $repository;

    public function __construct(WorkspaceRepository $repository)
    {
        $this->repository = $repository;
    }

    public function listForMember(int $memberId): array
    {
        // Read-only by design (V09-02): an empty result is just empty. Provisioning a
        // member's first Workspace happens explicitly via
        // WorkspaceProvisioningService::provisionDefaultForNewMember(), never as a
        // side effect of listing.
        return $this->repository->listForMember($memberId);
    }
}
