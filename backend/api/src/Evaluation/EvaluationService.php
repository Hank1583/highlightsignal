<?php

declare(strict_types=1);

namespace HighlightSignal\Evaluation;

use HighlightSignal\Audit\AuditLogger;
use HighlightSignal\Http\ValidationException;
use mysqli;

/**
 * V11-05: computes the Basic Learning closed-loop metrics (spec: 05
 * Learning Framework, bounded by Alignment v1.2) -- recommendation
 * adoption, decision outcome, task completion, outcome achievement,
 * time-to-decision, time-to-outcome -- and records human Feedback.
 *
 * STRUCTURAL GUARANTEE, not just a convention: nothing in this class (or
 * anywhere else in this codebase) reads an Evaluation row to create a
 * Decision, Action, or modify a Recommendation/model/threshold. This class
 * only ever WRITES evaluations and human feedback, and READS them back for
 * reporting -- it has no dependency on WorkflowRepository/ActionRepository/
 * SignalRepository write paths, which makes "no autonomous path exists" a
 * fact about the dependency graph, not just a code-review promise.
 */
final class EvaluationService
{
    const CALCULATION_VERSION = 'evaluation-v1';

    const SUBJECT_RECOMMENDATION = 'Recommendation';
    const SUBJECT_DECISION = 'Decision';
    const SUBJECT_TASK = 'Task';
    const SUBJECT_ACTION = 'Action';

    // A change smaller than this (hours, or outcome-achievement ratio) is
    // not worth a new append-only row -- avoids one new row every single
    // time get() happens to re-run this computation with a sub-second
    // timing difference.
    const TIME_METRIC_EPSILON_HOURS = 0.01;

    private $repository;
    private $database;
    private $auditLogger;

    public function __construct(EvaluationRepository $repository, mysqli $database)
    {
        $this->repository = $repository;
        $this->database = $database;
        $this->auditLogger = new AuditLogger($database);
    }

    /**
     * @param mixed $decision string|null the Recommendation's latest Decision outcome, or null if none yet
     * @return array|null
     */
    public function evaluateRecommendationAdoption(int $workspaceId, int $recommendationId, $decision)
    {
        $rating = $this->adoptionRatingFor($decision);
        return $this->recordIfChanged($workspaceId, self::SUBJECT_RECOMMENDATION, $recommendationId, 'recommendation.adoption', $rating, null, null);
    }

    /** @return array|null */
    public function evaluateDecisionOutcome(int $workspaceId, int $decisionId, string $decisionValue)
    {
        return $this->recordIfChanged($workspaceId, self::SUBJECT_DECISION, $decisionId, 'decision.outcome', $decisionValue, null, null);
    }

    /** @return array|null */
    public function evaluateTaskCompletion(int $workspaceId, int $taskId, string $taskStatus)
    {
        return $this->recordIfChanged($workspaceId, self::SUBJECT_TASK, $taskId, 'task.completion', $taskStatus, null, null);
    }

    /**
     * Aggregates V11-04's per-metric `outcome_status` values for one Action
     * into a single achievement rating -- majority improved => achieved,
     * majority regressed => not_achieved, mixed/tied => partial, nothing
     * measured yet => unknown (fail-closed, not guessed).
     *
     * @param array<int, array{outcome_status: string}> $outcomeMetrics
     * @return array|null
     */
    public function evaluateActionOutcomeAchievement(int $workspaceId, int $actionId, array $outcomeMetrics)
    {
        $measured = array_values(array_filter($outcomeMetrics, static function ($metric) {
            return $metric['outcome_status'] !== 'unknown';
        }));

        if (count($measured) === 0) {
            return $this->recordIfChanged($workspaceId, self::SUBJECT_ACTION, $actionId, 'outcome.achievement', 'unknown', null, null);
        }

        $improved = count(array_filter($measured, static function ($m) { return $m['outcome_status'] === 'improved'; }));
        $regressed = count(array_filter($measured, static function ($m) { return $m['outcome_status'] === 'regressed'; }));

        if ($improved > $regressed) {
            $rating = 'achieved';
        } elseif ($regressed > $improved) {
            $rating = 'not_achieved';
        } else {
            $rating = 'partial';
        }

        return $this->recordIfChanged($workspaceId, self::SUBJECT_ACTION, $actionId, 'outcome.achievement', $rating, (float) count($measured), null);
    }

    /** @return array|null */
    public function evaluateTimeToDecision(int $workspaceId, int $recommendationId, int $recommendationCreatedAtUnix, int $decisionCreatedAtUnix)
    {
        $hours = max(0.0, ($decisionCreatedAtUnix - $recommendationCreatedAtUnix) / 3600.0);
        return $this->recordIfChangedNumeric($workspaceId, self::SUBJECT_RECOMMENDATION, $recommendationId, 'time_to_decision', $hours);
    }

