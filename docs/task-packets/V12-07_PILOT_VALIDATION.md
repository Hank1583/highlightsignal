# Task Packet — V12-07 Pilot Validation

Status: PLANNED
Milestone: V1.2 Production & Specification Complete
Dependency: `V12-06`
Tracker: `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`（第 8 節）
Authority: `docs/00_Technical_Specification_Alignment_v1.2.md`（V1 Scope、Human-in-the-loop）

---

# Objective

讓 3～5 個經同意的真實 Workspace 從 onboarding 走到至少一個 Business Outcome，蒐集完成率、失敗點、使用者回饋與營運問題，證明產品不只在開發者測試資料上成立。

# Mandatory context before starting

1. V12-01 onboarding、V12-02 tests、V12-04 monitoring、V12-05 audit、V12-06 文件。
2. Pilot participant consent、privacy notice、support/contact 與 incident escalation。
3. 清楚區分 product validation 與 marketing/acquisition；Public Snapshot track 不阻擋 V1.2 Core。

# Required work

1. 定義 participant criteria、成功指標、退出條件、資料處理/同意、支持範圍與時間盒。
2. 招募/建立 3～5 個真實 Workspace；不得提交可識別個資、tokens 或 raw customer data 到 repo。
3. 每個 Workspace 走 onboarding → source connect → Signal → Evidence → Recommendation → Decision → Action/Task → Result → Outcome/Feedback。
4. 記錄 stage completion、time-to-value、drop-off、errors、support load、qualitative feedback。
5. 缺陷依 severity 分流；P0/P1 修復並重驗，非阻擋項進 backlog 且有 owner。
6. 產出匿名化 pilot report 與 go/no-go recommendation，最終發布決定仍屬 owner。

# Out of scope

* 不使用未經同意的客戶資料。
* 不把 3～5 人結果誇大為市場統計結論。
* 不因 Pilot 壓力跳過 security/privacy/backup gate。

# Mandatory verification

* 3～5 個真實 Workspace 均有完整或明確中止的 journey 記錄。
* 至少一個 Workspace 完成到 Business Outcome；其餘失敗點有分類與處理。
* Monitoring/support/incident 流程在 Pilot 期間實際可用。
* 報告已匿名化且 participant data 不進 repo。

# Required deliverables

1. Pilot protocol、consent/privacy/support checklist。
2. 匿名化 `docs/releases/V12-07_PILOT_VALIDATION_REPORT.md`。
3. Defect/backlog、metrics、feedback 與 go/no-go recommendation。
4. Tracker 與 task packet 更新。

# Acceptance criteria

- [ ] 3～5 個真實 Workspace 完成 Pilot 記錄。
- [ ] 至少一條 journey 到 Business Outcome。
- [ ] P0/P1 已處理並重驗。
- [ ] 隱私、支持與營運問題有 owner。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V12-07。
專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V12-07_PILOT_VALIDATION.md

這個 task 需要 owner 提供/核准 3～5 個真實 Pilot Workspace 與同意流程。沒有真實
participants 時不得用 mock 宣布完成。所有報告必須匿名化，P0/P1 修復後重驗。
```
