<?php

declare(strict_types=1);

/**
 * V12-02: `composer.json`'s `scripts.lint` referenced this file since it was
 * first written, but the file itself was never actually created -- `composer
 * lint` has been silently broken (a missing-file error) this entire project.
 * Converges the manual `php -l` sweep repeated by hand at the end of every
 * V10/V11 task into one reusable command.
 */

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "lint.php may only run from the command line.\n");
    exit(1);
}

// This script now lives in backend/dev/bin/ -- the payload it lints
// (src/, ga/, si/, etc.) is a sibling directory's contents, backend/api/.
$root = dirname(__DIR__, 2) . '/api';
$targets = ['src', 'ga', 'si', 'si/seo', 'si/aeo', 'si/geo', 'dashboard', 'public', 'workers', 'config'];

$files = [];
foreach ($targets as $target) {
    $dir = $root . '/' . $target;
    if (!is_dir($dir)) {
        continue;
    }
    $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS));
    foreach ($iterator as $file) {
        if ($file->getExtension() === 'php') {
            $files[] = $file->getPathname();
        }
    }
}

// Root-level flat scripts (db_connect.php, legacy_auth.php, api_helpers.php, etc.)
foreach (glob($root . '/*.php') as $file) {
    $files[] = $file;
}

sort($files);

$failures = [];
foreach ($files as $file) {
    $output = [];
    $exitCode = 0;
    exec('php -l ' . escapeshellarg($file) . ' 2>&1', $output, $exitCode);
    if ($exitCode !== 0) {
        $failures[$file] = implode("\n", $output);
    }
}

foreach ($files as $file) {
    echo (isset($failures[$file]) ? 'FAIL' : 'ok') . '  ' . $file . "\n";
}

if (count($failures) > 0) {
    fwrite(STDERR, "\n" . count($failures) . " file(s) failed php -l:\n");
    foreach ($failures as $file => $message) {
        fwrite(STDERR, "\n--- $file ---\n$message\n");
    }
    exit(1);
}

echo "\n" . count($files) . " file(s) passed php -l.\n";