    /** @return array|null */
    public function evaluateTimeToOutcome(int $workspaceId, int $actionId, int $actionCreatedAtUnix, int $firstMeasuredAtUnix)
    {
        $hours = max(0.0, ($firstMeasuredAtUnix - $actionCreatedAtUnix) / 3600.0);
        return $this->recordIfChangedNumeric($workspaceId, self::SUBJECT_ACTION, $actionId, 'time_to_outcome', $hours);
    }

    /**
     * Human Feedback -- always a real append-only event (not idempotent
     * unless the caller explicitly supplies a key), requires a real
     * `actor_member_id` (structurally cannot be recorded by a
     * system/automated path, since this is the only method that writes
     * `source='human'` rows and it always requires a real member id > 0).
     *
     * @param mixed $value float|null; $idempotencyKey string|null
     */
    public function recordFeedback(
        int $workspaceId,
        string $subjectType,
        int $subjectId,
        int $actorMemberId,
        string $rating,
        string $reason,
        $value = null,
        $idempotencyKey = null
    ): array {
        if ($actorMemberId <= 0) {
            throw new ValidationException('Feedback requires a real actor.');
        }
        if (!in_array($subjectType, array(self::SUBJECT_RECOMMENDATION, self::SUBJECT_DECISION, self::SUBJECT_TASK, self::SUBJECT_ACTION), true)) {
            throw new ValidationException('Invalid feedback subject_type.');
        }
        if (trim($rating) === '') {
            throw new ValidationException('Feedback rating is required.');
        }

        // A replay matching an existing idempotency_key is a no-op (the
        // repository returns the ORIGINAL row without inserting) -- checked
        // here, before the transaction, so that case skips the audit call
        // below entirely rather than writing a fresh audit row for
        // something that did not actually change anything.
        $isReplay = $idempotencyKey !== null && is_array($this->repository->findByIdempotencyKey($workspaceId, (string) $idempotencyKey));

        $this->database->begin_transaction();
        try {
            $row = $this->repository->insertHumanFeedback(
                $workspaceId,
                $subjectType,
                $subjectId,
                $actorMemberId,
                $rating,
                $reason,
                $value,
                $idempotencyKey
            );
            if (!$isReplay) {
                // V11-07: the one genuinely human-initiated mutation in this
                // class (see class doc's structural guarantee) had zero
                // audit coverage before this task.
                $this->auditLogger->record(
                    $workspaceId,
                    $actorMemberId,
                    'evaluation.feedback_recorded',
                    'Evaluation',
                    (string) $row['public_id'],
                    array('subject_type' => $subjectType, 'subject_id' => $subjectId, 'rating' => $rating)
                );
            }
            $this->database->commit();
            return $row;
        } catch (\Throwable $error) {
            $this->database->rollback();
            throw $error;
        }
    }

    public function listForSubject(int $workspaceId, string $subjectType, int $subjectId): array
    {
        return $this->repository->listForSubject($workspaceId, $subjectType, $subjectId);
    }

    public function listForWorkspace(int $workspaceId, array $filters, int $page, int $perPage): array
    {
        $page = max(1, $page);
        $perPage = max(1, min(100, $perPage));
        return $this->repository->listForWorkspace($workspaceId, $filters, $page, $perPage);
    }

    private function adoptionRatingFor($decision): string
    {
        if ($decision === null) {
            return 'pending';
        }
        if (in_array($decision, array('accepted', 'modified'), true)) {
            return 'adopted';
        }
        if (in_array($decision, array('rejected', 'skipped'), true)) {
            return 'not_adopted';
        }
        return 'pending'; // deferred / needs_more_evidence -- not yet resolved
    }

    /**
     * @param mixed $value float|null; $reason string|null
     * @return array|null
     */
    private function recordIfChanged(int $workspaceId, string $subjectType, int $subjectId, string $metricKey, string $rating, $value, $reason)
    {
        $latest = $this->repository->findLatestSystemEvaluation($workspaceId, $subjectType, $subjectId, $metricKey);
        if (is_array($latest) && (string) $latest['rating'] === $rating) {
            return $latest;
        }

        return $this->repository->insertSystemEvaluation($workspaceId, $subjectType, $subjectId, $metricKey, $rating, $value, $reason, self::CALCULATION_VERSION);
    }

    /** @return array|null */
    private function recordIfChangedNumeric(int $workspaceId, string $subjectType, int $subjectId, string $metricKey, float $hours)
    {
        $latest = $this->repository->findLatestSystemEvaluation($workspaceId, $subjectType, $subjectId, $metricKey);
        if (is_array($latest) && $latest['value'] !== null && abs((float) $latest['value'] - $hours) < self::TIME_METRIC_EPSILON_HOURS) {
            return $latest;
        }

        $rating = $hours < 24 ? 'same_day' : ($hours < 168 ? 'same_week' : 'over_a_week');
        return $this->repository->insertSystemEvaluation($workspaceId, $subjectType, $subjectId, $metricKey, $rating, $hours, null, self::CALCULATION_VERSION);
    }
}
