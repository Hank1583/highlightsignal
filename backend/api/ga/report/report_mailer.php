<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/report_excel.php';

function buildSubject($schedule, $type, $startDate, $endDate)
{
    switch ($type) {
        case 'monthly':
            $prefix = '【GA月報】';
            break;
        case 'weekly':
            $prefix = '【GA週報】';
            break;
        default:
            $prefix = '【GA報表】';
            break;
    }

    return $prefix . $schedule['report_name'] . ' ' . formatDateYmd($startDate) . '-' . formatDateYmd($endDate);
}

function buildOverviewCompare($connectionIds, $startDate, $endDate)
{
    $current = getOverviewData($connectionIds, $startDate, $endDate);

    $range = calcPreviousRange($startDate, $endDate);
    $prevStart = $range[0];
    $prevEnd = $range[1];

    $previous = getOverviewData($connectionIds, $prevStart, $prevEnd);

    $rows = array();
    $metricMap = array(
        'sessions' => 'Sessions',
        'users' => 'Users',
        'new_users' => 'New Users',
        'pageviews' => 'Pageviews',
        'events' => 'Events',
        'avg_session_duration' => 'Avg Session Duration',
        'bounce_rate' => 'Bounce Rate',
    );

    foreach ($metricMap as $key => $label) {
        $curr = (float)(isset($current[$key]) ? $current[$key] : 0);
        $prev = (float)(isset($previous[$key]) ? $previous[$key] : 0);

        $rows[] = array(
            'label' => $label,
            'current' => $curr,
            'previous' => $prev,
            'diff_pct' => percentDiff($curr, $prev),
        );
    }

    return array(
        'current_range' => array($startDate, $endDate),
        'previous_range' => array($prevStart, $prevEnd),
        'rows' => $rows,
    );
}

function diffColor($value)
{
    if ($value === null) {
        return '#6b7280';
    }
    if ($value > 0) {
        return '#16a34a';
    }
    if ($value < 0) {
        return '#dc2626';
    }
    return '#374151';
}

function buildOverviewCardsHtml($compare)
{
    $html = '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">';
    $count = 0;

    foreach ($compare['rows'] as $row) {
        if ($count % 2 === 0) {
            $html .= '<tr>';
        }

        $html .= '<td width="50%" valign="top" style="padding:8px;">';
        $html .= '<div style="border:1px solid #e5e7eb;border-radius:12px;padding:16px;background:#ffffff;">';
        $html .= '<div style="font-size:13px;color:#6b7280;margin-bottom:6px;">' . htmlspecialchars($row['label'], ENT_QUOTES, 'UTF-8') . '</div>';
        $html .= '<div style="font-size:24px;font-weight:bold;color:#111827;">' . numberFmt($row['current'], 2) . '</div>';
        $html .= '<div style="font-size:12px;color:#6b7280;margin-top:6px;">上期：' . numberFmt($row['previous'], 2) . '</div>';
        $html .= '<div style="font-size:13px;font-weight:bold;margin-top:6px;color:' . diffColor($row['diff_pct']) . ';">' . pctFmt($row['diff_pct']) . '</div>';
        $html .= '</div>';
        $html .= '</td>';

        if ($count % 2 === 1) {
            $html .= '</tr>';
        }

        $count++;
    }

    if ($count % 2 === 1) {
        $html .= '<td width="50%" valign="top" style="padding:8px;"></td></tr>';
    }

    $html .= '</table>';

    return $html;
}

function buildSimpleTableHtml($title, $rows)
{
    $html = '';
    $html .= '<div style="margin-top:24px;">';
    $html .= '<div style="font-size:18px;font-weight:bold;color:#111827;margin-bottom:12px;">' . htmlspecialchars($title, ENT_QUOTES, 'UTF-8') . '</div>';

    if (empty($rows)) {
        $html .= '<div style="padding:16px;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;color:#6b7280;">此區間沒有資料</div>';
        $html .= '</div>';
        return $html;
    }

    $headers = array_keys($rows[0]);

    $html .= '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border:1px solid #e5e7eb;background:#ffffff;">';
    $html .= '<tr style="background:#f9fafb;">';
    foreach ($headers as $header) {
        $html .= '<th style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:left;font-size:12px;color:#374151;">' . htmlspecialchars((string)$header, ENT_QUOTES, 'UTF-8') . '</th>';
    }
    $html .= '</tr>';

    foreach ($rows as $row) {
        $html .= '<tr>';
        foreach ($headers as $header) {
            $value = isset($row[$header]) ? $row[$header] : '';
            $html .= '<td style="padding:10px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#111827;">' . htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8') . '</td>';
        }
        $html .= '</tr>';
    }

    $html .= '</table>';
    $html .= '</div>';

    return $html;
}

