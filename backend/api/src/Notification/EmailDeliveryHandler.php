<?php

declare(strict_types=1);

namespace HighlightSignal\Notification;

/**
 * V11-06: the actual "call an external email provider" integration point.
 * NO real provider is wired up by this task -- `send()` always throws.
 * This is deliberate and documented, not an oversight: this project has no
 * chosen transactional email provider/credentials yet, and building a real
 * integration against a provider nobody has decided on (and this
 * environment cannot test against real credentials for) would be exactly
 * the kind of speculative, untestable work this project avoids elsewhere.
 *
 * What IS real: the structure around this class (queue-based delivery,
 * retry/backoff/dead-letter via V11-02, `skipped_unconfigured` vs `pending`/
 * `failed` states, workspace-scoped delivery tracking) -- a future task
 * only needs to replace THIS class's `send()` body with a real provider
 * call (SMTP, SendGrid, Postmark, etc.) and everything else keeps working
 * unchanged. Never claims success it cannot back up.
 */
final class EmailDeliveryHandler
{
    /**
     * @throws \RuntimeException always, until a real provider is wired up
     */
    public function send(int $notificationId)
    {
        throw new \RuntimeException(
            'No email provider is implemented yet (EmailDeliveryHandler is a documented stub) -- ' .
            'configure a real provider integration before relying on email delivery in production.'
        );
    }
}
