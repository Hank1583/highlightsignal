# Task Packet — V09-01 Migration Runner

Status: WAITING_FOR_V0.8_GATE  
Milestone: V0.9 Workspace Foundation  
Dependency: V0.8 exit conditions  
Tracker: `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`

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

- [ ] 所有 executable migration 都有唯一版本與 checksum。
- [ ] Runner 可安全辨識 pending／applied／mismatch。
- [ ] Concurrent execution 被鎖定。
- [ ] Runtime DDL 已移出 request path。
- [ ] Empty 與 existing database rehearsal 通過。
- [ ] DDL recovery 依 backup／expand-contract 設計，不虛構 rollback。
- [ ] 主 Tracker 收到可重現證據。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V09-01。

專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V09-01_MIGRATION_RUNNER.md

請建立 MySQL 5.6-compatible migration runner 與 schema_migrations，完整驗證 repeat、checksum、failure 與 concurrency。不得在 production 首次測試，也不得把 DDL transaction 當作可回滾證據。

完成後依 Required deliverables 回報。
```
