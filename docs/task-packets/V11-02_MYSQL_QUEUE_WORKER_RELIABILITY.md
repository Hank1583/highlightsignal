# Task Packet — V11-02 MySQL Queue Worker Reliability

Status: VERIFY（程式碼與 SQL 完成、disposable Docker 排練通過（21 項斷言＋真實雙進程 concurrency 測試），真實主機套用與正式 scheduler 設定待 owner 執行）
Milestone: V1.1 Execution & Operations
Dependency: `V11-01`
Tracker: `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`（第 7 節）
Authority: `docs/00_Technical_Specification_Alignment_v1.2.md`、`docs/10.adr/04_ADR_004_Database_Job_Queue.md`

---

# Objective

讓既有 MySQL `queue_jobs` 具備可安全 claim、lock、retry、backoff、timeout、idempotency、dead-letter 與 stuck recovery 的正式 Worker 行為。

# Mandatory context before starting

1. `010_v1_foundation.sql` 的 `queue_jobs` schema。
2. `docs/4.architecture/11_Execution_Architecture.md`、Job Queue ADR、PHP 7.0/MySQL 5.6 限制。
3. 正式主機沒有 SSH/cron；觸發方式必須明確決策，不能假設常駐 daemon。

# Required work

1. 定義 Job contract、handler registry、payload version、idempotency key、attempt/error/result metadata。
2. 實作 MySQL 5.6 可用的 atomic claim；證明兩個 worker 不會同時執行同一 job。
3. 實作 lease/heartbeat 或明確 timeout、exponential backoff、max attempts、dead-letter 與 stuck recovery。
4. Worker 必須無狀態；Business rule 留在 domain service，Job 只負責技術執行。
5. 決定正式觸發：受簽章保護的短批次 HTTP worker + 外部 scheduler，或經 owner 核准的其他可運作方案；不得公開未授權 trigger。
6. 加入 queue metrics/log/audit 與操作 runbook。

# Out of scope

* 不更換為 Redis、Cloudflare Queue 或常駐服務。
* 不允許 Google Apps Script 理解 domain rule。
* 不把 Action、Task 或 Execution Result 合併進 `queue_jobs`。

# Mandatory verification

* 兩個 worker 競爭同一 job 時只執行一次。
* 暫時失敗依 backoff 重試；永久失敗進 dead-letter；stuck job 可安全回收。
* handler 重放不產生重複 side effect。
* 未授權 trigger、跨 Workspace payload、未知 job type 均 fail closed。

# Required deliverables

1. Queue schema migration、Worker/handler contracts、trigger endpoint。
2. Scheduler/secret/operations runbook。
3. Concurrency、retry、dead-letter、stuck、idempotency 證據。
4. Tracker 與 task packet 更新。

# Acceptance criteria

- [x] Queue failure 可復原且不重複執行 — `QueueRepository::claimNext()` 用
      MySQL 5.6 相容的原子 `UPDATE...ORDER BY...LIMIT 1` + 隨機 claim token，
      經真實雙進程 concurrency 測試證明 20 個 job 被兩個真實 OS process
      競爭後恰好各執行一次，零重複、零遺漏。`recoverStuckJobs()` 復原
      crashed worker 遺留的 processing job。
- [x] Production 觸發方式在無 SSH/cron 限制下可運作 — 新增
      `POST /api/v1/queue/run`，由專屬 `WorkerRequestAuthenticator`（非既有
      member/workspace 導向的 `ServiceRequestAuthenticator`）以獨立密鑰
      `QUEUE_WORKER_SECRET` 簽章保護；外部 scheduler 的實際選型留給正式主機
      設定者決定，本任務保證的是端點本身安全（未授權呼叫一律拒絕）。
- [x] Job、Action、Task、Result 邊界保持分離 — `queue_jobs` 未新增任何
      Action/Task/Result 欄位；`QueueService` 不知道也不關心 job payload
      的業務意義，只透過呼叫者傳入的 handler registry 執行。
- [x] 監控與人工復原程序齊全 — dead-letter 事件寫入 audit_logs；
      stuck job 復原機制每次 `runBatch()` 都會執行；`listForWorkspace()`／
      `cancel()` 提供人工查詢與取消能力。

# Verification evidence

2026-07-21 disposable Docker `mysql:5.6` + local PHP 7.4 CLI 排練
（21 項單進程斷言＋1 組真實雙進程 concurrency 測試，全數通過）：詳見
`backend/sql/VERIFICATION_RUNBOOK.md` 第 14 節。摘要：enqueue 驗證（job_type
格式／priority 範圍／payload 大小限制）、idempotent enqueue、retry+
exponential backoff、max_attempts 後正確 dead-letter、未知 job_type 透過同一
fail-closed 路徑處理（非靜默略過）、成功 handler 正確完成並收到正確 payload、
stuck job 復原（requeue 或 dead-letter 視 attempts 而定）、跨 Workspace
cancel 正確拒絕、**真實雙進程 concurrency**（20 個 job 由兩個真實 `docker
run` process 平行搶佔，結果以 `job_type`/`locked_by` 直接查 DB 驗證，非只信
任各 process 自己的輸出：20 個全部恰好被執行一次，兩個 process 各拿 10 個，
零重複零遺漏）、dead-letter audit 記錄正確。

**尚未執行（需要正式主機）**：套用 migration 031、上傳 PHP 變更、設定真實
`QUEUE_WORKER_SECRET`、以及設定真實外部 scheduler 定期呼叫
`POST /api/v1/queue/run`（目前也還沒有任何 job handler 需要被排程，第一個
真實使用者是 V11-06 Notification）。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V11-02。
專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V11-02_MYSQL_QUEUE_WORKER_RELIABILITY.md

目標環境是 PHP 7.0/MySQL 5.6，正式主機沒有 SSH/cron。先決定可實際運作且受保護
的 trigger，再完成 atomic claim、retry、dead-letter、stuck recovery 與 concurrency 證據。
```
