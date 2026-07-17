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
        $workspaces = $this->repository->listForMember($memberId);
        if (count($workspaces) === 0) {
            $this->repository->ensureDefaultForMember($memberId);
            $workspaces = $this->repository->listForMember($memberId);
        }
        return $workspaces;
    }
}
