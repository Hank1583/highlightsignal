<?php

declare(strict_types=1);

use HighlightSignal\Workspace\AuthorizationException;
use HighlightSignal\Workspace\WorkspaceAccessPolicy;
use HighlightSignal\Workspace\WorkspacePermissions;

require_once __DIR__ . '/../db_connect.php';
require_once __DIR__ . '/../legacy_auth.php';

$member_id = hs_require_service_member($conn, $_GET['member_id'] ?? 0);

// V09-08: this console triggers a real Google Analytics Data API pull and
// writes rows for every connection it's scoped to -- gated the same way as
// other integration-sync actions (account_fetch.php,
// update_connection_status.php), not left open to any signed member. Was
// previously scoped by raw $_GET['member_id'] with no membership/role check
// at all.
$workspace_id = hs_resolve_member_workspace_id($conn, $member_id);

try {
    $membership = (new WorkspaceAccessPolicy($conn))->requireActiveMembership($workspace_id, $member_id);
    WorkspacePermissions::requirePermission($membership, 'integrations.manage');
} catch (AuthorizationException $error) {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(array('ok' => false, 'error' => 'Workspace role cannot sync integrations.'));
    exit;
}

//----------------------------------------
// 1. 禁用所有 Buffer（HTML 即時輸出必要）
//----------------------------------------
header("Content-Type: text/html; charset=utf-8");
header("Cache-Control: no-cache");
header("X-Accel-Buffering: no");

ini_set('output_buffering', 'off');
ini_set('zlib.output_compression', false);
ini_set('implicit_flush', 1);

