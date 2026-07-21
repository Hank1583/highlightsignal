# Task Packet — V10-06 Decision-first Dashboard

Status: PLANNED
Milestone: V1.0 Decision Intelligence Core
Dependency: `V10-05`
Tracker: `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`（第 6 節）
Authority: `docs/00_Technical_Specification_Alignment_v1.2.md`（Frontend Alignment）

---

# Objective

把 Dashboard 改成單一可理解、可審查、可正式決策的流程：Today's Signals → Evidence → Explanation → Business Impact → Recommendation → Human Review → Decision。

# Mandatory context before starting

1. V10-01～05 的實際 API contract 與 state machine。
2. `DashboardWorkspace.tsx`、`DashboardTasksPage.tsx`、GA/SEO/SI 現有頁面與 WorkspaceProvider。
3. Alignment v1.2 第 11 節；GA/SI 頁面保留為 Evidence/raw-data drill-down。

# Required work

1. 建立 Workspace-scoped Today's Signals query/view，具 loading、empty、partial、error 狀態。
2. 用清楚層次呈現 Signal、Evidence、Explanation、Impact、Recommendation，避免 AI 文字與事實混淆。
3. 接上 V10-05 Human Review，支援五種 Decision outcome、理由、pending/failed/success feedback 與防重送。
4. 切換 Workspace 時取消舊請求並清除所有 domain state/cache；URL、Server Component/BFF、query key 必須一致。
5. 保留 GA／SEO／AEO／GEO drill-down link；不得複製 domain data 到 widget 私有 state 當正式來源。
6. 基本 accessibility、responsive 與 keyboard flow 必須可用。

# Out of scope

* 不在 UI 重新實作 detector、recommendation 或 permission rule。
* 不建立 V1.1 Action/Task 執行功能。
* 不把 widget 當 Business Data owner。

# Mandatory verification

* 真實 Workspace 可在單一流程看懂資料並提交正式 Decision。
* Workspace A/B 快速切換不殘留前一租戶內容或 late response。
* Refresh 後 Recommendation/Decision 不消失，重複點擊不重複提交。
* lint、typecheck、build、主要 responsive/a11y smoke test 通過。

# Required deliverables

1. Dashboard/BFF/query integration。
2. Loading/error/empty/permission/decision states。
3. Workspace isolation 與完整 UI flow 證據。
4. Tracker 與 task packet 更新。

# Acceptance criteria

- [ ] 單一流程完成理解與正式決策。
- [ ] Evidence 與 AI 解讀視覺上明確分開。
- [ ] Workspace 切換、錯誤恢復與防重送通過。
- [ ] GA/SI 保持 drill-down 而非第二套核心流程。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V10-06。
專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V10-06_DECISION_FIRST_DASHBOARD.md

先讀 V10-01～05 的實際 API 與完成紀錄。建立 Decision-first Dashboard，但不要
把 domain rule 搬到前端，也不要做 V1.1 Action/Task。完成後附 Workspace 快速切換
與一條真實 Decision flow 的證據。
```
