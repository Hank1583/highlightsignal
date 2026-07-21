# Task Packet — V11-01 Action & Manual Task Lifecycle

Status: PLANNED
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

- [ ] Decision → Action → Manual Task 邊界清楚。
- [ ] Task 具 owner、期限、狀態、steps、history、permission。
- [ ] 既有 task 相容且無資料遺失。
- [ ] 不把技術執行或結果混入 Action。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V11-01。
專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V11-01_ACTION_MANUAL_TASK_LIFECYCLE.md

先讀 V10-04/05/08 完成紀錄與既有 tasks schema。請分開 Action 與 Manual Task，
以 expand/backfill 保留舊資料；不要做 Queue Worker 或把 Task 完成當 Business Outcome。
```
