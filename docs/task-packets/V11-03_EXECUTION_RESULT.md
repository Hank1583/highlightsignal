# Task Packet — V11-03 Execution Result

Status: VERIFY（程式碼與 SQL 完成、disposable Docker 排練通過（13/13，含 Task 與 Queue Job 兩條真實整合路徑），真實主機套用待 owner 執行）
Milestone: V1.1 Execution & Operations
Dependency: `V11-01`、`V11-02`
Tracker: `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`（第 7 節）
Authority: `docs/00_Technical_Specification_Alignment_v1.2.md`（Execution Result）

---

# Objective

持久化 Manual Task 或 Queue Job 的技術執行結果，清楚記錄 success/failure/output/error/duration，且不把「執行成功」誤當成 Business Outcome。

# Mandatory context before starting

1. V11-01 Action/Task 與 V11-02 Queue Job contracts。
2. Alignment v1.2 第 6～8 節；`docs/4.architecture/11_Execution_Architecture.md`。

# Required work

1. 建立 `execution_results`，支援 Task 或 Queue Job 作為來源，但需以可驗證約束避免兩者皆空或皆填。
2. 記錄 workspace、status、started/completed time、duration、output summary/reference、error code/message、attempt 與 handler version。
3. 大型或敏感輸出不得無限制寫入 DB；定義 redaction、size limit 與外部 artifact reference。
4. Worker 與 Manual Task completion flow 寫入 Result；同一 attempt/idempotency key 不重複。
5. 建立 Workspace-scoped read API 與 audit/monitoring hooks。

# Out of scope

* 不計算 Business Outcome 或 Recommendation effectiveness。
* 不把原始 secrets、tokens、完整個資寫進 output/error。
* 不用 Result 反向修改 Decision。

# Mandatory verification

* Manual Task 與 Queue Job 各產生 success/failure Result。
* retry attempts 可分辨且不重複同一 attempt。
* Result 與 Business Outcome API/schema 明確分離。
* 輸出限制、redaction、Workspace authorization 測試通過。

# Required deliverables

1. Execution Result migration、service/repository/API。
2. Task/Worker integration 與 error redaction 規則。
3. success/failure/retry/permission 證據。
4. Tracker 與 task packet 更新。

# Acceptance criteria

- [x] Result 正確表示技術執行而非商業成果 — `execution_results` 無任何欄位
      涉及 Business Outcome，只記錄 success/failure/output/error/duration。
- [x] Task/Job、attempt、duration、output/error 可追溯 —
      `task_id`/`queue_job_id` 恰一設定（MySQL 5.6 無法用 CHECK 強制，已在
      `ExecutionResultService` 程式層保證，postflight 亦有查詢驗證）；
      `attempt` 為來源自身的自然 idempotency key。
- [x] 敏感輸出受限制且 Workspace 隔離成立 — `redactAndLimit()` 先做
      Bearer/API key/password 樣式遮蔽，再截斷至 4KB；所有查詢均以
      workspace_id 隔離。
- [x] retry 不產生混淆或重複結果 — `UNIQUE(task_id, attempt)` /
      `UNIQUE(queue_job_id, attempt)` 保證同一 attempt 重複記錄回傳既有列，
      不同 attempt（真實重試）各自產生獨立列。

# Verification evidence

2026-07-21 disposable Docker `mysql:5.6` + local PHP 7.4 CLI 排練
（13 項斷言全數通過）：詳見 `backend/sql/VERIFICATION_RUNBOOK.md` 第 15 節。
摘要：Bearer token／password 正確遮蔽；超長輸出正確截斷並附註
`output_reference` 提示；同一 (task_id, attempt) 重複記錄回傳原列、內容不被
覆寫；**兩條真實整合路徑**——透過 `WorkflowService` 真實建立任務並完成步驟後
正確寫入 Task 來源的 Result；透過 `QueueService` 真實跑一個成功與一個失敗的
job，皆正確寫入對應 Result，失敗訊息中的偽造 token 正確遮蔽，且強制重試後
第二次嘗試產生獨立的 attempt=2 列而非覆寫。

**排練前發現並修正一個真實 bug**：`ExecutionResultRepository` 的
`bind_param()` 型別字串手動計算時算錯（13 個參數只給了 12 個字元且第 7 位起
型別錯位）——在執行排練前透過逐字元重新核對參數順序發現並修正，非執行期
才發現。

**尚未執行（需要正式主機）**：套用 migration 032、上傳 PHP 變更、真實 HTTP
端到端驗證 Task 與 Queue Job 兩條完成路徑——與先前每個任務相同的缺口。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V11-03。
專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V11-03_EXECUTION_RESULT.md

先讀 V11-01/02 的完成紀錄。建立 Execution Result 並接上 Task 與 Queue Job，
但不得把 success 當 Business Outcome；輸出需有 size limit 與 sensitive-data redaction。
```
