<?php

declare(strict_types=1);

namespace HighlightSignal\Tests\Support;

use mysqli;
use PHPUnit\Framework\TestCase;

/**
 * V12-02: base class for every test that needs a real disposable database
 * (this project's established verification philosophy throughout V10/V11 --
 * real disposable MySQL + real behavioral assertions, never a mocked
 * mysqli). Requires `bin/apply_test_schema.php` to have already been run
 * once against the target database before the suite starts (done by the
 * orchestrating script/CI step, not per-test -- re-applying the full
 * migration chain per test would be far too slow).
 *
 * Tests avoid needing table truncation between runs by always creating
 * their OWN fresh Workspace(s) via a unique random member id per test
 * (`freshMemberId()`) -- the exact same pattern this project's disposable
 * rehearsal scripts already used, just made permanent.
 */
abstract class DatabaseTestCase extends TestCase
{
    protected static ?mysqli $db = null;

    public static function setUpBeforeClass(): void
    {
        parent::setUpBeforeClass();

        $host = getenv('TEST_DB_HOST') ?: '127.0.0.1';
        $port = (int) (getenv('TEST_DB_PORT') ?: 3306);
        $user = getenv('TEST_DB_USER') ?: 'root';
        $password = getenv('TEST_DB_PASSWORD') ?: 'rootpass';
        $database = getenv('TEST_DB_NAME') ?: 'highlightsignal_test';

        mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
        self::$db = new mysqli($host, $user, $password, $database, $port);
        self::$db->set_charset('utf8mb4');
    }

    public static function tearDownAfterClass(): void
    {
        if (self::$db !== null) {
            self::$db->close();
        }
        self::$db = null;
        parent::tearDownAfterClass();
    }

    protected function db(): mysqli
    {
        return self::$db;
    }

    /**
     * A large, random, virtually-collision-free member id -- avoids any two
     * tests (even run in parallel processes, e.g. the concurrency test)
     * ever operating on the same Workspace/member.
     */
    protected function freshMemberId(): int
    {
        return random_int(100000, intdiv(PHP_INT_MAX, 2));
    }
}
