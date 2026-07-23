<?php

declare(strict_types=1);

namespace HighlightSignal\Audit;

use mysqli;

/**
 * V11-07: the single converged audit writer. Before this task, four classes
 * (SignalService, WorkflowService, QueueService, GaIntegrationService) each
 * hand-rolled their own private `audit()` method against `audit_logs`
 * directly -- two even duplicated a runtime `SHOW COLUMNS ... LIKE
 * 'metadata_json'` detection dance that has never needed its fallback branch
 * (the column has been `metadata_json` since migrations/010). Every writer in
 * this codebase should go through `record()` rather than re-implementing
 * insert/redaction/size-limit/versioning per call site.
 *
 * `audit_logs` has no UPDATE/DELETE anywhere in this codebase (grep-verified,
 * see VERIFICATION_RUNBOOK section 19) -- this class deliberately exposes no
 * such method either. Append-only by construction, not just convention.
 */
final class AuditLogger
{
    // Bumped only if the metadata SHAPE changes in a way a reader (incident
    // investigation, export tooling) needs to branch on -- not on every new
    // event_type, which is free-form and self-describing.
    const SCHEMA_VERSION = 1;

    // audit_logs.metadata_json is TEXT (64KB ceiling) but a single event's
    // metadata should never need anywhere near that -- 4KB matches
    // ExecutionResultService's own output limit and keeps one noisy mutation
    // from crowding out everything else in a workspace's audit trail.
    const MAX_METADATA_BYTES = 4096;

    // Whole-value replacement for an object key that is itself sensitive
    // (never emit the value at all), independent of REDACTION_PATTERNS below
    // which scrubs sensitive substrings out of otherwise-legitimate strings.
    const SENSITIVE_KEY_PATTERN = '/(password|passwd|secret|token|api[_-]?key|credential)/i';

    const REDACTION_PATTERNS = array(
        '/Bearer\s+[A-Za-z0-9._\-]+/i' => 'Bearer [REDACTED]',
        '/("?(?:password|passwd|secret|token|api[_-]?key|client_secret)"?\s*[:=]\s*"?)[^",}\s]+/i' => '$1[REDACTED]',
    );

    private $database;

    public function __construct(mysqli $database)
    {
        $this->database = $database;
    }

    /**
     * Not wrapped in its own transaction -- callers that need "mutation and
     * its audit row succeed or fail together" (the mandatory verification
     * rule: no misleading success audit on a rolled-back mutation) call this
     * from inside their OWN begin_transaction()/commit(), the same way
     * SignalService::updateStatus() and WorkflowService::mutate() already
     * do. A system-triggered event with no transaction to join (e.g. a
     * detector's per-item write) still gets this discipline -- see
     * SignalService::applyDetectionPlan()'s own transaction.
     *
     * @param mixed $actorMemberId int|null -- null for system-triggered events
     * @param mixed $entityType string|null
     * @param mixed $entityId string|null
     * @param mixed $requestId string|null
     */
    public function record(
        int $workspaceId,
        $actorMemberId,
        string $eventType,
        $entityType,
        $entityId,
        array $metadata = array(),
        $requestId = null
    ) {
        $metadataJson = $this->encodeMetadata($metadata);

        $statement = $this->database->prepare(
            'INSERT INTO audit_logs (workspace_id, actor_member_id, event_type, entity_type, entity_id, request_id, metadata_json)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $statement->bind_param(
            'iisssss',
            $workspaceId,
            $actorMemberId,
            $eventType,
            $entityType,
            $entityId,
            $requestId,
            $metadataJson
        );
        $statement->execute();
    }

    private function encodeMetadata(array $metadata): string
    {
        $metadata['_schema_version'] = self::SCHEMA_VERSION;
        $redacted = $this->redact($metadata);
        $json = json_encode($redacted, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        if ($json === false) {
            return (string) json_encode(array('_schema_version' => self::SCHEMA_VERSION, '_encode_error' => true));
        }

        if (strlen($json) > self::MAX_METADATA_BYTES) {
            return (string) json_encode(array(
                '_schema_version' => self::SCHEMA_VERSION,
                '_truncated' => true,
                '_original_bytes' => strlen($json),
            ));
        }

        return $json;
    }

    /** @param mixed $value */
    private function redact($value)
    {
        if (is_array($value)) {
            $result = array();
            foreach ($value as $key => $item) {
                if (is_string($key) && preg_match(self::SENSITIVE_KEY_PATTERN, $key)) {
                    $result[$key] = '[REDACTED]';
                    continue;
                }
                $result[$key] = $this->redact($item);
            }
            return $result;
        }

        if (is_string($value)) {
            foreach (self::REDACTION_PATTERNS as $pattern => $replacement) {
                $value = preg_replace($pattern, $replacement, $value);
            }
            return $value;
        }

        return $value;
    }
}
