# Task Packet — V09-04 SEO／AEO／GEO／Reporting Workspace Ownership

Status: DONE（資料完整性）／部分待驗證 — 2026-07-20 於真實 pre-launch host 完成驗證
Milestone: V0.9 Workspace Foundation
Dependencies: `V09-01`, `V09-02`, `V09-03` (all done this batch)
Tracker: `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`
Evidence: `backend/sql/migrations/018_seo_si_dashboard_workspace_expand.sql`、
`019_seo_si_dashboard_workspace_backfill.sql`、
`backend/sql/020_seo_si_dashboard_workspace_contract_DEFERRED.sql`（未套用）、
`backend/sql/preflight_v09_04_seo_si_dashboard_inventory.sql`、
`backend/sql/postflight_v09_04_seo_si_dashboard_workspace_backfill_invariants.sql`、
`backend/api/legacy_auth.php`（`hs_resolve_member_workspace_id()`）、
`backend/api/api_helpers.php`、`backend/api/si/common.php`、
`backend/api/si/save_common.php`、`backend/api/si/generate_common.php`、
`backend/api/si/sites/list.php`、`backend/api/si/seo/{list,add,summary,pagespeed,pagespeed_history}.php`、
`backend/api/dashboard/{ai_usage,ai_plan,ai_compose}.php`。
2026-07-20 postflight 結果（真實 pre-launch host，executor=hank）：9 張根表
`without_workspace`／`mapped_to_missing_workspace`／`mapped_to_inaccessible_workspace`
全部 0；孤兒 anomaly report 與 `legacy_member_workspace_map` 重複 mapping
檢查均為空結果；5 張子表 join 回根表的 `root_missing_workspace` 全部 0。
`schema_migrations` 確認 9 筆（010–016、018、019）皆已記錄。PHP 已上傳，前端
SEO 健康度頁面 smoke test：既有快取資料正常顯示、格式相容。
關鍵發現：Next.js BFF 大多數呼叫端（除 `seo/pagespeed` route 外）目前只簽
`memberId`，`lib/signedPhpFetch.ts` 會把 memberId 當 fallback workspaceId 簽入
`x-hs-workspace-id`——因此 PHP 端改為伺服器端由
`legacy_member_workspace_map` 解析 `workspace_id`，不信任該 header（見
`backend/sql/VERIFICATION_RUNBOOK.md` 第 4 節的完整說明）。
Known gap（未驗證，非資料完整性問題）：跨 Workspace negative test（Member A
讀 Workspace B 的 SEO/SI 資料）——需要第二個測試帳號/Workspace 才能做；
`si/seo/summary.php` 的「重新掃描」因主機缺少 GSC 憑證設定（既有缺口，非
本次迴歸）未能驗證到 workspace_id 完整寫入路徑。

---

# Objective

同一套 V09-03 已經對 `ga_connections` 做過的 expand → backfill → verify（→ contract
deferred）手法，套用到所有還只靠 `member_id`/`user_id` 當 tenant boundary 的
SEO／SI／AEO／GEO／Reporting 正式資料表，讓「所有正式 Business Record 都有可靠
Workspace ownership」這條 V0.9 出口條件對這些表也成立。

# Mandatory context before starting

閱讀順序：
1. `docs/00_V07_TO_V12_PROGRESS_TRACKER.md` 完整第 5 節（V0.9）與 2026-07-17／
   2026-07-20 的所有 dated notes——裡面記錄了這次主機環境的關鍵限制。
2. `backend/sql/README.md`、`backend/sql/VERIFICATION_RUNBOOK.md`、
   `backend/sql/manual_apply_bookkeeping.sql`。
3. `docs/task-packets/V09-03_GA_WORKSPACE_MIGRATION.md`（已完成，當作本次的範本）。
4. 本檔案下方列出的既有程式碼（repository、service、controller）。

# Critical operational constraints (從 V09-01～03 學到的，務必照做)

1. **主機（智邦生活館 虛擬主機）沒有 SSH／cron**。`backend/api/bin/migrate.php`
   這支 CLI runner **無法在此主機執行**，不要假設可以用它跑 migration。
