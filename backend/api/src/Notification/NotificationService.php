<?php

declare(strict_types=1);

namespace HighlightSignal\Notification;

use HighlightSignal\Audit\AuditLogger;
use HighlightSignal\Config\Environment;
use HighlightSignal\Http\ValidationException;
use HighlightSignal\Queue\QueueService;
use mysqli;

/**
 * V11-06: the "domain-event subscriber" entrypoint the task packet asks
 * for -- any code in this codebase that wants to notify workspace members
 * about something calls `notify()` directly (this project has no existing
 * pub/sub event bus to hook into; adding one would be new infrastructure
 * beyond this task's scope). `notify()` never creates a Recommendation,
 * Decision, or Action -- it only reads who should be told and records that
 * they were told.
 */
final class NotificationService
{
    // Opt-OUT default for in_app (everyone gets it unless they explicitly
    // disable it); opt-IN default for email (nobody gets it until they
    // explicitly enable it) -- matches "不承諾未配置 provider 的 email 已可用"
    // at the preference layer; the provider-configured check below is a
    // SECOND, independent gate email must also pass.
    const DEFAULT_CHANNEL_ENABLED = array('in_app' => true, 'email' => false);

    const EMAIL_PROVIDER_API_KEY_ENV = 'NOTIFICATION_EMAIL_PROVIDER_API_KEY';

    private $repository;
    private $queueService;
    private $database;
    private $auditLogger;

    public function __construct(NotificationRepository $repository, QueueService $queueService, mysqli $database)
    {
        $this->repository = $repository;
        $this->queueService = $queueService;
        $this->database = $database;
        $this->auditLogger = new AuditLogger($database);
    }

    /**
     * Honest capability check -- callers (and the API) should use this
     * before claiming email is available, never assume it based on a
     * preference row alone.
     */
    public function isEmailProviderConfigured(): bool
    {
        $key = Environment::get(self::EMAIL_PROVIDER_API_KEY_ENV);
        return $key !== null && $key !== '';
    }

    /**
     * @param array<int, int> $recipientMemberIds
     * @param mixed $body string|null; $entityType string|null; $entityId string|null
     * @return array<int, array> the notification row created/found for each recipient
     */
    public function notify(
        int $workspaceId,
        string $eventType,
        string $severity,
        array $recipientMemberIds,
        string $title,
        $body,
        $entityType,
        $entityId,
        string $dedupKey
    ): array {
        if (!in_array($severity, array('info', 'warning', 'critical'), true)) {
            throw new ValidationException('Invalid notification severity.');
        }

        $results = array();
        foreach ($recipientMemberIds as $memberId) {
            $memberId = (int) $memberId;
            if ($memberId <= 0) {
                continue;
            }

            $notification = $this->repository->createIfNotExists(
                $workspaceId,
                $memberId,
                $eventType,
                $severity,
                $title,
                $body,
                $entityType,
                $entityId,
                $dedupKey
            );
            $notificationId = (int) $notification['id'];

            $this->deliverInApp($workspaceId, $memberId, $eventType, $notificationId);
            $this->deliverEmail($workspaceId, $memberId, $eventType, $notificationId);

            $results[] = $notification;
        }
        return $results;
    }

    /**
     * Convenience wrapper over `notify()` for the common case: tell every
     * ACTIVE member of the workspace (see
     * `NotificationRepository::listActiveWorkspaceMemberIds()`), rather
     * than the caller having to resolve recipients itself.
     *
     * @param mixed $body string|null; $entityType string|null; $entityId string|null
     */
    public function notifyWorkspace(
        int $workspaceId,
        string $eventType,
        string $severity,
        string $title,
        $body,
        $entityType,
        $entityId,
        string $dedupKey
    ): array {
        $recipientMemberIds = $this->repository->listActiveWorkspaceMemberIds($workspaceId);
        return $this->notify($workspaceId, $eventType, $severity, $recipientMemberIds, $title, $body, $entityType, $entityId, $dedupKey);
    }

    /** V11-07: human-initiated -- only audited when it actually changed a row (repository's own status-guard WHERE already prevents a no-op from looking like a fresh read/dismiss). */
    public function markRead(int $workspaceId, int $recipientMemberId, int $notificationId): bool
    {
        $this->database->begin_transaction();
        try {
            $updated = $this->repository->markRead($workspaceId, $recipientMemberId, $notificationId);
            if ($updated) {
                $this->auditLogger->record($workspaceId, $recipientMemberId, 'notification.read', 'Notification', (string) $notificationId, array());
            }
            $this->database->commit();
            return $updated;
        } catch (\Throwable $error) {
            $this->database->rollback();
            throw $error;
        }
    }

    public function markDismissed(int $workspaceId, int $recipientMemberId, int $notificationId): bool
    {
        $this->database->begin_transaction();
        try {
            $updated = $this->repository->markDismissed($workspaceId, $recipientMemberId, $notificationId);
            if ($updated) {
                $this->auditLogger->record($workspaceId, $recipientMemberId, 'notification.dismissed', 'Notification', (string) $notificationId, array());
            }
            $this->database->commit();
            return $updated;
        } catch (\Throwable $error) {
            $this->database->rollback();
            throw $error;
        }
    }

    public function listForRecipient(int $workspaceId, int $recipientMemberId, array $filters, int $page, int $perPage): array
    {
        $page = max(1, $page);
        $perPage = max(1, min(100, $perPage));
        return $this->repository->listForRecipient($workspaceId, $recipientMemberId, $filters, $page, $perPage);
    }

