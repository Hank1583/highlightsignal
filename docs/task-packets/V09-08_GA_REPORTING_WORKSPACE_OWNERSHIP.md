# Task Packet — V09-08 GA Reporting Workspace Ownership

Status: VERIFY（程式與 SQL 完成，2026-07-21 於 disposable 本機 Docker MySQL 5.6 rehearsal 驗證；尚未套用至真實主機，尚未上傳 PHP，尚未執行真實跨 Workspace HTTP 測試）
Milestone: V0.9 Workspace Foundation
Dependency: `V09-01`～`V09-07`
Tracker: `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`（第 5 節）
Authority: `docs/00_Technical_Specification_Alignment_v1.2.md`（Workspace ownership、Permission、Database Alignment）

---

# Objective

補齊 V09-05 留下的 GA 報表／同步 ownership 缺口，使報表排程、每日摘要、頁面、事件、流量來源與轉換資料都以 Workspace 作為正式 tenant boundary，而不是只靠 `member_id`。

# Mandatory context before starting

1. `docs/task-packets/V09-03_GA_WORKSPACE_MIGRATION.md` 與 `V09-05_BACKEND_AUTHORIZATION_POLICY.md`。
2. 六張既有表：`ga_report_schedules`、`ga_daily_summary`、`ga_pages`、`ga_events`、`ga_traffic_sources`、`ga_conversions`。
3. 端點：`ga_report_{list,detail,save,update}.php`、`data_sync.php`、`get_query.php`，以及 `ga/report/{report_excel,report_runner,report_mailer}.php`。
4. 既有 expand/backfill/contract 慣例：`015`～`019` migrations、postflight scripts、`manual_apply_bookkeeping.sql`。

# Required work

1. 建立 schema preflight，盤點六張表的 PK、`user_id`／`connection_id` 關係、資料量、孤兒資料與可用 mapping。
2. 以 expand → backfill → verify → deferred contract 的方式加入 `workspace_id`；不得用 `member_id === workspace_id` 猜測。
3. 根表直接持有 `workspace_id`；若某表能由不可混淆的父表關係取得 ownership，需在任務紀錄寫明是否仍直接存欄位及理由。
4. 所有讀寫與匯出端點必須同時驗證 active membership、角色權限與 Workspace ownership。
5. 保留既有 response contract；舊呼叫端在切換期間不得讀到其他 Workspace 資料。
6. 更新 SQL runbook、manual bookkeeping、主 Tracker，並留下 contract migration 的啟用條件。

# Out of scope

* 不重寫 GA 報表 UI 或寄信模板。
* 不在本 task 解決 report delivery credentials。
* 不移除 legacy 欄位；contract migration 需等相容性與資料驗證通過。

# Mandatory verification

* 六張表 backfill 後 `workspace_id IS NULL`、orphan、inaccessible mapping 均為 0，或每筆例外都有明確隔離紀錄。
* Workspace A 無法 list、read、update、export Workspace B 的報表與彙總資料。
* `data_sync.php` 新寫入資料帶正確 `workspace_id`，重跑不造成跨租戶或重複資料。
* legacy response shape、既有真實報表查詢及寄送 smoke test 不退化。
* PHP lint、SQL rehearsal、postflight 與 rollback/fix-forward 證據齊全。

# Required deliverables

1. Preflight、expand、backfill、postflight 與 deferred contract SQL。
2. 六張表及全部相關端點的 ownership 修正。
3. Cross-workspace negative test 與相容性證據。
4. Task packet、Tracker、SQL runbook 狀態更新。

# Acceptance criteria

- [x] 六張表有可靠 Workspace ownership（程式＋SQL 完成，2026-07-21 disposable
      rehearsal 驗證邏輯正確；真實主機套用與資料完整性仍待 owner 執行）。
- [x] 所有 GA 報表／同步端點後端 fail closed（程式已補齊 active
      membership＋角色權限＋workspace ownership 三重檢查，lint 通過；真實
      HTTP 行為仍待上傳後驗證）。
- [ ] Cross-workspace read/write/export 測試通過（需要第二個測試帳號/
      Workspace 對真實上線後的端點測試，尚未執行）。
- [x] Migration 可重跑、可驗證、可 fix-forward（disposable Docker MySQL 5.6
      rehearsal：expand/backfill/postflight 全部通過，backfill 冪等重跑
      no-op，expand 重跑正確 fail closed）。
- [ ] V0.9 前兩項出口條件可據實重新判定（真實主機套用＋跨 Workspace HTTP
      測試完成後才能將 V0.9 出口條件由「尚未執行」改為「通過」）。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V09-08。

