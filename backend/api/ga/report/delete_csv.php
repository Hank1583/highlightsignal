<?php

$dir = __DIR__ . '/exports';
$files = glob($dir . '/*.csv');

foreach ($files as $file) {
    if (is_file($file)) {
        unlink($file);
        echo "deleted: " . basename($file) . "<br>";
    }
}

echo "done";