<?php

declare(strict_types=1);

namespace HighlightSignal\Auth;

final class ServiceIdentity
{
    public $memberId;
    public $workspaceId;
    public $nonce;

    public function __construct(
        int $memberId,
        int $workspaceId,
        string $nonce
    ) {
        $this->memberId = $memberId;
        $this->workspaceId = $workspaceId;
        $this->nonce = $nonce;
    }
}
