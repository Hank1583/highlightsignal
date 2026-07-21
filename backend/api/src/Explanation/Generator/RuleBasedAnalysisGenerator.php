<?php

declare(strict_types=1);

namespace HighlightSignal\Explanation\Generator;

/**
 * V10-03: produces Explanation + Business Impact content from a Signal and
 * its linked Evidence -- no external AI call. This is a deliberate choice,
 * not a placeholder for a future AI call: spec section 6 says Explanation is
 * "AI 或規則" (AI OR rule-based), and generating this synchronously on every
 * SEO scan (same trigger point as Signal detection/Evidence recording) would
 * mean an external API call, cost, and timeout risk on every single scan --
 * disproportionate for what is currently a deterministic technical-issue
 * classification. `dashboard_ai_compose` already shows the established
 * pattern for a real OpenAI call with a rule-based fallback (see
 * backend/api/dashboard/ai_compose.php) -- if a future task wants an AI path
 * here, it should follow that same fallback shape, not replace it.
 *
 * Stateless and self-contained on purpose, same as SeoTechnicalIssueDetector
 * -- no DB access, easy to rehearse deterministically.
 */
final class RuleBasedAnalysisGenerator
{
    const VERSION = 'rule-v1';

    const SEVERITY_MAGNITUDE = array(
        'critical' => 'severe',
        'high' => 'material',
        'medium' => 'moderate',
        'low' => 'minor',
        'info' => 'negligible',
    );

    /**
     * @param array<string, mixed> $signal Normalized signal row (type, severity, status, title, summary, occurrence_count, detected_at, last_seen_at)
     * @param array<int, array<string, mixed>> $evidence Normalized Evidence rows linked to this signal
     * @return array<string, mixed> Content fields ready for signal_analyses -- caller decides status/analysis_key/persistence.
     */
    public function generate(array $signal, array $evidence): array
    {
        $severity = (string) ($signal['severity'] ?? 'medium');
        $occurrenceCount = (int) ($signal['occurrence_count'] ?? 1);
        $title = (string) ($signal['title'] ?? '');
        $lastSeenAt = (string) ($signal['last_seen_at'] ?? '');
        $evidenceCount = count($evidence);

        $explanationText = sprintf(
            '系統於 %d 次掃描中偵測到「%s」，最近一次觀察時間為 %s，依據 %d 筆 Evidence 記錄的技術問題快照判斷此為持續存在的問題，而非單次誤報。',
            $occurrenceCount,
            $title,
            $lastSeenAt,
            $evidenceCount
        );

        // Confidence grows with repeated, independently-observed occurrences
        // -- a single observation is treated as less certain than a problem
        // confirmed across several scans. Capped, not linear to infinity.
        $explanationConfidence = min(95.0, 50.0 + min($occurrenceCount, 9) * 5.0);

        $magnitude = isset(self::SEVERITY_MAGNITUDE[$severity]) ? self::SEVERITY_MAGNITUDE[$severity] : 'moderate';

        return array(
            'explanation_text' => $explanationText,
            'explanation_confidence' => $explanationConfidence,
            'impact_area' => 'seo',
            'impact_direction' => 'negative',
            'impact_magnitude' => $magnitude,
            // Impact confidence is deliberately lower than explanation
            // confidence -- we're confident the technical issue exists
            // (that's a fact from Evidence), but far less confident about
            // its actual business consequence (traffic/revenue), which this
            // rule has no data to measure.
            'impact_confidence' => min(60.0, 30.0 + min($occurrenceCount, 6) * 5.0),
            'impact_basis' => sprintf('依據 %d 筆技術問題 Evidence 快照與 Signal 嚴重度（%s）推斷。', $evidenceCount, $severity),
            'impact_limitations' => '僅反映技術層面掃描結果，未納入實際流量、排名或轉換數據變化，無法確定實際商業損失或影響金額；此為規則式推斷，非 AI 生成內容。',
        );
    }
}
