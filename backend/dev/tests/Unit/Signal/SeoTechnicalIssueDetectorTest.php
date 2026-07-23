<?php

declare(strict_types=1);

namespace HighlightSignal\Tests\Unit\Signal;

use HighlightSignal\Signal\Detector\SeoTechnicalIssueDetector;
use PHPUnit\Framework\TestCase;

/**
 * V12-02: `SeoTechnicalIssueDetector` is deliberately stateless/self-contained
 * (see its own class doc) -- no database, no caller coupling -- making it
 * the cleanest pure-logic unit test candidate in the Signal domain.
 */
final class SeoTechnicalIssueDetectorTest extends TestCase
{
    public function testNewIssueProducesAnUpsertPlanEntry(): void
    {
        $detector = new SeoTechnicalIssueDetector();
        $plan = $detector->diff(501, [
            ['type' => 'missing_title', 'url' => '/a', 'severity' => 'high', 'message' => 'Missing title'],
        ], []);

        $this->assertCount(1, $plan['to_upsert']);
        $this->assertSame([], $plan['to_resolve']);
        $this->assertSame('high', $plan['to_upsert'][0]['severity']);
        $this->assertSame('seo', $plan['to_upsert'][0]['source']);
    }

    public function testIssueNoLongerPresentProducesAResolvePlanEntry(): void
    {
        $detector = new SeoTechnicalIssueDetector();
        $plan = $detector->diff(501, [], [
            ['type' => 'missing_title', 'url' => '/a', 'severity' => 'high', 'message' => 'Missing title'],
        ]);

        $this->assertSame([], $plan['to_upsert']);
        $this->assertCount(1, $plan['to_resolve']);
    }

    public function testDedupKeyIsStableAcrossCaseAndTrailingSlash(): void
    {
        $a = SeoTechnicalIssueDetector::computeDedupKey(501, 'missing_title', '/a/');
        $b = SeoTechnicalIssueDetector::computeDedupKey(501, 'MISSING_TITLE', '/a');
        $this->assertSame($a, $b);
    }

    public function testDedupKeyDiffersAcrossSites(): void
    {
        $a = SeoTechnicalIssueDetector::computeDedupKey(501, 'missing_title', '/a');
        $b = SeoTechnicalIssueDetector::computeDedupKey(502, 'missing_title', '/a');
        $this->assertNotSame($a, $b);
    }

    public function testSeverityMapsUnknownValuesToLow(): void
    {
        $detector = new SeoTechnicalIssueDetector();
        $plan = $detector->diff(501, [
            ['type' => 'x', 'url' => '/a', 'severity' => 'not_a_real_severity'],
        ], []);
        $this->assertSame('low', $plan['to_upsert'][0]['severity']);
    }
}
