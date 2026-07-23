<?php

declare(strict_types=1);

namespace HighlightSignal\Action;

use mysqli;

/**
 * V11-01: persistence only (spec section 10: Repository only does
 * persistence, rules live in the Service). An Action is the formal
 * authorization boundary between a human's Decision (V10-05) and the
 * Manual Task that actually gets worked on -- see migrations/029's header
 * for the full schema rationale. This class never creates a Decision, never
 * touches Task/step rows, and never assumes a Queue Job exists -- those are
 * WorkflowRepository's and V11-02/03's job respectively.
 */
final class ActionRepository
{
    private $database;

    public function __construct(mysqli $database)
    {
        $this->database = $database;
    }

    public function findByDecision(int $workspaceId, int $decisionId)
    {
        $statement = $this->database->prepare(
            'SELECT * FROM actions WHERE workspace_id = ? AND decision_id = ? LIMIT 1'
        );
        $statement->bind_param('ii', $workspaceId, $decisionId);
        $statement->execute();
        $row = $statement->get_result()->fetch_assoc();
        return is_array($row) ? $row : null;
    }

    public function findForWorkspace(int $workspaceId, int $actionId)
    {
        $statement = $this->database->prepare(
            'SELECT * FROM actions WHERE workspace_id = ? AND id = ? LIMIT 1'
        );
        $statement->bind_param('ii', $workspaceId, $actionId);
        $statement->execute();
        $row = $statement->get_result()->fetch_assoc();
        return is_array($row) ? $row : null;
    }

    /**
     * Idempotent by construction: `actions.decision_id` is UNIQUE
     * (migrations/029), so a repeat call for the SAME Decision always
     * returns the existing Action rather than creating a second one --
     * matches the task packet's "accepted Decision 可建立一個 idempotent
     * Action" requirement without needing an application-level idempotency
     * key the way `decisions.idempotency_key` needed one (a Decision is
     * opt-in idempotent because callers may or may not resubmit; an Action
     * is ALWAYS 1:1 with the Decision that authorized it, so the DB
     * constraint alone is sufficient).
     */
    public function createOrFindForDecision(
        int $workspaceId,
        int $recommendationId,
        int $decisionId,
        string $intent,
        int $authorizedByMemberId
    ): array {
        $existing = $this->findByDecision($workspaceId, $decisionId);
        if (is_array($existing)) {
            return $existing;
        }

        $publicId = $this->uuid();
        $statement = $this->database->prepare(
            'INSERT INTO actions (public_id, workspace_id, recommendation_id, decision_id, intent, authorized_by_member_id)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $statement->bind_param(
            'siiisi',
            $publicId,
            $workspaceId,
            $recommendationId,
            $decisionId,
            $intent,
            $authorizedByMemberId
        );
        $statement->execute();

        return $this->findByDecision($workspaceId, $decisionId);
    }

    public function updateStatus(int $workspaceId, int $actionId, string $status)
    {
        $statement = $this->database->prepare(
            'UPDATE actions SET status = ? WHERE id = ? AND workspace_id = ?'
        );
        $statement->bind_param('sii', $status, $actionId, $workspaceId);
        $statement->execute();
    }

    private function uuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
        $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
