# Task Packet — V11-04 Business Outcome

Status: PLANNED
Milestone: V1.1 Execution & Operations
Dependency: `V11-03`
Tracker: `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`（第 7 節）
Authority: `docs/00_Technical_Specification_Alignment_v1.2.md`（Business Outcome、Learning boundary）

---

# Objective

把既有 `business_outcomes` 升級為可比較 baseline 與 measurement window 的正式商業成果記錄，並連回 Action，而不是只以 Task 完成狀態代表成功。

# Mandatory context before starting

1. `012_business_outcomes.sql` 的現況（目前一個 Task 一筆 outcome）。
2. V11-01 Action、V11-03 Execution Result contracts。
3. Alignment v1.2 Business Outcome 與 Execution Result 分離規則。

# Required work

1. 盤點並以 expand/backfill 擴充 outcome schema：action link、metric definition、baseline value/window、target、measurement window、actual value、direction/status、source/evidence references。
2. 定義一個 Action 可有多個 Outcome metric，移除/延後既有 task unique constraint 的安全遷移方案。
3. baseline 必須在 Action 執行前或有可證明時間點鎖定；測量結果需保留來源與計算版本。
4. 建立 create/measure/read API、permission、audit 與 idempotency。
5. 至少以一個 GA 或 SEO 真實 metric 完成 baseline → measurement。

# Out of scope

* 不因 Task/Job success 自動宣告商業改善。
* 不做 Autonomous Learning 或自動調整 Recommendation。
* 不抹除既有 outcome 資料。

# Mandatory verification

* 一個真實 Action 具有 baseline、window、target、actual 與 source trace。
* 相同 measurement 重跑 idempotent；來源不足時標示 unavailable，不猜值。
* Execution Result success + Outcome not improved 的情境能正確呈現。
* 舊資料 backfill、Workspace isolation 與 role tests 通過。

# Required deliverables

1. Business Outcome migration/backfill/postflight。
2. Measurement service/API/UI minimal view。
3. 真實 metric 與「執行成功但結果未改善」驗證。
4. Tracker 與 task packet 更新。

# Acceptance criteria

- [ ] Outcome 有 baseline、measurement window、metrics、status。
- [ ] 與 Action、Result、source 可追溯且語意分離。
- [ ] 至少一種真實 GA/SEO metric 可測量。
- [ ] 不進行 Autonomous Learning。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V11-04。
專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V11-04_BUSINESS_OUTCOME.md

請先盤點既有 business_outcomes，使用 expand/backfill 保留資料。建立 Action 導向的
baseline/measurement model，並以真實 GA 或 SEO metric 驗證；不要把 Result success 當成果。
```
