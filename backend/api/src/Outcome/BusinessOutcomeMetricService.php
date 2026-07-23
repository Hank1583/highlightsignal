<?php

declare(strict_types=1);

namespace HighlightSignal\Outcome;

/**
 * V11-04: business rules for the formal, Action-linked, multi-metric
 * Business Outcome. Reuses the SAME 4-key metrics dict
 * (`sessions`/`conversions`/`seo_score`/`seo_issues`) already collected by
 * `WorkflowService::metrics()` for the legacy `business_outcomes` blob --
 * this is real GA/SEO data already flowing through the Dashboard today, not
 * synthetic numbers invented for this task.
 */
final class BusinessOutcomeMetricService
{
    const CALCULATION_VERSION = 'outcome-v1';
    const MEASUREMENT_WINDOW_DAYS = 30;

    // Which direction counts as improvement, and which real source each
    // legacy metric key actually comes from -- both are facts about the
    // metric itself, not a per-call choice.
    const METRIC_DEFINITIONS = array(
        'sessions' => array('key' => 'ga.sessions', 'direction' => 'increase', 'source' => 'ga'),
        'conversions' => array('key' => 'ga.conversions', 'direction' => 'increase', 'source' => 'ga'),
        'seo_score' => array('key' => 'seo.health_score', 'direction' => 'increase', 'source' => 'seo'),
        'seo_issues' => array('key' => 'seo.issues', 'direction' => 'decrease', 'source' => 'seo'),
    );

    // Within this band, a change is noise, not a real improvement/regression.
    const FLAT_BAND_PERCENT = 2.0;

    private $repository;

    public function __construct(BusinessOutcomeMetricRepository $repository)
    {
        $this->repository = $repository;
    }

    /**
     * @param array<string, float> $baseline the same dict WorkflowService::metrics() produces
     * @param mixed $sourceRef string|null
     * @return array<string, array> metric_key => row
     */
    public function recordBaselineSet(int $workspaceId, int $actionId, array $baseline, $sourceRef = null): array
    {
        $results = array();
        foreach ($baseline as $legacyKey => $value) {
            if (!isset(self::METRIC_DEFINITIONS[$legacyKey])) {
                continue;
            }
            $definition = self::METRIC_DEFINITIONS[$legacyKey];
            $results[$definition['key']] = $this->repository->createBaseline(
                $workspaceId,
                $actionId,
                $definition['key'],
                (float) $value,
                $definition['direction'],
                $definition['source'],
                $sourceRef,
                self::MEASUREMENT_WINDOW_DAYS,
                self::CALCULATION_VERSION
            );
        }
        return $results;
    }

    /**
     * @param array<string, float> $current the same dict WorkflowService::metrics() produces
     * @return array<string, array> metric_key => row (only for metrics that have a recorded baseline)
     */
    public function recordMeasurementSet(int $workspaceId, int $actionId, array $current): array
    {
        $results = array();
        foreach ($current as $legacyKey => $value) {
            if (!isset(self::METRIC_DEFINITIONS[$legacyKey])) {
                continue;
            }
            $metricKey = self::METRIC_DEFINITIONS[$legacyKey]['key'];
            $baselineRow = $this->repository->findByActionMetric($workspaceId, $actionId, $metricKey);
            if (!is_array($baselineRow)) {
                // No baseline was ever recorded for this metric on this
                // Action -- nothing to compare against, silently skipped
                // (not every Action baselines every metric).
                continue;
            }

            $baselineValue = (float) $baselineRow['baseline_value'];
            $direction = (string) $baselineRow['direction'];
            $actualValue = (float) $value;

            // Fail-closed: a meaningfully-positive baseline with a
            // non-positive current reading means the data source itself is
            // unavailable right now (e.g. GA query failed silently upstream
            // and returned 0) -- never recorded as a fabricated 100%
            // regression.
            if ($baselineValue > 0 && $actualValue <= 0) {
                $results[$metricKey] = $this->repository->recordMeasurement(
                    $workspaceId,
                    $actionId,
                    $metricKey,
                    null,
                    'unknown',
                    'unavailable'
                );
                continue;
            }

            $outcomeStatus = $this->computeOutcomeStatus($direction, $baselineValue, $actualValue);
            $results[$metricKey] = $this->repository->recordMeasurement(
                $workspaceId,
                $actionId,
                $metricKey,
                $actualValue,
                $outcomeStatus,
                'measured'
            );
        }
        return $results;
    }

    public function listForAction(int $workspaceId, int $actionId): array
    {
        return $this->repository->listForAction($workspaceId, $actionId);
    }

    public function listForWorkspace(int $workspaceId, array $filters, int $page, int $perPage): array
    {
        $page = max(1, $page);
        $perPage = max(1, min(100, $perPage));
        return $this->repository->listForWorkspace($workspaceId, $filters, $page, $perPage);
    }

    private function computeOutcomeStatus(string $direction, float $baseline, float $actual): string
    {
        if ($baseline == 0.0) {
            return 'unknown';
        }

        $changePercent = (($actual - $baseline) / abs($baseline)) * 100;
        if (abs($changePercent) < self::FLAT_BAND_PERCENT) {
            return 'flat';
        }

        $improved = $direction === 'increase' ? $actual > $baseline : $actual < $baseline;
        return $improved ? 'improved' : 'regressed';
    }
}
