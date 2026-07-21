# Task Packet — V09-07 Workspace Migration Rehearsal

Status: DONE — 2026-07-21，owner 選擇方向 1（真實 backup 演練），已於本機
disposable Docker MySQL 5.6 環境完整執行
Milestone: V0.9 Workspace Foundation
Dependency: `V09-01`～`V09-06`
Tracker: `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`
Evidence: `docs/releases/V09-07_MIGRATION_REHEARSAL_REPORT.md`（完整報告：
preflight/migrate/postflight 數據、四個 destructive 情境、一個真實 bug 的
發現與修復、復原 runbook）

---

# Objective（as originally written in the tracker）

使用 production-like backup 演練 preflight、migration、backfill、verify、
rollback。驗收：留下資料筆數、異常清單、耗時與 rollback 證據。

# Read this first: why this task may not be achievable as written

V09-01～03 執行時發現：這台主機（智邦生活館 虛擬主機）**沒有 SSH／cron**，
`backend/api/bin/migrate.php` 這支 runner 完全無法在此主機執行；也沒有辦法在
本機（開發者的 Windows 機器）跑一個 disposable MySQL 5.6-compatible 環境做
rehearsal（Docker 途徑 owner 已經評估過，決定不用）。

這代表「演練 migration／rollback」字面上要求的東西——**在一個跟 production
一樣、但可以安全搞壞的環境裡，真的跑一次完整流程並驗證 rollback**——目前找不到
一個安全的地方做。不要為了交差而在真實共用 DB 上「演練」破壞性操作
（`020_workspace_backfill_template.sql` 的檔頭已經明講過這件事）。

**先跟 owner 確認以下其中一個方向，再決定怎麼做這個 task**：

1. **拿到真實 backup 檔案，在別的地方（例如你自己能控制的一台機器，只要有
   PHP+MySQL）還原後演練** ——如果智邦控制台的「網頁備份」功能可以下載完整
   DB 備份，這是最接近原意的做法。
2. **降低範圍**：不追求「真的跑一次」，改成「書面 rollback／recovery runbook
   演練」——針對每一種可能失敗的情境（DDL 中途失敗、backfill 部分完成、
   contract migration 需要復原）寫清楚具體步驟，並讓 owner 審閱確認可執行，
   但不實際演練。這樣至少留下決策文件，而不是假裝驗證過。
3. **owner 決定接受這個限制**，比照 V09-01 三個 destructive scenario 的處理
   方式，正式列為長期接受風險，不繼續追這個 task 的原始驗收條件。

不要自己選一個方向就動手——這是 owner 的決定，不是執行對話可以單方面決定的。

# Mandatory context before starting

1. `docs/00_V07_TO_V12_PROGRESS_TRACKER.md` 完整第 2 節與第 5 節，尤其
   `BLOCKED_EXTERNAL_ROTATION`、V09-01 的「長期接受風險」記錄——這個 task 面臨
   的是同一類問題，不要重複調查一次已經有答案的事。
2. `backend/sql/VERIFICATION_RUNBOOK.md`、`manual_apply_bookkeeping.sql`。
3. 如果 owner 選第 1 個方向（真的拿 backup 演練），需要先確認智邦控制台「網頁
   備份」功能實際能不能匯出可還原的完整 SQL dump，這件事本身可能就要先跟智邦
   客服確認。

# Required work（依 owner 選的方向而定，不要三個都做）

視前面的 owner 決定，只執行對應的一種：

* **方向 1**：取得 backup → 還原到一個獨立環境 → 依序執行
  preflight／baseline／migrate／postflight → 記錄資料筆數、耗時 → 演練一次
  「假設中途失敗」的復原（依 expand/backfill/contract 的原則，不是真的
  rollback DDL）。
* **方向 2**：寫一份完整的 rollback／recovery runbook，涵蓋 010–0xx 每個
  migration 各自的失敗情境與復原步驟，交給 owner 審閱。
* **方向 3**：更新 tracker，把這個 task 標記為長期接受風險，記錄理由與觸發
  重新評估的條件（例如：換主機、或申請到 SSH）。

# Safety constraints

* 不得對真實共用 pre-launch DB 執行任何「演練」性質的破壞操作。
* 不得虛構已經演練過的證據。
* 不得未經 owner 確認就自行選擇上面三個方向之一動手。

# Required deliverables

依 owner 選擇的方向產出對應文件／證據，並更新主 Tracker。

# 執行紀錄（2026-07-21）

Owner 選擇方向 1。完整執行過程、數據與發現詳見
`docs/releases/V09-07_MIGRATION_REHEARSAL_REPORT.md`，摘要：

1. 取得真實 backup（`D:\7.Highlight\3.Backup\vhost125121-8.sql`，2026-07-17
   14:13 真實 pre-launch DB 匯出），在本機 Docker `mysql:5.6` 容器（只綁定
   `127.0.0.1`，用完即銷毀）還原成兩個獨立 database。
2. Preflight／baseline／migrate／postflight／idempotent re-run 全部針對真實
   資料執行，留下筆數、耗時與一筆真實既有異常（`dashboard_ai_logs`
   `user_id=8` 無 legacy mapping，設計上正確被隔離，非本次缺陷）。
3. V09-01 原本列為「確定無法測試」的三個 destructive 情境（checksum 竄改、
   故意失敗的 migration、併發 runner）全部在這個 disposable 環境驗證通過。
4. 額外模擬 expand migration（`018`）中途失敗，**發現並修好一個真實 bug**：
   `MigrationRunner::applyOne()` 在多語句檔案中途失敗時會被誤記為成功
   （`mysqli::next_result()` 回傳 `false` 時，迴圈把「失敗」跟「沒有更多語句」
   混為一談，從未檢查失敗語句的 errno）。已修復 `backend/api/src/Migration/MigrationRunner.php`，
   用同一個情境重新驗證修復生效，且不影響 happy path。
5. 完整記錄手動復原程序（非傳統 rollback，是 expand/backfill 原則下的
   fix-forward 復原）。
6. 環境清理：容器與 volume 已銷毀，本機未殘留任何常駐服務持有這份真實資料；
   原始 backup 檔案本身未被移動或修改。

**唯一未涵蓋**：V09-01 任務包字面要求的「empty database」情境本次未測（用的
是真實 mid-migration snapshot，非空 schema）；風險低（010–014 用標準
`CREATE TABLE IF NOT EXISTS`），列為次要缺口，非本次阻擋。

# 執行對話開場請直接貼

```text
請執行 Highlight Signal Roadmap Task V09-07。

專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V09-07_WORKSPACE_MIGRATION_REHEARSAL.md

這個 task 跟前面幾個不一樣：請先完整讀任務包裡的「Read this first」那段，
這台主機沒有 SSH 也沒有安全的 disposable 環境可以做「演練」，字面上的驗收條件
可能做不到。不要直接開始執行，先跟我確認任務包列出的三個方向（真的拿 backup
演練／改成書面 runbook／owner 接受長期風險）要選哪一個，再繼續。
```
