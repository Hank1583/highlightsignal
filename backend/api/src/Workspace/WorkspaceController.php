<?php

declare(strict_types=1);

namespace HighlightSignal\Workspace;

use HighlightSignal\Auth\ServiceIdentity;
use HighlightSignal\Http\Request;

final class WorkspaceController
{
    private $service;
    private $identity;

    public function __construct(WorkspaceService $service, ServiceIdentity $identity)
    {
        $this->service = $service;
        $this->identity = $identity;
    }

    public function index(Request $request, array $parameters): array
    {
        return array(
            'ok' => true,
            'data' => $this->service->listForMember($this->identity->memberId),
        );
    }
}
