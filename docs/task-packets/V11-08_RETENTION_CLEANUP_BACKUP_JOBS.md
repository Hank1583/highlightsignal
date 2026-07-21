# Task Packet — V11-08 Retention, Cleanup & Backup Jobs

Status: PLANNED
Milestone: V1.1 Execution & Operations
Dependency: `V11-02`、`V11-07`
Tracker: `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`（第 7 節）
Authority: `docs/00_Technical_Specification_Alignment_v1.2.md`（Retention/Queue support）

---

# Objective

依資料類別實作可審計的 retention、cleanup、backup 與 restore verification jobs，確保不誤刪 active business records，並能在現有主機限制下實際排程。

# Mandatory context before starting

1. V11-02 Worker 與 V11-07 Audit contracts。
2. `docs/5.database/10_Data_Retention_Database.md`、`docs/8.infrastructure/09_Backup_Recovery_Infrastructure.md`。
3. V09-07 migration rehearsal 與正式主機無 SSH/cron 限制。

# Required work

1. 建立 data-class inventory：domain records、snapshots、exports、logs、nonces、queue、notifications、audit、personal data。
2. 每類定義 retention period、legal/business reason、soft delete/archive/hard delete、owner approval 與 restore expectations。
3. 以可靠 queue 建立 dry-run first cleanup jobs；批次、checkpoint、idempotency、rate limit、failure recovery 齊全。
4. 定義 DB/config/artifact backup 與異地保存；secrets 不得進未加密備份或 repo。
5. 實際做一次 disposable restore verification，留下 RPO/RTO、筆數、checksum、耗時與缺口。
6. 提供 scheduler、alert、runbook 與 audit events。

# Out of scope

* 不未經 owner 核准直接 hard-delete production data。
* 不宣稱只有建立 backup 檔就等於可復原。
* 不用 retention 刪除法規或稽核要求保留的 Audit Log。

# Mandatory verification

* Dry-run 與實際小批次結果一致，active records 不被誤刪。
* Job 中斷/重跑不重複刪除或跳過資料。
* 真實 backup 在 disposable 環境可還原並通過 invariants。
* 未授權 trigger、跨 Workspace policy、audit 與 alert 通過。

# Required deliverables

1. Retention matrix/policies、jobs、scheduler、runbook。
2. Backup/restore procedure 與保存位置/加密策略。
3. Restore rehearsal report。
4. Tracker、V1.1 出口條件與 task packet 更新。

# Acceptance criteria

- [ ] Retention/cleanup/backup jobs 可重跑、可觀測、可復原。
- [ ] 每類資料政策有 owner 與理由。
- [ ] Restore 實測通過，不只檢查 backup 存在。
- [ ] V1.1 完整閉環、queue、notification、audit 可驗收。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V11-08。
專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V11-08_RETENTION_CLEANUP_BACKUP_JOBS.md

先建立資料分類與 retention matrix，所有 cleanup 先 dry-run；不得未經核准 hard-delete
正式資料。完成一次 disposable restore rehearsal 後，才可更新 V1.1 出口條件。
```
