<?php

declare(strict_types=1);

// V09-05: diagnostic/debug leftover with zero authentication, disclosing
// server filesystem paths and dependency state to anonymous requests. Gated
// behind the same signed-identity check as every other business endpoint;
// consider removing this file outright if it no longer serves a debugging
// purpose (see V09-05 tracker note).
require_once __DIR__ . '/../../db_connect.php';
require_once __DIR__ . '/../../legacy_auth.php';
hs_require_service_member($conn);

echo "<pre>";

$autoload = __DIR__ . '/vendor/autoload.php';
echo "autoload exists: " . (file_exists($autoload) ? 'YES' : 'NO') . "\n";

if (file_exists($autoload)) {
    require $autoload;
    echo "autoload loaded: YES\n";
} else {
    echo "autoload loaded: NO\n";
}

echo "Spreadsheet class exists: " . (class_exists('PhpOffice\\PhpSpreadsheet\\Spreadsheet') ? 'YES' : 'NO') . "\n";

echo "\nLoaded include_path:\n";
echo get_include_path() . "\n";

echo "</pre>";