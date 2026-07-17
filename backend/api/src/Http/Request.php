<?php

declare(strict_types=1);

namespace HighlightSignal\Http;

final class Request
{
    public $method;
    public $path;
    public $routePath;
    public $body;
    public $headers;

    /** @param array<string, string> $headers */
    public function __construct(
        string $method,
        string $path,
        string $body,
        array $headers
    ) {
        $this->method = $method;
        $this->path = $path;
        $apiPosition = strpos($path, '/api/v1');
        $this->routePath = $apiPosition === false
            ? $path
            : substr($path, $apiPosition);
        $this->body = $body;
        $this->headers = $headers;
    }

    public static function fromGlobals(): self
    {
        $headers = [];
        $rawHeaders = function_exists('getallheaders') ? getallheaders() : array();
        foreach ($rawHeaders ?: array() as $name => $value) {
            $headers[strtolower((string) $name)] = trim((string) $value);
        }

        // Some Apache/FastCGI hosts omit custom headers from getallheaders(),
        // while still exposing them through HTTP_* server variables.
        foreach ($_SERVER as $name => $value) {
            if (strpos((string) $name, 'HTTP_') !== 0 || !is_scalar($value)) {
                continue;
            }

            $headerName = strtolower(str_replace('_', '-', substr((string) $name, 5)));
            if (!isset($headers[$headerName])) {
                $headers[$headerName] = trim((string) $value);
            }
        }

        $uri = (string) ($_SERVER['REQUEST_URI'] ?? '/');
        $path = parse_url($uri, PHP_URL_PATH) ?: '/';

        return new self(
            strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')),
            $path,
            (string) file_get_contents('php://input'),
            $headers
        );
    }

    public function header(string $name)
    {
        return $this->headers[strtolower($name)] ?? null;
    }

    /** @return array<string, mixed> */
    public function json(): array
    {
        if ($this->body === '') {
            return [];
        }

        $decoded = json_decode($this->body, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \InvalidArgumentException('Request body is not valid JSON.');
        }
        return is_array($decoded) ? $decoded : [];
    }
}
