<?php

declare(strict_types=1);

use HighlightSignal\Config\Environment;

require_once __DIR__ . '/config/bootstrap.php';

try {
    $conn = new mysqli(
        Environment::require('DB_HOST'),
        Environment::require('DB_USER'),
        Environment::require('DB_PASSWORD'),
        Environment::require('DB_NAME'),
        Environment::integer('DB_PORT', 3306)
    );
} catch (RuntimeException $error) {
    http_response_code(500);
    die(json_encode(['status' => 'error', 'message' => 'Backend configuration is incomplete']));
}
$conn->set_charset('utf8mb4');

if ($conn->connect_error) {
    http_response_code(500);
    die(json_encode(['status' => 'error', 'message' => 'Database connection failed']));
}

define('SI_AI_POLISH_ENABLED', Environment::get('SI_AI_POLISH_ENABLED', 'false'));
define('SI_AI_API_KEY', Environment::get('OPENAI_API_KEY', ''));
define('SI_AI_API_URL', Environment::get('OPENAI_API_URL', 'https://api.openai.com/v1/chat/completions'));
define('SI_AI_MODEL', Environment::get('OPENAI_MODEL', 'gpt-4.1-mini'));
define('PAGESPEED_API_KEY', Environment::get('PAGESPEED_API_KEY', ''));
