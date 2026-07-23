<?php

declare(strict_types=1);

namespace HighlightSignal\Tests\Integration\Retention;

use HighlightSignal\Retention\RetentionCleanupService;
use HighlightSignal\Retention\RetentionRepository;
use HighlightSignal\Tests\Support\DatabaseTestCase;
use HighlightSignal\Workspace\WorkspaceProvisioningService;

/**
 * V12-05: this task's own privacy/retention audit found `dashboard_ai_logs`
 * (free-text AI questions + provider context/response, migrations/013+018)
 * had no cleanup at all -- every other operational data class already had
 * one (V11-08). These tests prove the new cleanup is real: it only deletes
 * rows past the retention window, a dry run deletes nothing, and a row with
 * a NULL workspace_id (pre-018-backfill data) is still eligible for
 * deletion without crashing the audit-trail grouping step.
 */
final class RetentionCleanupServiceTest extends DatabaseTestCase
{
    public static function setUpBeforeClass(): void
    {
        parent::setUpBeforeClass();

        // `dashboard_ai_logs` is on bin/apply_test_schema.php's own
        // documented exclusion list (013/018 also touch tables with no
        // CREATE TABLE anywhere in this repo) -- this fixture is the real,
        // isolated table this test genuinely needs, per that script's own
        // guidance.
        $fixture = file_get_contents(dirname(__DIR__, 2) . '/fixtures/dashboard_ai_logs_schema.sql');
        self::$db->query($fixture);
    }

    public function testDashboardAiLogCleanupDeletesOnlyRowsPastRetentionWindow(): void
    {
        $memberId = $this->freshMemberId();
        $ws = (new WorkspaceProvisioningService($this->db()))->provisionDefaultForNewMember($memberId);
        $workspaceId = (int) $ws['id'];

        $oldId = $this->insertAiLog($memberId, $workspaceId, 91);
        $recentId = $this->insertAiLog($memberId, $workspaceId, 1);
        $nullWorkspaceOldId = $this->insertAiLog($memberId, null, 200);

        $service = new RetentionCleanupService(new RetentionRepository($this->db()), $this->db());
        $result = $service->cleanupDashboardAiLogs(false);

        $this->assertSame('delete', $result['mode']);
        $this->assertGreaterThanOrEqual(2, $result['deleted_count']);

        $remaining = $this->existingAiLogIds([$oldId, $recentId, $nullWorkspaceOldId]);
        $this->assertNotContains($oldId, $remaining, 'row past the retention window should be deleted');
        $this->assertNotContains($nullWorkspaceOldId, $remaining, 'NULL workspace_id must not block deletion of an old row');
        $this->assertContains($recentId, $remaining, 'recent row must survive cleanup');
    }

    public function testDryRunDeletesNothing(): void
    {
        $memberId = $this->freshMemberId();
        $ws = (new WorkspaceProvisioningService($this->db()))->provisionDefaultForNewMember($memberId);
        $workspaceId = (int) $ws['id'];

        $oldId = $this->insertAiLog($memberId, $workspaceId, 91);

        $service = new RetentionCleanupService(new RetentionRepository($this->db()), $this->db());
        $result = $service->cleanupDashboardAiLogs(true);

        $this->assertSame('dry_run', $result['mode']);
        $this->assertSame(0, $result['deleted_count']);
        $this->assertContains($oldId, $this->existingAiLogIds([$oldId]));
    }

    private function insertAiLog(int $memberId, $workspaceId, int $ageInDays): int
    {
        $statement = $this->db()->prepare(
            'INSERT INTO dashboard_ai_logs (user_id, workspace_id, question, lens, status, created_at)
             VALUES (?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))'
        );
        $question = 'test question';
        $lens = 'overview';
        $status = 'success';
        $statement->bind_param('iisssi', $memberId, $workspaceId, $question, $lens, $status, $ageInDays);
        $statement->execute();
        return (int) $this->db()->insert_id;
    }

    /** @return array<int, int> */
    private function existingAiLogIds(array $ids): array
    {
        if (count($ids) === 0) {
            return array();
        }
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $statement = $this->db()->prepare("SELECT id FROM dashboard_ai_logs WHERE id IN ($placeholders)");
        $types = str_repeat('i', count($ids));
        $arguments = array($types);
        foreach ($ids as $index => $value) {
            $arguments[] = &$ids[$index];
        }
        call_user_func_array(array($statement, 'bind_param'), $arguments);
        $statement->execute();
        $rows = $statement->get_result()->fetch_all(MYSQLI_ASSOC);
        return array_map(static function (array $row) { return (int) $row['id']; }, $rows);
    }
}
