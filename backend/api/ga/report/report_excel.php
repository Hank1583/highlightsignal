<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

function getOverviewData($connectionIds, $startDate, $endDate)
{
    $pdo = db();
    $in = implode(',', array_fill(0, count($connectionIds), '?'));

    $sql = "
        SELECT
            SUM(sessions) AS sessions,
            SUM(users) AS users,
            SUM(new_users) AS new_users,
            SUM(pageviews) AS pageviews,
            SUM(events) AS events,
            AVG(avg_session_duration) AS avg_session_duration,
            AVG(bounce_rate) AS bounce_rate
        FROM ga_daily_summary
        WHERE connection_id IN ($in)
          AND date BETWEEN ? AND ?
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute(array_merge($connectionIds, array($startDate, $endDate)));

    return $stmt->fetch() ?: array();
}

function getOverviewDailyData($connectionIds, $startDate, $endDate)
{
    $pdo = db();
    $in = implode(',', array_fill(0, count($connectionIds), '?'));

    $sql = "
        SELECT
            date,
            SUM(sessions) AS sessions,
            SUM(users) AS users,
            SUM(new_users) AS new_users,
            SUM(pageviews) AS pageviews,
            SUM(events) AS events,
            AVG(avg_session_duration) AS avg_session_duration,
            AVG(bounce_rate) AS bounce_rate
        FROM ga_daily_summary
        WHERE connection_id IN ($in)
          AND date BETWEEN ? AND ?
        GROUP BY date
        ORDER BY date ASC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute(array_merge($connectionIds, array($startDate, $endDate)));

    return $stmt->fetchAll();
}

function getPagesData($connectionIds, $startDate, $endDate)
{
    $pdo = db();
    $in = implode(',', array_fill(0, count($connectionIds), '?'));

    $sql = "
        SELECT
            page_title,
            page_path,
            SUM(pageviews) AS pageviews,
            SUM(users) AS users,
            AVG(avg_time) AS avg_time
        FROM ga_pages
        WHERE connection_id IN ($in)
          AND date BETWEEN ? AND ?
        GROUP BY page_path_hash, page_title, page_path
        ORDER BY pageviews DESC
        LIMIT 100
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute(array_merge($connectionIds, array($startDate, $endDate)));

    return $stmt->fetchAll();
}

function getConversionsData($connectionIds, $startDate, $endDate)
{
    $pdo = db();
    $in = implode(',', array_fill(0, count($connectionIds), '?'));

    $sql = "
        SELECT
            conversion_name,
            SUM(count) AS conversion_count,
            SUM(value) AS conversion_value
        FROM ga_conversions
        WHERE connection_id IN ($in)
          AND date BETWEEN ? AND ?
        GROUP BY conversion_name
        ORDER BY conversion_count DESC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute(array_merge($connectionIds, array($startDate, $endDate)));

    return $stmt->fetchAll();
}

function getEventsData($connectionIds, $startDate, $endDate)
{
    $pdo = db();
    $in = implode(',', array_fill(0, count($connectionIds), '?'));

    $sql = "
        SELECT
            event_name,
            SUM(event_count) AS event_count
        FROM ga_events
        WHERE connection_id IN ($in)
          AND date BETWEEN ? AND ?
        GROUP BY event_name
        ORDER BY event_count DESC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute(array_merge($connectionIds, array($startDate, $endDate)));

    return $stmt->fetchAll();
}

function getTrafficData($connectionIds, $startDate, $endDate)
{
    $pdo = db();
    $in = implode(',', array_fill(0, count($connectionIds), '?'));

    $sql = "
        SELECT
            channel_group,
            source,
            medium,
            device,
            SUM(sessions) AS sessions,
            SUM(users) AS users,
            SUM(new_users) AS new_users,
            SUM(conversions) AS conversions
        FROM ga_traffic_sources
        WHERE connection_id IN ($in)
          AND date BETWEEN ? AND ?
        GROUP BY channel_group, source, medium, device
        ORDER BY sessions DESC
        LIMIT 100
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute(array_merge($connectionIds, array($startDate, $endDate)));

    return $stmt->fetchAll();
}

function csvLine($row)
{
    $fp = fopen('php://temp', 'r+');
    fputcsv($fp, $row);
    rewind($fp);
    $csv = stream_get_contents($fp);
    fclose($fp);
    return $csv;
}

function csvAssocRows($rows)
{
    $content = '';

    if (empty($rows)) {
        $content .= csvLine(array('無資料'));
        return $content;
    }

    $headers = array_keys($rows[0]);
    $content .= csvLine($headers);

    foreach ($rows as $row) {
        $line = array();
        foreach ($headers as $header) {
            $line[] = isset($row[$header]) ? $row[$header] : '';
        }
        $content .= csvLine($line);
    }

    return $content;
}