function buildEmailHtml($schedule, $type, $startDate, $endDate)
{
    $connectionIds = jsonArray($schedule['connection_ids']);
    $sections = jsonArray($schedule['section_list']);

    if (empty($sections)) {
        $sections = array('overview');
    }

    $compare = buildOverviewCompare($connectionIds, $startDate, $endDate);
    $previousRange = $compare['previous_range'];
    $prevStart = $previousRange[0];
    $prevEnd = $previousRange[1];

    switch ($type) {
        case 'monthly':
            $reportLabel = 'GA 月報';
            break;
        case 'weekly':
            $reportLabel = 'GA 週報';
            break;
        default:
            $reportLabel = 'GA 報表';
            break;
    }

    $html = '';
    $html .= '<div style="margin:0;padding:24px;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">';
    $html .= '<div style="max-width:960px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">';

    $html .= '<div style="background:#111827;padding:24px 28px;color:#ffffff;">';
    $html .= '<div style="font-size:13px;opacity:0.85;margin-bottom:8px;">' . $reportLabel . '</div>';
    $html .= '<div style="font-size:28px;font-weight:bold;line-height:1.3;">' . htmlspecialchars($schedule['report_name'], ENT_QUOTES, 'UTF-8') . '</div>';
    $html .= '<div style="font-size:14px;opacity:0.9;margin-top:10px;">本期：' . $startDate . ' ~ ' . $endDate . '</div>';
    $html .= '<div style="font-size:13px;opacity:0.75;margin-top:4px;">對比：' . $prevStart . ' ~ ' . $prevEnd . '</div>';
    $html .= '</div>';

    $html .= '<div style="padding:24px 28px;">';
    $html .= '<div style="font-size:20px;font-weight:bold;margin-bottom:12px;">總覽摘要</div>';
    $html .= buildOverviewCardsHtml($compare);

    foreach ($sections as $section) {
        if ($section === 'overview') {
            continue;
        }

        switch ($section) {
            case 'pages':
                $rows = array_slice(getPagesData($connectionIds, $startDate, $endDate), 0, 10);
                $html .= buildSimpleTableHtml('熱門頁面 Top 10', $rows);
                break;

            case 'conversions':
                $rows = array_slice(getConversionsData($connectionIds, $startDate, $endDate), 0, 10);
                $html .= buildSimpleTableHtml('轉換 Top 10', $rows);
                break;

            case 'events':
                $rows = array_slice(getEventsData($connectionIds, $startDate, $endDate), 0, 10);
                $html .= buildSimpleTableHtml('事件 Top 10', $rows);
                break;

            case 'traffic':
                $rows = array_slice(getTrafficData($connectionIds, $startDate, $endDate), 0, 10);
                $html .= buildSimpleTableHtml('流量來源 Top 10', $rows);
                break;
        }
    }

    $html .= '<div style="margin-top:24px;padding:16px;border:1px solid #dbeafe;background:#eff6ff;border-radius:12px;color:#1e3a8a;font-size:13px;">';
    $html .= '附件已隨信附上，可直接下載查看。';
    $html .= '</div>';

    $html .= '</div>';
    $html .= '</div>';
    $html .= '</div>';

    return $html;
}

