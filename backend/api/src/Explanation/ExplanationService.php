<?php

declare(strict_types=1);

namespace HighlightSignal\Explanation;

use HighlightSignal\Evidence\EvidenceRepository;
use HighlightSignal\Explanation\Generator\RuleBasedAnalysisGenerator;
use HighlightSignal\Signal\SignalRepository;

/**
 * V10-03: Explanation/Business Impact never create a Recommendation or
 * Decision (spec section 6) -- this class only reads Signal + Evidence and
 * persists an analysis record. Like SignalService's detection entrypoint and
 * EvidenceService's recording entrypoint, generation here is system-
 * triggered -- no ServiceIdentity/permission check needed for the write
 * path; reads go through the Controller's existing workspace-path check.
 */
final class ExplanationService
{
    private $repository;
    private $signalRepository;
    private $evidenceRepository;
    private $generator;

    public function __construct(
        ExplanationRepository $repository,
        SignalRepository $signalRepository,
        EvidenceRepository $evidenceRepository
    ) {
        $this->repository = $repository;
        $this->signalRepository = $signalRepository;
        $this->evidenceRepository = $evidenceRepository;
        $this->generator = new RuleBasedAnalysisGenerator();
    }

    /**
     * Read-or-generate: always safe to call repeatedly (GET semantics) --
     * the underlying upsert is idempotent on (Signal, Evidence set, generator
     * version), so calling this twice with nothing changed returns the same
     * row rather than creating a new version.
     */
    public function readOrGenerateForSignal(int $workspaceId, int $signalId)
    {
        $signal = $this->signalRepository->findForWorkspace($workspaceId, $signalId);
        if (!is_array($signal)) {
            return null;
        }

        return $this->normalize($this->generateForSignal($workspaceId, $signal));
    }

    /** @param array<string, mixed> $signal Full signal row (must include dedup_key, id, workspace-scoped). */
    private function generateForSignal(int $workspaceId, array $signal): array
    {
        $signalId = (int) $signal['id'];
        $evidence = $this->evidenceRepository->listForSignal($workspaceId, $signalId);
        $evidenceIds = array_values(array_map(static function (array $row) {
            return (int) $row['id'];
        }, $evidence));
        sort($evidenceIds);
        $evidenceIdsJson = json_encode($evidenceIds, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $analysisKey = hash('sha256', $signal['dedup_key'] . ':' . implode(',', $evidenceIds) . ':' . RuleBasedAnalysisGenerator::VERSION);

        if (count($evidence) === 0) {
            // Fail closed: no Evidence means no basis for an Explanation or
            // Business Impact claim -- never fabricate one just because a
            // Signal exists.
            $result = $this->repository->upsertByAnalysisKey(array(
                'workspace_id' => $workspaceId,
                'signal_id' => $signalId,
                'analysis_key' => $analysisKey,
                'status' => 'insufficient_evidence',
                'evidence_ids_json' => $evidenceIdsJson,
                'explanation_text' => null,
                'explanation_confidence' => null,
                'impact_area' => null,
                'impact_direction' => 'unknown',
                'impact_magnitude' => null,
                'impact_confidence' => null,
                'impact_basis' => null,
                'impact_limitations' => '尚無 Evidence 可佐證,無法產生 Explanation 或 Business Impact。',
                'generator_type' => 'rule',
                'generator_provider' => null,
                'generator_model' => null,
                'generator_version' => RuleBasedAnalysisGenerator::VERSION,
            ));
            return $result['row'];
        }

        try {
            $content = $this->generator->generate($signal, $evidence);
        } catch (\Throwable $error) {
            $result = $this->repository->upsertByAnalysisKey(array(
                'workspace_id' => $workspaceId,
                'signal_id' => $signalId,
                'analysis_key' => $analysisKey,
                'status' => 'failed',
                'evidence_ids_json' => $evidenceIdsJson,
                'explanation_text' => null,
                'explanation_confidence' => null,
                'impact_area' => null,
                'impact_direction' => 'unknown',
                'impact_magnitude' => null,
                'impact_confidence' => null,
                'impact_basis' => null,
                'impact_limitations' => '產生 Explanation/Impact 時發生錯誤，結果未產生。',
                'generator_type' => 'rule',
                'generator_provider' => null,
                'generator_model' => null,
                'generator_version' => RuleBasedAnalysisGenerator::VERSION,
            ));
            return $result['row'];
        }

        $result = $this->repository->upsertByAnalysisKey(array(
            'workspace_id' => $workspaceId,
            'signal_id' => $signalId,
            'analysis_key' => $analysisKey,
            'status' => 'ok',
            'evidence_ids_json' => $evidenceIdsJson,
            'explanation_text' => $content['explanation_text'],
            'explanation_confidence' => $content['explanation_confidence'],
            'impact_area' => $content['impact_area'],
            'impact_direction' => $content['impact_direction'],
            'impact_magnitude' => $content['impact_magnitude'],
            'impact_confidence' => $content['impact_confidence'],
            'impact_basis' => $content['impact_basis'],
            'impact_limitations' => $content['impact_limitations'],
            'generator_type' => 'rule',
            'generator_provider' => 'internal_rule_engine',
            'generator_model' => null,
            'generator_version' => RuleBasedAnalysisGenerator::VERSION,
        ));
        return $result['row'];
    }

    private function normalize(array $row): array
    {
        return array(
            'id' => (int) $row['id'],
            'public_id' => (string) $row['public_id'],
            'signal_id' => (int) $row['signal_id'],
            'status' => (string) $row['status'],
            'evidence_ids' => json_decode((string) $row['evidence_ids_json'], true) ?: array(),
            'explanation' => array(
                'text' => $row['explanation_text'],
                'confidence' => $row['explanation_confidence'] !== null ? (float) $row['explanation_confidence'] : null,
            ),
            'business_impact' => array(
                'area' => $row['impact_area'],
                'direction' => (string) $row['impact_direction'],
                'magnitude' => $row['impact_magnitude'],
                'confidence' => $row['impact_confidence'] !== null ? (float) $row['impact_confidence'] : null,
                'basis' => $row['impact_basis'],
                'limitations' => $row['impact_limitations'],
            ),
            'generator' => array(
                'type' => (string) $row['generator_type'],
                'provider' => $row['generator_provider'],
                'model' => $row['generator_model'],
                'version' => (string) $row['generator_version'],
            ),
            'attempt_count' => (int) $row['attempt_count'],
            'generated_at' => (string) $row['generated_at'],
        );
    }
}
