<?php

declare(strict_types=1);

require_once __DIR__ . '/../common.php';

$body = si_input();
$userId = si_positive_int($body, 'user_id');
$siteId = si_positive_int($body, 'site_id');
$tabKey = si_clean_key($body['tab'] ?? 'overview');
$limit = isset($body['limit']) ? (int)$body['limit'] : 10;

si_success(si_summary_history('geo', $userId, $siteId, $tabKey, $limit));
