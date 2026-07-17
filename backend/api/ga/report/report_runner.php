<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/report_mailer.php';

$pdo = db();

$now = new DateTimeImmutable('now', new DateTimeZone('Asia/Taipei'));

$currentWeekday = (int)$now->format('N');   // 1 (Mon) ~ 7 (Sun)
$currentMonthday = (int)$now->format('j');  // 1 ~ 31
$currentHour = (int)$now->format('G');      // 0 ~ 23

$sql = "SELECT * FROM ga_report_schedules WHERE is_active = 1";
$schedules = $pdo->query($sql)->fetchAll();

$results = array();

foreach ($schedules as $row) {
    $scheduleId = (int)$row['id'];
    $reportType = (string)$row['report_type'];
    $reportName = isset($row['report_name']) ? (string)$row['report_name'] : '';

    $sendTimeRaw = trim((string)$row['send_time']);
    $sendHour = null;

    if ($sendTimeRaw !== '') {
        $timeParts = explode(':', $sendTimeRaw);
        if (isset($timeParts[0]) && $timeParts[0] !== '') {
            $sendHour = (int)$timeParts[0];
        }
    }

    $shouldRun = false;

    if ($sendHour !== null && $sendHour === $currentHour) {
        if ($reportType === 'weekly') {
            if ((int)$row['send_weekday'] === $currentWeekday) {
                $shouldRun = true;
            }
        } elseif ($reportType === 'monthly') {
            if ((int)$row['send_monthday'] === $currentMonthday) {
                $shouldRun = true;
            }
        }
    }

    if (!$shouldRun) {
        continue;
    }

    try {
        $range = calcRangeByType($reportType);
        $startDate = $range[0];
        $endDate = $range[1];

        if (alreadySent($scheduleId, $startDate, $endDate)) {
            $results[] = array(
                'schedule_id' => $scheduleId,
                'report_name' => $reportName,
                'status' => 'SKIP_ALREADY_SENT',
                'period' => $startDate . ' ~ ' . $endDate,
            );
            continue;
        }

        $mailerResult = sendReportMail($scheduleId, $startDate, $endDate, $reportType);
        writeReportLog($scheduleId, $startDate, $endDate, 'success', null);
        $results[] = array(
            'schedule_id' => $scheduleId,
            'report_name' => $reportName,
            'status' => 'SUCCESS',
            'period' => $startDate . ' ~ ' . $endDate,
            'output' => isset($mailerResult['subject']) ? (string)$mailerResult['subject'] : '',
            'data' => $mailerResult,
        );
    } catch (Throwable $e) {
        writeReportLog(
            $scheduleId,
            $startDate ?? date('Y-m-d'),
            $endDate ?? date('Y-m-d'),
            'failed',
            $e->getMessage()
        );

        $results[] = array(
            'schedule_id' => $scheduleId,
            'report_name' => $reportName,
            'status' => 'FAILED',
            'error' => $e->getMessage(),
        );
    }
}

header('Content-Type: application/json; charset=utf-8');
echo json_encode(
    array(
        'now' => $now->format('Y-m-d H:i:s'),
        'current_hour' => $currentHour,
        'count' => count($results),
        'results' => $results,
    ),
    JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT
);