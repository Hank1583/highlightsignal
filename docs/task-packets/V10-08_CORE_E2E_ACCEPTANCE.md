# Task Packet — V10-08 Decision Intelligence Core E2E Acceptance

Status: PLANNED
Milestone: V1.0 Decision Intelligence Core
Dependency: `V10-01`～`V10-07`
Tracker: `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`（第 6 節）
Authority: `docs/00_Technical_Specification_Alignment_v1.2.md`（Unified V1 Domain Flow、V1 Scope）

---

# Objective

以真實 Workspace 與真實資料驗收 Data Source → Signal → Evidence → Explanation/Impact → Recommendation → Human Review → Decision 的完整 V1.0 核心鏈，並留下可重現證據。

# Mandatory context before starting

1. V10-01～07 全部 task packet、執行紀錄、migration 與已知限制。
2. V0.9 Workspace/auth/migration rehearsal 報告。
3. V1.0 三項出口條件與 Alignment v1.2 固定決策。

# Required work

1. 定義至少一條 GA 或 SEO golden path，固定 Workspace、source record、預期 Signal/Evidence/Recommendation/Decision IDs。
2. 執行正常流程、重跑/idempotency、跨 Workspace、權限不足、Evidence 缺失、AI failure、Decision retry 等情境。
3. 核對每個節點的 DB、API、audit、UI 及 source trace，不只驗證畫面。
4. 建立 E2E acceptance report，逐項列出 PASS/FAIL/BLOCKED、證據位置與殘留風險。
5. 只有全部 V1.0 出口條件具證據時才將 milestone 標為 DONE。

# Out of scope

* 不在驗收 task 偷補大功能；發現缺陷應回到對應 task 修復並重驗。
* 不包含 V1.1 Action/Execution/Outcome。
* 不以 mock-only 測試取代至少一條真實資料 flow。

# Mandatory verification

* 真實 golden path 端到端通過且所有關聯可追溯。
* Cross-workspace、角色、重放與失敗情境 fail closed。
* AI 未自動做 Decision，Decision actor 為真實人類會員。
* lint、typecheck、build、PHP lint、migration/postflight 與 core E2E 全通過。

# Required deliverables

1. `docs/releases/V10-08_CORE_E2E_ACCEPTANCE_REPORT.md`。
2. 可重現測試資料與指令（不得提交 secrets/個資）。
3. 缺陷修復及重驗證證據。
4. Tracker、版本出口條件與下一 task 更新。

# Acceptance criteria

- [ ] 真實資料驅動完整核心決策流程。
- [ ] Signal、Evidence、Recommendation、Decision 持久化且隔離。
- [ ] Human-in-the-loop 與 traceability 成立。
- [ ] V1.0 出口條件有可重現證據。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V10-08。
專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V10-08_CORE_E2E_ACCEPTANCE.md

這是驗收 task。請先確認 V10-01～07 均完成，使用至少一條真實資料 golden path，
同時執行隔離、權限、idempotency 與 failure 測試。不要用 mock-only 結果宣布 V1.0 完成。
```
