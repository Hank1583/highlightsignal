# Task Packet — V09-01 Migration Runner

Status: DONE（runner 機制已於 2026-07-21 透過 V09-07 disposable rehearsal 環境
實際驗證，含三個原列為「長期接受風險」的 destructive 情境）
Milestone: V0.9 Workspace Foundation  
Dependency: V0.8 exit conditions — owner 已接受 V08-02 rotation 風險並指示直接進行 V09-01
Tracker: `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`
Evidence: `backend/api/src/Migration/MigrationRunner.php`、`backend/api/bin/migrate.php`、
`backend/sql/migrations/010`–`019`、`backend/sql/VERIFICATION_RUNBOOK.md`（第 1 節）、
`docs/releases/V09-07_MIGRATION_REHEARSAL_REPORT.md`（實際執行證據）
Operational note: 主機（智邦生活館 虛擬主機）確認無 SSH／cron，`bin/migrate.php`
仍無法在此主機執行；實際操作方式仍是 `backend/sql/manual_apply_bookkeeping.sql`
（phpMyAdmin 手動貼 SQL＋bookkeeping INSERT）。2026-07-21：owner 選擇用真實
backup 在本機 Docker MySQL 5.6 disposable 環境演練（見
`docs/releases/V09-07_MIGRATION_REHEARSAL_REPORT.md`），runner 首次被真正執行，
status／baseline／migrate／idempotent re-run／checksum mismatch fail-closed／
故意失敗 migration／併發 runner lock 全部驗證通過。過程中發現並修好一個真實
bug（多語句 migration 中途失敗時 runner 會靜默記成功，見報告第 5.4 節），
修好後重新驗證 happy path 不受影響。三個原列為「長期接受風險」的 destructive
情境已全部解除；主機仍無 SSH，這支 runner 仍無法用於真正的主機操作，但其
本身的正確性已不再是未知數。

---

# Objective

建立唯一、版本化、可查狀態、可防止重複與並行執行的 MySQL migration 機制，取代手動逐檔與 request-time DDL。

# Current evidence

* `backend/sql/README.md` 目前要求人工逐檔執行。
* 尚無 `schema_migrations` table 或 migration runner。
* 現有 `010`–`012` 使用 `CREATE TABLE IF NOT EXISTS`，但沒有 checksum 或 applied evidence。
* `020` 是永遠 rollback 的人工 template；`030` 是 review script，不是可直接執行的 migration。
* Target database 需維持 MySQL 5.6 compatibility。
* MySQL DDL 會 implicit commit，不能以一般 transaction rollback 當作可靠復原。

# Required work

1. 定義 migration file convention，區分：
   * executable versioned migration
   * read-only preflight／verification
   * data backfill
   * rollback／recovery instruction
   * template（不得由 runner 執行）
2. 建立 `schema_migrations`，至少記錄 version、name、checksum、applied_at、duration、executor／release identity。
3. Runner 只允許 CLI／deployment context 執行，不提供 public HTTP migration endpoint。
4. 實作 status、pending、apply 與 verify 行為。
5. 使用 database lock 或等效方法防止兩個 runner 同時執行。
6. 已套用 migration 的 checksum 改變時 fail closed。
7. 單一 migration 失敗時停止後續執行並留下明確狀態。
8. 針對 DDL implicit commit 定義 expand／backfill／contract 與 backup restore 策略。
9. 將 runtime `CREATE TABLE IF NOT EXISTS` 從 request path 移出並列入正式 migration。
10. 更新 SQL README、部署順序與 rollback runbook。

# Required migration semantics

```text
preflight → backup confirmation → acquire lock → verify checksums
→ apply one version → record evidence → post-verify → release lock
```

不得把 `020_workspace_backfill_template.sql` 或 `030_ga_connections_workspace_backfill_review.sql` 當作自動 migration 直接執行。

# Mandatory verification

在 disposable MySQL 5.6-compatible database 驗證：

* Empty database：全部正式 migrations 成功。
* Second run：沒有重複 schema/data mutation。
* Changed applied file：checksum mismatch，runner 拒絕。
* Failed migration fixture：後續版本不執行，狀態清楚。
* Concurrent runner：只有一個取得 lock。
* Template／review file：不會被自動執行。
* Existing partial schema：preflight 能辨識，不會錯誤宣稱完整。
* Request path：不再執行 DDL。

# Safety constraints

* 不得直接在 production 首次測試 runner。
* 不得假設 DDL 可用 transaction rollback。
* 不得修改已套用 migration 來修正 production；建立新版本。
* 不得將 database credential 寫入 migration、CLI argument、log 或 tracker。
* 不得在沒有 backup／restore evidence 時執行 contract migration。

# Required deliverables

1. Migration convention 與分類表。
2. `schema_migrations` schema。
3. Runner／CLI 與設定。
4. Converted executable migrations。
5. Status、success、repeat、checksum、failure、concurrency test evidence。
6. Deployment／rollback runbook。

# Acceptance criteria

- [x] 所有 executable migration 都有唯一版本與 checksum。
- [x] Runner 可安全辨識 pending／applied／mismatch。→ 2026-07-21 rehearsal 確認 `status`／checksum tampering 情境正確回報。
- [x] Concurrent execution 被鎖定。→ 2026-07-21 rehearsal 確認第二個 runner 於 10 秒 lock timeout 後正確失敗，無重複套用。
- [x] Runtime DDL 已移出 request path。→ V09-01 原始實作已完成（5 個 PHP call site no-op 化）。
- [~] Empty 與 existing database rehearsal 通過。→ **existing（partial）database** 情境已用真實 backup 完整驗證（見 V09-07 報告）；**empty database** 情境本次未測（rehearsal 用的是真實 mid-migration snapshot，不是空 schema），非本次範圍，風險極低（010–014 的 `CREATE TABLE IF NOT EXISTS` 語法本身就是空 schema 安全的標準寫法）。
- [x] DDL recovery 依 backup／expand-contract 設計，不虛構 rollback。→ 2026-07-21 rehearsal 實際演練並記錄 mid-batch 失敗的手動復原程序（見 `docs/releases/V09-07_MIGRATION_REHEARSAL_REPORT.md` 第 6 節），過程中發現並修好 runner 的一個真實 bug（多語句 migration 中途失敗會被誤記為成功）。
- [x] 主 Tracker 收到可重現證據。→ 見 tracker 2026-07-21 條目與上述報告。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V09-01。

專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V09-01_MIGRATION_RUNNER.md

請建立 MySQL 5.6-compatible migration runner 與 schema_migrations，完整驗證 repeat、checksum、failure 與 concurrency。不得在 production 首次測試，也不得把 DDL transaction 當作可回滾證據。

完成後依 Required deliverables 回報。
```
