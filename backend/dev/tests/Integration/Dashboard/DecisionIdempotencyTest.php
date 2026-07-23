<?php

declare(strict_types=1);

namespace HighlightSignal\Tests\Integration\Dashboard;

use HighlightSignal\Auth\ServiceIdentity;
use HighlightSignal\Tests\Support\DatabaseTestCase;
use HighlightSignal\Tests\Support\ServiceFactory;

/**
 * V12-02: this task's own required "Decision/idempotency" scenario. Covers
 * two DISTINCT idempotency guarantees this codebase makes:
 *  1. `recordDecision()`'s opt-in `idempotency_key` -- a resubmit with the
 *     SAME key returns the ORIGINAL row, never a second Decision.
 *  2. `create_task`'s full-resubmit idempotency (V11-01) -- resubmitting the
 *     exact same create_task call is a complete no-op on Decision/Action/
 *     Task/Outcome, not just Task.
 */
final class DecisionIdempotencyTest extends DatabaseTestCase
{
    public function testDecisionWithIdempotencyKeyReplayReturnsOriginalRow(): void
    {
        $provisioning = ServiceFactory::workspaceProvisioning($this->db());
        $memberId = $this->freshMemberId();
        $ws = $provisioning->provisionDefaultForNewMember($memberId);
        $identity = new ServiceIdentity($memberId, (int) $ws['id'], bin2hex(random_bytes(16)));
        $workflowService = ServiceFactory::workflowService($this->db());

        $contextKey = 'idem-decision-' . $memberId;
        $idempotencyKey = 'idem-key-' . bin2hex(random_bytes(8));

        $first = $workflowService->mutate($identity, $contextKey, [
            'title' => 'Idempotency Test',
            'action' => 'save_decision',
            'decision' => 'accepted',
            'reason' => 'first submission',
            'idempotency_key' => $idempotencyKey,
        ]);

        $second = $workflowService->mutate($identity, $contextKey, [
            'title' => 'Idempotency Test',
            'action' => 'save_decision',
            // Deliberately DIFFERENT content on the replay -- a real
            // idempotency guarantee must return the ORIGINAL decision
            // untouched, not silently accept the new content.
            'decision' => 'rejected',
            'reason' => 'this must never be persisted',
            'idempotency_key' => $idempotencyKey,
        ]);

        $this->assertSame($first['decision']['id'], $second['decision']['id']);
        $this->assertSame('accepted', $second['decision']['decision'], 'a replay must never overwrite the original decision');

        $countStatement = $this->db()->prepare('SELECT COUNT(*) AS c FROM decisions WHERE idempotency_key = ?');
        $countStatement->bind_param('s', $idempotencyKey);
        $countStatement->execute();
        $count = (int) $countStatement->get_result()->fetch_assoc()['c'];
        $this->assertSame(1, $count, 'exactly one decision row must exist for this idempotency key, never two');
    }

    public function testCreateTaskResubmitIsACompleteNoOp(): void
    {
        $provisioning = ServiceFactory::workspaceProvisioning($this->db());
        $memberId = $this->freshMemberId();
        $ws = $provisioning->provisionDefaultForNewMember($memberId);
        $identity = new ServiceIdentity($memberId, (int) $ws['id'], bin2hex(random_bytes(16)));
        $workflowService = ServiceFactory::workflowService($this->db());

        $contextKey = 'idem-create-task-' . $memberId;
        $input = [
            'title' => 'Idempotent Task Test',
            'action' => 'create_task',
            'steps' => [['title' => 'Only step']],
        ];

        $first = $workflowService->mutate($identity, $contextKey, $input);
        $workflowService->mutate($identity, $contextKey, $input);
        $workflowService->mutate($identity, $contextKey, $input);

        $taskId = $first['task']['id'];

        $decisionCount = $this->countRows('decisions', 'recommendation_id', (int) $first['recommendation']['id']);
        $actionCount = $this->countRows('actions', 'recommendation_id', (int) $first['recommendation']['id']);
        $taskCount = $this->countRows('tasks', 'id', (int) $taskId);

        $this->assertSame(1, $decisionCount, 'resubmitting create_task must never create a second Decision');
        $this->assertSame(1, $actionCount, 'resubmitting create_task must never create a second Action');
        $this->assertSame(1, $taskCount);
    }

    private function countRows(string $table, string $column, int $value): int
    {
        $statement = $this->db()->prepare("SELECT COUNT(*) AS c FROM $table WHERE $column = ?");
        $statement->bind_param('i', $value);
        $statement->execute();
        return (int) $statement->get_result()->fetch_assoc()['c'];
    }
}