    public function setPreference(int $workspaceId, int $memberId, string $eventType, string $channel, bool $enabled)
    {
        if (!in_array($channel, array('in_app', 'email'), true)) {
            throw new ValidationException('Invalid notification channel.');
        }
        $this->database->begin_transaction();
        try {
            $this->repository->setPreference($workspaceId, $memberId, $eventType, $channel, $enabled);
            $this->auditLogger->record(
                $workspaceId,
                $memberId,
                'notification.preference_updated',
                'NotificationPreference',
                $eventType . ':' . $channel,
                array('event_type' => $eventType, 'channel' => $channel, 'enabled' => $enabled)
            );
            $this->database->commit();
        } catch (\Throwable $error) {
            $this->database->rollback();
            throw $error;
        }
    }

    public function listPreferencesForMember(int $workspaceId, int $memberId): array
    {
        return $this->repository->listPreferencesForMember($workspaceId, $memberId);
    }

    private function isChannelEnabled(int $workspaceId, int $memberId, string $eventType, string $channel): bool
    {
        $preference = $this->repository->findPreference($workspaceId, $memberId, $eventType, $channel);
        if (is_array($preference)) {
            return (bool) $preference['enabled'];
        }
        return self::DEFAULT_CHANNEL_ENABLED[$channel];
    }

    /** in_app delivery is synchronous and immediate -- the row being visible via the read API IS the delivery, no external call, no queue. */
    private function deliverInApp(int $workspaceId, int $memberId, string $eventType, int $notificationId)
    {
        if (!$this->isChannelEnabled($workspaceId, $memberId, $eventType, 'in_app')) {
            $this->repository->createDeliveryIfNotExists($workspaceId, $notificationId, 'in_app', 'skipped_disabled', null, null);
            return;
        }
        $this->repository->createDeliveryIfNotExists($workspaceId, $notificationId, 'in_app', 'delivered', null, null);
    }

    /**
     * Email delivery, per the task packet's "不得在 domain transaction 內同步
     * 呼叫外部 provider": if eligible, this ENQUEUES a Queue Job
     * (V11-02) rather than calling any provider directly -- the actual send
     * happens later, in a worker batch, via
     * `EmailDeliveryHandler::handle()`. Two independent gates must BOTH
     * pass before anything is even enqueued: the recipient's own
     * preference, AND the provider being genuinely configured -- an
     * unconfigured provider is recorded as `skipped_unconfigured`
     * immediately, never a queued job that would only fail later.
     */
    private function deliverEmail(int $workspaceId, int $memberId, string $eventType, int $notificationId)
    {
        if (!$this->isChannelEnabled($workspaceId, $memberId, $eventType, 'email')) {
            $this->repository->createDeliveryIfNotExists($workspaceId, $notificationId, 'email', 'skipped_disabled', null, null);
            return;
        }
        if (!$this->isEmailProviderConfigured()) {
            $this->repository->createDeliveryIfNotExists($workspaceId, $notificationId, 'email', 'skipped_unconfigured', null, null);
            return;
        }

        // workspace_id travels in the payload itself -- the Queue Job
        // handler below has no other way to know which workspace this
        // notification belongs to (queue_jobs.workspace_id is available to
        // QueueService internally, but handlers only ever receive the
        // decoded payload, never the raw job row -- keeping that boundary
        // means a handler can never accidentally read OTHER job metadata).
        $job = $this->queueService->enqueue(
            $workspaceId,
            'notification.email',
            array('workspace_id' => $workspaceId, 'notification_id' => $notificationId),
            100,
            5
        );
        $this->repository->createDeliveryIfNotExists($workspaceId, $notificationId, 'email', 'pending', (int) $job['id'], null);
    }

    /**
     * The `notification.email` Queue Job handler -- registered into
     * QueueService::runBatch()'s handler registry by `public/index.php`.
     * Delegates the actual send to `EmailDeliveryHandler`, which has no
     * real provider integration yet (see its own class doc) -- this
     * correctly fails and goes through V11-02's normal retry/dead-letter
     * path rather than fabricating a successful send.
     *
     * @param array<string, mixed> $payload
     */
    public function handleEmailDeliveryJob(array $payload, EmailDeliveryHandler $handler)
    {
        $workspaceId = isset($payload['workspace_id']) ? (int) $payload['workspace_id'] : 0;
        $notificationId = isset($payload['notification_id']) ? (int) $payload['notification_id'] : 0;
        if ($workspaceId <= 0 || $notificationId <= 0) {
            throw new \RuntimeException('notification.email job payload missing workspace_id/notification_id.');
        }

        try {
            $handler->send($notificationId);
            $this->recordEmailDeliveryOutcome($workspaceId, $notificationId, true, null);
        } catch (\Throwable $error) {
            $this->recordEmailDeliveryOutcome($workspaceId, $notificationId, false, $error->getMessage());
            throw $error;
        }
    }

    /** @param mixed $errorMessage string|null */
    private function recordEmailDeliveryOutcome(int $workspaceId, int $notificationId, bool $success, $errorMessage)
    {
        $delivery = $this->repository->findDelivery($workspaceId, $notificationId, 'email');
        if (!is_array($delivery)) {
            return;
        }
        $this->repository->updateDeliveryStatus(
            $workspaceId,
            (int) $delivery['id'],
            $success ? 'sent' : 'failed',
            (int) $delivery['attempt'] + 1,
            $errorMessage
        );
    }
}
