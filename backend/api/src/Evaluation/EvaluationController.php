<?php

declare(strict_types=1);

namespace HighlightSignal\Evaluation;

use HighlightSignal\Auth\ServiceIdentity;
use HighlightSignal\Http\Request;
use HighlightSignal\Http\ValidationException;
use HighlightSignal\Workspace\WorkspacePermissions;

/**
 * V11-05: read is any active member (reporting surface); submitting human
 * Feedback reuses the SAME `workflow.mutate` permission gate as Decision/
 * Task mutation -- a viewer cannot leave feedback any more than they can
 * accept a Recommendation.
 */
final class EvaluationController
{
    private $service;
    private $identity;
    private $membership;

    public function __construct(EvaluationService $service, ServiceIdentity $identity, array $membership)
    {
        $this->service = $service;
        $this->identity = $identity;
        $this->membership = $membership;
    }

    public function index(Request $request, array $parameters): array
    {
        $this->requireMatchingWorkspace($parameters);

        $subjectType = isset($_GET['subject_type']) ? (string) $_GET['subject_type'] : '';
        $subjectId = isset($_GET['subject_id']) ? (int) $_GET['subject_id'] : 0;

        if ($subjectType !== '' && $subjectId > 0) {
            return array('ok' => true, 'data' => array('items' => $this->service->listForSubject($this->identity->workspaceId, $subjectType, $subjectId)));
        }

        $filters = array(
            'subject_type' => $subjectType,
            'source' => isset($_GET['source']) ? (string) $_GET['source'] : '',
        );
        $page = isset($_GET['page']) ? (int) $_GET['page'] : 1;
        $perPage = isset($_GET['per_page']) ? (int) $_GET['per_page'] : 20;

        return array('ok' => true, 'data' => $this->service->listForWorkspace($this->identity->workspaceId, $filters, $page, $perPage));
    }

    public function submitFeedback(Request $request, array $parameters): array
    {
        $this->requireMatchingWorkspace($parameters);
        WorkspacePermissions::requirePermission($this->membership, 'workflow.mutate');

        $input = $request->json();
        $subjectType = isset($input['subject_type']) ? (string) $input['subject_type'] : '';
        $subjectId = isset($input['subject_id']) ? (int) $input['subject_id'] : 0;
        $rating = isset($input['rating']) ? trim((string) $input['rating']) : '';
        $reason = isset($input['reason']) ? trim((string) $input['reason']) : '';
        $value = isset($input['value']) && $input['value'] !== '' ? (float) $input['value'] : null;
        $idempotencyKey = isset($input['idempotency_key']) ? trim((string) $input['idempotency_key']) : '';

        if ($subjectId <= 0) {
            throw new ValidationException('subject_id is required.');
        }

        $row = $this->service->recordFeedback(
            $this->identity->workspaceId,
            $subjectType,
            $subjectId,
            $this->identity->memberId,
            $rating,
            $reason,
            $value,
            $idempotencyKey !== '' ? $idempotencyKey : null
        );

        return array('ok' => true, 'data' => $row);
    }

    private function requireMatchingWorkspace(array $parameters)
    {
        $workspaceId = isset($parameters['workspaceId']) ? (int) $parameters['workspaceId'] : 0;
        if ($workspaceId <= 0 || $workspaceId !== $this->identity->workspaceId) {
            throw new ValidationException('Workspace path does not match signed context.');
        }
    }
}
