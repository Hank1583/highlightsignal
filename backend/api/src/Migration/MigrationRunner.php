<?php

declare(strict_types=1);

namespace HighlightSignal\Migration;

use mysqli;
use RuntimeException;
use Throwable;

/**
 * Applies backend/sql/migrations/*.sql in version order, tracked in
 * schema_migrations. CLI-only by convention (see bin/migrate.php); this class
 * itself has no notion of an HTTP context.
 */
final class MigrationRunner
{
    const LOCK_NAME = 'hs_schema_migrations';
    const LOCK_TIMEOUT_SECONDS = 10;

    private $database;
    private $migrationsPath;

    public function __construct(mysqli $database, string $migrationsPath)
    {
        $this->database = $database;
        $this->migrationsPath = rtrim($migrationsPath, '/');
    }

    public function status(): array
    {
        $this->ensureSchemaMigrationsTableExists();
        $applied = $this->loadApplied();
        $files = $this->discoverMigrationFiles();

        $rows = array();
        foreach ($files as $version => $file) {
            // V12-02: PHP auto-casts an array key that looks like a clean
            // decimal integer (no leading zero) to a real int -- every real
            // migration version has a leading zero ("010".."037") and is
            // immune, but this class's own contract says "version", a
            // string identifier, not a number. Found via this task's
            // automated test suite using synthetic fixture versions ("900",
            // "901") that ARE unsafe, exposing a latent bug that would
            // otherwise stay dormant until a real migration ever reaches
            // version 100+.
            $version = (string) $version;
            $name = basename($file);
            if (isset($applied[$version])) {
                $checksum = $this->checksum($file);
                $state = $checksum === $applied[$version]['checksum'] ? 'applied' : 'checksum_mismatch';
                $rows[] = array(
                    'version' => $version,
                    'name' => $name,
                    'state' => $state,
                    'applied_at' => $applied[$version]['applied_at'],
                );
            } else {
                $rows[] = array(
                    'version' => $version,
                    'name' => $name,
                    'state' => 'pending',
                    'applied_at' => null,
                );
            }
        }

        return $rows;
    }

    public function migrate(string $executor): array
    {
        $lockState = $this->acquireLock();
        if ($lockState !== 1) {
            throw new RuntimeException($this->lockFailureMessage($lockState));
        }

        try {
            $this->ensureSchemaMigrationsTableExists();
            $applied = $this->loadApplied();
            $files = $this->discoverMigrationFiles();

            // Fail closed before applying anything if any already-applied file has drifted.
            foreach ($files as $version => $file) {
                $version = (string) $version; // see status()'s own comment on this cast
                if (!isset($applied[$version])) {
                    continue;
                }

                $checksum = $this->checksum($file);
                if ($checksum !== $applied[$version]['checksum']) {
                    throw new RuntimeException(sprintf(
                        'Checksum mismatch for applied migration %s (%s): recorded=%s current=%s. ' .
                        'Aborting before applying any further migrations. Do not edit an applied migration file; ' .
                        'create a new version instead.',
                        $version,
                        basename($file),
                        $applied[$version]['checksum'],
                        $checksum
                    ));
                }
            }

            $results = array();
            foreach ($files as $version => $file) {
                $version = (string) $version; // see status()'s own comment on this cast
                if (isset($applied[$version])) {
                    continue;
                }

                $result = $this->applyOne($version, $file, $executor);
                $results[] = $result;
            }

            return $results;
        } finally {
            $this->releaseLock();
        }
    }

    public function baseline(array $versions, string $executor): array
    {
        $lockState = $this->acquireLock();
        if ($lockState !== 1) {
            throw new RuntimeException($this->lockFailureMessage($lockState));
        }

        try {
            $this->ensureSchemaMigrationsTableExists();
            $applied = $this->loadApplied();
            $files = $this->discoverMigrationFiles();
            $results = array();

            foreach ($versions as $version) {
                if (!isset($files[$version])) {
                    throw new RuntimeException(sprintf(
                        'Cannot baseline unknown version %s (no matching file in %s).',
                        $version,
                        $this->migrationsPath
                    ));
                }

                if (isset($applied[$version])) {
                    continue;
                }

                $file = $files[$version];
                $name = basename($file);
                $checksum = $this->checksum($file);

                $statement = $this->database->prepare(
                    'INSERT INTO schema_migrations (version, name, checksum, duration_ms, executor) ' .
                    'VALUES (?, ?, ?, 0, ?)'
                );
                $statement->bind_param('ssss', $version, $name, $checksum, $executor);
                $statement->execute();

                $results[] = array('version' => $version, 'name' => $name, 'state' => 'baselined');
            }

            return $results;
        } finally {
            $this->releaseLock();
        }
    }

    /**
     * 1 = acquired, 0 = timed out, null = internal MySQL error. GET_LOCK/RELEASE_LOCK are
     * session-scoped on this single connection for the life of the CLI process, so they only
     * protect concurrent runs if every caller shares one connection per invocation — this class
     * never opens a second one.
     */
    private function acquireLock()
    {
        $statement = $this->database->prepare('SELECT GET_LOCK(?, ?) AS acquired');
        $lockName = self::LOCK_NAME;
        $timeout = self::LOCK_TIMEOUT_SECONDS;
        $statement->bind_param('si', $lockName, $timeout);
        $statement->execute();
        $row = $statement->get_result()->fetch_assoc();

        return $row['acquired'] === null ? null : (int) $row['acquired'];
    }

