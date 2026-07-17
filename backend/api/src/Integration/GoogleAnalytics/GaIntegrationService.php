<?php

declare(strict_types=1);

namespace HighlightSignal\Integration\GoogleAnalytics;

use HighlightSignal\Auth\ServiceIdentity;
use HighlightSignal\Http\ValidationException;
use HighlightSignal\Workspace\AuthorizationException;
use mysqli;

final class GaIntegrationService
{
    private $database;
    private $repository;

    public function __construct(mysqli $database, GaIntegrationRepository $repository)
    {
        $this->database = $database;
        $this->repository = $repository;
    }

    public function listConnections(int $workspaceId, bool $includeInactive): array
    {
        return $this->repository->listByWorkspace($workspaceId, $includeInactive);
    }

    public function updateConnectionStatus(
        ServiceIdentity $identity,
        array $membership,
        int $connectionId,
        int $status
    ): array {
        if (!in_array($membership['role'], array('owner', 'admin', 'manager'), true)) {
            throw new AuthorizationException('Workspace role cannot update integrations.');
        }

        if ($connectionId <= 0 || !in_array($status, array(0, 1), true)) {
            throw new ValidationException('Invalid GA connection settings.');
        }

        $this->database->begin_transaction();
        try {
            $connection = $this->repository->updateStatus(
                $identity->workspaceId,
                $connectionId,
                $status
            );

            $eventType = 'GA Integration Status Updated';
            $entityType = 'WorkspaceIntegration';
            $entityId = (string) $connectionId;
            $requestId = $identity->nonce;
            $metadata = json_encode(array('status' => $status));
            $audit = $this->database->prepare(
                'INSERT INTO audit_logs
                 (workspace_id, actor_member_id, event_type, entity_type, entity_id, request_id, metadata_json)
                 VALUES (?, ?, ?, ?, ?, ?, ?)'
            );
            $audit->bind_param(
                'iisssss',
                $identity->workspaceId,
                $identity->memberId,
                $eventType,
                $entityType,
                $entityId,
                $requestId,
                $metadata
            );
            $audit->execute();
            $this->database->commit();

            return $connection;
        } catch (\Throwable $error) {
            $this->database->rollback();
            throw $error;
        }
    }
}
