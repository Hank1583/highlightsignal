<?php

declare(strict_types=1);

$envFile = __DIR__ . '/.env';
if (is_file($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || strpos($line, '#') === 0 || strpos($line, '=') === false) {
            continue;
        }
        list($name, $value) = array_map('trim', explode('=', $line, 2));
        if ($name !== '' && getenv($name) === false) {
            putenv($name . '=' . trim($value, " \t\n\r\0\x0B\"'"));
        }
    }
}

foreach (['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'] as $requiredVariable) {
    if (getenv($requiredVariable) === false || getenv($requiredVariable) === '') {
        http_response_code(500);
        die(json_encode(['status' => 'error', 'message' => 'Backend configuration is incomplete']));
    }
}

$conn = new mysqli(
    (string) getenv('DB_HOST'),
    (string) getenv('DB_USER'),
    (string) getenv('DB_PASSWORD'),
    (string) getenv('DB_NAME'),
    (int) (getenv('DB_PORT') ?: 3306)
);
$conn->set_charset('utf8mb4');

if ($conn->connect_error) {
    http_response_code(500);
    die(json_encode(['status' => 'error', 'message' => 'Database connection failed']));
}

define('SI_AI_POLISH_ENABLED', getenv('SI_AI_POLISH_ENABLED') ?: 'false');
define('SI_AI_API_KEY', getenv('OPENAI_API_KEY') ?: '');
define('SI_AI_API_URL', getenv('OPENAI_API_URL') ?: 'https://api.openai.com/v1/chat/completions');
define('SI_AI_MODEL', getenv('OPENAI_MODEL') ?: 'gpt-4.1-mini');
define('PAGESPEED_API_KEY', getenv('PAGESPEED_API_KEY') ?: '');
