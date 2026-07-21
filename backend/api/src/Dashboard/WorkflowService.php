<?php

declare(strict_types=1);

namespace HighlightSignal\Dashboard;

use HighlightSignal\Auth\ServiceIdentity;
use HighlightSignal\Evidence\EvidenceRepository;
use HighlightSignal\Explanation\ExplanationRepository;
use HighlightSignal\Http\NotFoundException;
use HighlightSignal\Http\ValidationException;
use HighlightSignal\Signal\Detector\SeoTechnicalIssueDetector;
use HighlightSignal\Signal\SignalRepository;
use mysqli;

final class WorkflowService
{
    private $database;
    private $repository;
    private $signalRepository;
    private $evidenceRepository;
    private $explanationRepository;

    public function __construct(
        mysqli $database,
        WorkflowRepository $repository,
        SignalRepository $signalRepository,
        EvidenceRepository $evidenceRepository,
        ExplanationRepository $explanationRepository
    ) {
        $this->database = $database;
        $this->repository = $repository;
        $this->signalRepository = $signalRepository;
        $this->evidenceRepository = $evidenceRepository;
        $this->explanationRepository = $explanationRepository;
    }

    public function get(int $workspaceId, string $contextKey): array
    {
        $recommendation = $this->repository->findRecommendation($workspaceId, $contextKey);
        if (!is_array($recommendation)) {
            return array('context_key' => $contextKey, 'recommendation' => null, 'decision' => null, 'task' => null, 'outcome' => null);
        }

        // V10-04: re-checked on every read (including the read at the end of
        // mutate(), which runs AFTER actions like create_task's
        // recordDecision() already wrote 'accepted') so a stale Recommendation
        // is superseded regardless of which decision path it was on when its
        // backing Signal resolved/dismissed. Only applies to signal-backed
        // rows -- a legacy (frontend_legacy) recommendation has no Signal to
        // check against and is left exactly as before.
        if ($recommendation['signal_id'] !== null && (string) $recommendation['status'] !== 'archived') {
            $signal = $this->signalRepository->findForWorkspace($workspaceId, (int) $recommendation['signal_id']);
            if (is_array($signal) && in_array((string) $signal['status'], array('resolved', 'dismissed'), true)) {
                $this->repository->archiveRecommendation($workspaceId, (int) $recommendation['id']);
                $recommendation = $this->repository->findRecommendation($workspaceId, $contextKey);
            }
        }

        $recommendationId = (int) $recommendation['id'];
        $task = $this->repository->findTask($workspaceId, $recommendationId);
        if (is_array($task)) {
            $task['id'] = (int) $task['id'];
            $task['steps'] = array_map(array($this, 'normalizeStep'), $this->repository->listSteps((int) $task['id']));
        }

        $outcome = is_array($task)
            ? $this->normalizeOutcome($this->repository->getOutcome($workspaceId, (int) $task['id']))
            : null;

        return array(
            'context_key' => $contextKey,
            'recommendation' => $this->normalizeRecommendation($recommendation),
            'decision' => $this->repository->latestDecision($workspaceId, $recommendationId),
            'task' => $task,
            'outcome' => $outcome,
        );
    }

