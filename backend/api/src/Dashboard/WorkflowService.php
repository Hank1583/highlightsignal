<?php

declare(strict_types=1);

namespace HighlightSignal\Dashboard;

use HighlightSignal\Action\ActionRepository;
use HighlightSignal\Audit\AuditLogger;
use HighlightSignal\Auth\ServiceIdentity;
use HighlightSignal\Evaluation\EvaluationService;
use HighlightSignal\Evidence\EvidenceRepository;
use HighlightSignal\Execution\ExecutionResultService;
use HighlightSignal\Explanation\ExplanationRepository;
use HighlightSignal\Http\NotFoundException;
use HighlightSignal\Http\ValidationException;
use HighlightSignal\Notification\NotificationService;
use HighlightSignal\Outcome\BusinessOutcomeMetricService;
use HighlightSignal\Signal\Detector\SeoTechnicalIssueDetector;
use HighlightSignal\Signal\SignalRepository;
use HighlightSignal\Workspace\AuthorizationException;
use HighlightSignal\Workspace\WorkspaceAccessPolicy;
use mysqli;

final class WorkflowService
{
    /**
     * V11-01: legal Task lifecycle transitions. 'completed' never appears
     * as a value here on purpose -- it is ONLY ever set by updateStep()'s
     * automatic step-driven recompute (WorkflowRepository::updateStep()),
     * never directly by a human via update_task, so it is deliberately
     * excluded as a manually-reachable target from every state. No
     * visibility keyword -- modifiers on class constants are PHP 7.1+ only
     * and this project targets PHP 7.0 (same reasoning as SignalService's
     * HUMAN_SETTABLE_STATUSES).
     */
    const TASK_STATUS_TRANSITIONS = array(
        'pending' => array('in_progress', 'blocked', 'cancelled'),
        'in_progress' => array('blocked', 'cancelled'),
        'blocked' => array('in_progress', 'cancelled'),
        'completed' => array(),
        'cancelled' => array(),
    );

    private $database;
    private $repository;
    private $signalRepository;
    private $evidenceRepository;
    private $explanationRepository;
    private $actionRepository;
    private $executionResultService;
    private $businessOutcomeMetricService;
    private $evaluationService;
    private $notificationService;
    private $auditLogger;

    public function __construct(
        mysqli $database,
        WorkflowRepository $repository,
        SignalRepository $signalRepository,
        EvidenceRepository $evidenceRepository,
        ExplanationRepository $explanationRepository,
        ActionRepository $actionRepository,
        ExecutionResultService $executionResultService,
        BusinessOutcomeMetricService $businessOutcomeMetricService,
        EvaluationService $evaluationService,
        NotificationService $notificationService
    ) {
        $this->database = $database;
        $this->repository = $repository;
        $this->signalRepository = $signalRepository;
        $this->evidenceRepository = $evidenceRepository;
        $this->explanationRepository = $explanationRepository;
        $this->actionRepository = $actionRepository;
        $this->executionResultService = $executionResultService;
        $this->businessOutcomeMetricService = $businessOutcomeMetricService;
        $this->evaluationService = $evaluationService;
        $this->notificationService = $notificationService;
        $this->auditLogger = new AuditLogger($database);
    }

