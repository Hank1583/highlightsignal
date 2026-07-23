<?php

declare(strict_types=1);

namespace HighlightSignal\Queue;

use HighlightSignal\Auth\AuthenticationException;
use HighlightSignal\Config\Environment;
use HighlightSignal\Http\Request;
use mysqli;

/**
 * V11-02: authenticates the queue worker trigger endpoint
 * (`POST /api/v1/queue/run`) -- deliberately NOT
 * `HighlightSignal\Auth\ServiceRequestAuthenticator`, which requires a
 * member/workspace identity that has no meaning here (the worker processes
 * jobs across ALL workspaces, it is not acting on behalf of one member in
 * one workspace). Same HMAC-timestamp-nonce shape as
 * ServiceRequestAuthenticator (replay-safe, reuses the same
 * `service_request_nonces` table -- a generic nonce+expiry table, not tied
 * to member requests), but signed with its own secret
 * (`QUEUE_WORKER_SECRET`) so a leaked frontend `SERVICE_AUTH_SECRET` can
 * never be used to trigger the worker, and vice versa.
 *
 * This is the "受簽章保護的短批次 HTTP worker" trigger the task packet asks
 * for a decision on. The external scheduler that calls this endpoint on a
 * schedule (a free cron-ping service, a GitHub Actions scheduled workflow,
 * a Cloudflare Cron Trigger hitting the URL, etc.) is an operational choice
 * left to whoever configures the real host -- this class only guarantees
 * the endpoint cannot be triggered by anyone who doesn't hold the secret.
 */
final class WorkerRequestAuthenticator
{
    private $database;

    public function __construct(mysqli $database)
    {
        $this->database = $database;
    }

    public function authenticate(Request $request)
    {
        $timestamp = $this->requiredHeader($request, 'x-hs-worker-timestamp');
        $nonce = $this->requiredHeader($request, 'x-hs-worker-nonce');
        $providedSignature = $this->requiredHeader($request, 'x-hs-worker-signature');

        $timestampValue = filter_var($timestamp, FILTER_VALIDATE_INT);
        if ($timestampValue === false) {
            throw new AuthenticationException('Invalid worker timestamp.');
        }

        $ttl = Environment::integer('SERVICE_AUTH_TTL_SECONDS', 60);
        if (abs(time() - $timestampValue) > $ttl) {
            throw new AuthenticationException('Expired worker request.');
        }

        if (!preg_match('/^[A-Za-z0-9_-]{16,128}$/', $nonce)) {
            throw new AuthenticationException('Invalid worker nonce.');
        }

        $canonical = implode("\n", [
            $request->method,
            $request->path,
            hash('sha256', $request->body),
            (string) $timestampValue,
            $nonce,
        ]);

        $expected = hash_hmac('sha256', $canonical, Environment::require('QUEUE_WORKER_SECRET'));
        if (!hash_equals($expected, $providedSignature)) {
            throw new AuthenticationException('Invalid worker signature.');
        }

        $this->claimNonce($nonce, $timestampValue);
    }

    private function requiredHeader(Request $request, string $name): string
    {
        $value = $request->header($name);
        if ($value === null || $value === '') {
            throw new AuthenticationException(sprintf('Missing worker header %s.', $name));
        }

        return $value;
    }

    private function claimNonce(string $nonce, int $timestamp)
    {
        $statement = $this->database->prepare(
            'INSERT INTO service_request_nonces (nonce, requested_at, expires_at) VALUES (?, FROM_UNIXTIME(?), FROM_UNIXTIME(?))'
        );
        if ($statement === false) {
            throw new \RuntimeException('Unable to prepare worker nonce claim.');
        }
        $expiresAt = $timestamp + Environment::integer('SERVICE_AUTH_TTL_SECONDS', 60);
        $statement->bind_param('sii', $nonce, $timestamp, $expiresAt);

        // V12-02: same fix as ServiceRequestAuthenticator::claimNonce() --
        // this connection always runs with MYSQLI_REPORT_STRICT, so
        // execute() throws on a duplicate key rather than returning false;
        // the old `if (!$statement->execute())` check here was dead code.
        try {
            $statement->execute();
        } catch (\mysqli_sql_exception $error) {
            if ((int) $error->getCode() === 1062) {
                throw new AuthenticationException('Duplicate signed worker request.');
            }
            throw new \RuntimeException('Unable to claim worker nonce.', 0, $error);
        }
    }
}
