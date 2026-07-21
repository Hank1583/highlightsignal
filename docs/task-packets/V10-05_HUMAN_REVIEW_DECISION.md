# Task Packet — V10-05 Human Review & Decision Formalization

Status: PLANNED
Milestone: V1.0 Decision Intelligence Core
Dependency: `V10-04`
Tracker: `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`（第 6 節）
Authority: `docs/00_Technical_Specification_Alignment_v1.2.md`（Human Review、Decision、Permission）

---

# Objective

把 Human Review 變成可驗證流程，讓人類針對正式 Recommendation 建立不可混淆、具理由、操作者、時間與歷程的 Decision。

# Mandatory context before starting

1. V10-04 正式 Recommendation contract。
2. 現有 `decisions` enum 僅有 `accepted/skipped`，Workflow update 與 audit 實作。
3. Alignment 要求至少支援 Accept、Reject、Skip、Defer、Needs More Evidence。

# Required work

1. 安全擴充 Decision schema/status，保留既有 `accepted/skipped` 資料語意。
2. 每筆 Decision 記錄 recommendation/version、actor、reason、timestamp、expected outcome 與 request/idempotency key。
3. 定義 Recommendation 可否重審、Decision 是否 append-only、何時以新 Decision supersede 舊決定；不得覆寫歷史。
4. 建立 review/read/submit API，交易內完成狀態更新、Decision insert 與 audit log。
5. 套用 WorkspacePermissions；AI、前端或背景 job 不得偽裝 decision maker。

# Out of scope

* Human Review 不是獨立 entity/table。
* 不在本 task 建立 Action/Task 執行生命週期。
* 不做 Autonomous Decision。

# Mandatory verification

* 五種 Decision outcome 均有 contract 與合法狀態轉換測試。
* 重複提交同一 idempotency key 只產生一次結果。
* 跨 Workspace、失效 membership、viewer/未授權角色均 fail closed。
* DB failure 不會留下 Recommendation 已更新但 Decision 未建立的半套狀態。

# Required deliverables

1. Migration 與 compatibility/backfill 文件。
2. Human Review UI/API、Decision Service/Repository/Policy。
3. Transaction、idempotency、permission、history 測試。
4. Tracker 與 task packet 更新。

# Acceptance criteria

- [ ] Decision 只由已授權的人類建立。
- [ ] 五種 outcome、reason、actor、timestamp、history 完整。
- [ ] 重複提交不重複記錄，交易失敗不產生半套資料。
- [ ] AI 不代替 Human 做正式決定。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V10-05。
專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V10-05_HUMAN_REVIEW_DECISION.md

請以正式 Recommendation 為前提，完成 Human Review 與 append-only Decision。
必須驗證五種 outcome、交易、idempotency、角色與跨 Workspace；不要建立自動 Decision。
```
