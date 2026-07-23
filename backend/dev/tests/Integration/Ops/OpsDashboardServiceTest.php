<?php

declare(strict_types=1);

namespace HighlightSignal\Tests\Integration\Ops;

use HighlightSignal\Execution\ExecutionResultRepository;
use HighlightSignal\Execution\ExecutionResultService;
use HighlightSignal\Ops\OpsDashboardService;
use HighlightSignal\Queue\QueueRepository;
use HighlightSignal\Queue\QueueService;
use HighlightSignal\Tests\Support\DatabaseTestCase;
use HighlightSignal\Workspace\WorkspaceProvisioningService;

/**
 * V12-04: this task's own required "queue depth/age/dead-letter" and
 * "DB/migration version" SLI scenarios -- proves the ops snapshot reflects
 * REAL rows in real tables, not a fabricated/mocked shape.
 */
final class OpsDashboardServiceTest extends DatabaseTestCase
{
    public function testQueueSnapshotReflectsRealQueuedAndDeadLetterJobs(): void
    {
        $memberId = $this->freshMemberId();
        $ws = (new WorkspaceProvisioningService($this->db()))->provisionDefaultForNewMember($memberId);
        $workspaceId = (int) $ws['id'];

        $executionResultService = new ExecutionResultService(new ExecutionResultRepository($this->db()));
        $queueService = new QueueService(new QueueRepository($this->db()), $this->db(), $executionResultService);

        // Two jobs seeded, but runBatch's maxJobs is capped at 1 below --
        // an unknown job_type fails closed exactly like a thrown exception
        // (QueueService's own documented behavior), so the FIRST (lower id,
        // same priority) claimed job dead-letters immediately (no handler
        // registered, maxAttempts=1); the second is never claimed and stays
        // 'queued', giving this test a real example of both states at once.
        $queueService->enqueue($workspaceId, 'test.ops_snapshot_fail', array(), 100, 1);
        $queueService->enqueue($workspaceId, 'test.ops_snapshot_stays_queued', array(), 100, 1);
        $queueService->runBatch(array(), 1, 5);

        $service = new OpsDashboardService($this->db());
        $snapshot = $service->snapshot();

        $byStatus = array();
        foreach ($snapshot['queue'] as $row) {
            $byStatus[$row['status']] = (int) $row['c'];
        }

        $this->assertGreaterThanOrEqual(1, $byStatus['queued'] ?? 0);
        $this->assertGreaterThanOrEqual(1, $byStatus['dead_letter'] ?? 0);
    }

    public function testSchemaSnapshotReportsUnavailableWhenTableMissingRatherThanFabricating(): void
    {
        $this->db()->query('DROP TABLE IF EXISTS schema_migrations');
        $service = new OpsDashboardService($this->db());
        $snapshot = $service->snapshot();

        $this->assertFalse($snapshot['schema']['available']);
        $this->assertArrayHasKey('reason', $snapshot['schema']);
    }

    public function testSnapshotStructureCoversTheFourDataBackedSliCategories(): void
    {
        $service = new OpsDashboardService($this->db());
        $snapshot = $service->snapshot();

        $this->assertArrayHasKey('queue', $snapshot);
        $this->assertArrayHasKey('notifications', $snapshot);
        $this->assertArrayHasKey('ai_usage', $snapshot);
        $this->assertArrayHasKey('schema', $snapshot);
        $this->assertArrayHasKey('generated_at', $snapshot);
    }
}
