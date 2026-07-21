# Task Packet — V12-04 Observability & Incident Readiness

Status: PLANNED
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

- [ ] 六類關鍵訊號可觀測且有門檻/owner。
- [ ] Incident 可定位、處置、溝通、復盤。
- [ ] Game day 通過且證據可重現。
- [ ] Logs/alerts 不洩漏 secrets/PII。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V12-04。
專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V12-04_OBSERVABILITY_INCIDENT_READINESS.md

先建立 SLI/alert/owner matrix，再做三種 game day。不能只截 dashboard 圖；必須證明
告警送達、correlation 可定位、runbook 可執行，且 logs 不含 secrets/PII。
```