while (ob_get_level()) ob_end_flush();
ob_implicit_flush(true);
?>
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>GA Sync Console</title>
<style>
body { background:#1a1a1a; color:#ddd; font-family: Consolas, monospace; }
#log {
    white-space: pre-wrap;
    line-height: 1.5;
    background: #000;
    padding: 20px;
    margin: 20px;
    border-radius: 6px;
    font-size: 14px;
}
.ok { color:#0f0; }
.err { color:#f33; font-weight:bold; }
.info { color:#39f; }
.head { color:#ff0; font-weight:bold; }
.date { color:#0ff; }
</style>
</head>
<body>

<h2 style="color:#fff;">GA Sync Console</h2>
<div id="log">
<?php

echo str_repeat(" ", 4096) . "\n"; // 強制讓 Nginx / Browser flush
flush();

require_once "api_client.php";

$client_id = (string) getenv("GOOGLE_CLIENT_ID");
$client_secret = (string) getenv("GOOGLE_CLIENT_SECRET");

if ($client_id === '' || $client_secret === '') {
    http_response_code(500);
    die('Google OAuth configuration is incomplete');
}

/*****************************************************
 * 日期判斷
 *****************************************************/
$startDate = $_GET["start"] ?? null;
$endDate   = $_GET["end"] ?? null;

function is_valid_ymd($date) {
    return is_string($date) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $date);
}

if (!$startDate || !$endDate) {
    $startDate = date("Y-m-d", strtotime("-1 day"));
    $endDate   = $startDate;
    echo "Mode: Daily Sync (yesterday: $startDate)\n";
} else {
    if (!is_valid_ymd($startDate) || !is_valid_ymd($endDate) || $startDate > $endDate) {
        echo "<span class='err'>ERROR: Invalid date range</span>\n";
        exit;
    }
    echo "Mode: Range Sync ($startDate ~ $endDate)\n";
}
flush();

/*****************************************************
 * 日期迴圈
 *****************************************************/
$period = new DatePeriod(
    new DateTime($startDate),
    new DateInterval('P1D'),
    (new DateTime($endDate))->modify('+1 day')
);

/*****************************************************
 * 讀取所有 GA 連結設定
 *****************************************************/
// V09-08: scoped by the resolved, membership-checked workspace_id rather than
// the raw member_id -- ga_connections.workspace_id has been reliably
// backfilled since V09-03/016.
$sql = "SELECT * FROM ga_connections WHERE status = 1 AND workspace_id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param('i', $workspace_id);
$stmt->execute();
$res = $stmt->get_result();
// $res = $conn->query("SELECT * FROM ga_connections WHERE status=1");

while ($row = $res->fetch_assoc()) {

    $connection_id = $row["id"];
    $property_id   = $row["property_id"];
    $refresh_token = $row["refresh_token"];
    $account_name  = $row["account_name"] ?? "Unknown";

    echo "\n--------------------------------------------\n";
    echo "<span class='head'>Sync Connection #$connection_id — $account_name (Property $property_id)</span>\n";
    flush();

    /***************************************************
     * Step 1 — Access Token
     ***************************************************/
    $access_token = ga_refresh_access_token($refresh_token, $client_id, $client_secret);

    if (!$access_token) {
        echo "<span class='err'>ERROR: Cannot refresh access token</span>\n";
        flush();
        continue;
    }

    $report_url = "https://analyticsdata.googleapis.com/v1beta/properties/$property_id:runReport";

    /***************************************************
     * 遍歷每日
     ***************************************************/
    foreach ($period as $day) {

        $theDate = $day->format("Y-m-d");
        echo "\n<span class='date'>→ $theDate</span>\n";
        flush();

        /***************************************************
         * 1. Summary
         ***************************************************/
        echo "Summary... ";
        $post_summary = [
            "dateRanges" => [
                ["startDate" => $theDate, "endDate" => $theDate]
            ],
            "metrics" => [
                ["name" => "sessions"],
                ["name" => "activeUsers"],
                ["name" => "newUsers"],
                ["name" => "averageSessionDuration"]
            ]
        ];

        $summary_res = ga_post($report_url, $access_token, $post_summary);

        if (isset($summary_res["rows"])) {

            $m = $summary_res["rows"][0]["metricValues"];
            $sessions  = intval($m[0]["value"]);
            $users     = intval($m[1]["value"]);
            $new_users = intval($m[2]["value"]);
            $avg_time  = floatval($m[3]["value"]);

            $stmt = $conn->prepare("
                INSERT INTO ga_daily_summary
                (connection_id, date, sessions, users, new_users, avg_session_duration)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    sessions = VALUES(sessions),
                    users = VALUES(users),
                    new_users = VALUES(new_users),
                    avg_session_duration = VALUES(avg_session_duration)
            ");
            if ($stmt) {
                $stmt->bind_param("isiiid", $connection_id, $theDate, $sessions, $users, $new_users, $avg_time);
                $stmt->execute();
            }

            echo "<span class='ok'>OK</span>\n";

            /***********************************************
             * V10-07: GA traffic-anomaly Signal detection.
             * Mirrors si/seo/summary.php's Signal/Evidence call site --
             * wrapped in try/catch, never breaks the sync console output.
             * Baseline is the trailing 7-day average of THIS connection's
             * own prior days (excludes $theDate itself).
             ***********************************************/
            try {
                $baselineStmt = $conn->prepare(
                    'SELECT AVG(sessions) AS avg_sessions, COUNT(*) AS day_count FROM (
                        SELECT sessions FROM ga_daily_summary
                        WHERE connection_id = ? AND date < ?
                        ORDER BY date DESC LIMIT 7
                    ) recent_days'
                );
                $baselineStmt->bind_param('is', $connection_id, $theDate);
                $baselineStmt->execute();
                $baselineRow = $baselineStmt->get_result()->fetch_assoc();
                $baselineAvgSessions = $baselineRow && $baselineRow['avg_sessions'] !== null ? (float) $baselineRow['avg_sessions'] : 0.0;
                $baselineDayCount = $baselineRow ? (int) $baselineRow['day_count'] : 0;

                $gaSignalRepository = new \HighlightSignal\Signal\SignalRepository($conn);
                $gaSignalService = new \HighlightSignal\Signal\SignalService($conn, $gaSignalRepository);
                $gaSignalService->runGaTrafficAnomalyDetection(
                    $workspace_id,
                    (int) $connection_id,
                    $account_name,
                    (float) $sessions,
                    $baselineAvgSessions,
                    $baselineDayCount
                );

                $gaEvidenceRepository = new \HighlightSignal\Evidence\EvidenceRepository($conn);
                $gaEvidenceService = new \HighlightSignal\Evidence\EvidenceService($gaEvidenceRepository, $gaSignalRepository);
                $gaEvidenceService->recordGaTrafficAnomalyEvidence(
                    $workspace_id,
                    (int) $connection_id,
                    $account_name,
                    (float) $sessions,
                    $baselineAvgSessions,
                    $baselineDayCount,
                    $theDate . ' 00:00:00'
                );
            } catch (\Throwable $gaSignalError) {
                // Signal/Evidence detection must never break the GA sync
                // console itself -- a missed detection is recoverable on the
                // next sync, same principle as the SEO integration.
                error_log('GA Signal detection failed: ' . $gaSignalError->getMessage());
            }
        } else {
            echo "<span class='err'>No Data</span>\n";
        }
        flush();

        /***************************************************
         * 2. Pages
         ***************************************************/
        echo "Pages... ";

        $post_pages = [
            "dateRanges" => [
                ["startDate" => $theDate, "endDate" => $theDate]
            ],
            "dimensions" => [
                ["name" => "pagePath"],
                ["name" => "pageTitle"]
            ],
            "metrics" => [
                ["name" => "screenPageViews"],
                ["name" => "activeUsers"],
                ["name" => "averageSessionDuration"]
            ]
        ];

        $pages_res = ga_post($report_url, $access_token, $post_pages);

        if (isset($pages_res["rows"])) {
            foreach ($pages_res["rows"] as $r) {
                $page_path  = $r["dimensionValues"][0]["value"] ?? "";
                $page_title = $r["dimensionValues"][1]["value"] ?? "";
                $pageviews  = intval($r["metricValues"][0]["value"] ?? 0);
                $users      = intval($r["metricValues"][1]["value"] ?? 0);
                $avg_time   = floatval($r["metricValues"][2]["value"] ?? 0);

                if ($page_path === "") {
                    $page_path = "(not set)";
                }

                $page_path_hash = md5($page_path);

                $stmt = $conn->prepare("
                    INSERT INTO ga_pages
                    (connection_id, date, page_path, page_path_hash, page_title, pageviews, users, avg_time)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        page_title = VALUES(page_title),
                        pageviews = VALUES(pageviews),
                        users = VALUES(users),
                        avg_time = VALUES(avg_time)
                ");

                if ($stmt) {
                    $stmt->bind_param(
                        "issssiid",
                        $connection_id,
                        $theDate,
                        $page_path,
                        $page_path_hash,
                        $page_title,
                        $pageviews,
                        $users,
                        $avg_time
                    );
                    $stmt->execute();
                    $stmt->close();
                }
            }

            echo "<span class='ok'>OK</span>\n";
        } else {
            echo "<span class='err'>No Data</span>\n";
        }
        flush();

        /***************************************************
         * 3. Events
         ***************************************************/
        echo "Events... ";
        $post_events = [
            "dateRanges" => [
                ["startDate" => $theDate, "endDate" => $theDate]
            ],
            "dimensions" => [
                ["name" => "eventName"]
            ],
            "metrics" => [
                ["name" => "eventCount"]
            ]
        ];

        $events_res = ga_post($report_url, $access_token, $post_events);

        if (isset($events_res["rows"])) {
            foreach ($events_res["rows"] as $r) {
                $event_name  = $r["dimensionValues"][0]["value"] ?? "";
                $event_count = intval($r["metricValues"][0]["value"] ?? 0);

                if ($event_name === "") continue;

                $stmt = $conn->prepare("
                    INSERT INTO ga_events
                    (connection_id, date, event_name, event_count)
                    VALUES (?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        event_count = VALUES(event_count)
                ");

                if ($stmt) {
                    $stmt->bind_param(
                        "issi",
                        $connection_id,
                        $theDate,
                        $event_name,
                        $event_count
                    );
                    $stmt->execute();
                    $stmt->close();
                }
            }

            echo "<span class='ok'>OK</span>\n";
        } else {
            echo "<span class='err'>No Data</span>\n";
        }
        flush();

        /***************************************************
         * 4. Traffic
         ***************************************************/
        echo "Traffic... ";

        $post_sources = [
            "dateRanges" => [
                ["startDate" => $theDate, "endDate" => $theDate]
            ],
            "dimensions" => [
                ["name" => "sessionDefaultChannelGroup"],
                ["name" => "sessionSource"],
                ["name" => "sessionMedium"],
                ["name" => "deviceCategory"]
            ],
            "metrics" => [
                ["name" => "sessions"],
                ["name" => "activeUsers"],
                ["name" => "newUsers"],
                ["name" => "keyEvents"]
            ]
        ];

        $source_res = ga_post($report_url, $access_token, $post_sources);

        if (isset($source_res["rows"])) {
            foreach ($source_res["rows"] as $r) {
                $channel_group = $r["dimensionValues"][0]["value"] ?? "";
                $source        = $r["dimensionValues"][1]["value"] ?? "";
                $medium        = $r["dimensionValues"][2]["value"] ?? "";
                $device        = $r["dimensionValues"][3]["value"] ?? "";

                $sessions      = intval($r["metricValues"][0]["value"] ?? 0);
                $users         = intval($r["metricValues"][1]["value"] ?? 0);
                $new_users     = intval($r["metricValues"][2]["value"] ?? 0);
                $conversions   = intval($r["metricValues"][3]["value"] ?? 0);

                $stmt = $conn->prepare("
                    INSERT INTO ga_traffic_sources
                    (connection_id, date, channel_group, source, medium, device, sessions, users, new_users, conversions)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        channel_group = VALUES(channel_group),
                        device = VALUES(device),
                        sessions = VALUES(sessions),
                        users = VALUES(users),
                        new_users = VALUES(new_users),
                        conversions = VALUES(conversions)
                ");

                if ($stmt) {
                    $stmt->bind_param(
                        "isssssiiii",
                        $connection_id,
                        $theDate,
                        $channel_group,
                        $source,
                        $medium,
                        $device,
                        $sessions,
                        $users,
                        $new_users,
                        $conversions
                    );
                    $stmt->execute();
                    $stmt->close();
                }
            }

            echo "<span class='ok'>OK</span>\n";
        } else {
            echo "<span class='err'>No Data</span>\n";
        }
        flush();

        /***************************************************
         * 5. Conversions
         ***************************************************/
        echo "Conversions... ";

        $post_conversions = [
            "dateRanges" => [
                ["startDate" => $theDate, "endDate" => $theDate]
            ],
            "dimensions" => [
                ["name" => "eventName"]
            ],
            "metrics" => [
                ["name" => "eventCount"],
                ["name" => "totalRevenue"]
            ],
            "dimensionFilter" => [
                "filter" => [
                    "fieldName" => "eventName",
                    "inListFilter" => [
                        "values" => [
                            "purchase",
                            "generate_lead",
                            "contact_submit",
                            "sign_up",
                            "start_trial",
                            "book_demo"
                        ]
                    ]
                ]
            ]
        ];

        $conversions_res = ga_post($report_url, $access_token, $post_conversions);

        if (isset($conversions_res["rows"])) {
            foreach ($conversions_res["rows"] as $r) {
                $conversion_name = $r["dimensionValues"][0]["value"] ?? "";
                $count           = intval($r["metricValues"][0]["value"] ?? 0);
                $value           = floatval($r["metricValues"][1]["value"] ?? 0);

                if ($conversion_name === "") continue;

                $stmt = $conn->prepare("
                    INSERT INTO ga_conversions
                    (connection_id, date, conversion_name, count, value)
                    VALUES (?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        count = VALUES(count),
                        value = VALUES(value)
                ");

                if ($stmt) {
                    $stmt->bind_param(
                        "issid",
                        $connection_id,
                        $theDate,
                        $conversion_name,
                        $count,
                        $value
                    );
                    $stmt->execute();
                    $stmt->close();
                }
            }

            echo "<span class='ok'>OK</span>\n";
        } else {
            echo "<span class='err'>No Data</span>\n";
        }
        flush();

        sleep(1);
    }
}

echo "\n--------------------------------------------\n";
echo "<span class='head'>FINISHED ALL</span>\n";
flush();
?>
</div>
</body>
</html>
