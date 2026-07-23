<?php

declare(strict_types=1);

namespace HighlightSignal\Execution;

/**
 * V11-03: Execution Result records TECHNICAL completion of a Task or Queue
 * Job -- success/failure/output/error/duration -- and nothing about
 * Business Outcome (V11-04's job: whether it actually worked is a
 * different question, answered separately, later, sometimes never for a
 * Task that has no measurable business metric). This class enforces the
 * "exactly one of Task/Queue Job" rule MySQL 5.6 cannot enforce as a real
 * constraint, and owns redaction/size-limiting BEFORE anything reaches the
 * database -- the Repository never sees raw, unbounded handler output.
 */
final class ExecutionResultService
{
    const MAX_OUTPUT_BYTES = 4096;

    // Broad but targeted -- matches common secret shapes without
    // attempting to redact every long string (which would mangle
    // legitimate content like real IDs/hashes a human needs to debug with).
    const REDACTION_PATTERNS = array(
        '/\bbearer\s+[a-z0-9._-]+/i',
        '/\b(api[_-]?key|secret|token)(["\']?\s*[:=]\s*["\']?)[a-z0-9._-]{8,}/i',
        '/\bpassword(["\']?\s*[:=]\s*["\']?)\S+/i',
    );

    private $repository;

    public function __construct(ExecutionResultRepository $repository)
    {
        $this->repository = $repository;
    }

    /**
     * @param mixed $outputSummary string|null; $outputReference string|null; $errorCode string|null; $errorMessage string|null; $handlerVersion string|null
     */
    public function recordForTask(
        int $workspaceId,
        int $taskId,
        bool $success,
        int $attempt,
        int $startedAtUnix,
        int $completedAtUnix,
        $outputSummary = null,
        $outputReference = null,
        $errorCode = null,
        $errorMessage = null,
        $handlerVersion = null
    ): array {
        return $this->repository->recordForTask(
            $workspaceId,
            $taskId,
            $success ? 'success' : 'failure',
            $attempt,
            date('Y-m-d H:i:s', $startedAtUnix),
            date('Y-m-d H:i:s', $completedAtUnix),
            max(0, $completedAtUnix - $startedAtUnix) * 1000,
            $this->redactAndLimit($outputSummary),
            $outputReference,
            $errorCode,
            $this->redactAndLimit($errorMessage),
            $handlerVersion
        );
    }

    /** @param mixed $outputSummary string|null; $outputReference string|null; $errorCode string|null; $errorMessage string|null; $handlerVersion string|null */
    public function recordForQueueJob(
        int $workspaceId,
        int $queueJobId,
        bool $success,
        int $attempt,
        int $startedAtUnix,
        int $completedAtUnix,
        $outputSummary = null,
        $outputReference = null,
        $errorCode = null,
        $errorMessage = null,
        $handlerVersion = null
    ): array {
        return $this->repository->recordForQueueJob(
            $workspaceId,
            $queueJobId,
            $success ? 'success' : 'failure',
            $attempt,
            date('Y-m-d H:i:s', $startedAtUnix),
            date('Y-m-d H:i:s', $completedAtUnix),
            max(0, $completedAtUnix - $startedAtUnix) * 1000,
            $this->redactAndLimit($outputSummary),
            $outputReference,
            $errorCode,
            $this->redactAndLimit($errorMessage),
            $handlerVersion
        );
    }

    public function listForTask(int $workspaceId, int $taskId): array
    {
        return $this->repository->listForTask($workspaceId, $taskId);
    }

    public function listForWorkspace(int $workspaceId, array $filters, int $page, int $perPage): array
    {
        $page = max(1, $page);
        $perPage = max(1, min(100, $perPage));
        return $this->repository->listForWorkspace($workspaceId, $filters, $page, $perPage);
    }

    /** @param mixed $text string|null @return mixed string|null */
    private function redactAndLimit($text)
    {
        if ($text === null) {
            return null;
        }

        $text = (string) $text;
        foreach (self::REDACTION_PATTERNS as $pattern) {
            $text = preg_replace($pattern, '[REDACTED]', $text);
        }

        if (strlen($text) > self::MAX_OUTPUT_BYTES) {
            $text = substr($text, 0, self::MAX_OUTPUT_BYTES) . "\n...[truncated, see output_reference for the full artifact if one was recorded]";
        }

        return $text;
    }
}
