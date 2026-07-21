<?php

declare(strict_types=1);

use HighlightSignal\Database\ConnectionFactory;
use HighlightSignal\Migration\MigrationRunner;

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "migrate.php may only run from the command line.\n");
    exit(1);
}

require dirname(__DIR__) . '/config/bootstrap.php';

function migrate_cli_usage()
{
    fwrite(STDERR, "Usage:\n");
    fwrite(STDERR, "  php bin/migrate.php status\n");
    fwrite(STDERR, "  php bin/migrate.php migrate --executor=<release-or-run-identity>\n");
    fwrite(STDERR, "  php bin/migrate.php baseline --executor=<identity> --versions=010,011,012\n");
    fwrite(STDERR, "\n--executor identifies who/what ran this (a release id, CI run id, or operator\n");
    fwrite(STDERR, "name) for the audit trail. Never pass a database credential as an argument.\n");
}

$args = array_slice($argv, 1);
$command = isset($args[0]) ? $args[0] : '';

$options = array();
foreach (array_slice($args, 1) as $arg) {
    if (strpos($arg, '--') === 0 && strpos($arg, '=') !== false) {
        list($key, $value) = explode('=', substr($arg, 2), 2);
        $options[$key] = $value;
    }
}

$migrationsPath = realpath(dirname(__DIR__) . '/../sql/migrations');
if ($migrationsPath === false) {
    fwrite(STDERR, "Unable to resolve backend/sql/migrations directory.\n");
    exit(1);
}

try {
    $database = ConnectionFactory::create();
    $runner = new MigrationRunner($database, $migrationsPath);

    switch ($command) {
        case 'status':
            $rows = $runner->status();
            foreach ($rows as $row) {
                printf(
                    "%-6s %-50s %-18s %s\n",
                    $row['version'],
                    $row['name'],
                    $row['state'],
                    $row['applied_at'] !== null ? $row['applied_at'] : ''
                );
            }
            exit(0);

        case 'migrate':
            if (!isset($options['executor']) || trim($options['executor']) === '') {
                fwrite(STDERR, "migrate requires --executor=<release-or-run-identity>\n");
                exit(1);
            }

            $applied = $runner->migrate($options['executor']);
            if (count($applied) === 0) {
                echo "No pending migrations.\n";
            }
            foreach ($applied as $row) {
                printf("applied %-6s %-50s (%dms)\n", $row['version'], $row['name'], $row['duration_ms']);
            }
            exit(0);

        case 'baseline':
            if (!isset($options['executor']) || trim($options['executor']) === '') {
                fwrite(STDERR, "baseline requires --executor=<release-or-run-identity>\n");
                exit(1);
            }
            if (!isset($options['versions']) || trim($options['versions']) === '') {
                fwrite(STDERR, "baseline requires --versions=010,011,012\n");
                exit(1);
            }

            $versions = array_values(array_filter(array_map('trim', explode(',', $options['versions']))));
            $baselined = $runner->baseline($versions, $options['executor']);
            if (count($baselined) === 0) {
                echo "Nothing to baseline (already recorded).\n";
            }
            foreach ($baselined as $row) {
                printf("baselined %-6s %-50s\n", $row['version'], $row['name']);
            }
            exit(0);

        default:
            migrate_cli_usage();
            exit(1);
    }
} catch (Throwable $error) {
    fwrite(STDERR, 'Migration failed: ' . $error->getMessage() . "\n");
    exit(1);
}
