<?php

declare(strict_types=1);

namespace HighlightSignal\Explanation;

use mysqli;

final class ExplanationRepository
{
    private $database;

    public function __construct(mysqli $database)
    {
        $this->database = $database;
    }

    public function findByAnalysisKey(int $workspaceId, string $analysisKey)
    {
        $statement = $this->database->prepare(
            'SELECT * FROM signal_analyses WHERE workspace_id = ? AND analysis_key = ? LIMIT 1'
        );
        $statement->bind_param('is', $workspaceId, $analysisKey);
        $statement->execute();
        $row = $statement->get_result()->fetch_assoc();
        return is_array($row) ? $row : null;
    }

    public function findLatestForSignal(int $workspaceId, int $signalId)
    {
        $statement = $this->database->prepare(
            'SELECT * FROM signal_analyses WHERE workspace_id = ? AND signal_id = ?
             ORDER BY generated_at DESC, id DESC LIMIT 1'
        );
        $statement->bind_param('ii', $workspaceId, $signalId);
        $statement->execute();
        $row = $statement->get_result()->fetch_assoc();
        return is_array($row) ? $row : null;
    }

    /**
     * INSERT ... ON DUPLICATE KEY UPDATE on (workspace_id, analysis_key) --
     * the same Signal + same Evidence set + same generator_version always
     * upserts the same row (bumping attempt_count/generated_at), so retries
     * never create unbounded duplicate versions. A different Evidence set or
     * generator_version produces a different analysis_key upstream, hence a
     * genuinely new row here.
     */
    public function upsertByAnalysisKey(array $fields): array
    {
        $existing = $this->findByAnalysisKey((int) $fields['workspace_id'], (string) $fields['analysis_key']);
        $publicId = $this->uuid();

        $statement = $this->database->prepare(
            "INSERT INTO signal_analyses (
                public_id, workspace_id, signal_id, analysis_key, status,
                evidence_ids_json, explanation_text, explanation_confidence,
                impact_area, impact_direction, impact_magnitude, impact_confidence,
                impact_basis, impact_limitations, generator_type, generator_provider,
                generator_model, generator_version, attempt_count, generated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())
            ON DUPLICATE KEY UPDATE
                status = VALUES(status),
                evidence_ids_json = VALUES(evidence_ids_json),
                explanation_text = VALUES(explanation_text),
                explanation_confidence = VALUES(explanation_confidence),
                impact_area = VALUES(impact_area),
                impact_direction = VALUES(impact_direction),
                impact_magnitude = VALUES(impact_magnitude),
                impact_confidence = VALUES(impact_confidence),
                impact_basis = VALUES(impact_basis),
                impact_limitations = VALUES(impact_limitations),
                attempt_count = attempt_count + 1,
                generated_at = NOW()"
        );

        $workspaceId = (int) $fields['workspace_id'];
        $signalId = (int) $fields['signal_id'];
        $analysisKey = (string) $fields['analysis_key'];
        $status = (string) $fields['status'];
        $evidenceIdsJson = (string) $fields['evidence_ids_json'];
        $explanationText = $fields['explanation_text'];
        $explanationConfidence = $fields['explanation_confidence'];
        $impactArea = $fields['impact_area'];
        $impactDirection = (string) $fields['impact_direction'];
        $impactMagnitude = $fields['impact_magnitude'];
        $impactConfidence = $fields['impact_confidence'];
        $impactBasis = $fields['impact_basis'];
        $impactLimitations = $fields['impact_limitations'];
        $generatorType = (string) $fields['generator_type'];
        $generatorProvider = $fields['generator_provider'];
        $generatorModel = $fields['generator_model'];
        $generatorVersion = (string) $fields['generator_version'];

        $statement->bind_param(
            'siissssdsssdssssss',
            $publicId,
            $workspaceId,
            $signalId,
            $analysisKey,
            $status,
            $evidenceIdsJson,
            $explanationText,
            $explanationConfidence,
            $impactArea,
            $impactDirection,
            $impactMagnitude,
            $impactConfidence,
            $impactBasis,
            $impactLimitations,
            $generatorType,
            $generatorProvider,
            $generatorModel,
            $generatorVersion
        );
        $statement->execute();

        $row = $this->findByAnalysisKey($workspaceId, $analysisKey);
        return array('row' => $row, 'was_new' => !is_array($existing));
    }

    private function uuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
        $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