    public function mutate(ServiceIdentity $identity, string $contextKey, array $input): array
    {
        $action = isset($input['action']) ? (string) $input['action'] : '';
        $title = trim((string) ($input['title'] ?? ''));
        $description = trim((string) ($input['description'] ?? ''));
        if ($title === '' || strlen($title) > 255) throw new ValidationException('Recommendation title is required.');

        $this->database->begin_transaction();
        try {
            // V10-04: if the caller supplies a real (site_id, issue_type,
            // url) -- seo/page.tsx has these as actual observed facts, not
            // business claims -- and it resolves to a genuine Signal in the
            // CALLER'S OWN workspace, the Recommendation's content is built
            // from that Signal/Evidence/Explanation chain, never from the
            // frontend's title/description. A forged site_id belonging to
            // another workspace simply won't resolve (findByDedupKey is
            // scoped to $identity->workspaceId), falling back to the legacy
            // path below rather than leaking cross-workspace data.
            $signal = $this->resolveSignalContext($identity->workspaceId, $input);
            if (is_array($signal)) {
                $content = $this->buildFormalizedContent($signal);
                $recommendation = $this->repository->saveFormalizedRecommendation(
                    $identity->workspaceId,
                    $contextKey,
                    (int) $signal['id'],
                    $content
                );
            } else {
                $recommendation = $this->repository->saveRecommendation(
                    $identity->workspaceId,
                    $contextKey,
                    $title,
                    $description
                );
            }
            $recommendationId = (int) $recommendation['id'];

            if ($action === 'save_decision') {
                // V10-05: expanded from {accepted, skipped} to the spec's
                // full outcome set (migrations/028) -- 'accepted'/'skipped'
                // keep meaning exactly what they always did.
                $decision = (string) ($input['decision'] ?? '');
                $validDecisions = array('accepted', 'skipped', 'rejected', 'deferred', 'modified', 'needs_more_evidence');
                if (!in_array($decision, $validDecisions, true)) {
                    throw new ValidationException('Decision must be one of: ' . implode(', ', $validDecisions) . '.');
                }
                $reason = trim((string) ($input['reason'] ?? ''));
                $expectedOutcome = trim((string) ($input['expected_outcome'] ?? ''));
                $idempotencyKey = isset($input['idempotency_key']) ? trim((string) $input['idempotency_key']) : '';
                $this->repository->recordDecision(
                    $identity->workspaceId,
                    $recommendationId,
                    $identity->memberId,
                    $decision,
                    $reason !== '' ? $reason : null,
                    (int) $recommendation['revision'],
                    $expectedOutcome !== '' ? $expectedOutcome : null,
                    $idempotencyKey !== '' ? $idempotencyKey : null
                );
            } elseif ($action === 'create_task') {
                $steps = isset($input['steps']) && is_array($input['steps']) ? $input['steps'] : array();
                if (count($steps) === 0 || count($steps) > 20) throw new ValidationException('Task steps are required.');
                foreach ($steps as $step) {
                    if (!is_array($step) || trim((string) ($step['title'] ?? '')) === '') {
                        throw new ValidationException('Every task step requires a title.');
                    }
                }
                // create_task's implicit accept -- unchanged semantics, now
                // also stamps recommendation_revision for traceability.
                $this->repository->recordDecision(
                    $identity->workspaceId,
                    $recommendationId,
                    $identity->memberId,
                    'accepted',
                    null,
                    (int) $recommendation['revision']
                );
                $task = $this->repository->createTask($identity->workspaceId, $recommendationId, $identity->memberId, $title, $description, $steps);
                $baseline = $this->metrics(isset($input['baseline']) && is_array($input['baseline']) ? $input['baseline'] : array());
                $this->repository->createOutcome($identity->workspaceId, (int) $task['id'], $baseline);
            } elseif ($action === 'update_step') {
                $taskId = (int) ($input['task_id'] ?? 0);
                $stepId = (int) ($input['step_id'] ?? 0);
                if ($taskId <= 0 || $stepId <= 0) throw new ValidationException('Task and step are required.');
                $task = $this->repository->findTask($identity->workspaceId, $recommendationId);
                if (!is_array($task) || (int) $task['id'] !== $taskId) throw new NotFoundException('Task not found.');
                $this->repository->updateStep($identity->workspaceId, $taskId, $stepId, !empty($input['completed']));
            } elseif ($action === 'measure_outcome') {
                $task = $this->repository->findTask($identity->workspaceId, $recommendationId);
                if (!is_array($task)) throw new NotFoundException('Task not found.');
                $outcome = $this->repository->getOutcome($identity->workspaceId, (int) $task['id']);
                if (!is_array($outcome)) throw new NotFoundException('Outcome baseline not found.');
                if ((string) $task['status'] !== 'completed') throw new ValidationException('Task must be completed before measuring outcome.');
                $current = $this->metrics(isset($input['metrics']) && is_array($input['metrics']) ? $input['metrics'] : array());
                $baseline = json_decode((string) $outcome['baseline_metrics_TEXT'], true);
                $baseline = is_array($baseline) ? $this->metrics($baseline) : $this->metrics(array());
                if ($baseline['sessions'] > 0 && $current['sessions'] <= 0) {
                    throw new ValidationException('Current GA metrics are unavailable; outcome was not updated.');
                }
                $this->repository->measureOutcome(
                    $identity->workspaceId,
                    (int) $task['id'],
                    $current,
                    $this->compare($baseline, $current)
                );
            } elseif ($action === 'refresh_recommendation') {
                // V10-06: no additional side effect -- the Recommendation
                // save/formalization above (saveFormalizedRecommendation()/
                // saveRecommendation()) already ran for every action, this
                // one included. Exists purely so the Decision-first
                // Dashboard can formalize/refresh a Signal-backed
                // Recommendation's real content (title/priority/confidence/
                // expected_impact/suggested_action/reason) for human review
                // BEFORE any decision is made, unlike save_decision/
                // create_task which always implicitly recorded one.
            } else {
                throw new ValidationException('Unsupported workflow action.');
            }

            $this->audit($identity, $action, $contextKey);
            $this->database->commit();
            return $this->get($identity->workspaceId, $contextKey);
        } catch (\Throwable $error) {
            $this->database->rollback();
            throw $error;
        }
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>|null Full signal row (workspace-scoped), or null if not signal-backed.
     */
    private function resolveSignalContext(int $workspaceId, array $input)
    {
        $context = isset($input['signal_context']) && is_array($input['signal_context']) ? $input['signal_context'] : null;
        if ($context === null) {
            return null;
        }

        // V10-06: direct-by-id path, alongside the original SEO-specific
        // (site_id, issue_type, url) -> dedup_key path below. The
        // Decision-first Dashboard already has the real Signal row in hand
        // (from GET .../signals) for ANY source domain (SEO today, GA/AEO/GEO
        // once V10-07 wires their detectors) -- it doesn't know or need to
        // know a detector's dedup-key formula to formalize a Recommendation
        // from a Signal it's already looking at. Still scoped to the
        // caller's own workspace via findForWorkspace(), same as the
        // dedup-key path -- no cross-workspace lookup introduced.
        $signalId = isset($context['signal_id']) ? (int) $context['signal_id'] : 0;
        if ($signalId > 0) {
            return $this->signalRepository->findForWorkspace($workspaceId, $signalId);
        }

        $siteId = isset($context['site_id']) ? (int) $context['site_id'] : 0;
        $issueType = isset($context['issue_type']) ? trim((string) $context['issue_type']) : '';
        $url = isset($context['url']) ? (string) $context['url'] : '';
        if ($siteId <= 0 || $issueType === '') {
            return null;
        }

        $dedupKey = SeoTechnicalIssueDetector::computeDedupKey($siteId, $issueType, $url);
        $found = $this->signalRepository->findByDedupKey($workspaceId, $dedupKey);
        if (!is_array($found)) {
            return null;
        }

        return $this->signalRepository->findForWorkspace($workspaceId, (int) $found['id']);
    }

    /** @param array<string, mixed> $signal @return array<string, mixed> */
    private function buildFormalizedContent(array $signal): array
    {
        $signalId = (int) $signal['id'];
        $title = (string) $signal['title'];
        $severity = (string) $signal['severity'];
        $priorityMap = array('critical' => 'critical', 'high' => 'high', 'medium' => 'medium', 'low' => 'low', 'info' => 'low');
        $priority = isset($priorityMap[$severity]) ? $priorityMap[$severity] : 'medium';

        $analysis = $this->explanationRepository->findLatestForSignal((int) $signal['workspace_id'], $signalId);
        $hasAnalysis = is_array($analysis) && (string) $analysis['status'] === 'ok';

        $confidence = $hasAnalysis ? (float) $analysis['explanation_confidence'] : 50.0;
        $reason = $hasAnalysis
            ? (string) $analysis['explanation_text']
            : sprintf(
                '系統偵測到「%s」，已發生 %d 次，最近一次觀察時間為 %s。',
                $title,
                (int) $signal['occurrence_count'],
                (string) $signal['last_seen_at']
            );
        $expectedImpact = $hasAnalysis
            ? sprintf(
                '%s（%s）。依據：%s。限制：%s',
                (string) $analysis['impact_direction'],
                (string) ($analysis['impact_magnitude'] ?? '-'),
                (string) ($analysis['impact_basis'] ?? '-'),
                (string) ($analysis['impact_limitations'] ?? '-')
            )
            : '尚無足夠 Evidence，無法產生 Business Impact 評估。';
        $suggestedAction = sprintf('修復「%s」後重新掃描確認已解決。', $title);

        // NOTE: whether this Recommendation should be 'archived' is decided
        // in get(), not here -- any mutate() action that also calls
        // recordDecision() (create_task, save_decision) would immediately
        // overwrite a status set at save time, so the archive check has to
        // run on read, after all of a single request's side effects have
        // already happened, to be the actually-authoritative final state.

        return array(
            'title' => $title,
            'priority' => $priority,
            'confidence' => $confidence,
            'expected_impact' => $expectedImpact,
            'suggested_action' => $suggestedAction,
            'reason' => $reason,
            'description' => $reason,
            'generator_version' => 'rec-v1',
        );
    }

    private function audit(ServiceIdentity $identity, string $action, string $contextKey)
    {
        $eventType = 'Dashboard Workflow ' . $action;
        $entityType = 'RecommendationWorkflow';
        $entityId = $contextKey;
        $requestId = $identity->nonce;
        $metadata = json_encode(array('action' => $action, 'context_key' => $contextKey));
        $columns = $this->database->query("SHOW COLUMNS FROM audit_logs LIKE 'metadata_json'");
        $metadataColumn = $columns && $columns->num_rows > 0 ? 'metadata_json' : 'metadata_TEXT';
        $statement = $this->database->prepare(
            'INSERT INTO audit_logs (workspace_id, actor_member_id, event_type, entity_type, entity_id, request_id, ' . $metadataColumn . ')
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $statement->bind_param('iisssss', $identity->workspaceId, $identity->memberId, $eventType, $entityType, $entityId, $requestId, $metadata);
        $statement->execute();
    }

    private function normalizeRecommendation(array $row): array
    {
        // V10-04: signal_id/priority/confidence/expected_impact/
        // suggested_action/reason/generator_type/revision are all nullable
        // (added by migrations/027) so a pre-existing or still-legacy
        // (non-signal-backed) recommendation normalizes fine with these as
        // null/defaults -- this does not require every row to be formalized.
        return array(
            'id' => (int) $row['id'],
            'public_id' => (string) $row['public_id'],
            'context_key' => (string) $row['context_key'],
            'signal_id' => isset($row['signal_id']) && $row['signal_id'] !== null ? (int) $row['signal_id'] : null,
            'title' => (string) $row['title'],
            'description' => (string) ($row['description'] ?? ''),
            'priority' => $row['priority'] ?? null,
            'confidence' => isset($row['confidence']) && $row['confidence'] !== null ? (float) $row['confidence'] : null,
            'expected_impact' => $row['expected_impact'] ?? null,
            'suggested_action' => $row['suggested_action'] ?? null,
            'reason' => $row['reason'] ?? null,
            'generator_type' => (string) ($row['generator_type'] ?? 'frontend_legacy'),
            'generator_version' => $row['generator_version'] ?? null,
            'revision' => isset($row['revision']) ? (int) $row['revision'] : 1,
            'status' => (string) $row['status'],
            'updated_at' => (string) $row['updated_at'],
        );
    }

    public function normalizeStep(array $row): array
    {
        return array(
            'id' => (int) $row['id'],
            'title' => (string) $row['title'],
            'description' => (string) ($row['description'] ?? ''),
            'sort_order' => (int) $row['sort_order'],
            'status' => (string) $row['status'],
            'completed_at' => $row['completed_at'],
        );
    }

    private function metrics(array $input): array
    {
        return array(
            'sessions' => (float) ($input['sessions'] ?? 0),
            'conversions' => (float) ($input['conversions'] ?? 0),
            'seo_score' => (float) ($input['seo_score'] ?? 0),
            'seo_issues' => (float) ($input['seo_issues'] ?? 0),
        );
    }

    private function compare(array $baseline, array $current): array
    {
        $result = array();
        foreach ($baseline as $key => $value) {
            $before = (float) $value;
            $after = (float) ($current[$key] ?? 0);
            $result[$key] = array(
                'before' => $before,
                'after' => $after,
                'change' => $after - $before,
                'change_percent' => $before == 0.0 ? null : round((($after - $before) / abs($before)) * 100, 2),
            );
        }
        return $result;
    }

    private function normalizeOutcome($row)
    {
        if (!is_array($row)) return null;
        return array(
            'id' => (int) $row['id'],
            'status' => (string) $row['status'],
            'baseline' => json_decode((string) $row['baseline_metrics_TEXT'], true),
            'measured' => $row['measured_metrics_TEXT'] ? json_decode((string) $row['measured_metrics_TEXT'], true) : null,
            'result' => $row['result_TEXT'] ? json_decode((string) $row['result_TEXT'], true) : null,
            'measured_at' => $row['measured_at'],
        );
    }
}
