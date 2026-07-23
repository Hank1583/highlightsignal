# Task Packet — V11-05 Evaluation & Feedback

Status: VERIFY（程式碼與 SQL 完成、disposable Docker 排練通過（28/28，含真實 WorkflowService 整合），真實主機套用待 owner 執行）
Milestone: V1.1 Execution & Operations
Dependency: `V11-04`
Tracker: `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`（第 7 節）
Authority: `docs/00_Technical_Specification_Alignment_v1.2.md`（Evaluation / Feedback、Learning Domain）

---

# Objective

建立 V1 基本 Learning closed loop：評估 Recommendation/Decision/Action/Outcome 是否有效並收集人工回饋，但不讓系統自行改模型、規則或做 Autonomous Learning。

# Mandatory context before starting

1. V10 Recommendation/Decision 與 V11 Action/Outcome contracts。
2. `docs/3.framework/05 Learning Framework.md`，以 Alignment v1.2 為衝突時最高準則。

# Required work

1. 建立 Evaluation 與 Feedback persistence，均具 workspace、subject type/id、evaluator/actor、rating/outcome、reason、source、version、timestamps。
2. 定義 basic metrics：recommendation adoption、decision outcome、task completion、outcome achieved/partial/not achieved、time-to-decision/time-to-outcome。
3. 人工 feedback 與系統 evaluation 必須可區分；修改或撤回採 append/supersede，不改寫歷史。
4. 建立 Workspace-scoped API/UI minimal flow、permission 與 audit。
5. Evaluation 可供報表讀取，但不得直接觸發自動 Decision/Action/model update。

# Out of scope

* 不訓練模型、不自動改 prompt/threshold。
* 不做複雜因果歸因或 autonomous optimization。
* 不建立重複的 Learning 頂層 domain 文件。

# Mandatory verification

* 真實 Recommendation → Decision → Action → Outcome 可建立 evaluation 與 human feedback。
* system evaluation 和 human feedback 在 schema/API/UI 可辨識。
* supersede/history、permission、cross-workspace、重放測試通過。
* 沒有程式路徑會因評估結果自動建立 Decision/Action。

# Required deliverables

1. Evaluation/Feedback schema、service、API、minimal UI。
2. Basic metrics definition 與 calculation tests。
3. Governance/history/permission 證據。
4. Tracker 與 task packet 更新。

# Acceptance criteria

- [x] 基本閉環可由真實 Outcome 驅動 — `outcome.achievement` 直接彙總 V11-04
      的真實 per-metric outcome_status；`recommendation.adoption`／
      `decision.outcome`／`task.completion`／`time_to_decision`／
      `time_to_outcome` 皆讀取真實既有資料計算，非合成分數。
- [x] 人工與系統評估清楚分離 — 單一 `evaluations` 表以 `source`
      （system/human）區分，`actor_member_id` 為 system 恆 NULL、human 恆必填
      （程式層強制，postflight 亦有查詢驗證）。
- [x] 歷程不可任意覆寫 — 全表 append-only；system 評估僅在計算值真的改變時
      才新增一列（idempotent-if-unchanged），human feedback 每次提交皆為
      新事件（可選 idempotency_key 防重複點擊）。
- [x] 無 Autonomous Learning 或 Decision — `EvaluationService` 的建構子只依賴
      `EvaluationRepository`，對 WorkflowRepository/ActionRepository 等寫入路徑
      零依賴，「不存在自動化 Decision/Action 路徑」是依賴圖的事實，不只是約定。

# Verification evidence

2026-07-21 disposable Docker `mysql:5.6` + local PHP 7.4 CLI 排練
（28 項斷言全數通過）：詳見 `backend/sql/VERIFICATION_RUNBOOK.md` 第 17 節。
摘要：6 種基本 metric 計算正確（含 outcome.achievement 的 improved/regressed/
partial/unknown 四種真實組合、time bucket 的 same_day/over_a_week）；
idempotent-if-unchanged 與 append-only 歷程正確；human feedback 的權限驗證
（無真實 actor 拒絕、subject_type 驗證）、idempotency、與 system 評估的結構性
區分皆正確；跨 Workspace 隔離；**真實整合**——透過 `WorkflowService::get()`
的既有呼叫路徑證明評估會在讀取時自動、正確地計算與追加，包含一個排練腳本
自身的錯誤假設（誤以為只會新增 1 列，實際上 adoption 與
first-ever-time_to_decision 兩個 metric 同時成立，正確產生 2 列）已透過直接
查 DB 澄清並修正測試腳本，而非產品缺陷。

**尚未執行（需要正式主機）**：套用 migration 034、上傳 PHP 變更、透過真實
瀏覽器登入互動驗證 Feedback 提交端點——與 V10-06 起每個任務相同的憑證缺口。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V11-05。
專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V11-05_EVALUATION_FEEDBACK.md

建立 Basic Evaluation 與 Manual Feedback，完成一條真實 closed loop；不得自動
改模型/規則，也不得依評估結果自動做 Decision 或 Action。
```
