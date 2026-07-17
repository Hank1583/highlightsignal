<?php

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