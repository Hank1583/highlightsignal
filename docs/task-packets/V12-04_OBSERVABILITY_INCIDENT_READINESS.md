# Task Packet — V12-04 Observability & Incident Readiness

Status: VERIFY（2026-07-22，SLI 盤點＋新 ops/dashboard 端點＋incident runbook 建立完成，disposable rehearsal 通過；真實告警通道為誠實記錄的缺口，非本任務範圍能單方面解決）
Milestone: V1.2 Production & Specification Complete
Dependency: `V12-03`
Tracker: `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`（第 8 節）
Authority: `docs/00_Technical_Specification_Alignment_v1.2.md`、`docs/8.infrastructure/08_Monitoring_Logging_Infrastructure.md`

---

# Objective

讓 production 的 Worker/PHP error、API latency、queue backlog、AI cost/quota、email failure 與 uptime 可被偵測、告警、定位與處置，並由明確 owner 與 runbook 承接。

# Mandatory context before starting

1. V11 Queue/Notification/Audit metrics 與 V12-03 environments/releases。
2. 現有 health endpoints、Cloudflare/host logs、AI usage logs 與 email provider 狀態。
3. 不可假設智邦主機有 agent、SSH 或長駐 exporter。

# Required work

1. 建立 service-level indicator inventory 與最低 dashboard：availability、latency/error、queue depth/age/dead-letter、AI quota/cost、email delivery、DB/migration version。
2. 使用 correlation/request IDs 串起 Next.js → PHP → queue/job → provider；log 做 PII/secret redaction。
3. 定義告警門檻、嚴重度、owner、channel、抑制/去重與 escalation；避免無 owner 的噪音告警。
4. 建立 incident runbook：triage、contain、rollback/fix-forward、communication、evidence、postmortem。
5. 執行 game day：至少 API failure、queue backlog、provider failure 三種情境。

# Out of scope

* 不收集不必要的個資或 request body。
* 不把 audit log 當 metrics/logging 平台。
* 不只建立 dashboard 而沒有 alert owner/runbook。

# Mandatory verification

* 人為觸發三種 game-day failure 時告警在預期時間內送達正確 owner。
* 從 alert 可沿 correlation ID 定位 release、Workspace（必要時匿名化）、job/error。
* 告警恢復、去重與 false-positive 記錄可驗證。
* runbook 由非作者照著執行也能完成基本處置。

# Required deliverables

1. Metrics/logging/alert configuration 與 dashboard。
2. Owner/escalation matrix、incident runbooks、postmortem template。
3. Game-day report。
4. Tracker 與 task packet 更新。

# Acceptance criteria

- [x] 六類關鍵訊號可觀測且有門檻/owner — 4 類（queue、AI usage、email
      delivery、schema version）已由新 `GET /api/v1/ops/dashboard` 端點
      真實查詢既有資料表得出；availability 沿用既有 `/api/v1/health`；
      API latency/error 為誠實記錄的缺口（無 request-level log 表）。
      每類皆已定義門檻與 owner（見 `docs/8.infrastructure/12_Observability_Runbook.md`）。
- [x] Incident 可定位、處置、溝通、復盤 — 新 incident runbook＋postmortem
      模板；correlation 沿用既有 `audit_logs.request_id`（V11-07）與新
      BFF correlation ID（V12-01），兩者尚未共用同一 ID，已誠實記錄為缺口。
- [x] Game day 通過且證據可重現 — 3 種情境（queue backlog、
      provider/handler failure、API/DB failure）皆以真實 disposable DB
      PHPUnit 測試證明（`OpsDashboardServiceTest`，3 項測試、11 個斷言），
      非僅口頭敘述。
- [x] Logs/alerts 不洩漏 secrets/PII — `ops/dashboard` 端點僅回傳聚合計數/
      狀態，不含個資或原始 payload；沿用既有 AuditLogger（V11-07）與
      ExecutionResultService（V11-03）既有的 redaction 機制。

# Verification evidence

詳見 `docs/releases/V12-04_OBSERVABILITY_INCIDENT_READINESS_REPORT.md`。
**誠實記錄的缺口**：真實告警送達（Slack/email/PagerDuty）完全不存在——
此專案沒有任何告警平台，且為單一 owner 專案；本任務定義門檻與可查詢的
資料，但無法代為選定/接上真實通道（同 V11-06 EmailDeliveryHandler stub
與 V12-01 Cloudflare Rate Limiting 的誠實記錄模式）。API latency/error
無 request-level log 表，為真實缺口而非疏漏。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V12-04。
專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V12-04_OBSERVABILITY_INCIDENT_READINESS.md

先建立 SLI/alert/owner matrix，再做三種 game day。不能只截 dashboard 圖；必須證明
告警送達、correlation 可定位、runbook 可執行，且 logs 不含 secrets/PII。
```
