# Task Packet — V11-01 Action & Manual Task Lifecycle

Status: VERIFY（程式碼與 SQL 完成、disposable Docker 排練通過（29/29，含發現並修復一個 idempotency 缺陷）；真實主機套用待 owner 執行）
Milestone: V1.1 Execution & Operations
Dependency: `V10-08`
Tracker: `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`（第 7 節）
Authority: `docs/00_Technical_Specification_Alignment_v1.2.md`（Action、Task、Recommendation/Execution boundaries）

---

# Objective

將人類接受的 Decision 轉成明確 Business-level Action，再由 Action 建立可指派、可追蹤、可稽核的 Manual Task；Action、Task 與 Queue Job 必須保持不同語意。

# Mandatory context before starting

1. V10-04/05/08 的 Recommendation、Decision 與 E2E contract。
2. 既有 `tasks`／`task_steps` schema 與 Workflow Service/UI。
3. Alignment v1.2 第 6～8 節與 `docs/4.architecture/11_Execution_Architecture.md`。

# Required work

1. 建立 `actions`（Recommendation Domain）或等價正式模型，連到 accepted Decision，記錄 intent、status、authorization、creator、時間與版本。
2. 以 expand/backfill 讓既有 `tasks.recommendation_id` 過渡到 `action_id`；不得直接破壞既有任務。
3. 正式化 Manual Task lifecycle：pending/in_progress/blocked/completed/cancelled、assignee、due date、steps、history、completion note。
4. 定義 Decision outcome 與 Action/Task 建立規則；Reject/Skip/Defer/Needs More Evidence 不得自動建立可執行 Action。
5. 建立 Workspace-scoped API、角色矩陣、交易與 idempotency；所有 mutation 寫 audit。

# Out of scope

* 不在此 task 執行 System Queue Job。
* 不把 Task 完成當成 Business Outcome 達成。
* 不允許 AI 未經授權自行建立 Action。

# Mandatory verification

* accepted Decision 可建立一個 idempotent Action 與 Manual Task。
* 非 accepted outcome、跨 Workspace、權限不足與重放均 fail closed。
* lifecycle 非法跳轉被拒絕，合法跳轉有 actor/time/history。
* 舊 tasks backfill 後仍可讀取與操作。

# Required deliverables

1. Action/task migrations、backfill、postflight。
2. Service/Repository/Policy/API/UI lifecycle。
3. Permission、transaction、idempotency、history 測試。
4. Tracker 與 task packet 更新。

# Acceptance criteria

- [x] Decision → Action → Manual Task 邊界清楚 — 新增 `actions` 表（獨立
      status、`decision_id` UNIQUE 保證 idempotent），只有 `create_task` 的
      implicit accept 路徑會建立 Action；`save_decision`（含
      reject/skip/defer/needs_more_evidence 及未建立任務的
      accepted/modified）完全不碰 `actions`/`tasks`。
- [x] Task 具 owner（`assigned_member_id`，含 workspace membership 驗證）、
      期限（`due_at`）、狀態（新增 `blocked`，明確 state machine，`completed`
      永遠不能直接設定）、steps（既有）、history（`audit_logs` 既有機制）、
      permission（沿用既有 `workflow.mutate` 矩陣）。
- [x] 既有 task 相容且無資料遺失 — migration 030 以 expand/backfill 為每筆
      既有 task 反推其 accepted/modified Decision 並建立對應 Action，
      `recommendation_id` 保持 NOT NULL 且持續 dual-write，未修改任何既有
      讀取路徑。
- [x] 不把技術執行或結果混入 Action — `actions` 表無任何欄位涉及 Queue Job
      或執行結果（V11-02/03 的範圍），Action 只記錄授權與業務意圖。

# Verification evidence

2026-07-21 disposable Docker `mysql:5.6` + local PHP 7.4 CLI 排練
（29 項斷言全數通過）：詳見 `backend/sql/VERIFICATION_RUNBOOK.md` 第 13 節。
摘要：backfilled 的既有 task 正確取得 action_id 且可透過新 lifecycle API 操作；
新建 create_task 正確建立 Action+Decision+Task；**排練過程發現並修復一個真實
idempotency 缺陷**（重複提交 create_task 原本會因 recordDecision() 每次都
append 一筆新 Decision，導致同一個 Task 底下產生第二個 Action——已修正為
「Task 已存在時完全不重跑 Decision/Action/Outcome」）；步驟驅動自動完成正確
同步 Action 狀態；blocked 狀態下完成所有步驟不會自動完成（凍結，需先手動
解除封鎖）；completed 永遠不能直接設定；cancelled 為終態；assignee 驗證
（必須是啟用中成員）；跨 Workspace 存取正確拒絕；四種不接受的 outcome 皆不
建立 Task/Action；角色權限矩陣不變。

`npm run typecheck`/`lint`/`build` 皆通過（`DashboardTasksPage.tsx` 新增
封鎖/取消/恢復控制與備註顯示）。

**尚未執行（需要正式主機）**：套用 migrations 029/030、上傳 PHP 變更、真實
瀏覽器登入互動驗證（與 V10-06 相同的憑證缺口）、確認正式主機真實既有 task
資料的 backfill 結果（本次排練只用一筆合成的既有 task，非正式主機真實資料
形狀）。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V11-01。
專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V11-01_ACTION_MANUAL_TASK_LIFECYCLE.md

先讀 V10-04/05/08 完成紀錄與既有 tasks schema。請分開 Action 與 Manual Task，
以 expand/backfill 保留舊資料；不要做 Queue Worker 或把 Task 完成當 Business Outcome。
```
