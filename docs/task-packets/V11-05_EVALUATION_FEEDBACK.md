# Task Packet — V11-05 Evaluation & Feedback

Status: PLANNED
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

- [ ] 基本閉環可由真實 Outcome 驅動。
- [ ] 人工與系統評估清楚分離。
- [ ] 歷程不可任意覆寫。
- [ ] 無 Autonomous Learning 或 Decision。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V11-05。
專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V11-05_EVALUATION_FEEDBACK.md

建立 Basic Evaluation 與 Manual Feedback，完成一條真實 closed loop；不得自動
改模型/規則，也不得依評估結果自動做 Decision 或 Action。
```
