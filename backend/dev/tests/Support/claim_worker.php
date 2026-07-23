<?php

declare(strict_types=1);

/**
 * V12-02: standalone worker process for QueueConcurrencyTest -- run via
 * `proc_open()`, NOT a PHPUnit test itself. Repeatedly claims jobs for
 * $workspaceId until none remain, printing one claimed job id per line to
 * stdout. Two of these run truly concurrently (real OS processes, not
 * threads/coroutines) against the SAME database, mirroring V11-02's own
 * disposable rehearsal proof.
 *
 * Usage: php claim_worker.php <workspaceId> [startSignalFile]
 *
 * $startSignalFile, if given, makes this process BUSY-POLL until that file
 * exists before starting its claim loop -- the test creates both worker
 * processes first (each already past PHP's own ~tens-of-ms startup/autoload
 * cost) and only THEN writes the signal file, so both workers begin racing
 * at effectively the same instant instead of however `proc_open()`
 * happened to stagger their OS-level startup. Without this, two workers
 * racing on a small job count can easily miss each other's timing window
 * entirely and never actually collide, making a real concurrency defect
 * look like it passes purely by luck.
 */
require dirname(__DIR__, 2) . '/vendor/autoload.php';

use HighlightSignal\Queue\QueueRepository;

$workspaceId = (int) ($argv[1] ?? 0);
$startSignalFile = $argv[2] ?? null;

$host = getenv('TEST_DB_HOST') ?: '127.0.0.1';
$port = (int) (getenv('TEST_DB_PORT') ?: 3306);
$user = getenv('TEST_DB_USER') ?: 'root';
$password = getenv('TEST_DB_PASSWORD') ?: 'rootpass';
$database = getenv('TEST_DB_NAME') ?: 'highlightsignal_test';

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
$db = new mysqli($host, $user, $password, $database, $port);
$repository = new QueueRepository($db);

if ($startSignalFile !== null) {
    $deadline = microtime(true) + 5.0;
    while (!file_exists($startSignalFile)) {
        if (microtime(true) > $deadline) {
            fwrite(STDERR, "timed out waiting for start signal\n");
            exit(3);
        }
        usleep(500);
    }
}

while (true) {
    $claimToken = bin2hex(random_bytes(16));
    $job = $repository->claimNext($claimToken);
    if ($job === null) {
        break;
    }
    // Print every claimed job id, regardless of workspace -- the test
    // verifies correctness only for the specific ids IT seeded, so a
    // (correctly claimed) job belonging to some other concurrently-running
    // test's data is simply ignored downstream, not treated as an error.
    echo $job['id'] . "\n";
}
