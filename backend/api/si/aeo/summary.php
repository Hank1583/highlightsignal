<?php

declare(strict_types=1);

require_once __DIR__ . '/../common.php';

$body = si_input();
$userId = si_positive_int($body, 'user_id');
$siteId = si_positive_int($body, 'site_id');
$tabKey = si_clean_key($body['tab'] ?? 'overview');

si_success(si_latest_summary('aeo', $userId, $siteId, $tabKey));

