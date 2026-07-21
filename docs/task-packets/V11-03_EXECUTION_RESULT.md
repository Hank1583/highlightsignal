# Task Packet — V11-03 Execution Result

Status: PLANNED
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

- [ ] Result 正確表示技術執行而非商業成果。
- [ ] Task/Job、attempt、duration、output/error 可追溯。
- [ ] 敏感輸出受限制且 Workspace 隔離成立。
- [ ] retry 不產生混淆或重複結果。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V11-03。
專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V11-03_EXECUTION_RESULT.md

先讀 V11-01/02 的完成紀錄。建立 Execution Result 並接上 Task 與 Queue Job，
但不得把 success 當 Business Outcome；輸出需有 size limit 與 sensitive-data redaction。
```
