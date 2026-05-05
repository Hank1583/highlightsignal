<?php

declare(strict_types=1);

require_once __DIR__ . '/common.php';

function si_handle_save_summary($forcedModule = null)
{
    $body = si_input();
    si_success(si_create_summary_payload($body, $forcedModule));
}

function si_create_summary_payload(array $body, $forcedModule = null)
{
    $userId = si_positive_int($body, 'user_id');
    $siteId = si_positive_int($body, 'site_id');
    $module = $forcedModule ?: si_clean_key($body['module'] ?? '');
    $tabKey = si_clean_key($body['tab'] ?? 'overview');

    if (!in_array($module, ['aeo', 'geo'], true)) {
        si_fail('INVALID_MODULE', 'module must be aeo or geo.', 400);
    }

    $title = trim((string)($body['title'] ?? ''));

    if ($title === '') {
        si_fail('MISSING_TITLE', 'title is required.', 400);
    }

    $conn = si_db();
    $conn->begin_transaction();

    try {
        $siteStmt = $conn->prepare(
            'SELECT id FROM si_sites WHERE id = ? AND user_id = ? AND is_active = 1'
        );

        if (!$siteStmt) {
            throw new RuntimeException($conn->error);
        }

        $siteStmt->bind_param('ii', $siteId, $userId);
        $siteStmt->execute();

        if (!$siteStmt->get_result()->fetch_assoc()) {
            throw new RuntimeException('SITE_NOT_FOUND');
        }

        $description = (string)($body['desc'] ?? '');
        $panelTitle = (string)($body['panelTitle'] ?? '');
        $sideTitle = (string)($body['sideTitle'] ?? '');
        $recommendation = (string)($body['recommendation'] ?? '');
        $source = (string)($body['source'] ?? 'manual');
        $status = (string)($body['status'] ?? 'ready');

        $stmt = $conn->prepare(
            'INSERT INTO si_analysis_runs
             (user_id, site_id, module, tab_key, title, description, panel_title, side_title, recommendation, source, status, analyzed_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())'
        );

        if (!$stmt) {
            throw new RuntimeException($conn->error);
        }

        $stmt->bind_param(
            'iisssssssss',
            $userId,
            $siteId,
            $module,
            $tabKey,
            $title,
            $description,
            $panelTitle,
            $sideTitle,
            $recommendation,
            $source,
            $status
        );
        $stmt->execute();

        $runId = (int)$conn->insert_id;

        si_insert_metrics($conn, $runId, $body['metrics'] ?? []);
        si_insert_items($conn, $runId, $body['items'] ?? []);
        si_insert_actions($conn, $runId, $body['actions'] ?? []);
        si_insert_side_items($conn, $runId, $body['sideItems'] ?? []);

        $conn->commit();

        return [
            'id' => $runId,
            'module' => $module,
            'tab' => $tabKey,
        ];
    } catch (Throwable $error) {
        $conn->rollback();

        if ($error instanceof RuntimeException && $error->getMessage() === 'SITE_NOT_FOUND') {
            si_fail('SITE_NOT_FOUND', 'Site not found.', 404);
        }

        si_fail('SAVE_FAILED', $error->getMessage(), 500);
    }
}

function si_insert_metrics(mysqli $conn, int $runId, $metrics)
{
    if (!is_array($metrics)) {
        return;
    }

    $stmt = $conn->prepare(
        'INSERT INTO si_analysis_metrics (run_id, label, value, note, basis, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)'
    );

    if (!$stmt) {
        throw new RuntimeException($conn->error);
    }

    foreach (array_values($metrics) as $index => $item) {
        if (!is_array($item)) {
            continue;
        }

        $label = (string)($item['label'] ?? '');
        $value = (string)($item['value'] ?? '');
        $note = (string)($item['note'] ?? '');
        $basis = (string)($item['basis'] ?? '');
        $sortOrder = (int)$index;

        $stmt->bind_param('issssi', $runId, $label, $value, $note, $basis, $sortOrder);
        $stmt->execute();
    }
}

function si_insert_items(mysqli $conn, int $runId, $items)
{
    if (!is_array($items)) {
        return;
    }

    $stmt = $conn->prepare(
        'INSERT INTO si_analysis_items (run_id, title, meta, status, source, tags_json, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    );

    if (!$stmt) {
        throw new RuntimeException($conn->error);
    }

    foreach (array_values($items) as $index => $item) {
        if (!is_array($item)) {
            continue;
        }

        $title = (string)($item['title'] ?? '');
        $meta = (string)($item['meta'] ?? '');
        $status = (string)($item['status'] ?? '');
        $source = (string)($item['source'] ?? '');
        $tags = $item['tags'] ?? [];
        $itemMeta = [
            'tags' => is_array($tags) ? array_values($tags) : [],
        ];

        foreach (['sourceLabel', 'placement', 'draft', 'draftMode', 'confidence', 'intent', 'basis'] as $key) {
            if (isset($item[$key]) && $item[$key] !== '') {
                $itemMeta[$key] = (string)$item[$key];
            }
        }

        $tagsJson = json_encode($itemMeta, JSON_UNESCAPED_UNICODE);
        $sortOrder = (int)$index;

        $stmt->bind_param('isssssi', $runId, $title, $meta, $status, $source, $tagsJson, $sortOrder);
        $stmt->execute();
    }
}

function si_insert_actions(mysqli $conn, int $runId, $actions)
{
    if (!is_array($actions)) {
        return;
    }

    $stmt = $conn->prepare(
        'INSERT INTO si_analysis_actions (run_id, action_text, sort_order)
         VALUES (?, ?, ?)'
    );

    if (!$stmt) {
        throw new RuntimeException($conn->error);
    }

    foreach (array_values($actions) as $index => $action) {
        $text = trim((string)$action);
        if ($text === '') {
            continue;
        }

        $sortOrder = (int)$index;
        $stmt->bind_param('isi', $runId, $text, $sortOrder);
        $stmt->execute();
    }
}

function si_insert_side_items(mysqli $conn, int $runId, $items)
{
    if (!is_array($items)) {
        return;
    }

    $stmt = $conn->prepare(
        'INSERT INTO si_analysis_side_items (run_id, name, score, sort_order)
         VALUES (?, ?, ?, ?)'
    );

    if (!$stmt) {
        throw new RuntimeException($conn->error);
    }

    foreach (array_values($items) as $index => $item) {
        if (!is_array($item)) {
            continue;
        }

        $name = (string)($item['name'] ?? '');
        $score = (float)($item['score'] ?? 0);
        $sortOrder = (int)$index;

        $stmt->bind_param('isdi', $runId, $name, $score, $sortOrder);
        $stmt->execute();
    }
}