    private function releaseLock()
    {
        $statement = $this->database->prepare('SELECT RELEASE_LOCK(?)');
        $lockName = self::LOCK_NAME;
        $statement->bind_param('s', $lockName);
        $statement->execute();
        $statement->get_result();
    }

    private function lockFailureMessage($lockState): string
    {
        if ($lockState === 0) {
            return sprintf(
                'Another migration run holds the lock (timed out after %ds). Not running concurrently.',
                self::LOCK_TIMEOUT_SECONDS
            );
        }

        return 'GET_LOCK failed with an internal MySQL error; refusing to proceed.';
    }

    private function ensureSchemaMigrationsTableExists()
    {
        $this->database->query(
            'CREATE TABLE IF NOT EXISTS schema_migrations (' .
            'version VARCHAR(20) NOT NULL, ' .
            'name VARCHAR(190) NOT NULL, ' .
            'checksum CHAR(64) NOT NULL, ' .
            'applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, ' .
            'duration_ms INT UNSIGNED NOT NULL, ' .
            'executor VARCHAR(150) NOT NULL, ' .
            'PRIMARY KEY (version)' .
            ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
    }

    private function loadApplied(): array
    {
        $result = $this->database->query('SELECT version, checksum, applied_at FROM schema_migrations');
        $applied = array();
        while ($row = $result->fetch_assoc()) {
            $applied[$row['version']] = $row;
        }

        return $applied;
    }

    /** @return array<string, string> version => absolute file path, sorted ascending */
    private function discoverMigrationFiles(): array
    {
        $files = glob($this->migrationsPath . '/*.sql');
        if ($files === false) {
            $files = array();
        }

        $indexed = array();
        foreach ($files as $file) {
            $name = basename($file);
            if (!preg_match('/^(\d+)_/', $name, $matches)) {
                throw new RuntimeException(sprintf(
                    'Migration file %s does not start with a numeric version prefix; refusing to guess its order.',
                    $name
                ));
            }

            $version = $matches[1];
            if (isset($indexed[$version])) {
                throw new RuntimeException(sprintf('Duplicate migration version %s in %s.', $version, $this->migrationsPath));
            }

            $indexed[$version] = $file;
        }

        ksort($indexed, SORT_STRING);

        return $indexed;
    }

    private function checksum(string $file): string
    {
        $contents = file_get_contents($file);
        if ($contents === false) {
            throw new RuntimeException(sprintf('Unable to read %s to compute its checksum.', $file));
        }

        return hash('sha256', $contents);
    }

    /**
     * mysqli_multi_query is used deliberately: a hand-rolled `;` splitter does not understand
     * quoted strings, so it would mis-split the UPDATE/INSERT migrations that contain string
     * literals. multi_query delegates statement splitting to the server. mysqli_report is
     * turned off only around the result-drain loop so a mid-drain error cannot throw and leave
     * the connection desynced ("commands out of sync") before RELEASE_LOCK runs; it is restored
     * immediately after. This intentionally cannot run DELIMITER-style compound statements
     * (triggers/stored procedures) — none of today's migrations need that, and any future one
     * that does needs a different execution path, not a silent workaround here.
     */
    private function applyOne(string $version, string $file, string $executor): array
    {
        $sql = file_get_contents($file);
        if ($sql === false) {
            throw new RuntimeException(sprintf('Unable to read migration file %s.', $file));
        }

        $checksum = $this->checksum($file);
        $name = basename($file);
        $startedAt = microtime(true);

        mysqli_report(MYSQLI_REPORT_OFF);
        try {
            if (!$this->database->multi_query($sql)) {
                throw new RuntimeException(sprintf(
                    'Migration %s (%s) failed on statement 1: %s',
                    $version,
                    $name,
                    $this->database->error
                ));
            }

            $statementIndex = 1;
            do {
                $result = $this->database->store_result();
                if ($result) {
                    $result->free();
                }

                if ($this->database->errno !== 0) {
                    throw new RuntimeException(sprintf(
                        'Migration %s (%s) failed on statement %d: %s',
                        $version,
                        $name,
                        $statementIndex,
                        $this->database->error
                    ));
                }

                $statementIndex++;
            } while ($this->database->more_results() && $this->database->next_result());

            // next_result() returns false both when there is genuinely nothing left
            // AND when the next statement itself failed to execute -- those two
            // cases are indistinguishable from the loop condition alone, so the loop
            // above exits silently on a mid-batch failure without ever inspecting
            // that statement's errno. Check once more here: if a statement failed,
            // its error is still on the connection even though next_result() already
            // returned false for it (confirmed via V09-07 migration rehearsal).
            if ($this->database->errno !== 0) {
                throw new RuntimeException(sprintf(
                    'Migration %s (%s) failed on statement %d: %s',
                    $version,
                    $name,
                    $statementIndex,
                    $this->database->error
                ));
            }
        } catch (Throwable $error) {
            mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
            throw $error;
        }
        mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

        $durationMs = (int) round((microtime(true) - $startedAt) * 1000);

        $statement = $this->database->prepare(
            'INSERT INTO schema_migrations (version, name, checksum, duration_ms, executor) ' .
            'VALUES (?, ?, ?, ?, ?)'
        );
        $statement->bind_param('sssis', $version, $name, $checksum, $durationMs, $executor);
        $statement->execute();

        return array('version' => $version, 'name' => $name, 'state' => 'applied', 'duration_ms' => $durationMs);
    }
}
