<?php

declare(strict_types=1);

namespace HighlightSignal\Tests\Integration\Migration;

use HighlightSignal\Migration\MigrationRunner;
use HighlightSignal\Tests\Support\DatabaseTestCase;
use RuntimeException;

/**
 * V12-02: this task's own required "migration/checksum/rollback" scenario.
 * Uses a SYNTHETIC, isolated migrations directory (copied to a fresh temp
 * dir per test, version-numbered 900+ -- never a real
 * `backend/sql/migrations/*.sql` file) so mutating a "migration file" mid-test
 * to prove checksum-mismatch detection never touches the real repo or the
 * shared test database's real applied schema.
 *
 * "Rollback": this codebase has no per-migration down-script -- its actual
 * rollback strategy is restore-from-backup, already proven for real in
 * V11-08's disposable restore rehearsal (see
 * backend/sql/VERIFICATION_RUNBOOK.md section 20). What IS this class's job,
 * and what's tested here, is the fail-closed guarantee that prevents a
 * corrupted/drifted migration from ever being silently re-applied or from
 * blocking OTHER pending migrations from being individually assessed.
 */
final class MigrationChecksumTest extends DatabaseTestCase
{
    private string $tempMigrationsDir;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tempMigrationsDir = sys_get_temp_dir() . '/hs_migration_test_' . bin2hex(random_bytes(8));
        mkdir($this->tempMigrationsDir);
        foreach (glob(__DIR__ . '/../../fixtures/sample_migrations/*.sql') as $file) {
            copy($file, $this->tempMigrationsDir . '/' . basename($file));
        }

        // Each test gets a fresh `schema_migrations` table -- this codebase's
        // own MigrationRunner creates it lazily via ensureSchemaMigrationsTableExists(),
        // but a PRIOR test run may have left rows in it, so start clean.
        $this->db()->query('DROP TABLE IF EXISTS schema_migrations');
        $this->db()->query('DROP TABLE IF EXISTS test_migration_marker_a');
        $this->db()->query('DROP TABLE IF EXISTS test_migration_marker_b');
    }

    protected function tearDown(): void
    {
        foreach (glob($this->tempMigrationsDir . '/*') as $file) {
            unlink($file);
        }
        rmdir($this->tempMigrationsDir);
        parent::tearDown();
    }

    public function testStatusReportsPendingBeforeAnythingIsApplied(): void
    {
        $runner = new MigrationRunner($this->db(), $this->tempMigrationsDir);
        $status = $runner->status();

        $this->assertCount(2, $status);
        $this->assertSame('pending', $status[0]['state']);
        $this->assertSame('pending', $status[1]['state']);
    }

    public function testMigrateAppliesInOrderAndRecordsChecksums(): void
    {
        $runner = new MigrationRunner($this->db(), $this->tempMigrationsDir);
        $results = $runner->migrate('phpunit-test');

        $this->assertCount(2, $results);
        $this->assertSame('900', $results[0]['version']);
        $this->assertSame('901', $results[1]['version']);
        $this->assertSame('applied', $results[0]['state']);

        $status = $runner->status();
        $this->assertSame('applied', $status[0]['state']);
        $this->assertSame('applied', $status[1]['state']);

        // The actual DDL really ran, not just the bookkeeping row.
        $tableCheck = $this->db()->query("SHOW TABLES LIKE 'test_migration_marker_a'");
        $this->assertSame(1, $tableCheck->num_rows);
    }

    public function testReapplyingAnAlreadyAppliedSetIsANoOp(): void
    {
        $runner = new MigrationRunner($this->db(), $this->tempMigrationsDir);
        $runner->migrate('phpunit-test');
        $second = $runner->migrate('phpunit-test');

        $this->assertSame([], $second, 'nothing pending remains, migrate() must apply nothing a second time');
    }

    public function testDriftedAppliedMigrationIsDetectedAsChecksumMismatch(): void
    {
        $runner = new MigrationRunner($this->db(), $this->tempMigrationsDir);
        $runner->migrate('phpunit-test');

        // Simulate someone editing an ALREADY-APPLIED migration file after
        // the fact -- exactly the mistake this guard exists to catch.
        file_put_contents($this->tempMigrationsDir . '/900_test_marker_a.sql', "-- drifted content\nSELECT 1;\n");

        $status = $runner->status();
        $this->assertSame('checksum_mismatch', $status[0]['state']);
    }

    public function testMigrateFailsClosedBeforeApplyingAnythingWhenAnEarlierMigrationHasDrifted(): void
    {
        $runner = new MigrationRunner($this->db(), $this->tempMigrationsDir);
        $runner->migrate('phpunit-test'); // applies 900 + 901

        // Drift the ALREADY-APPLIED 900, then add a brand-new pending 902.
        file_put_contents($this->tempMigrationsDir . '/900_test_marker_a.sql', "-- drifted content\nSELECT 1;\n");
        file_put_contents(
            $this->tempMigrationsDir . '/902_test_marker_c.sql',
            "CREATE TABLE IF NOT EXISTS test_migration_marker_c (id INT UNSIGNED NOT NULL AUTO_INCREMENT, PRIMARY KEY (id)) ENGINE=InnoDB;\n"
        );

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessageMatches('/Checksum mismatch/');

        try {
            $runner->migrate('phpunit-test');
        } finally {
            // Whether it throws or not, 902 must NEVER have been applied --
            // a drifted EARLIER migration must block every later one from
            // running, not just be reported and skipped past.
            $tableCheck = $this->db()->query("SHOW TABLES LIKE 'test_migration_marker_c'");
            $this->assertSame(0, $tableCheck->num_rows, '902 must never be applied while 900 is drifted, even though 902 itself is untouched');
        }
    }

    public function testBaselineRecordsAnAlreadyAppliedVersionWithoutRerunningItsDdl(): void
    {
        // Simulates the real-host workflow: DDL was already applied by hand
        // (phpMyAdmin), and `baseline` just records that fact without
        // re-running the CREATE TABLE (which would otherwise fail on a
        // table that already exists from a prior manual apply).
        $this->db()->query('CREATE TABLE test_migration_marker_a (id INT UNSIGNED NOT NULL AUTO_INCREMENT, PRIMARY KEY (id)) ENGINE=InnoDB');

        $runner = new MigrationRunner($this->db(), $this->tempMigrationsDir);
        $results = $runner->baseline(['900'], 'phpunit-test');

        $this->assertCount(1, $results);
        $this->assertSame('baselined', $results[0]['state']);

        $status = $runner->status();
        $this->assertSame('applied', $status[0]['state']);
        $this->assertSame('pending', $status[1]['state'], '901 was never baselined, must still show pending');
    }
}
