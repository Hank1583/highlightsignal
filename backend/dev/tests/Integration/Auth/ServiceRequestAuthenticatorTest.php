<?php

declare(strict_types=1);

namespace HighlightSignal\Tests\Integration\Auth;

use HighlightSignal\Auth\AuthenticationException;
use HighlightSignal\Auth\ServiceRequestAuthenticator;
use HighlightSignal\Http\Request;
use HighlightSignal\Tests\Support\DatabaseTestCase;

/**
 * V12-02: covers this task's "JWT/signature/nonce" required scenario on the
 * PHP side (JWT itself is signed/verified entirely in the Next.js frontend
 * via `jose` -- see the frontend test suite for that half). Requires a real
 * database because a valid request also CLAIMS a row in
 * `service_request_nonces`, which is the actual replay-protection
 * mechanism -- a mock could not prove replay rejection for real.
 */
final class ServiceRequestAuthenticatorTest extends DatabaseTestCase
{
    private const SECRET = 'test-only-service-auth-secret-not-a-real-secret-32chars';

    protected function setUp(): void
    {
        parent::setUp();
        putenv('SERVICE_AUTH_SECRET=' . self::SECRET);
        putenv('SERVICE_AUTH_TTL_SECONDS=60');
    }

    private function sign(string $method, string $path, string $body, int $timestamp, string $nonce, int $memberId, int $workspaceId): string
    {
        $canonical = implode("\n", [$method, $path, hash('sha256', $body), (string) $timestamp, $nonce, (string) $memberId, (string) $workspaceId]);
        return hash_hmac('sha256', $canonical, self::SECRET);
    }

    private function requestWith(array $overrides = []): Request
    {
        $memberId = $overrides['memberId'] ?? $this->freshMemberId();
        $workspaceId = $overrides['workspaceId'] ?? 1;
        $timestamp = $overrides['timestamp'] ?? time();
        $nonce = $overrides['nonce'] ?? bin2hex(random_bytes(16));
        $method = $overrides['method'] ?? 'GET';
        $path = $overrides['path'] ?? '/api/v1/workspaces';
        $body = $overrides['body'] ?? '';

        $signature = $overrides['signature'] ?? $this->sign($method, $path, $body, $timestamp, $nonce, $memberId, $workspaceId);

        return new Request($method, $path, $body, [
            'x-hs-timestamp' => (string) $timestamp,
            'x-hs-nonce' => $nonce,
            'x-hs-member-id' => (string) $memberId,
            'x-hs-workspace-id' => (string) $workspaceId,
            'x-hs-signature' => $signature,
        ]);
    }

    public function testValidSignatureIsAccepted(): void
    {
        $authenticator = new ServiceRequestAuthenticator($this->db());
        $identity = $authenticator->authenticate($this->requestWith());
        $this->assertGreaterThan(0, $identity->memberId);
    }

    public function testTamperedSignatureIsRejected(): void
    {
        $authenticator = new ServiceRequestAuthenticator($this->db());
        $request = $this->requestWith(['signature' => str_repeat('0', 64)]);

        $this->expectException(AuthenticationException::class);
        $authenticator->authenticate($request);
    }

    public function testTamperedBodyInvalidatesSignature(): void
    {
        // Sign for one body, then send a DIFFERENT body -- the signature
        // covers a hash of the body, so this must be rejected exactly like
        // a tampered signature would be.
        $memberId = $this->freshMemberId();
        $timestamp = time();
        $nonce = bin2hex(random_bytes(16));
        $signature = $this->sign('POST', '/api/v1/workspaces', '{"a":1}', $timestamp, $nonce, $memberId, 1);

        $request = new Request('POST', '/api/v1/workspaces', '{"a":2}', [
            'x-hs-timestamp' => (string) $timestamp,
            'x-hs-nonce' => $nonce,
            'x-hs-member-id' => (string) $memberId,
            'x-hs-workspace-id' => '1',
            'x-hs-signature' => $signature,
        ]);

        $authenticator = new ServiceRequestAuthenticator($this->db());
        $this->expectException(AuthenticationException::class);
        $authenticator->authenticate($request);
    }

    public function testExpiredTimestampIsRejected(): void
    {
        $authenticator = new ServiceRequestAuthenticator($this->db());
        $request = $this->requestWith(['timestamp' => time() - 3600]);

        $this->expectException(AuthenticationException::class);
        $authenticator->authenticate($request);
    }

    public function testReplayedNonceIsRejectedOnSecondUse(): void
    {
        $nonce = bin2hex(random_bytes(16));
        $memberId = $this->freshMemberId();
        $timestamp = time();

        $authenticator = new ServiceRequestAuthenticator($this->db());
        $first = $this->requestWith(['nonce' => $nonce, 'memberId' => $memberId, 'timestamp' => $timestamp]);
        $authenticator->authenticate($first);

        // Same signed request, replayed exactly -- must be rejected the
        // second time even though the signature itself is still valid.
        $second = $this->requestWith(['nonce' => $nonce, 'memberId' => $memberId, 'timestamp' => $timestamp]);
        $this->expectException(AuthenticationException::class);
        $authenticator->authenticate($second);
    }

    public function testInvalidNonceShapeIsRejected(): void
    {
        $authenticator = new ServiceRequestAuthenticator($this->db());
        $request = $this->requestWith(['nonce' => 'too-short']);

        $this->expectException(AuthenticationException::class);
        $authenticator->authenticate($request);
    }
}
