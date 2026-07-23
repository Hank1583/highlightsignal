<?php

declare(strict_types=1);

namespace HighlightSignal\Tests\Unit\Audit;

use HighlightSignal\Audit\AuditLogger;
use mysqli;
use PHPUnit\Framework\TestCase;
use ReflectionClass;

/**
 * V12-02: `AuditLogger::redact()`/`encodeMetadata()` are pure functions of
 * their argument -- they never touch `$this->database` -- so this tests
 * them via Reflection against a real-but-UNCONNECTED `mysqli` instance
 * (`new mysqli()` with no arguments never attempts a connection), with zero
 * database dependency. The redaction guarantee itself was already proven
 * end-to-end against a real database in V11-07's disposable rehearsal; this
 * is the fast, permanent regression version of that same guarantee.
 */
final class AuditLoggerRedactionTest extends TestCase
{
    private function encode(array $metadata): string
    {
        $logger = new AuditLogger(new mysqli());
        $reflection = new ReflectionClass($logger);
        $method = $reflection->getMethod('encodeMetadata');
        $method->setAccessible(true);
        return $method->invoke($logger, $metadata);
    }

    public function testPasswordKeyIsWhollyRedacted(): void
    {
        $json = $this->encode(['password' => 'my-real-secret']);
        $this->assertStringNotContainsString('my-real-secret', $json);
        $this->assertStringContainsString('[REDACTED]', $json);
    }

    public function testApiKeyKeyIsWhollyRedacted(): void
    {
        $json = $this->encode(['api_key' => 'sk-should-not-leak']);
        $this->assertStringNotContainsString('sk-should-not-leak', $json);
    }

    public function testBearerTokenPatternIsScrubbedFromAnOtherwiseLegitimateString(): void
    {
        $json = $this->encode(['note' => 'Authorization: Bearer abcxyz.123-secret']);
        $this->assertStringNotContainsString('abcxyz.123-secret', $json);
        $this->assertStringContainsString('Bearer [REDACTED]', $json);
    }

    public function testNonSensitiveFieldSurvivesUntouched(): void
    {
        $json = $this->encode(['safe_field' => 'this stays']);
        $this->assertStringContainsString('this stays', $json);
    }

    public function testSchemaVersionIsAlwaysStamped(): void
    {
        $json = $this->encode(['x' => 1]);
        $this->assertStringContainsString('"_schema_version":1', $json);
    }

    public function testOversizeMetadataIsReplacedWithATruncationMarker(): void
    {
        $json = $this->encode(['blob' => str_repeat('x', 8000)]);
        $this->assertLessThan(500, strlen($json));
        $this->assertStringContainsString('_truncated', $json);
    }
}