2. 唯一可行的套用方式是 **手動貼 SQL 到 phpMyAdmin**（"MySQL資料庫設定"），然後
   對應執行 `manual_apply_bookkeeping.sql` 風格的 bookkeeping INSERT
   （checksum 用 `sha256sum` 或等效方式算好，不要用假值）。這是永久的操作方式，
   不是暫時的，不要嘗試說服自己「等有 SSH 再說」。
3. Migration 檔案放在 `backend/sql/migrations/`，版本號 3 位數遞增；目前已用到
   `016`。`017` 是 GA 的 contract migration，刻意留在 `migrations/` 外
   （`017_ga_connections_workspace_contract_DEFERRED.sql`），**下一個可用版本號
   是 `018`**。
4. 每個新 migration 都要更新 `backend/sql/README.md` 的檔案清單，並在
   `manual_apply_bookkeeping.sql` 加上對應的 bookkeeping 區塊（含真的算出來的
   checksum，不要用佔位字串）。
5. Expand／backfill／contract 分離：nullable 加欄位、backfill、postflight 驗證
   都可以做；**contract（NOT NULL + FK，砍掉舊路徑）一律仿照 `017_..._DEFERRED.sql`
   的模式寫好但不套用**，除非 postflight 全部歸零且已有 backup/restore 演練證據。
6. 不要假設本機（開發者的 Windows 機器）有 PHP／MySQL runtime 可以本地跑 rehearsal
   ——沒有。所有驗證都要嘛透過 phpMyAdmin 手動查詢，要嘛透過 HTTP request
   （不需要 SSH，用 curl／瀏覽器打真實主機的 URL 就可以，V09-03 的 OAuth
   negative test 就是這樣測的，可以參考）。
7. `SERVICE_AUTH_SECRET` 是主機環境變數，你（執行這個 task 的 session）不會拿到、
   也不該要求使用者提供。任何需要簽章的 API 測試（例如驗證跨 Workspace 存取被擋）
   都需要請 owner 用真實登入的帳號在瀏覽器/前端操作，不能自己組簽章請求。

# Current evidence (V09-01～03 已確認的基礎)

* `workspaces`／`workspace_members`／`workspace_settings`／
  `legacy_member_workspace_map` 已存在且 backfill 完成（`unmapped_count=0`）。
* `ga_connections.workspace_id` 已 expand＋backfill 完成，`GaIntegrationRepository`
  已改用真實 `workspace_id` 查詢。這是本次要複製的範本模式。
* `backend/sql/000_preflight_inventory.sql` 底部有 owner-candidate 的 UNION 查詢
  範本，本次新增的表也要用同樣手法整理 candidate 清單。

# Tables in scope (已在程式碼中確認存在，非本 repo 的 migration 建立，全部只有
member_id／user_id，沒有 workspace_id)

SEO／SI 核心：
* `seo_sites`（`user_id`）— site 的根擁有權表
* `seo_site_integrations`（透過 `site_id` 關聯 `seo_sites`，本身可能沒有 user_id，
  需要先查 `information_schema` 確認欄位）
* `seo_summary_cache`（`user_id`, `site_id`）
* `seo_scan_history`（`user_id`, `site_id`）
* `si_sites`（`user_id`）
* `si_analysis_runs`（透過 `site_id` 關聯，需確認是否有直接 user_id）
* `si_analysis_items`／`si_analysis_metrics`／`si_analysis_actions`／
  `si_analysis_side_items`（都透過 `run_id` 關聯 `si_analysis_runs`，本身應該
  沒有直接 user_id/workspace_id ——這幾個可能只需要「透過 join 到根表確認歸屬」，
  不一定需要直接加欄位；要先盤點清楚再決定，不要每張表都無腦加欄位）

V09-01 這次新建的（`migrations/013`）：
* `dashboard_ai_logs`（`user_id`）
* `dashboard_ai_plan_logs`（`user_id`）
* `seo_pagespeed_cache`（`user_id`, `site_id`）
* `seo_pagespeed_history`（`user_id`, `site_id`）

