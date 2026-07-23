# Task Packet — V11-08 Retention, Cleanup & Backup Jobs

Status: VERIFY（程式碼與 SQL 完成、disposable Docker 排練通過（35/35 功能斷言＋真實 mysqldump backup/restore 驗證），真實主機套用與排程設定待 owner 執行）
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

- [x] Retention/cleanup/backup jobs 可重跑、可觀測、可復原 — 4 種資料類別
      （nonces／終態 Queue Jobs／舊 Execution Result／已讀 Notification）
      皆 dry-run-first、批次（500 筆上限）、idempotent（重跑只重新評估
      eligibility，不會重複刪除）；每次執行寫入 `retention_cleanup_runs`
      ledger；一個類別失敗不阻擋其他類別（真實強制失敗測試證明）；透過
      新 `POST /api/v1/retention/run`（沿用 `WorkerRequestAuthenticator`）
      可排程執行；真實 mysqldump backup／disposable restore 驗證可完整
      復原（見下）。
- [x] 每類資料政策有 owner 與理由 — 完整 data-class inventory（見
      VERIFICATION_RUNBOOK 第 20 節表格），含 retention 期間、刪除方式、
      owner 核准需求（dead_letter Queue Job 需要
      `RETENTION_DEAD_LETTER_CLEANUP_APPROVED=true` 明確核准，預設不刪）。
      Audit Log 與核心 business records 明確排除於自動刪除之外。
- [x] Restore 實測通過，不只檢查 backup 存在 — 真實 `mysqldump`
      （989 行、53KB，耗時 362ms）＋在全新 disposable MySQL 容器還原
      （693ms）；還原後 13 張表 row count 與 5 張代表性表格
      `CHECKSUM TABLE` 皆與原始資料庫完全一致；還原後的 FK 約束真實生效
      （嘗試插入不存在的 workspace_id 被正確拒絕）。
- [x] V1.1 完整閉環、queue、notification、audit 可驗收 — retention cleanup
      本身即透過 V11-02 Queue 的 worker trigger 模式排程；cleanup 執行
      透過 V11-07 `AuditLogger` 記錄每個受影響 Workspace 的事件；發現並
      正確處理與 Queue/Notification 的真實跨表 FK 相依（`execution_results`／
      `notification_deliveries` 對 `queue_jobs` 的 `ON DELETE RESTRICT`）。

# Verification evidence

2026-07-22 disposable Docker `mysql:5.6` + local PHP 7.4 CLI 排練（35 項
功能斷言全數通過，另加真實 backup/restore 驗證）：詳見
`backend/sql/VERIFICATION_RUNBOOK.md` 第 20 節。摘要：dry-run 與實際刪除
結果一致；FK-blocked 排除機制正確運作（不是拋出 FK 錯誤，而是正確跳過，
待被引用的 Execution Result 也過期後才真正刪除）；dead_letter Queue Job
owner 核准 gate 正確運作；notification 的 unread 狀態無論多舊皆不會被
刪除；真實強制單一類別失敗（暫時改名 `notifications` 表）證明其他 3
類別不受影響；跨 Workspace audit 歸屬正確。**真實 restore 驗證**：非模擬
數字——真實 mysqldump（362ms）、全新 disposable 容器還原（693ms）、
13 張表 row count 與 5 張表 checksum 完全一致、還原後 FK 約束真實生效。

**尚未執行（需要正式主機）**：套用 migration 037、上傳 PHP 變更、設定外部
排程器呼叫 `POST /api/v1/retention/run`、owner 建立真實定期 phpMyAdmin
匯出排程（本任務定義程序並驗證還原機制，無法在無 SSH/cron 的主機上自動化
匯出本身）、owner 決定是否核准 dead_letter Queue Job 自動清理。

至此 V1.1 Execution & Operations 全部 8 項任務（`V11-01`～`V11-08`）皆已
完成程式＋SQL＋disposable rehearsal，狀態 VERIFY，真實主機套用待 owner
執行（見專案標準規則）。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V11-08。
專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V11-08_RETENTION_CLEANUP_BACKUP_JOBS.md

先建立資料分類與 retention matrix，所有 cleanup 先 dry-run；不得未經核准 hard-delete
正式資料。完成一次 disposable restore rehearsal 後，才可更新 V1.1 出口條件。
```
