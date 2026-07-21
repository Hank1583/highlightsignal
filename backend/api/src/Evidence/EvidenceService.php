<?php

declare(strict_types=1);

namespace HighlightSignal\Evidence;

use HighlightSignal\Signal\Detector\SeoTechnicalIssueDetector;
use HighlightSignal\Signal\SignalRepository;

/**
 * V10-02: Evidence only records facts (spec section 6) -- it never computes
 * an AI Explanation or Business Impact (V10-03's job) and never touches
 * recommendations/decisions/tasks. Like SignalService's detection entrypoint,
 * recordSeoTechnicalIssueEvidence() is system-triggered (no ServiceIdentity/
 * permission check) -- it's called right alongside Signal detection from
 * si/seo/summary.php, not behind a human mutation.
 */
final class EvidenceService
{
    private $repository;
    private $signalRepository;

    public function __construct(EvidenceRepository $repository, SignalRepository $signalRepository)
    {
        $this->repository = $repository;
        $this->signalRepository = $signalRepository;
    }

    public function listForWorkspace(int $workspaceId, array $filters, int $page, int $perPage): array
    {
        $page = max(1, $page);
        $perPage = max(1, min(100, $perPage));
        $result = $this->repository->listForWorkspace($workspaceId, $filters, $page, $perPage);

        return array(
            'items' => array_map(array($this, 'normalize'), $result['items']),
            'total' => $result['total'],
            'page' => $page,
            'per_page' => $perPage,
        );
    }

    /** @return array<int, array> Evidence linked to a Signal, for the Signal -> Evidence traceability API. */
    public function listForSignal(int $workspaceId, int $signalId): array
    {
        return array_map(array($this, 'normalize'), $this->repository->listForSignal($workspaceId, $signalId));
    }

    /**
     * Re-runs the SAME stateless Detector diff already used by
     * SignalService::runSeoTechnicalIssueDetection() (cheap, no DB access) --
     * this class does not depend on SignalService, only on SignalRepository,
     * to find which Signal a piece of Evidence belongs to. Only `to_upsert`
     * (currently-observed issues) produce Evidence here; a "no longer
     * observed" fact isn't a new fact to record, it's the Signal's own
     * resolved-status concern.
     *
     * @param array<int, array<string, mixed>> $currentIssues
     * @param array<int, array<string, mixed>> $previousIssues
     * @return array{recorded: int, refreshed: int, linked: int, unmatched: int}
     */
    public function recordSeoTechnicalIssueEvidence(
        int $workspaceId,
        int $siteId,
        array $currentIssues,
        array $previousIssues,
        int $scanHistoryId,
        string $scannedAt
    ): array {
        $detector = new SeoTechnicalIssueDetector();
        $plan = $detector->diff($siteId, $currentIssues, $previousIssues);

        $stats = array('recorded' => 0, 'refreshed' => 0, 'linked' => 0, 'unmatched' => 0);

        foreach ($plan['to_upsert'] as $item) {
            $fact = $this->stableFact($siteId, $item);
            $contentHash = hash('sha256', json_encode($fact, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
            $evidenceDedupKey = hash('sha256', $item['dedup_key'] . ':' . $contentHash);

            $payload = $fact;
            $payload['scan_history_id'] = $scanHistoryId;
            $payload['scanned_at'] = $scannedAt;
            $payloadJson = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

            $result = $this->repository->upsertByDedupKey(
                $workspaceId,
                $evidenceDedupKey,
                'seo_technical_issue_snapshot',
                $item['source'],
                $item['source_ref_type'],
                $scanHistoryId,
                $item['title'],
                $item['summary'],
                $payloadJson,
                $contentHash,
                $scannedAt
            );

            if ($result['was_new']) {
                $stats['recorded']++;
            } else {
                $stats['refreshed']++;
            }

            $signal = $this->signalRepository->findByDedupKey($workspaceId, $item['dedup_key']);
            if (!is_array($signal)) {
                // Should not happen -- SignalService's detection runs against
                // the same plan -- but Evidence must never assume a Signal
                // exists; recording the fact is still valid even if linking
                // isn't possible this run.
                $stats['unmatched']++;
                continue;
            }

            if ($this->repository->linkSignalEvidence(
                $workspaceId,
                (int) $signal['id'],
                (int) $result['row']['id'],
                'primary'
            )) {
                $stats['linked']++;
            }
        }

        return $stats;
    }

    /**
     * Only the fields that define WHAT the fact is -- excludes scan-run
     * metadata (scan_history_id, scanned_at) that changes on every re-scan
     * even when the issue itself hasn't. Fixed key order matters: this is
     * json_encode'd directly into content_hash, so a different key order
     * would hash differently for identical content.
     */
    private function stableFact(int $siteId, array $item): array
    {
        return array(
            'site_id' => $siteId,
            'signal_type' => $item['signal_type'],
            'severity' => $item['severity'],
            'title' => $item['title'],
            'summary' => $item['summary'],
        );
    }

    private function normalize(array $row): array
    {
        return array(
            'id' => (int) $row['id'],
            'public_id' => (string) $row['public_id'],
            'evidence_type' => (string) $row['evidence_type'],
            'source' => (string) $row['source'],
            'source_ref_type' => $row['source_ref_type'],
            'source_ref_id' => $row['source_ref_id'] !== null ? (int) $row['source_ref_id'] : null,
            'title' => (string) $row['title'],
            'summary' => (string) ($row['summary'] ?? ''),
            'payload' => json_decode((string) $row['payload_json'], true),
            'content_hash' => (string) $row['content_hash'],
            'observed_at' => (string) $row['observed_at'],
            'last_observed_at' => (string) $row['last_observed_at'],
            'captured_at' => (string) $row['captured_at'],
            'relationship_type' => isset($row['relationship_type']) ? (string) $row['relationship_type'] : null,
        );
    }
}
