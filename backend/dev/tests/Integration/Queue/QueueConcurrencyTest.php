<?php

declare(strict_types=1);

namespace HighlightSignal\Tests\Integration\Queue;

use HighlightSignal\Execution\ExecutionResultRepository;
use HighlightSignal\Execution\ExecutionResultService;
use HighlightSignal\Queue\QueueRepository;
use HighlightSignal\Queue\QueueService;
use HighlightSignal\Tests\Support\DatabaseTestCase;
use HighlightSignal\Workspace\WorkspaceProvisioningService;

/**
 * V12-02: this task's own required "queue concurrency/retry" scenario --
 * the permanent version of V11-02's real two-process concurrency proof.
 * Spawns two REAL OS processes (`proc_open`, not threads/coroutines/mocked
 * timing) racing to claim the same seeded batch of jobs, then verifies via
 * a direct DB query (not by trusting either process's own stdout) that
 * every job was claimed EXACTLY once.
 */
final class QueueConcurrencyTest extends DatabaseTestCase
{
    private const JOB_COUNT = 20;

    public function testTwoRealConcurrentWorkersNeverDoubleClaimOrLoseAJob(): void
    {
        $memberId = $this->freshMemberId();
        $ws = (new WorkspaceProvisioningService($this->db()))->provisionDefaultForNewMember($memberId);
        $workspaceId = (int) $ws['id'];

        $executionResultService = new ExecutionResultService(new ExecutionResultRepository($this->db()));
        $queueService = new QueueService(new QueueRepository($this->db()), $this->db(), $executionResultService);

        $seededIds = [];
        for ($i = 0; $i < self::JOB_COUNT; $i++) {
            $job = $queueService->enqueue($workspaceId, 'test.concurrency', ['i' => $i], 100, 3);
            $seededIds[] = (int) $job['id'];
        }

        $workerScript = __DIR__ . '/../../Support/claim_worker.php';
        $descriptorSpec = [1 => ['pipe', 'w'], 2 => ['pipe', 'w']];

        // Both worker processes busy-poll for this file before starting
        // their claim loop -- see claim_worker.php's own doc comment on
        // why this matters for actually forcing a real collision instead
        // of leaving it to `proc_open()`'s incidental OS-level scheduling.
        $startSignalFile = sys_get_temp_dir() . '/hs_queue_concurrency_start_' . bin2hex(random_bytes(8));

        $processA = proc_open(['php', $workerScript, (string) $workspaceId, $startSignalFile], $descriptorSpec, $pipesA);
        $processB = proc_open(['php', $workerScript, (string) $workspaceId, $startSignalFile], $descriptorSpec, $pipesB);

        $this->assertIsResource($processA);
        $this->assertIsResource($processB);

        // Give both processes time to finish PHP startup/autoload and reach
        // the busy-poll, then release them at the same instant.
        usleep(300000);
        touch($startSignalFile);

        $outputA = stream_get_contents($pipesA[1]);
        $errorA = stream_get_contents($pipesA[2]);
        fclose($pipesA[1]);
        fclose($pipesA[2]);
        $exitA = proc_close($processA);

        $outputB = stream_get_contents($pipesB[1]);
        $errorB = stream_get_contents($pipesB[2]);
        fclose($pipesB[1]);
        fclose($pipesB[2]);
        $exitB = proc_close($processB);

        if (file_exists($startSignalFile)) {
            unlink($startSignalFile);
        }

        $this->assertSame(0, $exitA, "worker A failed: $errorA");
        $this->assertSame(0, $exitB, "worker B failed: $errorB");

        $claimedByA = array_filter(array_map('intval', explode("\n", trim($outputA))));
        $claimedByB = array_filter(array_map('intval', explode("\n", trim($outputB))));

        // Restrict to THIS test's own seeded ids -- other tests' jobs may
        // also have been claimed by these same workers if they raced
        // against leftover data, which is fine and ignored here.
        $ourClaimsA = array_intersect($claimedByA, $seededIds);
        $ourClaimsB = array_intersect($claimedByB, $seededIds);

        $overlap = array_intersect($ourClaimsA, $ourClaimsB);
        $this->assertSame([], array_values($overlap), 'no job may ever be claimed by BOTH workers');

        $allClaimed = array_merge($ourClaimsA, $ourClaimsB);
        sort($allClaimed);
        $this->assertSame($seededIds, $allClaimed, 'every seeded job must be claimed exactly once across both workers, none lost');

        // A non-atomic claim can pass BOTH checks above while still being
        // broken: if worker A loses a single race, `claimNext()` can report
        // NULL to A (its own claim vanished, overwritten by B) even though
        // real work remained -- A's loop then reads that as "queue is
        // empty" and exits for good, so B alone ends up claiming
        // everything. Every id still gets claimed by SOMEONE (so the two
        // checks above stay green), but that is luck, not the atomicity
        // guarantee actually holding. A real fair-claim implementation
        // should never let one worker walk away with (almost) everything
        // while the other does (almost) nothing.
        $this->assertGreaterThanOrEqual(
            (int) (self::JOB_COUNT * 0.2),
            min(count($ourClaimsA), count($ourClaimsB)),
            'both workers must claim a meaningful share -- one worker claiming (almost) nothing means it silently gave up after losing a race it should have retried, not that it ran out of real work'
        );

        // Direct DB verification -- not trusting either process's stdout.
        // call_user_func_array + by-reference, same pattern as every
        // Repository's own bindDynamic() in this codebase (mysqli's
        // bind_param requires true references, which a `...$array` spread
        // does not reliably provide across PHP versions).
        $placeholders = implode(',', array_fill(0, count($seededIds), '?'));
        $statement = $this->db()->prepare("SELECT status, COUNT(*) AS c FROM queue_jobs WHERE id IN ($placeholders) GROUP BY status");
        $types = str_repeat('i', count($seededIds));
        $arguments = [$types];
        foreach ($seededIds as $index => $value) {
            $arguments[] = &$seededIds[$index];
        }
        call_user_func_array([$statement, 'bind_param'], $arguments);
        $statement->execute();
        $statuses = $statement->get_result()->fetch_all(MYSQLI_ASSOC);

        $this->assertCount(1, $statuses, 'all seeded jobs must land in exactly one status after claiming');
        $this->assertSame('processing', $statuses[0]['status']);
        $this->assertSame(self::JOB_COUNT, (int) $statuses[0]['c']);
    }
}