    public function get(int $workspaceId, string $contextKey): array
    {
        $recommendation = $this->repository->findRecommendation($workspaceId, $contextKey);
        if (!is_array($recommendation)) {
            return array('context_key' => $contextKey, 'recommendation' => null, 'decision' => null, 'action' => null, 'task' => null, 'outcome' => null, 'outcome_metrics' => array());
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

        // V11-01: Action is read via the Task's own action_id -- a
        // pre-migration Task backfilled by migrations/030 always has one; a
        // Recommendation with a Decision but no Task yet has no Action
        // either (an Action is only ever created alongside its Task, see
        // the create_task branch of mutate()).
        $action = is_array($task) && $task['action_id'] !== null
            ? $this->actionRepository->findForWorkspace($workspaceId, (int) $task['action_id'])
            : null;

        // V11-04: formal, per-metric outcome rows -- read-only here
        // (Workspace-scoped API requirement), additive alongside the legacy
        // `outcome` blob above.
        $outcomeMetricRows = is_array($action) ? $this->businessOutcomeMetricService->listForAction($workspaceId, (int) $action['id']) : array();
        $outcomeMetrics = array_map(array($this, 'normalizeOutcomeMetric'), $outcomeMetricRows);

        $decision = $this->repository->latestDecision($workspaceId, $recommendationId);

        // V11-05: Basic Evaluation metrics are computed lazily on every read
        // (same established pattern as V10-06's refresh_recommendation and
        // V10-03's readOrGenerateForSignal) -- idempotent, only a real
        // change to the underlying rating produces a new append-only row
        // (EvaluationService::recordIfChanged*()). This NEVER creates a
        // Decision/Action/Task -- it only reads what already exists above
        // and writes an observational record.
        $this->evaluationService->evaluateRecommendationAdoption($workspaceId, $recommendationId, is_array($decision) ? (string) $decision['decision'] : null);
        if (is_array($decision)) {
            $this->evaluationService->evaluateDecisionOutcome($workspaceId, (int) $decision['id'], (string) $decision['decision']);
            $this->evaluationService->evaluateTimeToDecision(
                $workspaceId,
                $recommendationId,
                strtotime((string) $recommendation['created_at']),
                strtotime((string) $decision['created_at'])
            );
        }
        if (is_array($task)) {
            $this->evaluationService->evaluateTaskCompletion($workspaceId, (int) $task['id'], (string) $task['status']);
        }
        if (is_array($action)) {
            $this->evaluationService->evaluateActionOutcomeAchievement($workspaceId, (int) $action['id'], $outcomeMetrics);
            $firstMeasuredAt = null;
            foreach ($outcomeMetricRows as $metricRow) {
                if ($metricRow['measured_at'] !== null) {
                    $firstMeasuredAt = $firstMeasuredAt === null ? $metricRow['measured_at'] : min($firstMeasuredAt, $metricRow['measured_at']);
                }
            }
            if ($firstMeasuredAt !== null) {
                $this->evaluationService->evaluateTimeToOutcome($workspaceId, (int) $action['id'], strtotime((string) $action['created_at']), strtotime((string) $firstMeasuredAt));
            }
        }

        return array(
            'context_key' => $contextKey,
            'recommendation' => $this->normalizeRecommendation($recommendation),
            'decision' => $decision,
            'action' => is_array($action) ? $this->normalizeAction($action) : null,
            'task' => $task,
            'outcome' => $outcome,
            'outcome_metrics' => $outcomeMetrics,
        );
    }

    public function mutate(ServiceIdentity $identity, string $contextKey, array $input): array
    {
        $action = isset($input['action']) ? (string) $input['action'] : '';
        $title = trim((string) ($input['title'] ?? ''));
        $description = trim((string) ($input['description'] ?? ''));
        if ($title === '' || strlen($title) > 255) throw new ValidationException('Recommendation title is required.');

        $this->database->begin_transaction();
        // V11-07: replaces the single generic "Dashboard Workflow {action}"
        // audit row every branch below used to produce -- that row named
        // neither WHICH Decision/Action/Task/Outcome was actually created or
        // changed nor its own public_id, only the Recommendation's
        // context_key. Each branch now appends one entry per real state
        // change it made; all of them are written (in this same
        // transaction, so "committed mutation" and "has an audit row" rise
        // and fall together) right before commit.
        $auditEvents = array();
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
                $decisionRow = $this->repository->recordDecision(
                    $identity->workspaceId,
                    $recommendationId,
                    $identity->memberId,
                    $decision,
                    $reason !== '' ? $reason : null,
                    (int) $recommendation['revision'],
                    $expectedOutcome !== '' ? $expectedOutcome : null,
                    $idempotencyKey !== '' ? $idempotencyKey : null
                );
                $auditEvents[] = array(
                    'event_type' => 'decision.recorded',
                    'entity_type' => 'Decision',
                    'entity_id' => (string) $decisionRow['public_id'],
                    'metadata' => array('decision' => $decision, 'reason_supplied' => $reason !== '', 'idempotency_key_supplied' => $idempotencyKey !== ''),
                );
            } elseif ($action === 'create_task') {
                $steps = isset($input['steps']) && is_array($input['steps']) ? $input['steps'] : array();
                if (count($steps) === 0 || count($steps) > 20) throw new ValidationException('Task steps are required.');
                foreach ($steps as $step) {
                    if (!is_array($step) || trim((string) ($step['title'] ?? '')) === '') {
                        throw new ValidationException('Every task step requires a title.');
                    }
                }

                // V11-01: fully idempotent resubmit -- if a Task already
                // exists for this Recommendation, create_task is a complete
                // no-op on Decision/Action/Task/Outcome (not just Task,
                // which is all the pre-V11-01 code checked). Without this,
                // every resubmit would still append a fresh 'accepted'
                // Decision (recordDecision() has no idempotency_key here)
                // and, since an Action is keyed 1:1 to ITS OWN decision_id,
                // that would create a SECOND Action for the same Task --
                // caught by this rehearsal's own idempotency check, not by
                // reasoning about the code up front.
                $existingTask = $this->repository->findTask($identity->workspaceId, $recommendationId);
                if (is_array($existingTask)) {
                    // V11-01: fully idempotent resubmit -- nothing mutated,
                    // so no audit row (a no-op is not a mutation).
                    $task = $existingTask;
                } else {
                    // create_task's implicit accept -- unchanged semantics,
                    // now also stamps recommendation_revision for traceability.
                    $decisionRow = $this->repository->recordDecision(
                        $identity->workspaceId,
                        $recommendationId,
                        $identity->memberId,
                        'accepted',
                        null,
                        (int) $recommendation['revision']
                    );
                    $auditEvents[] = array(
                        'event_type' => 'decision.recorded',
                        'entity_type' => 'Decision',
                        'entity_id' => (string) $decisionRow['public_id'],
                        'metadata' => array('decision' => 'accepted', 'implicit' => true),
                    );
                    // An Action is the formal authorization boundary between
                    // this Decision and the Task about to be created --
                    // idempotent by construction (actions.decision_id is
                    // UNIQUE).
                    $actionRow = $this->actionRepository->createOrFindForDecision(
                        $identity->workspaceId,
                        $recommendationId,
                        (int) $decisionRow['id'],
                        $recommendation['suggested_action'] !== null && $recommendation['suggested_action'] !== ''
                            ? (string) $recommendation['suggested_action']
                            : $title,
                        $identity->memberId
                    );
                    $actionId = (int) $actionRow['id'];
                    $auditEvents[] = array(
                        'event_type' => 'action.created',
                        'entity_type' => 'Action',
                        'entity_id' => (string) $actionRow['public_id'],
                        'metadata' => array('intent' => (string) $actionRow['intent'], 'decision_id' => (int) $decisionRow['id']),
                    );
                    $task = $this->repository->createTask($identity->workspaceId, $recommendationId, $actionId, $identity->memberId, $title, $description, $steps);
                    $auditEvents[] = array(
                        'event_type' => 'task.created',
                        'entity_type' => 'Task',
                        'entity_id' => (string) $task['public_id'],
                        'metadata' => array('action_id' => $actionId, 'step_count' => count($steps)),
                    );
                    if ((string) $actionRow['status'] === 'pending') {
                        // A Task now exists for this Action -- work has started.
                        $this->actionRepository->updateStatus($identity->workspaceId, $actionId, 'in_progress');
                        $auditEvents[] = array(
                            'event_type' => 'action.status_changed',
                            'entity_type' => 'Action',
                            'entity_id' => (string) $actionRow['public_id'],
                            'metadata' => array('from_status' => 'pending', 'to_status' => 'in_progress'),
                        );
                    }
                    $baseline = $this->metrics(isset($input['baseline']) && is_array($input['baseline']) ? $input['baseline'] : array());
                    $outcomeRow = $this->repository->createOutcome($identity->workspaceId, (int) $task['id'], $baseline);
                    $auditEvents[] = array(
                        'event_type' => 'outcome.baseline_recorded',
                        'entity_type' => 'BusinessOutcome',
                        'entity_id' => (string) $outcomeRow['public_id'],
                        'metadata' => array('task_id' => (int) $task['id']),
                    );
                    // V11-04: same real baseline dict, ALSO persisted as
                    // formal per-metric rows linked to this Action -- the
                    // legacy blob above is untouched, this is additive.
                    $sourceRef = $recommendation['signal_id'] !== null ? (string) $recommendation['signal_id'] : null;
                    $baselineMetrics = $this->businessOutcomeMetricService->recordBaselineSet($identity->workspaceId, $actionId, $baseline, $sourceRef);
                    if (count($baselineMetrics) > 0) {
                        $auditEvents[] = array(
                            'event_type' => 'outcome_metric.baseline_set',
                            'entity_type' => 'Action',
                            'entity_id' => (string) $actionId,
                            'metadata' => array('metric_keys' => array_keys($baselineMetrics)),
                        );
                    }
                }
            } elseif ($action === 'update_step') {
                $taskId = (int) ($input['task_id'] ?? 0);
                $stepId = (int) ($input['step_id'] ?? 0);
                if ($taskId <= 0 || $stepId <= 0) throw new ValidationException('Task and step are required.');
                $task = $this->repository->findTask($identity->workspaceId, $recommendationId);
                if (!is_array($task) || (int) $task['id'] !== $taskId) throw new NotFoundException('Task not found.');
                // V11-01: 'cancelled'/'completed' are terminal -- no further
                // step mutation once there; 'blocked' must be explicitly
                // unblocked via update_task first (WorkflowRepository's own
                // WHERE guard on the automatic recompute is the real data
                // boundary, this is the user-facing rejection).
                if (in_array((string) $task['status'], array('cancelled', 'completed'), true)) {
                    throw new ValidationException('Cannot update steps on a cancelled or completed task.');
                }
                $this->repository->updateStep($identity->workspaceId, $taskId, $stepId, !empty($input['completed']));
                $auditEvents[] = array(
                    'event_type' => 'task.step_updated',
                    'entity_type' => 'Task',
                    'entity_id' => (string) $task['public_id'],
                    'metadata' => array('step_id' => $stepId, 'completed' => !empty($input['completed'])),
                );
                if ((string) $task['status'] !== 'blocked') {
                    $refreshedTask = $this->repository->findTaskById($identity->workspaceId, $taskId);
                    if (is_array($refreshedTask) && (string) $refreshedTask['status'] === 'completed') {
                        $auditEvents[] = array(
                            'event_type' => 'task.completed',
                            'entity_type' => 'Task',
                            'entity_id' => (string) $refreshedTask['public_id'],
                            'metadata' => array('action_id' => $refreshedTask['action_id'] !== null ? (int) $refreshedTask['action_id'] : null),
                        );
                        // V11-03: a Task completes exactly once (completed
                        // is terminal in TASK_STATUS_TRANSITIONS, so there
                        // is no path back to in_progress afterward) -- always
                        // attempt=1, the Result's own (task_id, attempt)
                        // unique key makes a duplicate step-toggle race a
                        // no-op rather than a second row.
                        $executionResult = $this->executionResultService->recordForTask(
                            $identity->workspaceId,
                            $taskId,
                            true,
                            1,
                            strtotime((string) $refreshedTask['created_at']),
                            time()
                        );
                        $auditEvents[] = array(
                            'event_type' => 'execution_result.recorded',
                            'entity_type' => 'Task',
                            'entity_id' => (string) $refreshedTask['public_id'],
                            'metadata' => array('status' => (string) ($executionResult['status'] ?? 'success'), 'attempt' => 1),
                        );
                        if ($refreshedTask['action_id'] !== null) {
                            $this->actionRepository->updateStatus($identity->workspaceId, (int) $refreshedTask['action_id'], 'completed');
                            $auditEvents[] = array(
                                'event_type' => 'action.status_changed',
                                'entity_type' => 'Action',
                                'entity_id' => (string) $refreshedTask['action_id'],
                                'metadata' => array('to_status' => 'completed', 'reason' => 'task_completed'),
                            );
                        }
                        // V11-06: notify the task's assignee -- targeted at
                        // one recipient (not the whole workspace, unlike
                        // signal.detected), deduped per task (a task
                        // completes exactly once, so no re-notify risk).
                        if ($refreshedTask['assigned_member_id'] !== null) {
                            $this->notificationService->notify(
                                $identity->workspaceId,
                                'task.completed',
                                'info',
                                array((int) $refreshedTask['assigned_member_id']),
                                sprintf('任務已完成：%s', (string) $refreshedTask['title']),
                                '所有步驟皆已完成，可回到決策中心查看後續成果衡量。',
                                'Task',
                                (string) $taskId,
                                hash('sha256', 'task.completed:' . $taskId)
                            );
                        }
                    }
                }
            } elseif ($action === 'update_task') {
                $taskId = (int) ($input['task_id'] ?? 0);
                if ($taskId <= 0) throw new ValidationException('Task is required.');
                $task = $this->repository->findTaskById($identity->workspaceId, $taskId);
                if (!is_array($task) || (int) $task['recommendation_id'] !== $recommendationId) {
                    throw new NotFoundException('Task not found.');
                }

                $fields = array();

                if (array_key_exists('status', $input) && $input['status'] !== null && $input['status'] !== '') {
                    $requestedStatus = (string) $input['status'];
                    $currentStatus = (string) $task['status'];
                    $allowed = isset(self::TASK_STATUS_TRANSITIONS[$currentStatus]) ? self::TASK_STATUS_TRANSITIONS[$currentStatus] : array();
                    if (!in_array($requestedStatus, $allowed, true)) {
                        throw new ValidationException(sprintf('Cannot transition task from %s to %s.', $currentStatus, $requestedStatus));
                    }
                    $fields['status'] = $requestedStatus;
                }

                if (array_key_exists('assigned_member_id', $input) && $input['assigned_member_id'] !== null) {
                    $assigneeId = (int) $input['assigned_member_id'];
                    if ($assigneeId <= 0) throw new ValidationException('Invalid assignee.');
                    try {
                        (new WorkspaceAccessPolicy($this->database))->requireActiveMembership($identity->workspaceId, $assigneeId);
                    } catch (AuthorizationException $error) {
                        throw new ValidationException('Assignee must be an active member of this workspace.');
                    }
                    $fields['assigned_member_id'] = $assigneeId;
                }

                if (array_key_exists('due_at', $input)) {
                    $dueAt = $input['due_at'];
                    if ($dueAt === null || $dueAt === '') {
                        $fields['due_at'] = null;
                    } else {
                        $dueAt = str_replace('T', ' ', (string) $dueAt);
                        if (!preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $dueAt)) {
                            throw new ValidationException('Invalid due date format.');
                        }
                        $fields['due_at'] = $dueAt;
                    }
                }

                if (array_key_exists('completion_note', $input)) {
                    $note = trim((string) $input['completion_note']);
                    $fields['completion_note'] = $note !== '' ? $note : null;
                }

                if (count($fields) === 0) throw new ValidationException('No task fields to update.');

                $this->repository->updateTaskLifecycle($identity->workspaceId, $taskId, $fields);
                $auditEvents[] = array(
                    'event_type' => 'task.lifecycle_updated',
                    'entity_type' => 'Task',
                    'entity_id' => (string) $task['public_id'],
                    'metadata' => array('fields' => array_keys($fields)) + (isset($fields['status']) ? array('to_status' => $fields['status']) : array()),
                );

                if (isset($fields['status']) && $fields['status'] === 'cancelled' && $task['action_id'] !== null) {
                    $this->actionRepository->updateStatus($identity->workspaceId, (int) $task['action_id'], 'cancelled');
                    $auditEvents[] = array(
                        'event_type' => 'action.status_changed',
                        'entity_type' => 'Action',
                        'entity_id' => (string) $task['action_id'],
                        'metadata' => array('to_status' => 'cancelled', 'reason' => 'task_cancelled'),
                    );
                }
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
                $outcomeRow = $this->repository->measureOutcome(
                    $identity->workspaceId,
                    (int) $task['id'],
                    $current,
                    $this->compare($baseline, $current)
                );
                $auditEvents[] = array(
                    'event_type' => 'outcome.measured',
                    'entity_type' => 'BusinessOutcome',
                    'entity_id' => (string) $outcomeRow['public_id'],
                    'metadata' => array('task_id' => (int) $task['id']),
                );
                // V11-04: same real current-metrics dict, ALSO measured
                // against the formal per-metric baseline rows (if this
                // Action ever recorded one) -- fail-closed to 'unavailable'
                // per metric independently, never a fabricated value.
                if ($task['action_id'] !== null) {
                    $measuredMetrics = $this->businessOutcomeMetricService->recordMeasurementSet($identity->workspaceId, (int) $task['action_id'], $current);
                    if (count($measuredMetrics) > 0) {
                        $auditEvents[] = array(
                            'event_type' => 'outcome_metric.measured',
                            'entity_type' => 'Action',
                            'entity_id' => (string) $task['action_id'],
                            'metadata' => array('metric_keys' => array_keys($measuredMetrics)),
                        );
                    }
                }
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
                $auditEvents[] = array(
                    'event_type' => 'recommendation.refreshed',
                    'entity_type' => 'Recommendation',
                    'entity_id' => (string) $recommendation['public_id'],
                    'metadata' => array(),
                );
            } else {
                throw new ValidationException('Unsupported workflow action.');
            }

