<?php

declare(strict_types=1);

namespace HighlightSignal\Dashboard;

use HighlightSignal\Auth\ServiceIdentity;
use HighlightSignal\Http\NotFoundException;
use HighlightSignal\Http\ValidationException;
use mysqli;

final class WorkflowService
{
    private $database;
    private $repository;

    public function __construct(mysqli $database, WorkflowRepository $repository)
    {
        $this->database = $database;
        $this->repository = $repository;
    }

    public function get(int $workspaceId, string $contextKey): array
    {
        $recommendation = $this->repository->findRecommendation($workspaceId, $contextKey);
        if (!is_array($recommendation)) {
            return array('context_key' => $contextKey, 'recommendation' => null, 'decision' => null, 'task' => null, 'outcome' => null);
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
            $recommendation = $this->repository->saveRecommendation(
                $identity->workspaceId,
                $contextKey,
                $title,
                $description
            );
            $recommendationId = (int) $recommendation['id'];

            if ($action === 'save_decision') {
                $decision = (string) ($input['decision'] ?? '');
                if (!in_array($decision, array('accepted', 'skipped'), true)) {
                    throw new ValidationException('Decision must be accepted or skipped.');
                }
                $this->repository->recordDecision($identity->workspaceId, $recommendationId, $identity->memberId, $decision);
            } elseif ($action === 'create_task') {
                $steps = isset($input['steps']) && is_array($input['steps']) ? $input['steps'] : array();
                if (count($steps) === 0 || count($steps) > 20) throw new ValidationException('Task steps are required.');
                foreach ($steps as $step) {
                    if (!is_array($step) || trim((string) ($step['title'] ?? '')) === '') {
                        throw new ValidationException('Every task step requires a title.');
                    }
                }
                $this->repository->recordDecision($identity->workspaceId, $recommendationId, $identity->memberId, 'accepted');
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
        return array(
            'id' => (int) $row['id'],
            'public_id' => (string) $row['public_id'],
            'context_key' => (string) $row['context_key'],
            'title' => (string) $row['title'],
            'description' => (string) ($row['description'] ?? ''),
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
