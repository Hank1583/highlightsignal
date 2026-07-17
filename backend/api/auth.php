<?php

declare(strict_types=1);

require_once __DIR__ . '/legacy_auth.php';

function getMemberId()
{
    global $conn;
    return hs_require_service_member($conn);
}
