<?php

declare(strict_types=1);

namespace HighlightSignal\Dashboard;

use mysqli;

final class WorkflowRepository
{
    private $database;

    public function __construct(mysqli $database)
    {
        $this->database = $database;
    }

    public function findRecommendation(int $workspaceId, string $contextKey)
    {
        $statement = $this->database->prepare(
            'SELECT * FROM recommendations WHERE workspace_id = ? AND context_key = ? LIMIT 1'
        );
        $statement->bind_param('is', $workspaceId, $contextKey);
        $statement->execute();
        $row = $statement->get_result()->fetch_assoc();
        return is_array($row) ? $row : null;
    }

    public function saveRecommendation(int $workspaceId, string $contextKey, string $title, string $description): array
    {
        $existing = $this->findRecommendation($workspaceId, $contextKey);
        if (is_array($existing)) {
            $statement = $this->database->prepare(
                'UPDATE recommendations SET title = ?, description = ? WHERE id = ? AND workspace_id = ?'
            );
            $id = (int) $existing['id'];
            $statement->bind_param('ssii', $title, $description, $id, $workspaceId);
            $statement->execute();
            return $this->findRecommendation($workspaceId, $contextKey);
        }

        $publicId = $this->uuid();
        $statement = $this->database->prepare(
            "INSERT INTO recommendations (public_id, workspace_id, context_key, source, title, description)
             VALUES (?, ?, ?, 'dashboard', ?, ?)"
        );
        $statement->bind_param('sisss', $publicId, $workspaceId, $contextKey, $title, $description);
        $statement->execute();
        return $this->findRecommendation($workspaceId, $contextKey);
    }

    public function recordDecision(int $workspaceId, int $recommendationId, int $memberId, string $decision)
    {
        $publicId = $this->uuid();
        $statement = $this->database->prepare(
            'INSERT INTO decisions (public_id, workspace_id, recommendation_id, actor_member_id, decision)
             VALUES (?, ?, ?, ?, ?)'
        );
        $statement->bind_param('siiis', $publicId, $workspaceId, $recommendationId, $memberId, $decision);
        $statement->execute();

        $update = $this->database->prepare(
            'UPDATE recommendations SET status = ? WHERE id = ? AND workspace_id = ?'
        );
        $update->bind_param('sii', $decision, $recommendationId, $workspaceId);
        $update->execute();
    }

    public function latestDecision(int $workspaceId, int $recommendationId)
    {
        $statement = $this->database->prepare(
            'SELECT public_id, decision, actor_member_id, note, created_at
             FROM decisions WHERE workspace_id = ? AND recommendation_id = ?
             ORDER BY id DESC LIMIT 1'
        );
        $statement->bind_param('ii', $workspaceId, $recommendationId);
        $statement->execute();
        $row = $statement->get_result()->fetch_assoc();
        return is_array($row) ? $row : null;
    }

    public function findTask(int $workspaceId, int $recommendationId)
    {
        $statement = $this->database->prepare(
            'SELECT * FROM tasks WHERE workspace_id = ? AND recommendation_id = ? LIMIT 1'
        );
        $statement->bind_param('ii', $workspaceId, $recommendationId);
        $statement->execute();
        $row = $statement->get_result()->fetch_assoc();
        return is_array($row) ? $row : null;
    }