專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V09-08_GA_REPORTING_WORKSPACE_OWNERSHIP.md

先完成 schema/endpoint 盤點，再依 expand/backfill/verify/deferred-contract 執行。
不得用 member_id 猜 workspace_id，不得直接在正式資料上做破壞性 contract 變更。
完成後附 cross-workspace 與資料完整性證據，並更新 Tracker。
```

# 執行紀錄（2026-07-21）

## Schema 盤點結論

六張表分兩類（與 GA/SEO/SI 既有慣例一致）：

* **根表（1 張）**：`ga_report_schedules` — 有直接 `user_id` 欄位（由
  `ga_report_list.php`/`save.php` 等程式碼確認），比照 GA/SEO 模式做
  expand（`migrations/021`）＋backfill（`migrations/022`），直接持有
  `workspace_id`。
* **子表（5 張）**：`ga_daily_summary`／`ga_pages`／`ga_events`／
  `ga_traffic_sources`／`ga_conversions` — 只有 `connection_id` 外鍵指回
  `ga_connections`（V09-03 已加上並回填 `workspace_id`，`connections_without_workspace=0`
  已由 V09-03 postflight 確認），**不**新增欄位，改為查詢時 join 回
  `ga_connections.workspace_id` 取得 ownership，與 V09-04 對
  `seo_site_integrations`／`si_analysis_metrics` 等子表的處理方式一致。此分類
  已寫入 `backend/sql/preflight_v09_08_ga_reporting_inventory.sql`，需 owner
  在 phpMyAdmin 執行後比對是否與真實 schema 一致，再套用 `021`／`022`。

`ga_report_schedules.connection_ids` 是 JSON 陣列（TEXT 欄位，非正規化外鍵），
可能同時引用多筆 `ga_connections`，因此除了六張表各自的 backfill 完整性外，
額外新增一項這批獨有的檢查：schedule 的 `connection_ids` 是否引用了「屬於
別的 Workspace」的 GA connection（見 postflight 第 6 段，使用與
`ga_report_list.php`/`ga_report_detail.php` 既有程式碼相同的
`FIND_IN_SET(...)` join 手法）。

## 程式修正

* `backend/api/ga/ownership.php`：`ga_require_connection_ownership()` 改為以
  `workspace_id` 比對 `ga_connections`（原本用 `member_id`，是任務包禁止的
  ownership 假設）。
* `ga_report_list.php`／`ga_report_detail.php`：解析呼叫者 `workspace_id`、要求
  active membership＋`read` 權限，查詢改為 `user_id AND workspace_id` 雙條件，
  與 `ga_connections` 的 JOIN 條件也從 `c.member_id = r.user_id` 改為
  `c.workspace_id = r.workspace_id`。
* `ga_report_save.php`／`ga_report_update.php`：解析 `workspace_id`、要求
  active membership＋`integrations.manage` 權限（比照
  `account_fetch.php`／`update_connection_status.php` 既有慣例）；INSERT/UPDATE
  皆寫入／比對 `workspace_id`；`ga_require_connection_ownership()` 呼叫改傳
  `workspace_id`。
* `data_sync.php`：原本完全無 membership／角色檢查、只用
  `$_GET['member_id']` 猜測範圍；改為解析 `workspace_id`、要求 active
  membership＋`integrations.manage`，`ga_connections` 查詢改用
  `workspace_id = ?` 而非字串接合的 `member_id`。
* `get_query.php`：解析 `workspace_id`、要求 active membership＋`read`，
  `ga_require_connection_ownership()` 呼叫改傳 `workspace_id`（後續五張子表的
  查詢因此透過 connection_id 間接被此檢查保護，不需個別加欄位）。
* `ga/report/report_excel.php`／`ga/report/report_mailer.php` 的
  direct-HTTP 分支：原本比對 `ga_report_schedules.user_id === 呼叫者 member_id`
  （只有建立者本人能存取），改為解析呼叫者 `workspace_id` 並比對
  `ga_report_schedules.workspace_id`——這是刻意的設計決策，非單純遷移：
  讓報表匯出／寄送與 GA connections 一樣以 Workspace 為存取邊界，而不是綁死
  在建立當下的單一 member_id，與任務目標「以 Workspace 作為正式 tenant
  boundary」一致。目前正式資料每個 Workspace 只有一個 owner
  membership（V09-02 postflight 已確認），此改動對現有資料無行為差異。
* `ga/report/report_runner.php`、`ga/report/delete_csv.php`、
  `ga/report/check_phpspreadsheet.php`：不需改動（前者是跨全 tenant 的 cron
  入口，後兩者是無 tenant 概念的維運端點，V09-05 已補齊驗證，超出本任務範圍）。

## SQL 交付物

* `backend/sql/preflight_v09_08_ga_reporting_inventory.sql`（唯讀盤點）
* `backend/sql/migrations/021_ga_reporting_workspace_expand.sql`（expand）
* `backend/sql/migrations/022_ga_reporting_workspace_backfill.sql`（backfill）
* `backend/sql/023_ga_reporting_workspace_contract_DEFERRED.sql`（刻意排除在
  `migrations/` 外，未套用，比照 `017`／`020` 的 gate 條件）
* `backend/sql/postflight_v09_08_ga_reporting_workspace_backfill_invariants.sql`
  （唯讀驗證，含子表 join 回 `ga_connections` 的 sanity check 與 schedule/
  connection 跨 Workspace 洩漏檢查）

## 驗證證據（2026-07-21）

**PHP lint**：本機 `D:\4.Tool\php\php.exe -l`（PHP 8.3，非正式站 7.0，但可抓語法錯誤）
對全部 9 個修改的 PHP 檔案執行，全部 `No syntax errors detected`。

**Migration／postflight rehearsal（disposable 本機 Docker `mysql:5.6`，非真實主機資料）**：
比照 V09-07 的方法論，建立一次性容器（僅綁定 `127.0.0.1`，驗證後
`docker rm -f` 銷毀），依程式碼推斷欄位建立六張表的合成 schema（**注意**：
未使用真實主機 schema，preflight 檔仍需 owner 對照真實 host 執行），並種入：
Workspace A（member 1）／Workspace B（member 2）兩個真實情境租戶、一筆孤兒
schedule（member 99，無 legacy mapping）、一筆刻意跨接的 schedule（屬於
Workspace A 但 `connection_ids` 同時列出 Workspace B 的連線）、一筆刻意懸空的
`ga_daily_summary` 列（引用不存在的 `connection_id=999`）。結果：

* Preflight 六張表欄位分類（1 根表＋5 子表）與假設一致。
* `021`／`022` 套用成功（exit 0）。
* Postflight：`schedules_without_workspace=1`（唯一未映射到 legacy mapping 的
  孤兒 schedule，正確保留 NULL 未猜測）、`mapped_to_missing_workspace=0`、
  `mapped_to_inaccessible_workspace=0`、anomaly report 正確只列出孤兒
  schedule、子表 sanity check 正確抓到懸空的 `ga_daily_summary` 列
  （`root_missing_or_deleted_connection=1`，其餘 4 張子表皆 0）、跨 Workspace
  洩漏檢查正確抓到刻意跨接的 schedule（`schedule_workspace_id=1` 對應
  `connection_workspace_id=2`）。
* 重跑 `022` 為 no-op（冪等，數值不變）；重跑 `021` 正確以
  `Duplicate column name 'workspace_id'` 失敗（MySQL 5.6 `ADD COLUMN` 沒有
  `IF NOT EXISTS`，符合既有 runbook 對「不可盲目重跑 expand」的說明）。

## 尚未完成（需要 owner 執行正式環境操作，非本次程式撰寫可解決）

1. **真實主機 preflight／migration／postflight**：尚未在 phpMyAdmin 對真實
   pre-launch database 執行 `preflight_v09_08_ga_reporting_inventory.sql` 與
   `021`／`022`；上方 rehearsal 使用的是依程式碼推斷的合成 schema，非真實
   欄位讀取結果，同 V09-03/04 preflight 先例，需 owner 比對真實輸出。
2. **PHP 上傳**：9 個修改檔案尚未上傳智邦主機；依既有部署順序規則，必須等
   `022` postflight 確認歸零後才能上傳，否則會因缺少 `workspace_id` 欄位
   500。
3. **真實跨 Workspace HTTP 負向測試**：需要第二個測試帳號/Workspace（同
   V09-03/04/05 已知缺口），測試 Member A 無法 list/detail/save/update/export
   Workspace B 的報表；`data_sync.php`/`get_query.php` 的 viewer 角色拒絕測試
   需要一筆非 owner 角色的測試 membership（V09-05 尚未解決的同一缺口）。
4. **真實報表 smoke test**：需 owner 對至少一筆既有真實 schedule 觸發
   `report_excel.php`（direct-HTTP CSV 下載）或
   `report_mailer.php`（寄送）確認搬遷後行為未退化。

以上四項需要 owner 提供真實主機 phpMyAdmin／FTP 操作、第二個測試帳號或觸發
真實寄信，屬於「正式環境操作」範疇，非本次工具可直接執行；程式與 SQL 本身已
完成並通過可重現的 disposable rehearsal，狀態列為 `VERIFY`，不宣告 `DONE`。
