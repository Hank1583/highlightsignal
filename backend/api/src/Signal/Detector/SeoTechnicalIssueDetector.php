<?php

declare(strict_types=1);

namespace HighlightSignal\Signal\Detector;

/**
 * V10-01: the first real Signal detection rule (task packet's recommended
 * first case over a GA threshold rule -- SEO technical issues are already
 * structured `type`/`severity`/`url` data, not a "how much decline counts as
 * an anomaly" business judgment call).
 *
 * Deliberately self-contained and stateless -- no database access, no
 * dependency on si/seo/summary.php's own comparison-object variable names.
 * It re-derives its own current/previous diff from the raw issue arrays so
 * this class stays independently testable and isn't coupled to how the
 * caller happens to shape its own response payload.
 *
 * `const` here (no `private`/`public` visibility keyword) is intentional --
 * visibility modifiers on class constants are PHP 7.1+ only, and this
 * project's production target is PHP 7.0.
 */
final class SeoTechnicalIssueDetector
{
    const LABELS = array(
        'BAD_STATUS_CODE' => '頁面狀態碼異常',
        'NON_HTML_CONTENT' => '頁面內容非 HTML',
        'MISSING_TITLE' => '缺少 Title',
        'TITLE_TOO_SHORT' => 'Title 過短',
        'TITLE_TOO_LONG' => 'Title 過長',
        'MISSING_META_DESCRIPTION' => '缺少 Meta Description',
        'META_DESCRIPTION_TOO_SHORT' => 'Meta Description 過短',
        'META_DESCRIPTION_TOO_LONG' => 'Meta Description 過長',
        'MISSING_CANONICAL' => '缺少 Canonical',
        'MISSING_H1' => '缺少 H1',
        'MULTIPLE_H1' => '多個 H1',
        'NOINDEX_FOUND' => '偵測到 noindex',
        'LOW_CONTENT_TEXT' => '頁面內容過少',
    );

    /**
     * @param array<int, array<string, mixed>> $currentIssues  this scan's `analyze_tech()` output
     * @param array<int, array<string, mixed>> $previousIssues the immediately preceding scan's issues_json, decoded
     * @return array{to_upsert: array<int, array<string, mixed>>, to_resolve: array<int, string>}
     */
    public function diff(int $siteId, array $currentIssues, array $previousIssues): array
    {
        $currentByKey = array();
        foreach ($currentIssues as $issue) {
            if (!is_array($issue)) {
                continue;
            }
            $currentByKey[$this->dedupKey($siteId, $issue)] = $issue;
        }

        $previousByKey = array();
        foreach ($previousIssues as $issue) {
            if (!is_array($issue)) {
                continue;
            }
            $previousByKey[$this->dedupKey($siteId, $issue)] = $issue;
        }

        $toUpsert = array();
        foreach ($currentByKey as $dedupKey => $issue) {
            $toUpsert[] = $this->buildUpsertPlan($siteId, $dedupKey, $issue);
        }

        $toResolve = array();
        foreach (array_keys($previousByKey) as $dedupKey) {
            if (!isset($currentByKey[$dedupKey])) {
                $toResolve[] = $dedupKey;
            }
        }

        return array('to_upsert' => $toUpsert, 'to_resolve' => $toResolve);
    }

    /**
     * sha256 over a stable, time-independent signature of the underlying
     * problem (site + issue type + normalized URL) -- not a prefix, the full
     * digest fits comfortably in dedup_key's VARCHAR(191).
     */
    private function dedupKey(int $siteId, array $issue): string
    {
        $type = (string) ($issue['type'] ?? 'UNKNOWN');
        $url = (string) ($issue['url'] ?? '');
        return self::computeDedupKey($siteId, $type, $url);
    }

    /**
     * V10-04: public so WorkflowService can independently resolve "does a
     * real Signal exist for this (site, issue type, url)" without
     * duplicating the hash formula -- e.g. when a Recommendation is being
     * created from a legacy `seo:{siteId}:{issueType}` context_key and the
     * caller (seo/page.tsx) also has the real `url`, this lets the backend
     * verify a genuine Signal backs it before trusting any content for it.
     */
    public static function computeDedupKey(int $siteId, string $type, string $url): string
    {
        $normalizedType = strtoupper($type);
        $normalizedUrl = rtrim(strtolower($url), '/');
        return hash('sha256', 'seo_issue:' . $siteId . ':' . $normalizedType . ':' . $normalizedUrl);
    }

    private function buildUpsertPlan(int $siteId, string $dedupKey, array $issue): array
    {
        $type = strtoupper((string) ($issue['type'] ?? 'UNKNOWN'));
        $url = (string) ($issue['url'] ?? '');
        $message = (string) ($issue['message'] ?? '');

        return array(
            'dedup_key' => $dedupKey,
            'signal_type' => 'seo.technical_issue.new',
            'severity' => $this->mapSeverity((string) ($issue['severity'] ?? 'LOW')),
            'source' => 'seo',
            'source_ref_type' => 'seo_site',
            'source_ref_id' => $siteId,
            'title' => isset(self::LABELS[$type]) ? self::LABELS[$type] : $type,
            'summary' => $url !== '' ? ($message . '（' . $url . '）') : $message,
        );
    }

    private function mapSeverity(string $rawSeverity): string
    {
        switch (strtoupper($rawSeverity)) {
            case 'HIGH':
                return 'high';
            case 'MEDIUM':
                return 'medium';
            default:
                return 'low';
        }
    }
}
