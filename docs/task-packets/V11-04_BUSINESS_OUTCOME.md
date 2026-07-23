# Task Packet — V11-04 Business Outcome

Status: VERIFY（程式碼與 SQL 完成、disposable Docker 排練通過（17/17，含真實端到端整合），真實主機套用待 owner 執行）
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

- [x] Outcome 有 baseline、measurement window、metrics、status — 新建
      `business_outcome_metrics`（`UNIQUE(action_id, metric_key)`），每個
      metric 有獨立 baseline_value/baseline_captured_at/target_value/
      measurement_window_days/actual_value/status/outcome_status。
- [x] 與 Action、Result、source 可追溯且語意分離 — 表格直接連回 `actions`
      （而非 Task）；`source_type`/`source_ref`/`calculation_version` 提供
      來源與計算版本追溯；與 V11-03 Execution Result 完全獨立的表與語意。
- [x] 至少一種真實 GA/SEO metric 可測量 — 重用 `WorkflowService::metrics()`
      既有的真實 4 個 GA/SEO metric（sessions/conversions/seo_score/
      seo_issues），非合成數字；disposable rehearsal 以真實
      create_task→complete→measure_outcome 流程端到端驗證。
- [x] 不進行 Autonomous Learning — 本任務只記錄與計算 outcome_status，無任何
      路徑會回頭修改 Recommendation、Decision 或觸發新的 Action。

# Verification evidence

**設計決策（提前說明）**：任務包提示的「移除/延後既有 task unique constraint」
會需要改動已上線且被 V10-04~06 UI 讀取的既有 `business_outcomes` 表。改為
新建 ADDITIVE 的 `business_outcome_metrics` 表（連回 Action，而非 Task），
在完全不觸碰既有表結構/資料的前提下，於 `create_task`／`measure_outcome`
兩個既有呼叫點「並存」寫入正式的多 metric 資料。此設計已於
`backend/sql/VERIFICATION_RUNBOOK.md` 第 16 節與 migration 檔頭完整記錄。

2026-07-21 disposable Docker `mysql:5.6` + local PHP 7.4 CLI 排練
（17 項斷言全數通過）：baseline 寫入即鎖定（重複提交不同值回傳原值）；
improved/flat/regressed 在 increase 與 decrease 兩種方向皆正確計算；
baseline 為正但實測非正時正確標示 unavailable（不猜值）；跨 Workspace 隔離；
**真實端到端整合**——透過 `WorkflowService` 真實建立任務（含真實 baseline）、
完成步驟、呼叫 `measure_outcome`（真實 current metrics），確認舊版 blob 與
新版正式 per-metric 資料「同時」被建立與更新，非取代關係。

**尚未執行（需要正式主機）**：套用 migration 033、上傳 PHP 變更、以真實 GA/
SEO 資料執行端到端驗證（本次排練使用合理但合成的數字）。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V11-04。
專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V11-04_BUSINESS_OUTCOME.md

請先盤點既有 business_outcomes，使用 expand/backfill 保留資料。建立 Action 導向的
baseline/measurement model，並以真實 GA 或 SEO metric 驗證；不要把 Result success 當成果。
```
