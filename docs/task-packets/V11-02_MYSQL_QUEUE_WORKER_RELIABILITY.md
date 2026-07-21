# Task Packet — V11-02 MySQL Queue Worker Reliability

Status: PLANNED
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

- [ ] Queue failure 可復原且不重複執行。
- [ ] Production 觸發方式在無 SSH/cron 限制下可運作。
- [ ] Job、Action、Task、Result 邊界保持分離。
- [ ] 監控與人工復原程序齊全。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V11-02。
專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V11-02_MYSQL_QUEUE_WORKER_RELIABILITY.md

目標環境是 PHP 7.0/MySQL 5.6，正式主機沒有 SSH/cron。先決定可實際運作且受保護
的 trigger，再完成 atomic claim、retry、dead-letter、stuck recovery 與 concurrency 證據。
```
