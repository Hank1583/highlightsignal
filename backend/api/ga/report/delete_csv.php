<?php

declare(strict_types=1);

// V09-05: this endpoint had zero authentication -- any anonymous request
// deleted every generated report export on the host. It isn't tied to a
// single tenant's workspace (it wipes a shared exports/ directory), so the
// applicable bar is "must be a legitimately signed request from our own
// system", the same HMAC scheme every other business endpoint requires --
// not a per-workspace role check, since there is no workspace context here.
require_once __DIR__ . '/../../db_connect.php';
require_once __DIR__ . '/../../legacy_auth.php';
hs_require_service_member($conn);

$dir = __DIR__ . '/exports';
$files = glob($dir . '/*.csv');

foreach ($files as $file) {
    if (is_file($file)) {
        unlink($file);
        echo "deleted: " . basename($file) . "<br>";
    }
}

echo "done";