            foreach ($auditEvents as $event) {
                $metadata = $event['metadata'];
                $metadata['workflow_action'] = $action;
                $metadata['context_key'] = $contextKey;
                $this->auditLogger->record(
                    $identity->workspaceId,
                    $identity->memberId,
                    $event['event_type'],
                    $event['entity_type'],
                    $event['entity_id'],
                    $metadata,
                    $identity->nonce
                );
            }
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

    /** V11-01: Action's own lifecycle -- deliberately separate from Task's (see migrations/029's header). */
    private function normalizeAction(array $row): array
    {
        return array(
            'id' => (int) $row['id'],
            'public_id' => (string) $row['public_id'],
            'intent' => (string) $row['intent'],
            'status' => (string) $row['status'],
            'authorized_by_member_id' => (int) $row['authorized_by_member_id'],
            'revision' => (int) $row['revision'],
            'created_at' => (string) $row['created_at'],
        );
    }

    /** V11-04: formal per-metric Business Outcome row -- additive alongside the legacy `outcome` blob. */
    private function normalizeOutcomeMetric(array $row): array
    {
        return array(
            'metric_key' => (string) $row['metric_key'],
            'baseline_value' => (float) $row['baseline_value'],
            'baseline_captured_at' => (string) $row['baseline_captured_at'],
            'target_value' => $row['target_value'] !== null ? (float) $row['target_value'] : null,
            'measurement_window_days' => (int) $row['measurement_window_days'],
            'actual_value' => $row['actual_value'] !== null ? (float) $row['actual_value'] : null,
            'measured_at' => $row['measured_at'],
            'direction' => (string) $row['direction'],
            'status' => (string) $row['status'],
            'outcome_status' => (string) $row['outcome_status'],
            'source_type' => (string) $row['source_type'],
            'source_ref' => $row['source_ref'],
            'calculation_version' => (string) $row['calculation_version'],
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
