<?php

declare(strict_types=1);

require_once __DIR__ . '/../common.php';

$body = si_input();
$userId = si_positive_int($body, 'user_id');
$conn = si_db();
$sites = [];
$seen = [];

$stmt = $conn->prepare(
    'SELECT id, site_name, site_url
     FROM si_sites
     WHERE user_id = ? AND is_active = 1
     ORDER BY id DESC'
);

if (!$stmt) {
    si_fail('SQL_PREPARE_FAILED', $conn->error, 500);
}

$stmt->bind_param('i', $userId);
$stmt->execute();
$result = $stmt->get_result();

while ($row = $result->fetch_assoc()) {
    $id = (int)$row['id'];
    $seen[$id] = true;
    $sites[] = [
        'id' => $id,
        'site_name' => $row['site_name'] ?: null,
        'site_url' => $row['site_url'],
    ];
}

if (si_table_exists_for_sites('seo_sites')) {
    $seoStmt = $conn->prepare(
        'SELECT id, site_name, site_url
         FROM seo_sites
         WHERE user_id = ?
         ORDER BY id DESC'
    );

    if ($seoStmt) {
        $seoStmt->bind_param('i', $userId);
        $seoStmt->execute();
        $seoResult = $seoStmt->get_result();

        while ($row = $seoResult->fetch_assoc()) {
            $id = (int)$row['id'];
            if (isset($seen[$id])) {
                continue;
            }

            $seen[$id] = true;
            $sites[] = [
                'id' => $id,
                'site_name' => $row['site_name'] ?: null,
                'site_url' => $row['site_url'],
            ];
        }
    }
}

si_success($sites);

function si_table_exists_for_sites($table)
{
    $conn = si_db();
    $stmt = $conn->prepare(
        'SELECT COUNT(*) AS total FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?'
    );

    if (!$stmt) {
        return false;
    }

    $stmt->bind_param('s', $table);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();

    return (int)($row['total'] ?? 0) > 0;
}