function generateExcelReportData($scheduleId, $startDate, $endDate, $type)
{
    $schedule = getScheduleById($scheduleId);

    $connectionIds = jsonArray($schedule['connection_ids']);
    $sections = jsonArray($schedule['section_list']);

    if (empty($connectionIds)) {
        throw new RuntimeException("schedule_id={$scheduleId} 的 connection_ids 為空");
    }

    if (empty($sections)) {
        $sections = array('overview');
    }

    $filename = sprintf(
        'ga_report_%d_%s_%s_%s.csv',
        (int)$scheduleId,
        $type,
        formatDateYmd($startDate),
        formatDateYmd($endDate)
    );

    $content = '';
    $content .= chr(239) . chr(187) . chr(191); // UTF-8 BOM
    $content .= csvLine(array('Report Name', $schedule['report_name']));
    $content .= csvLine(array('Type', $type));
    $content .= csvLine(array('Start Date', $startDate));
    $content .= csvLine(array('End Date', $endDate));
    $content .= csvLine(array());

    foreach ($sections as $section) {
        if ($section === 'overview') {
            $summary = getOverviewData($connectionIds, $startDate, $endDate);
            $dailyRows = getOverviewDailyData($connectionIds, $startDate, $endDate);

            $content .= csvLine(array('Overview Summary'));
            $content .= csvAssocRows(array(
                array('metric' => 'sessions', 'value' => isset($summary['sessions']) ? $summary['sessions'] : 0),
                array('metric' => 'users', 'value' => isset($summary['users']) ? $summary['users'] : 0),
                array('metric' => 'new_users', 'value' => isset($summary['new_users']) ? $summary['new_users'] : 0),
                array('metric' => 'pageviews', 'value' => isset($summary['pageviews']) ? $summary['pageviews'] : 0),
                array('metric' => 'events', 'value' => isset($summary['events']) ? $summary['events'] : 0),
                array('metric' => 'avg_session_duration', 'value' => isset($summary['avg_session_duration']) ? $summary['avg_session_duration'] : 0),
                array('metric' => 'bounce_rate', 'value' => isset($summary['bounce_rate']) ? $summary['bounce_rate'] : 0),
            ));
            $content .= csvLine(array());

            $content .= csvLine(array('Overview Daily'));
            $content .= csvAssocRows($dailyRows);
            $content .= csvLine(array());
        }

        if ($section === 'pages') {
            $content .= csvLine(array('Pages'));
            $content .= csvAssocRows(getPagesData($connectionIds, $startDate, $endDate));
            $content .= csvLine(array());
        }

        if ($section === 'conversions') {
            $content .= csvLine(array('Conversions'));
            $content .= csvAssocRows(getConversionsData($connectionIds, $startDate, $endDate));
            $content .= csvLine(array());
        }

        if ($section === 'events') {
            $content .= csvLine(array('Events'));
            $content .= csvAssocRows(getEventsData($connectionIds, $startDate, $endDate));
            $content .= csvLine(array());
        }

        if ($section === 'traffic') {
            $content .= csvLine(array('Traffic'));
            $content .= csvAssocRows(getTrafficData($connectionIds, $startDate, $endDate));
            $content .= csvLine(array());
        }
    }

    return array(
        'fileName' => $filename,
        'mimeType' => 'text/csv',
        'content' => $content
    );
}

if (PHP_SAPI === 'cli' && isset($argv[1], $argv[2], $argv[3], $argv[4])) {
    try {
        $file = generateExcelReportData((int)$argv[1], $argv[2], $argv[3], $argv[4]);
        file_put_contents($file['fileName'], $file['content']);
        echo $file['fileName'] . PHP_EOL;
        exit(0);
    } catch (Throwable $e) {
        fwrite(STDERR, $e->getMessage() . PHP_EOL);
        exit(1);
    }
}

if (PHP_SAPI !== 'cli' && realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__) {
    $scheduleId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    $startDate  = isset($_GET['start']) ? $_GET['start'] : '';
    $endDate    = isset($_GET['end']) ? $_GET['end'] : '';
    $type       = isset($_GET['type']) ? $_GET['type'] : '';

    if ($scheduleId <= 0 || !$startDate || !$endDate || !$type) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(array(
            'ok' => false,
            'error' => '請帶參數 id, start, end, type'
        ), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }

    try {
        $file = generateExcelReportData($scheduleId, $startDate, $endDate, $type);

        header('Content-Type: text/csv; charset=UTF-8');
        header('Content-Disposition: attachment; filename="' . $file['fileName'] . '"');
        header('Content-Length: ' . strlen($file['content']));
        echo $file['content'];
        exit;
    } catch (Throwable $e) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(array(
            'ok' => false,
            'error' => $e->getMessage()
        ), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }
}