<?php

declare(strict_types=1);

/**
 * V12-02: applies every `backend/sql/migrations/*.sql` file, in filename
 * order, to a disposable test database. This replaces the throwaway
 * "cat several migration files into one schema_chain.sql" step every
 * V10/V11 task's one-off Docker rehearsal repeated by hand -- the ad hoc
 * per-task subset selection (some rehearsals skipped 013-023 as "not
 * needed for this task") is replaced here with the FULL real chain, since
 * this script now needs to serve every test class, not just one task's
 * scenario.
 *
 * Connection is entirely env-driven so the SAME script works against a
 * local `docker run mysql:5.6` container (this project's established
 * rehearsal pattern) or a GitHub Actions `services:` container.
 *
 * Usage: php bin/apply_test_schema.php
 */

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "apply_test_schema.php may only run from the command line.\n");
    exit(1);
}

$host = getenv('TEST_DB_HOST') ?: '127.0.0.1';
$port = (int) (getenv('TEST_DB_PORT') ?: 3306);
$user = getenv('TEST_DB_USER') ?: 'root';
$password = getenv('TEST_DB_PASSWORD') ?: 'rootpass';
$database = getenv('TEST_DB_NAME') ?: 'highlightsignal_test';

$migrationsDir = getenv('MIGRATIONS_DIR') ?: (dirname(__DIR__, 2) . '/sql/migrations');
if (!is_dir($migrationsDir)) {
    fwrite(STDERR, "Migrations directory not found: $migrationsDir\n");
    exit(1);
}

// Migrations 013-023 are "expand"/"backfill" steps against LEGACY tables
// (`ga_connections`, `seo_sites`, `si_sites`, `dashboard_ai_logs`, etc.)
// that predate this migrations/ folder entirely and were created directly
// on the real production host -- no CREATE TABLE for them exists anywhere
// in this repo, so they cannot be reconstructed here. Every V10/V11 task's
// disposable rehearsal already independently arrived at the same working
// subset (010, 011, 012, 024-037); this is that same precedent, made
// permanent instead of re-discovered by hand each time. If a future test
// genuinely needs one of those legacy tables, add a real fixture (see
// V11-08's `test_only_setup.sql` for the `ga_connections` precedent) rather
// than widening this list.
$excludedLegacyRetrofitVersions = ['013', '014', '015', '016', '018', '019', '021', '022'];

$files = glob($migrationsDir . '/*.sql');
sort($files, SORT_STRING);
$files = array_values(array_filter($files, static function (string $file) use ($excludedLegacyRetrofitVersions) {
    if (!preg_match('/^(\d+)_/', basename($file), $matches)) {
        return true;
    }
    return !in_array($matches[1], $excludedLegacyRetrofitVersions, true);
}));

if (count($files) === 0) {
    fwrite(STDERR, "No migration files found in $migrationsDir\n");
    exit(1);
}

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

$bootstrap = new mysqli($host, $user, $password, '', $port);
$bootstrap->query("CREATE DATABASE IF NOT EXISTS `$database` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
$bootstrap->close();

$db = new mysqli($host, $user, $password, $database, $port);
$db->set_charset('utf8mb4');

foreach ($files as $file) {
    $sql = file_get_contents($file);
    if ($sql === false) {
        fwrite(STDERR, "Unable to read $file\n");
        exit(1);
    }

    echo 'Applying ' . basename($file) . "...\n";
    if (!$db->multi_query($sql)) {
        fwrite(STDERR, 'Failed applying ' . basename($file) . ': ' . $db->error . "\n");
        exit(1);
    }
    // Drain all result sets from multi_query before the next statement.
    do {
        if ($result = $db->store_result()) {
            $result->free();
        }
    } while ($db->more_results() && $db->next_result());
}

echo "Test schema applied (" . count($files) . " migrations) to `$database`.\n";
