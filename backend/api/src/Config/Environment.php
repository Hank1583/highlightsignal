<?php

declare(strict_types=1);

namespace HighlightSignal\Config;

use RuntimeException;

final class Environment
{
    private static $loaded = false;

    public static function load(string $file)
    {
        if (self::$loaded || !is_file($file)) {
            self::$loaded = true;
            return;
        }

        $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines === false) {
            throw new RuntimeException('Unable to read environment file.');
        }

        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || strpos($line, '#') === 0 || strpos($line, '=') === false) {
                continue;
            }

            list($name, $value) = array_map('trim', explode('=', $line, 2));
            if ($name === '' || getenv($name) !== false) {
                continue;
            }

            $value = trim($value, " \t\n\r\0\x0B\"'");
            putenv($name . '=' . $value);
            $_ENV[$name] = $value;
        }

        self::$loaded = true;
    }

    public static function get(string $name, $default = null)
    {
        $value = getenv($name);
        return $value === false ? $default : $value;
    }

    public static function require(string $name): string
    {
        $value = self::get($name);
        if ($value === null || $value === '') {
            throw new RuntimeException(sprintf('Required environment variable %s is missing.', $name));
        }

        return $value;
    }

    public static function integer(string $name, int $default): int
    {
        $value = self::get($name);
        return $value === null || $value === '' ? $default : (int) $value;
    }
}
