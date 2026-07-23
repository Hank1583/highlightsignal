<?php

declare(strict_types=1);

namespace HighlightSignal\Integration\GoogleAnalytics;

use HighlightSignal\Audit\AuditLogger;
use HighlightSignal\Auth\ServiceIdentity;
use HighlightSignal\Http\ValidationException;
use HighlightSignal\Workspace\WorkspacePermissions;
use mysqli;

final class GaIntegrationService
{
    private $database;
    private $repository;
    private $auditLogger;

    public function __construct(mysqli $database, GaIntegrationRepository $repository)
    {
        $this->database = $database;
        $this->repository = $repository;
        $this->auditLogger = new AuditLogger($database);
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
        WorkspacePermissions::requirePermission($membership, 'integrations.manage');

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

            $this->auditLogger->record(
                $identity->workspaceId,
                $identity->memberId,
                'integration.ga_status_updated',
                'WorkspaceIntegration',
                (string) $connectionId,
                array('status' => $status),
                $identity->nonce
            );
            $this->database->commit();

            return $connection;
        } catch (\Throwable $error) {
            $this->database->rollback();
            throw $error;
        }
    }
}
