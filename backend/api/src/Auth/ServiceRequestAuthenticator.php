<?php

declare(strict_types=1);

namespace HighlightSignal\Auth;

use HighlightSignal\Config\Environment;
use HighlightSignal\Http\Request;
use mysqli;

final class ServiceRequestAuthenticator
{
    private $database;

    public function __construct(mysqli $database)
    {
        $this->database = $database;
    }

    public function authenticate(Request $request): ServiceIdentity
    {
        $timestamp = $this->requiredHeader($request, 'x-hs-timestamp');
        $nonce = $this->requiredHeader($request, 'x-hs-nonce');
        $memberId = $this->positiveInteger($this->requiredHeader($request, 'x-hs-member-id'));
        $workspaceId = $this->nonNegativeInteger($this->requiredHeader($request, 'x-hs-workspace-id'));
        $providedSignature = $this->requiredHeader($request, 'x-hs-signature');

        $timestampValue = filter_var($timestamp, FILTER_VALIDATE_INT);
        if ($timestampValue === false) {
            throw new AuthenticationException('Invalid service timestamp.');
        }

        $ttl = Environment::integer('SERVICE_AUTH_TTL_SECONDS', 60);
        if (abs(time() - $timestampValue) > $ttl) {
            throw new AuthenticationException('Expired service request.');
        }

        if (!preg_match('/^[A-Za-z0-9_-]{16,128}$/', $nonce)) {
            throw new AuthenticationException('Invalid service nonce.');
        }

        $canonical = implode("\n", [
            $request->method,
            $request->path,
            hash('sha256', $request->body),
            (string) $timestampValue,
            $nonce,
            (string) $memberId,
            (string) $workspaceId,
        ]);

        $expected = hash_hmac('sha256', $canonical, Environment::require('SERVICE_AUTH_SECRET'));
        if (!hash_equals($expected, $providedSignature)) {
            throw new AuthenticationException('Invalid service signature.');
        }

        $this->claimNonce($nonce, $timestampValue);
        return new ServiceIdentity($memberId, $workspaceId, $nonce);
    }

    private function requiredHeader(Request $request, string $name): string
    {
        $value = $request->header($name);
        if ($value === null || $value === '') {
            throw new AuthenticationException(sprintf('Missing service header %s.', $name));
        }

        return $value;
    }

    private function positiveInteger(string $value): int
    {
        $integer = filter_var($value, FILTER_VALIDATE_INT);
        if ($integer === false || $integer <= 0) {
            throw new AuthenticationException('Invalid service identity.');
        }

        return $integer;
    }

    private function nonNegativeInteger(string $value): int
    {
        $integer = filter_var($value, FILTER_VALIDATE_INT);
        if ($integer === false || $integer < 0) {
            throw new AuthenticationException('Invalid workspace identity.');
        }

        return $integer;
    }

    private function claimNonce(string $nonce, int $timestamp)
    {
        $statement = $this->database->prepare(
            'INSERT INTO service_request_nonces (nonce, requested_at, expires_at) VALUES (?, FROM_UNIXTIME(?), FROM_UNIXTIME(?))'
        );
        $expiresAt = $timestamp + Environment::integer('SERVICE_AUTH_TTL_SECONDS', 60);
        $statement->bind_param('sii', $nonce, $timestamp, $expiresAt);
        $statement->execute();

        $cleanupPercent = Environment::integer('SERVICE_AUTH_NONCE_CLEANUP_PERCENT', 1);
        if ($cleanupPercent > 0 && mt_rand(1, 100) <= min(100, $cleanupPercent)) {
            $this->database->query(
                'DELETE FROM service_request_nonces WHERE expires_at < NOW() LIMIT 1000'
            );
        }
    }
}
