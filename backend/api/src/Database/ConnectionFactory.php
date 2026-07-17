<?php

declare(strict_types=1);

namespace HighlightSignal\Database;

use HighlightSignal\Config\Environment;
use mysqli;
use RuntimeException;

final class ConnectionFactory
{
    public static function create(): mysqli
    {
        mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

        $connection = new mysqli(
            Environment::require('DB_HOST'),
            Environment::require('DB_USER'),
            Environment::require('DB_PASSWORD'),
            Environment::require('DB_NAME'),
            Environment::integer('DB_PORT', 3306)
        );
        $connection->set_charset('utf8mb4');

        if (!$connection->query("SET SESSION sql_mode = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'")) {
            throw new RuntimeException('Unable to configure database session.');
        }

        return $connection;
    }
}
