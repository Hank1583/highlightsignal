<?php

declare(strict_types=1);

namespace HighlightSignal\Outcome;

use mysqli;

/**
 * V11-04: persistence only. `business_outcome_metrics` is additive,
 * alongside the legacy `business_outcomes` table (migrations/012, unchanged
 * by this task) -- see migrations/033's header for the full reasoning.
 */
final class BusinessOutcomeMetricRepository
{
    private $database;

    public function __construct(mysqli $database)
    {
        $this->database = $database;
    }

    public function findByActionMetric(int $workspaceId, int $actionId, string $metricKey)
    {
        $statement = $this->database->prepare(
            'SELECT * FROM business_outcome_metrics WHERE workspace_id = ? AND action_id = ? AND metric_key = ? LIMIT 1'
        );
        $statement->bind_param('iis', $workspaceId, $actionId, $metricKey);
        $statement->execute();
        $row = $statement->get_result()->fetch_assoc();
        return is_array($row) ? $row : null;
    }

    /**
     * Write-once baseline: `UNIQUE(action_id, metric_key)` plus this
     * early-return means a resubmitted baseline for the same Action+metric
     * is a no-op returning the ORIGINAL row -- "baseline 必須...鎖定" is a
     * real guarantee, not just a convention.
     *
     * @param mixed $targetValue float|null
     */
    public function createBaseline(
        int $workspaceId,
        int $actionId,
        string $metricKey,
        float $baselineValue,
        string $direction,
        string $sourceType,
        $sourceRef,
        int $measurementWindowDays,
        string $calculationVersion
    ): array {
        $existing = $this->findByActionMetric($workspaceId, $actionId, $metricKey);
        if (is_array($existing)) {
            return $existing;
        }

        $publicId = $this->uuid();
        $statement = $this->database->prepare(
            'INSERT INTO business_outcome_metrics (
                public_id, workspace_id, action_id, metric_key, baseline_value, baseline_captured_at,
                measurement_window_days, direction, source_type, source_ref, calculation_version
            ) VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?)'
        );
        $statement->bind_param(
            'siisdissss',
            $publicId,
            $workspaceId,
            $actionId,
            $metricKey,
            $baselineValue,
            $measurementWindowDays,
            $direction,
            $sourceType,
            $sourceRef,
            $calculationVersion
        );
        $statement->execute();

        return $this->findByActionMetric($workspaceId, $actionId, $metricKey);
    }

    /** @param mixed $actualValue float|null -- null means status must be 'unavailable' */
    public function recordMeasurement(
        int $workspaceId,
        int $actionId,
        string $metricKey,
        $actualValue,
        string $outcomeStatus,
        string $status
    ): array {
        $statement = $this->database->prepare(
            'UPDATE business_outcome_metrics
             SET actual_value = ?, measured_at = NOW(), outcome_status = ?, status = ?
             WHERE workspace_id = ? AND action_id = ? AND metric_key = ?'
        );
        $statement->bind_param('dssiis', $actualValue, $outcomeStatus, $status, $workspaceId, $actionId, $metricKey);
        $statement->execute();

        return $this->findByActionMetric($workspaceId, $actionId, $metricKey);
    }

    /** @return array<int, array> */
    public function listForAction(int $workspaceId, int $actionId): array
    {
        $statement = $this->database->prepare(
            'SELECT * FROM business_outcome_metrics WHERE workspace_id = ? AND action_id = ? ORDER BY metric_key'
        );
        $statement->bind_param('ii', $workspaceId, $actionId);
        $statement->execute();
        return $statement->get_result()->fetch_all(MYSQLI_ASSOC);
    }

    /** @return array{items: array<int, array>, total: int} */
    public function listForWorkspace(int $workspaceId, array $filters, int $page, int $perPage): array
    {
        $conditions = array('workspace_id = ?');
        $types = 'i';
        $params = array($workspaceId);

        if (isset($filters['status']) && $filters['status'] !== '') {
            $conditions[] = 'status = ?';
            $types .= 's';
            $params[] = (string) $filters['status'];
        }

        $where = implode(' AND ', $conditions);
        $offset = max(0, ($page - 1) * $perPage);

        $countStatement = $this->database->prepare("SELECT COUNT(*) AS total FROM business_outcome_metrics WHERE $where");
        $this->bindDynamic($countStatement, $types, $params);
        $countStatement->execute();
        $total = (int) ($countStatement->get_result()->fetch_assoc()['total'] ?? 0);

        $listStatement = $this->database->prepare(
            "SELECT * FROM business_outcome_metrics WHERE $where ORDER BY updated_at DESC LIMIT ? OFFSET ?"
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