function sendReportMail($scheduleId, $startDate, $endDate, $type)
{
    $schedule = getScheduleById((int)$scheduleId);
    if (!$schedule) {
        throw new RuntimeException("找不到 schedule_id={$scheduleId}");
    }

    $emailList = jsonArray($schedule['email_list']);

    if (empty($emailList)) {
        throw new RuntimeException("schedule_id={$scheduleId} 的 email_list 為空");
    }

    $file = generateExcelReportData((int)$scheduleId, $startDate, $endDate, $type);
    $subject = buildSubject($schedule, $type, $startDate, $endDate);
    $html = buildEmailHtml($schedule, $type, $startDate, $endDate);

    $files = array(
        array(
            'fileName' => $file['fileName'],
            'mimeType' => $file['mimeType'],
            'content' => base64_encode($file['content']),
        )
    );

    $to = implode(',', $emailList);
    $mailResult = gas_send_mail($to, $subject, $html, $files);

    if (!$mailResult['ok']) {
        $errorMessage = json_encode($mailResult, JSON_UNESCAPED_UNICODE);
        // writeReportLog((int)$scheduleId, $startDate, $endDate, 'failed', $errorMessage);
        throw new RuntimeException($errorMessage);
    }

    // writeReportLog((int)$scheduleId, $startDate, $endDate, 'success', null);

    return array(
        'schedule_id' => (int)$scheduleId,
        'subject' => $subject,
        'file_name' => $file['fileName'],
        'mail_result' => $mailResult,
    );
}

/**
 * 只有直接執行這支檔案時，才輸出 JSON / exit
 * 被 report_runner.php require 時，不會進到這段
 */
function isDirectExecution()
{
    // Every HTTP request to this file must enter the signed-auth branch. On
    // shared hosting SCRIPT_FILENAME can resolve through a different symlink
    // or document-root path, so comparing realpath() values can incorrectly
    // classify a direct request as an include and return an unauthenticated 200.
    if (PHP_SAPI !== 'cli') {
        return true;
    }

    $scriptFilename = isset($_SERVER['SCRIPT_FILENAME']) ? realpath((string)$_SERVER['SCRIPT_FILENAME']) : '';
    return $scriptFilename !== false && $scriptFilename === realpath(__FILE__);
}

if (isDirectExecution()) {
    header("Content-Type: application/json; charset=utf-8");

    if (PHP_SAPI === 'cli') {
        if (!isset($argv[1], $argv[2], $argv[3], $argv[4])) {
            fwrite(STDERR, "Usage: php report_mailer.php {schedule_id} {start_date} {end_date} {type}\n");
            exit(1);
        }

        try {
            $result = sendReportMail((int)$argv[1], (string)$argv[2], (string)$argv[3], (string)$argv[4]);
            echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . PHP_EOL;
            exit(0);
        } catch (Throwable $e) {
            fwrite(STDERR, $e->getMessage() . PHP_EOL);
            exit(1);
        }
    }

    require_once __DIR__ . '/../../db_connect.php';
    require_once __DIR__ . '/../../legacy_auth.php';
    $serviceMemberId = hs_require_service_member($conn);

    $scheduleId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    $startDate = isset($_GET['start']) ? (string)$_GET['start'] : '';
    $endDate = isset($_GET['end']) ? (string)$_GET['end'] : '';
    $type = isset($_GET['type']) ? (string)$_GET['type'] : '';

    if ($scheduleId <= 0 || $startDate === '' || $endDate === '' || $type === '') {
        echo json_encode(array(
            'ok' => false,
            'error' => '請帶參數 id, start, end, type',
        ), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }

    $ownerCheck = db()->prepare('SELECT user_id FROM ga_report_schedules WHERE id = ? LIMIT 1');
    $ownerCheck->execute(array($scheduleId));
    $ownerId = (int) $ownerCheck->fetchColumn();
    if ($ownerId <= 0 || $ownerId !== $serviceMemberId) {
        http_response_code(403);
        echo json_encode(array('ok' => false, 'error' => 'Report access denied'));
        exit;
    }

    try {
        $result = sendReportMail($scheduleId, $startDate, $endDate, $type);
        echo json_encode(array(
            'ok' => true,
            'data' => $result,
        ), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    } catch (Throwable $e) {
        echo json_encode(array(
            'ok' => false,
            'error' => 'Report delivery failed',
        ), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }
}