上面每一張表在動手之前，先用 `SHOW CREATE TABLE` 或
`information_schema.COLUMNS` 查真實欄位（不要完全相信這份清單，這是從程式碼
grep 出來的，不是從真實資料庫 schema 讀出來的——V09-01 npm 時就發現這個落差，
`ga_connections` 的真實欄位跟預期有出入過）。

# Required work

1. 用 `information_schema` 查出上面每張表的真實欄位、row count、既有 index。
2. 決定「根表」與「子表」的分類：像 `seo_sites`／`si_sites`／`dashboard_ai_logs`
   這種有直接 user_id 的是根表，需要 expand+backfill 直接欄位；像
   `si_analysis_items` 這種只透過 `run_id` 關聯根表的子表，可能只需要在查詢時
   JOIN 回根表拿 workspace_id，不必每張都加欄位（過度加欄位是不必要的複雜化）。
3. 對每個需要加欄位的根表，比照 `015`/`016` 的模式寫 expand + backfill migration
   （nullable，透過 `legacy_member_workspace_map` 回填，不猜測 ambiguous mapping）。
4. 找出所有讀寫這些表的 PHP 程式碼（`backend/api/si/**`, `backend/api/dashboard/**`），
   把目前用 `member_id`/`user_id` 當 tenant boundary 的查詢，改成用
   Workspace-scoped 查詢（比照 `GaIntegrationRepository` 這次的修法）。這些
   端點大多是 legacy 平鋪檔案（不是 src/ 下的新架構），要先確認呼叫端（Next.js
   BFF）目前怎麼傳 identity，不要假設都有 signed workspace_id。
5. 每個表都寫 postflight invariant 查詢（比照
   `postflight_ga_workspace_backfill_invariants.sql`），並更新
   `backend/sql/manual_apply_bookkeeping.sql`、`backend/sql/README.md`。
6. Contract migration（NOT NULL + FK）比照 `017_..._DEFERRED.sql` 寫好但不套用。

# Mandatory verification

* 每個根表：postflight 查詢確認 `*_without_workspace = 0` 或有清楚的異常清單。
* 抽查至少一個 SEO 或 SI 端點：改動前後回應格式相容（legacy frontend 不能壞掉）。
* 記錄哪些表最終判斷「不需要直接加欄位，透過 join 取得 ownership 即可」，並說明理由。

# Safety constraints

* 不得假設本機或 SSH 存在；所有驗證比照 V09-01～03 這次的模式（phpMyAdmin 手動
  執行＋真實 HTTP request 測試）。
* 不得對子表無差別加欄位；先盤點真實 schema 再決定。
* Contract migration 不套用，除非 postflight 全部歸零且有 backup/restore 證據。
* 不得將 owner 判斷邏輯建立在 `member_id === workspace_id` 這種假設上。

# Required deliverables

1. 真實 schema 盤點紀錄（哪些表有哪些欄位）。
2. Expand／backfill migration（`018` 起）＋ postflight 查詢。
3. PHP repository/query 層改動，改用 workspace-scoped 查詢。
4. `manual_apply_bookkeeping.sql`／`README.md` 更新。
5. Contract migration（deferred，不套用）。
6. 主 Tracker 更新，回報格式比照本文件下方的執行對話回報格式。

# 執行對話開場請直接貼

```text
請執行 Highlight Signal Roadmap Task V09-04。

專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V09-04_SEO_AEO_GEO_REPORTING_WORKSPACE_OWNERSHIP.md

請先完整讀主追蹤文件第 5 節與 2026-07-17／2026-07-20 的 dated notes，再讀任務包
全文，特別是「Critical operational constraints」那段——這台主機沒有 SSH／cron，
migration 只能手動貼到 phpMyAdmin 執行，不要假設可以用 bin/migrate.php 跑。

請先盤點任務包列出的每張表的真實欄位（information_schema），再決定哪些是根表
需要加 workspace_id、哪些子表只需要 join 回根表。完成 expand/backfill migration、
PHP 查詢層改動、postflight 驗證查詢，並更新 manual_apply_bookkeeping.sql／
README.md。Contract migration 寫好但不套用。

完成後依任務包 Required deliverables 回報，並更新主追蹤文件與本任務包狀態。
```
