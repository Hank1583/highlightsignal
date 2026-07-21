<?php

declare(strict_types=1);

namespace HighlightSignal\Signal\Detector;

/**
 * V10-07: first GA detection rule, proving the Signal/Evidence pipeline
 * generalizes beyond SEO (V10-01's SeoTechnicalIssueDetector) without any
 * change to the shared `signals`/`evidence_items` schema or to
 * SignalService/EvidenceService's persistence layer -- only a new detector
 * plus a new call site in `ga/data_sync.php`.
 *
 * Deliberately stateless, same discipline as SeoTechnicalIssueDetector: no
 * database access. The caller supplies the day's observed sessions and a
 * trailing baseline average it already has to compute (from
 * `ga_daily_summary`) -- this class only turns that into a dedup/severity
 * decision, exactly the "source observation -> stable Signal DTO" Adapter
 * boundary the task packet asks for.
 *
 * Emits at most ONE upsert item per connection (unlike SEO, which can have
 * many concurrent issue types) -- this is a real, narrower first GA rule
 * (traffic-drop only), not a placeholder; more GA anomaly types are a later,
 * additive task, the same way SEO started with only technical issues in
 * V10-01.
 */
final class GaTrafficAnomalyDetector
{
    const DROP_HIGH_THRESHOLD_PERCENT = 50.0;
    const DROP_MEDIUM_THRESHOLD_PERCENT = 25.0;

    // Below this trailing average, percentage swings are noise (e.g. 2
    // sessions/day dropping to 1 is a "50% drop" that means nothing) -- never
    // flag, never resolve, same fail-closed spirit as V10-03's
    // insufficient_evidence state.
    const MIN_BASELINE_SESSIONS = 10.0;

    // Fewer days of history than this and there is no real trailing baseline
    // yet (e.g. a connection synced for the first time) -- do not guess.
    const MIN_BASELINE_DAYS = 3;

    /**
     * @return array{to_upsert: array<int, array<string, mixed>>, to_resolve: array<int, string>}
     */
    public function diff(
        int $connectionId,
        string $accountName,
        float $currentSessions,
        float $baselineAvgSessions,
        int $baselineDayCount
    ): array {
        $dedupKey = self::computeDedupKey($connectionId);

        if ($baselineDayCount < self::MIN_BASELINE_DAYS || $baselineAvgSessions < self::MIN_BASELINE_SESSIONS) {
            // Not enough history to judge either way -- deliberately a no-op
            // (neither upsert nor resolve) rather than guessing.
            return array('to_upsert' => array(), 'to_resolve' => array());
        }

        $dropPercent = (($baselineAvgSessions - $currentSessions) / $baselineAvgSessions) * 100;

        if ($dropPercent < self::DROP_MEDIUM_THRESHOLD_PERCENT) {
            return array('to_upsert' => array(), 'to_resolve' => array($dedupKey));
        }

        $severity = $dropPercent >= self::DROP_HIGH_THRESHOLD_PERCENT ? 'high' : 'medium';

        return array(
            'to_upsert' => array(array(
                'dedup_key' => $dedupKey,
                'signal_type' => 'ga.traffic_anomaly.new',
                'severity' => $severity,
                'source' => 'ga',
                'source_ref_type' => 'ga_connection',
                'source_ref_id' => $connectionId,
                'title' => 'GA 流量異常下滑',
                'summary' => sprintf(
                    '連結「%s」的工作階段從近期平均 %.0f 降至 %.0f（下滑 %.0f%%）。',
                    $accountName,
                    $baselineAvgSessions,
                    $currentSessions,
                    $dropPercent
                ),
                'current_sessions' => $currentSessions,
                'baseline_avg_sessions' => round($baselineAvgSessions, 1),
                'drop_percent' => round($dropPercent, 1),
            )),
            'to_resolve' => array(),
        );
    }

    public static function computeDedupKey(int $connectionId): string
    {
        return hash('sha256', 'ga_traffic_drop:' . $connectionId);
    }
}
