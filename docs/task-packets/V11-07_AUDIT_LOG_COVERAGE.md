# Task Packet — V11-07 Audit Log Complete Coverage

Status: VERIFY（程式碼與 SQL 完成、disposable Docker 排練通過（41/41），真實主機套用待 owner 執行）
Milestone: V1.1 Execution & Operations
Dependency: `V11-01`～`V11-06`
Tracker: `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`（第 7 節）
Authority: `docs/00_Technical_Specification_Alignment_v1.2.md`（Audit Log cross-cutting capability）

---

# Objective

讓所有 security-sensitive、AI、Decision、Action/Task、Integration、Queue、Notification mutation 都寫入一致、append-only、可搜尋且可追溯的 Audit Log。

# Mandatory context before starting

1. `audit_logs` 現有 schema 與所有 `audit`/`event_type` 呼叫點。
2. V09 authorization、V10 domain、V11 execution/notification 的 mutation inventory。
3. Alignment v1.2：Audit 是橫切能力，不是 pipeline 最後一步。

# Required work

1. 建立 mutation-to-audit coverage matrix，列 endpoint/event、actor、entity、before/after metadata、request/correlation ID 與現況。
2. 收斂 audit writer/interface 與 event naming；所有重要 mutation 在同一交易或可靠 outbox/補償機制記錄。
3. metadata 做 secret/PII redaction、size limit、canonical JSON/versioning。
4. 建立 Workspace-scoped search/read API；一般使用者不可 update/delete Audit Log。
5. 加入完整性、retention、export 與 incident 查詢規則。

# Out of scope

* 不把一般 debug/application logs 全塞進 audit_logs。
* 不允許管理 UI 編輯或刪除 audit event。
* 不把 Notification 當 audit 的替代品。

# Mandatory verification

* Coverage matrix 所有 P0/P1 mutation 均有 audit event 或明確 blocker。
* 交易失敗不留下誤導性 success audit；成功 mutation 不會漏記。
* secret/token/password 不出現在 metadata。
* 跨 Workspace 查詢、一般使用者 mutation、直接 DB API 均 fail closed。

# Required deliverables

1. Audit coverage matrix 與缺口修復。
2. 統一 writer、event catalog、search/read API。
3. Redaction、immutability、transaction、permission 證據。
4. Tracker 與 task packet 更新。

# Acceptance criteria

- [x] Security/AI/Decision/Task/Integration mutation 覆蓋完整 — 收斂為單一
      `AuditLogger`，補上 Decision/Action/Task/Outcome 細粒度事件、
      Execution Result、Queue 第二條 dead-letter 路徑（stale lease）、GA
      連接（不只是 toggle）、人工 Feedback、Notification
      read/dismiss/preference、Workspace provisioning；AI 使用已由既有
      `dashboard_ai_logs`/`dashboard_ai_plan_logs` 覆蓋，不重複塞入
      `audit_logs`（見 out of scope）。
- [x] Audit append-only、可搜尋、可追溯 — grep 確認全專案無任何
      `UPDATE`/`DELETE audit_logs`；新 `GET .../audit-logs`
      Workspace-scoped 搜尋 API（`event_type`/`entity_type`/`entity_id`/
      `actor_member_id`/`from`/`to`），僅 owner/admin 可讀（新
      `audit.read` permission，較一般 `read`更嚴格）。
- [x] Secret/PII redaction 與權限通過 — `AuditLogger` 統一 redaction
      （敏感 key 整值替換、Bearer/token pattern 字串內清除）、4KB
      size limit（超過以 `_truncated` marker 取代原文）、
      `_schema_version` 版本化；排練證明 password/api_key/Bearer token
      皆不出現於儲存的 metadata_json。
- [x] 可供營運與 incident investigation 使用 — entity_type+entity_id 可查
      單一實體歷史、actor_member_id+時間範圍可查單一成員行為，新增
      `idx_audit_logs_workspace_event` 索引支援 event_type 查詢；
      retention/export 規則已定義（見 VERIFICATION_RUNBOOK 第 19 節），
      實際刪除 job 留給 V11-08（其相依性已包含 V11-07）。

# Verification evidence

2026-07-22 disposable Docker `mysql:5.6` + local PHP 7.4 CLI 排練
（41 項斷言全數通過）：詳見 `backend/sql/VERIFICATION_RUNBOOK.md` 第 19 節。
摘要：完整 mutation-to-audit coverage matrix（見該節表格）；
`SignalService::applyDetectionPlan()` 補上交易包裝，真實 FK violation
測試證明失敗時 signal 與 audit 皆正確 rollback（此前完全沒有交易保護）；
`WorkflowService::mutate()` 從單一通用 `"Dashboard Workflow {action}"`
事件，改為每個真實 Decision/Action/Task/Outcome 變更各自一筆、
entity_id 為該實體自己的 public_id 的細粒度事件（排練證明 create_task
產生完整 6 事件串、idempotent resubmit 不產生任何 audit 噪音）；
Queue 補上 stale-lease 這條此前完全未被 audit 的第二條 dead-letter 路徑；
GA OAuth 連接（此前只有 toggle 被 audit）；EvaluationService 人工
Feedback（idempotency replay 不重複 audit，排練前的程式碼審查中發現並
修正這個設計錯誤）；Notification read/dismiss/preference；Workspace
provisioning。跨 Workspace 隔離、owner/admin-only 權限矩陣皆驗證通過。

**尚未執行（需要正式主機）**：套用 migration 036、上傳 PHP 變更、真實
瀏覽器登入（owner/admin）驗證 `GET .../audit-logs` 端點。V11-08 的
retention/cleanup job 實作亦未開始（依設計留給該任務）。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V11-07。
專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V11-07_AUDIT_LOG_COVERAGE.md

先做完整 mutation coverage matrix，再補實作。Audit 必須 append-only、redacted、
Workspace-scoped；不要以 debug log 或 Notification 取代 audit evidence。
```
