<?php

declare(strict_types=1);

namespace HighlightSignal\Ops;

use mysqli;

/**
 * V12-04: the six required SLI categories
 * (docs/task-packets/V12-04_OBSERVABILITY_INCIDENT_READINESS.md), each
 * queried directly from data that ALREADY exists (queue_jobs, execution_results,
 * notification_deliveries, dashboard_ai_logs, schema_migrations) -- no new
 * table, no new logging pipeline. This host has no persistent
 * agent/exporter (no SSH), so this is exposed as a signed HTTP endpoint
 * (`GET /api/v1/ops/dashboard`, same `WorkerRequestAuthenticator` pattern
 * as `/api/v1/queue/run`) an external poller/scheduler calls periodically,
 * rather than something scraped by a long-running process on this host.
 *
 * Deliberately does NOT cover API request latency/error rate -- no request-
 * level log table exists in this schema and adding one is a real scope
 * decision (a new table + instrumenting every route), not done here; the
 * honest gap is documented in this task's own report rather than faked
 * with a table that only ever contains this task's own test data.
 */
final class OpsDashboardService
{
    private $database;

    public function __construct(mysqli $database)
    {
        $this->database = $database;
    }

    public function snapshot(): array
    {
        return array(
            'generated_at' => date('Y-m-d H:i:s'),
            'queue' => $this->queueSnapshot(),
            'notifications' => $this->notificationSnapshot(),
            'ai_usage' => $this->aiUsageSnapshot(),
            'schema' => $this->schemaSnapshot(),
        );
    }

    /** Queue depth/age/dead-letter -- required SLI #3. */
    private function queueSnapshot(): array
    {
        $result = $this->database->query(
            "SELECT status, COUNT(*) AS c, MIN(created_at) AS oldest_created_at,
                    TIMESTAMPDIFF(SECOND, MIN(created_at), NOW()) AS oldest_age_seconds
             FROM queue_jobs
             WHERE status IN ('queued', 'processing', 'dead_letter')
             GROUP BY status"
        );
        return $result ? $result->fetch_all(MYSQLI_ASSOC) : array();
    }

    /** Email delivery -- required SLI #5. */
    private function notificationSnapshot(): array
    {
        $result = $this->database->query(
            "SELECT channel, status, COUNT(*) AS c
             FROM notification_deliveries
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
             GROUP BY channel, status"
        );
        return $result ? $result->fetch_all(MYSQLI_ASSOC) : array();
    }

    /** AI cost/quota proxy -- required SLI #4 (call volume + error rate per model, not a real $ cost figure -- no provider billing API is wired here). */
    private function aiUsageSnapshot(): array
    {
        $tableExists = $this->database->query("SHOW TABLES LIKE 'dashboard_ai_logs'");
        if (!$tableExists || $tableExists->num_rows === 0) {
            return array('available' => false, 'reason' => 'dashboard_ai_logs table not present on this database');
        }

        $result = $this->database->query(
            "SELECT model, status, COUNT(*) AS c
             FROM dashboard_ai_logs
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
             GROUP BY model, status"
        );
        return array('available' => true, 'last_24h' => $result ? $result->fetch_all(MYSQLI_ASSOC) : array());
    }

    /** DB/migration version -- required SLI #6. */
    private function schemaSnapshot(): array
    {
        $tableExists = $this->database->query("SHOW TABLES LIKE 'schema_migrations'");
        if (!$tableExists || $tableExists->num_rows === 0) {
            return array('available' => false, 'reason' => 'schema_migrations table not present on this database (never applied via bin/migrate.php on this host)');
        }

        $result = $this->database->query('SELECT version, name, applied_at FROM schema_migrations ORDER BY version DESC LIMIT 1');
        $latest = $result ? $result->fetch_assoc() : null;
        $count = $this->database->query('SELECT COUNT(*) AS c FROM schema_migrations');
        return array(
            'available' => true,
            'latest' => is_array($latest) ? $latest : null,
            'applied_count' => $count ? (int) $count->fetch_assoc()['c'] : 0,
        );
    }
}
