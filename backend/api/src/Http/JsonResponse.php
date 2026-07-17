<?php

declare(strict_types=1);

namespace HighlightSignal\Http;

final class JsonResponse
{
    /** @param array<string, mixed> $payload */
    public static function send(array $payload, int $status = 200)
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        $encoded = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($encoded === false) {
            http_response_code(500);
            echo '{"ok":false,"error":{"code":"JSON_ENCODING_ERROR","message":"Unable to encode response"}}';
            exit;
        }
        echo $encoded;
        exit;
    }

    public static function error(string $code, string $message, int $status)
    {
        self::send([
            'ok' => false,
            'error' => [
                'code' => $code,
                'message' => $message,
            ],
        ], $status);
    }
}