    public function createTask(int $workspaceId, int $recommendationId, int $memberId, string $title, string $description, array $steps): array
    {
        $existing = $this->findTask($workspaceId, $recommendationId);
        if (is_array($existing)) return $existing;

        $publicId = $this->uuid();
        $statement = $this->database->prepare(
            'INSERT INTO tasks (public_id, workspace_id, recommendation_id, title, description, created_by_member_id, assigned_member_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $statement->bind_param('siissii', $publicId, $workspaceId, $recommendationId, $title, $description, $memberId, $memberId);
        $statement->execute();
        $taskId = (int) $statement->insert_id;

        $insertStep = $this->database->prepare(
            'INSERT INTO task_steps (task_id, title, description, sort_order) VALUES (?, ?, ?, ?)'
        );
        foreach ($steps as $index => $step) {
            $stepTitle = (string) $step['title'];
            $stepDescription = (string) ($step['description'] ?? '');
            $sortOrder = $index + 1;
            $insertStep->bind_param('issi', $taskId, $stepTitle, $stepDescription, $sortOrder);
            $insertStep->execute();
        }

        return $this->findTask($workspaceId, $recommendationId);
    }

    public function listSteps(int $taskId): array
    {
        $statement = $this->database->prepare(
            'SELECT id, title, description, sort_order, status, completed_at
             FROM task_steps WHERE task_id = ? ORDER BY sort_order, id'
        );
        $statement->bind_param('i', $taskId);
        $statement->execute();
        return $statement->get_result()->fetch_all(MYSQLI_ASSOC);
    }

    public function updateStep(int $workspaceId, int $taskId, int $stepId, bool $completed)
    {
        $status = $completed ? 'completed' : 'pending';
        $statement = $this->database->prepare(
            "UPDATE task_steps s INNER JOIN tasks t ON t.id = s.task_id
             SET s.status = ?, s.completed_at = IF(? = 1, NOW(), NULL)
             WHERE s.id = ? AND s.task_id = ? AND t.workspace_id = ?"
        );
        $completedValue = $completed ? 1 : 0;
        $statement->bind_param('siiii', $status, $completedValue, $stepId, $taskId, $workspaceId);
        $statement->execute();

        $updateTask = $this->database->prepare(
            "UPDATE tasks t SET
               t.status = IF((SELECT COUNT(*) FROM task_steps s WHERE s.task_id = t.id AND s.status <> 'completed') = 0, 'completed', 'in_progress'),
               t.completed_at = IF((SELECT COUNT(*) FROM task_steps s WHERE s.task_id = t.id AND s.status <> 'completed') = 0, NOW(), NULL)
             WHERE t.id = ? AND t.workspace_id = ?"
        );
        $updateTask->bind_param('ii', $taskId, $workspaceId);
        $updateTask->execute();

        $updateOutcome = $this->database->prepare(
            "UPDATE business_outcomes o INNER JOIN tasks t ON t.id = o.task_id
             SET o.status = IF(t.status = 'completed', 'awaiting_measurement', 'awaiting_execution')
             WHERE o.task_id = ? AND o.workspace_id = ?"
        );
        $updateOutcome->bind_param('ii', $taskId, $workspaceId);
        $updateOutcome->execute();
    }

    public function createOutcome(int $workspaceId, int $taskId, array $baseline): array
    {
        $existing = $this->getOutcome($workspaceId, $taskId);
        if (is_array($existing)) return $existing;

        $publicId = $this->uuid();
        $baselineJson = json_encode($baseline, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $statement = $this->database->prepare(
            'INSERT INTO business_outcomes (public_id, workspace_id, task_id, baseline_metrics_TEXT)
             VALUES (?, ?, ?, ?)'
        );
        $statement->bind_param('siis', $publicId, $workspaceId, $taskId, $baselineJson);
        $statement->execute();
        return $this->getOutcome($workspaceId, $taskId);
    }

    public function getOutcome(int $workspaceId, int $taskId)
    {
        $statement = $this->database->prepare(
            'SELECT * FROM business_outcomes WHERE workspace_id = ? AND task_id = ? LIMIT 1'
        );
        $statement->bind_param('ii', $workspaceId, $taskId);
        $statement->execute();
        $row = $statement->get_result()->fetch_assoc();
        return is_array($row) ? $row : null;
    }

    public function measureOutcome(int $workspaceId, int $taskId, array $metrics, array $result): array
    {
        $metricsJson = json_encode($metrics, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $resultJson = json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $status = 'measured';
        $statement = $this->database->prepare(
            'UPDATE business_outcomes SET status = ?, measured_metrics_TEXT = ?, result_TEXT = ?, measured_at = NOW()
             WHERE workspace_id = ? AND task_id = ?'
        );
        $statement->bind_param('sssii', $status, $metricsJson, $resultJson, $workspaceId, $taskId);
        $statement->execute();
        return $this->getOutcome($workspaceId, $taskId);
    }

    private function uuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
        $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
