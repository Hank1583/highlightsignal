<?php

declare(strict_types=1);

require dirname(__DIR__) . '/vendor/autoload.php';

// Same fallback autoloader `config/bootstrap.php` uses when vendor/autoload.php
// hasn't wired PSR-4 for `HighlightSignal\` yet in some environments -- belt
// and suspenders, composer's own autoload.php from require-dev already
// covers this via autoload-dev, but tests must never silently no-op on a
// missing class. `src/` lives in `backend/api/`, a sibling of this
// `backend/dev/` directory -- not moved alongside tests/vendor/composer,
// since it IS the real deployed payload.
spl_autoload_register(static function (string $class) {
    $prefix = 'HighlightSignal\\';
    if (strpos($class, $prefix) !== 0) {
        return;
    }
    $relative = substr($class, strlen($prefix));
    $file = dirname(__DIR__) . '/../api/src/' . str_replace('\\', '/', $relative) . '.php';
    if (is_file($file)) {
        require $file;
    }
});

date_default_timezone_set('UTC');
