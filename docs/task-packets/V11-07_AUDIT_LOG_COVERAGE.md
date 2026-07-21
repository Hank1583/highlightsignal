# Task Packet — V11-07 Audit Log Complete Coverage

Status: PLANNED
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

- [ ] Security/AI/Decision/Task/Integration mutation 覆蓋完整。
- [ ] Audit append-only、可搜尋、可追溯。
- [ ] Secret/PII redaction 與權限通過。
- [ ] 可供營運與 incident investigation 使用。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V11-07。
專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V11-07_AUDIT_LOG_COVERAGE.md

先做完整 mutation coverage matrix，再補實作。Audit 必須 append-only、redacted、
Workspace-scoped；不要以 debug log 或 Notification 取代 audit evidence。
```
