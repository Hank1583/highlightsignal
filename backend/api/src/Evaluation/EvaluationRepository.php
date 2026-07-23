<?php

declare(strict_types=1);

namespace HighlightSignal\Evaluation;

use mysqli;

/**
 * V11-05: persistence only. `evaluations` holds BOTH system Evaluation and
 * human Feedback rows (`source` discriminates), append-only -- see
 * migrations/034's header for the full reasoning. No FK on `subject_id`
 * (polymorphic across Recommendation/Decision/Task/Action) -- every method
 * here is workspace-scoped, which is the real integrity boundary.
 */
final class EvaluationRepository
{
    private $database;

    public function __construct(mysqli $database)
    {
        $this->database = $database;
    }

    public function findLatestSystemEvaluation(int $workspaceId, string $subjectType, int $subjectId, string $metricKey)
    {
        $statement = $this->database->prepare(
            "SELECT * FROM evaluations
             WHERE workspace_id = ? AND subject_type = ? AND subject_id = ? AND source = 'system' AND metric_key = ?
             ORDER BY id DESC LIMIT 1"
        );
        $statement->bind_param('isis', $workspaceId, $subjectType, $subjectId, $metricKey);
        $statement->execute();
        $row = $statement->get_result()->fetch_assoc();
        return is_array($row) ? $row : null;
    }

    public function findByIdempotencyKey(int $workspaceId, string $idempotencyKey)
    {
        $statement = $this->database->prepare(
            'SELECT * FROM evaluations WHERE workspace_id = ? AND idempotency_key = ? LIMIT 1'
        );
        $statement->bind_param('is', $workspaceId, $idempotencyKey);
        $statement->execute();
        $row = $statement->get_result()->fetch_assoc();
        return is_array($row) ? $row : null;
    }

    /**
     * Always a plain INSERT (append-only) -- the Service decides whether
     * this is worth inserting at all (only when the computed value
     * genuinely changed since the last system evaluation for this
     * subject+metric).
     *
     * @param mixed $value float|null; $reason string|null
     */
    public function insertSystemEvaluation(
        int $workspaceId,
        string $subjectType,
        int $subjectId,
        string $metricKey,
        string $rating,
        $value,
        $reason,
        string $calculationVersion
    ): array {
        $publicId = $this->uuid();
        $statement = $this->database->prepare(
            "INSERT INTO evaluations (
                public_id, workspace_id, subject_type, subject_id, source, metric_key, rating, value, reason, calculation_version
            ) VALUES (?, ?, ?, ?, 'system', ?, ?, ?, ?, ?)"
        );
        $statement->bind_param(
            'sisissdss',
            $publicId,
            $workspaceId,
            $subjectType,
            $subjectId,
            $metricKey,
            $rating,
            $value,
            $reason,
            $calculationVersion
        );
        $statement->execute();

        return $this->findByPublicId($workspaceId, $publicId);
    }

    /**
     * Human Feedback -- always a new row (append/supersede, never
     * overwritten); idempotent only when the caller supplies a key AND it
     * matches a prior submission (same opt-in pattern as
     * `decisions.idempotency_key`).
     *
     * @param mixed $value float|null; $idempotencyKey string|null
     */
    public function insertHumanFeedback(
        int $workspaceId,
        string $subjectType,
        int $subjectId,
        int $actorMemberId,
        string $rating,
        string $reason,
        $value,
        $idempotencyKey
    ): array {
        if ($idempotencyKey !== null) {
            $existing = $this->findByIdempotencyKey($workspaceId, $idempotencyKey);
            if (is_array($existing)) {
                return $existing;
            }
        }

        $publicId = $this->uuid();
        $statement = $this->database->prepare(
            "INSERT INTO evaluations (
                public_id, workspace_id, subject_type, subject_id, source, actor_member_id, rating, value, reason, idempotency_key
            ) VALUES (?, ?, ?, ?, 'human', ?, ?, ?, ?, ?)"
        );
        $statement->bind_param(
            'sisiisdss',
            $publicId,
            $workspaceId,
            $subjectType,
            $subjectId,
            $actorMemberId,
            $rating,
            $value,
            $reason,
            $idempotencyKey
        );
        $statement->execute();

        return $this->findByPublicId($workspaceId, $publicId);
    }

    public function findByPublicId(int $workspaceId, string $publicId)
    {
        $statement = $this->database->prepare(
            'SELECT * FROM evaluations WHERE workspace_id = ? AND public_id = ? LIMIT 1'
        );
        $statement->bind_param('is', $workspaceId, $publicId);
        $statement->execute();
        $row = $statement->get_result()->fetch_assoc();
        return is_array($row) ? $row : null;
    }

    /** @return array<int, array> newest first -- the full append-only history for one subject. */
    public function listForSubject(int $workspaceId, string $subjectType, int $subjectId): array
    {
        $statement = $this->database->prepare(
            'SELECT * FROM evaluations WHERE workspace_id = ? AND subject_type = ? AND subject_id = ? ORDER BY id DESC'
        );
        $statement->bind_param('isi', $workspaceId, $subjectType, $subjectId);
        $statement->execute();
        return $statement->get_result()->fetch_all(MYSQLI_ASSOC);
    }

    /** @return array{items: array<int, array>, total: int} */
    public function listForWorkspace(int $workspaceId, array $filters, int $page, int $perPage): array
    {
        $conditions = array('workspace_id = ?');
        $types = 'i';
        $params = array($workspaceId);

        if (isset($filters['subject_type']) && $filters['subject_type'] !== '') {
            $conditions[] = 'subject_type = ?';
            $types .= 's';
            $params[] = (string) $filters['subject_type'];
        }
        if (isset($filters['source']) && $filters['source'] !== '') {
            $conditions[] = 'source = ?';
            $types .= 's';
            $params[] = (string) $filters['source'];
        }

        $where = implode(' AND ', $conditions);
        $offset = max(0, ($page - 1) * $perPage);

        $countStatement = $this->database->prepare("SELECT COUNT(*) AS total FROM evaluations WHERE $where");
        $this->bindDynamic($countStatement, $types, $params);
        $countStatement->execute();
        $total = (int) ($countStatement->get_result()->fetch_assoc()['total'] ?? 0);

        $listStatement = $this->database->prepare(
            "SELECT * FROM evaluations WHERE $where ORDER BY id DESC LIMIT ? OFFSET ?"
        );
        $listTypes = $types . 'ii';
        $listParams = $params;
        $listParams[] = $perPage;
        $listParams[] = $offset;
        $this->bindDynamic($listStatement, $listTypes, $listParams);
        $listStatement->execute();
        $items = $listStatement->get_result()->fetch_all(MYSQLI_ASSOC);

        return array('items' => $items, 'total' => $total);
    }

    private function bindDynamic(\mysqli_stmt $statement, string $types, array $params)
    {
        $arguments = array($types);
        foreach ($params as $index => $value) {
            $arguments[] = &$params[$index];
        }
        call_user_func_array(array($statement, 'bind_param'), $arguments);
    }

    private function uuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
        $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
