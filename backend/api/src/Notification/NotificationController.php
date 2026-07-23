<?php

declare(strict_types=1);

namespace HighlightSignal\Notification;

use HighlightSignal\Auth\ServiceIdentity;
use HighlightSignal\Http\Request;
use HighlightSignal\Http\ValidationException;

/**
 * V11-06: every route here only ever acts on the CALLING member's own
 * notifications/preferences (`$this->identity->memberId`) -- there is no
 * "read another member's notifications" capability, regardless of role.
 */
final class NotificationController
{
    private $service;
    private $identity;

    public function __construct(NotificationService $service, ServiceIdentity $identity)
    {
        $this->service = $service;
        $this->identity = $identity;
    }

    public function index(Request $request, array $parameters): array
    {
        $this->requireMatchingWorkspace($parameters);

        $filters = array('status' => isset($_GET['status']) ? (string) $_GET['status'] : '');
        $page = isset($_GET['page']) ? (int) $_GET['page'] : 1;
        $perPage = isset($_GET['per_page']) ? (int) $_GET['per_page'] : 20;

        return array('ok' => true, 'data' => $this->service->listForRecipient(
            $this->identity->workspaceId,
            $this->identity->memberId,
            $filters,
            $page,
            $perPage
        ));
    }

    public function read(Request $request, array $parameters): array
    {
        $this->requireMatchingWorkspace($parameters);
        $notificationId = isset($parameters['notificationId']) ? (int) $parameters['notificationId'] : 0;
        if ($notificationId <= 0) throw new ValidationException('Invalid notification id.');

        $updated = $this->service->markRead($this->identity->workspaceId, $this->identity->memberId, $notificationId);
        return array('ok' => true, 'data' => array('updated' => $updated));
    }

    public function dismiss(Request $request, array $parameters): array
    {
        $this->requireMatchingWorkspace($parameters);
        $notificationId = isset($parameters['notificationId']) ? (int) $parameters['notificationId'] : 0;
        if ($notificationId <= 0) throw new ValidationException('Invalid notification id.');

        $updated = $this->service->markDismissed($this->identity->workspaceId, $this->identity->memberId, $notificationId);
        return array('ok' => true, 'data' => array('updated' => $updated));
    }

    public function preferencesIndex(Request $request, array $parameters): array
    {
        $this->requireMatchingWorkspace($parameters);
        return array('ok' => true, 'data' => array(
            'email_provider_configured' => $this->service->isEmailProviderConfigured(),
            'preferences' => $this->service->listPreferencesForMember($this->identity->workspaceId, $this->identity->memberId),
        ));
    }

    public function preferencesUpdate(Request $request, array $parameters): array
    {
        $this->requireMatchingWorkspace($parameters);
        $input = $request->json();
        $eventType = isset($input['event_type']) ? trim((string) $input['event_type']) : '';
        $channel = isset($input['channel']) ? (string) $input['channel'] : '';
        $enabled = !empty($input['enabled']);

        if ($eventType === '') throw new ValidationException('event_type is required.');

        $this->service->setPreference($this->identity->workspaceId, $this->identity->memberId, $eventType, $channel, $enabled);
        return array('ok' => true, 'data' => array('event_type' => $eventType, 'channel' => $channel, 'enabled' => $enabled));
    }

    private function requireMatchingWorkspace(array $parameters)
    {
        $workspaceId = isset($parameters['workspaceId']) ? (int) $parameters['workspaceId'] : 0;
        if ($workspaceId <= 0 || $workspaceId !== $this->identity->workspaceId) {
            throw new ValidationException('Workspace path does not match signed context.');
        }
    }
}
