<?php

declare(strict_types=1);

$backendRoot = dirname(__DIR__);
$vendorAutoload = $backendRoot . '/vendor/autoload.php';

if (is_file($vendorAutoload)) {
    require $vendorAutoload;
} else {
    spl_autoload_register(static function (string $class) use ($backendRoot) {
        $prefix = 'HighlightSignal\\';
        if (strpos($class, $prefix) !== 0) {
            return;
        }

        $relative = substr($class, strlen($prefix));
        $file = $backendRoot . '/src/' . str_replace('\\', '/', $relative) . '.php';
        if (is_file($file)) {
            require $file;
        }
    });
}

$environmentFile = getenv('HIGHLIGHT_SIGNAL_ENV_FILE');
if ($environmentFile === false || trim($environmentFile) === '') {
    $environmentFile = dirname($backendRoot) . '/highlightsignal/private/.env';
}

HighlightSignal\Config\Environment::load($environmentFile);

date_default_timezone_set('UTC');
