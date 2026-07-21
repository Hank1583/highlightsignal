# Highlight Signal V0.7 → V1.2 Progress Tracker

Version: v1.0  
Status: Active  
Owner thread: Codex 主進度追蹤對話  
Baseline date: 2026-07-17  
Authority: `00_Technical_Specification_Alignment_v1.2.md`

---

# 1. 使用方式

本文件是 V0.7 到 V1.2 的單一進度來源。

* 本對話負責：排序、拆任務、核對證據、更新版本狀態、處理跨任務衝突。
* 新對話負責：一次執行一個或一組相依性低的 Task ID。
* 任務只有在程式、驗證、文件及回報均完成後才能標記為 `DONE`。
* 沒有測試或可重現證據的工作，不計入正式完成度。
* Public Snapshot／Acquisition 是獨立 Track，不阻擋 V1.2 Core 驗收。

狀態定義：

```text
TODO        尚未開始
PLANNED     任務包已建立，但前置相依尚未完成
READY       任務包與前置條件已具備，可開始執行
IN_PROGRESS 已在執行
BLOCKED     有明確阻擋事項
VERIFY      程式完成，等待獨立驗證
DONE        已通過驗收並留下證據
DEFERRED    已決定延後，不計入目前版本
```

---

# 2. 目前基準

目前版本：**V0.7 Beta**  
估計 V1.2 規格完成度：**50–60%**  
目前發布狀態：V08-01 已建立可追溯 Release baseline；production 未因本任務變更。

## Current execution board

| 欄位 | 目前狀態 |
|---|---|
| Last sync | 2026-07-21 |
| Active milestone | V0.9 — Workspace Foundation（收尾）／V1.0 — Decision Intelligence Core（啟動） |
| Active task | `V09-01`～`V09-07` DONE；`V09-08`／`V10-01`～`V10-08` 全數程式＋SQL＋disposable rehearsal 完成，狀態 VERIFY（真實主機套用／PHP／前端上傳／真實資料執行待 owner 一次執行）；owner 下達「V10-03→V10-08 GOGOGO」持續執行指令已跑完，V1.0 Decision Intelligence Core 里程碑本身維持 VERIFY（不轉 DONE，見 `V10-08` 驗收報告的唯一缺口說明）；`V08-02` 仍 BLOCKED_EXTERNAL_ROTATION，owner 已接受風險 |
| Next task | `V09-08`／`V10-01`～`V10-08` 全部 VERIFY 任務待 owner 於真實主機依序執行對應 migration（021-022、024、025、026、027、028）＋上傳 PHP／前端＋跨 Workspace HTTP 測試＋真實瀏覽器登入互動驗證＋至少一條真實資料 golden path 後，V1.0 才可轉 DONE；role 邊界、全新會員 provisioning 與多 Workspace 切換的殘留驗證仍需具備對應測試資料後補測；AEO/GEO Signal 偵測缺 scan-history 持久化層的背景任務已建立建議，待挑選執行；下一個里程碑是 V1.1 Execution & Operations（`V11-01` 起）。**2026-07-21 owner 決定**：現有正式站已知有未指明錯誤，不插隊修復，留到 V1.2 全部完成後換版一次解決（見 `V12-08` 條目）；同時換版把 PHP 路徑從 `/highlightsignal/v2` 改為同網域拿掉 `v2` 的較短路徑，牽動 GA OAuth redirect URI 需重新註冊。 |
| Blocking issue | 舊 OAuth secret 與其他 V08-02 credentials 仍列為可能曝露；PHP 7.0／URL-only lint 為接受風險；report delivery config 未配置；`V09-08`／`V10-01`～`V10-08` 程式已完成但尚未套用至真實主機——六張 GA reporting tables 仍為 `member_id`-only ownership，`signals`／`evidence_items`／`signal_evidence_links`／`signal_analyses` 表尚未存在於正式環境，`recommendations` 表尚未加上 V10-04 新欄位，`decisions` 表尚未加上 V10-05 新欄位，`V10-06` 的 Decision-first Dashboard UI 與 `V10-07` 的 GA 偵測皆尚未對真實資料/真實登入驗證過——這是 V1.0 milestone 維持 VERIFY 而非 DONE 的唯一原因 |
| Last verified commit | `0811a25`；GitHub Actions run `29568711140` 全部 PASS（V0.8 為止；V0.9／V1.0 工作尚未 commit） |

已備妥的獨立執行任務包：

* `V08-01`：`docs/task-packets/V08-01_RELEASE_BASELINE.md`
* `V08-02`：`docs/task-packets/V08-02_SECRET_CONTAINMENT.md`
* `V08-03`：`docs/task-packets/V08-03_SERVICE_AUTH_COVERAGE.md`
* `V08-04`：`docs/task-packets/V08-04_CLOUDFLARE_ENVIRONMENTS.md`
* `V08-05`：`docs/task-packets/V08-05_PHP_STAGING_VALIDATION.md`
* `V08-06`：`docs/task-packets/V08-06_MINIMUM_CI_GATE.md`
* `V09-01`：`docs/task-packets/V09-01_MIGRATION_RUNNER.md`
* `V09-02`：`docs/task-packets/V09-02_WORKSPACE_BACKFILL.md`
* `V09-03`：`docs/task-packets/V09-03_GA_WORKSPACE_MIGRATION.md`
* `V09-04`：`docs/task-packets/V09-04_SEO_AEO_GEO_REPORTING_WORKSPACE_OWNERSHIP.md`（DONE（資料完整性）／部分待驗證，2026-07-20 於真實 pre-launch host 完成）
* `V09-05`：`docs/task-packets/V09-05_BACKEND_AUTHORIZATION_POLICY.md`（DONE（程式修復＋suspended membership 驗證）／部分待驗證）
* `V09-06`：`docs/task-packets/V09-06_FRONTEND_WORKSPACE_CONTEXT.md`（DONE（程式完成＋靜態驗證）／部分待驗證，2026-07-21）
* `V09-07`：`docs/task-packets/V09-07_WORKSPACE_MIGRATION_REHEARSAL.md`（DONE，2026-07-21，owner 選方向 1 並於本機 Docker 完成真實 backup 演練）
* `V09-08`：`docs/task-packets/V09-08_GA_REPORTING_WORKSPACE_OWNERSHIP.md`（VERIFY，2026-07-21，GA reporting tables/endpoints 的 Workspace ownership 程式＋SQL 完成，disposable rehearsal 驗證通過，真實主機套用待 owner 執行）
* `V10-01`：`docs/task-packets/V10-01_SIGNAL_PERSISTENCE.md`（VERIFY，2026-07-21，`signals` 表＋Signal Repository/Service/Controller＋SEO 技術問題偵測規則程式＋SQL 完成，disposable rehearsal 驗證去重/resolve/reopen/權限邏輯通過，真實主機套用待 owner 執行）
* `V10-02`：`docs/task-packets/V10-02_EVIDENCE_TRACEABILITY.md`（VERIFY，2026-07-21，`evidence_items`/`signal_evidence_links` 表＋Repository/Service/Controller＋SEO Evidence 記錄程式＋SQL 完成，disposable rehearsal 驗證 dedup/immutability/traceability 通過，真實主機套用待 owner 執行）
* `V10-03`：`docs/task-packets/V10-03_EXPLANATION_BUSINESS_IMPACT.md`（VERIFY，2026-07-21，`signal_analyses` 表＋rule-based generator 程式＋SQL 完成，disposable rehearsal 驗證通過，真實主機套用待 owner 執行）
* `V10-04`：`docs/task-packets/V10-04_RECOMMENDATION_FORMALIZATION.md`（VERIFY，2026-07-21，`recommendations` 擴充＋signal-backed 內容解析程式＋SQL 完成，disposable rehearsal 驗證通過，真實主機套用待 owner 執行）
* `V10-05`：`docs/task-packets/V10-05_HUMAN_REVIEW_DECISION.md`（VERIFY，2026-07-21，`decisions` 擴充為六種 outcome＋idempotency/recommendation_revision 程式＋SQL 完成，disposable rehearsal 驗證通過，真實主機套用待 owner 執行）
* `V10-06`：`docs/task-packets/V10-06_DECISION_FIRST_DASHBOARD.md`（VERIFY，2026-07-21，Decision-first Dashboard UI＋`WorkflowService` 小幅擴充（signal_id 直查／refresh_recommendation）程式完成，disposable rehearsal＋typecheck/lint/build 通過，真實瀏覽器登入互動驗證待 owner 於有憑證環境執行）
* `V10-07`：`docs/task-packets/V10-07_DOMAIN_ADAPTER_ALIGNMENT.md`（VERIFY，2026-07-21，GA/SEO 兩條 vertical slice 程式完成，disposable rehearsal 通過；AEO/GEO 為明確 deferred gap（缺 scan-history 等價持久化層），真實主機驗證待 owner 執行）
* `V10-08`：`docs/task-packets/V10-08_CORE_E2E_ACCEPTANCE.md`（VERIFY，2026-07-21，全鏈路 disposable rehearsal 通過（33/33），發現並修復一個真實跨來源缺陷（`RuleBasedAnalysisGenerator` 的 impact_area 曾寫死為 seo）；真實主機／真實資料執行仍待 owner，V1.0 milestone 因此不轉 DONE，見 `docs/releases/V10-08_CORE_E2E_ACCEPTANCE_REPORT.md`）
* `V11-01`：`docs/task-packets/V11-01_ACTION_MANUAL_TASK_LIFECYCLE.md`（PLANNED）
* `V11-02`：`docs/task-packets/V11-02_MYSQL_QUEUE_WORKER_RELIABILITY.md`（PLANNED）
* `V11-03`：`docs/task-packets/V11-03_EXECUTION_RESULT.md`（PLANNED）
* `V11-04`：`docs/task-packets/V11-04_BUSINESS_OUTCOME.md`（PLANNED）
* `V11-05`：`docs/task-packets/V11-05_EVALUATION_FEEDBACK.md`（PLANNED）
* `V11-06`：`docs/task-packets/V11-06_NOTIFICATION.md`（PLANNED）
* `V11-07`：`docs/task-packets/V11-07_AUDIT_LOG_COVERAGE.md`（PLANNED）
* `V11-08`：`docs/task-packets/V11-08_RETENTION_CLEANUP_BACKUP_JOBS.md`（PLANNED）
* `V12-01`：`docs/task-packets/V12-01_REGISTRATION_ONBOARDING_BFF.md`（PLANNED）
* `V12-02`：`docs/task-packets/V12-02_AUTOMATED_TEST_SUITE.md`（PLANNED）
* `V12-03`：`docs/task-packets/V12-03_RELEASE_CI_CD.md`（PLANNED）
* `V12-04`：`docs/task-packets/V12-04_OBSERVABILITY_INCIDENT_READINESS.md`（PLANNED）
* `V12-05`：`docs/task-packets/V12-05_PERFORMANCE_SECURITY_PRIVACY_AUDIT.md`（PLANNED）
* `V12-06`：`docs/task-packets/V12-06_DOCUMENTATION_IMPLEMENTATION_ALIGNMENT.md`（PLANNED）
* `V12-07`：`docs/task-packets/V12-07_PILOT_VALIDATION.md`（PLANNED）
* `V12-08`：`docs/task-packets/V12-08_FINAL_ACCEPTANCE_RELEASE.md`（PLANNED）

版本進度只在 Task 通過驗收後更新；未提交或未驗證的程式碼不自動計入完成度。

## Resolved blocker record

```text
Blocker ID: BLOCKED_EXTERNAL_EXECUTION
Since: 2026-07-17
Resolved: 2026-07-17 by V08-01
Affected gate: V0.8 Release Safety
Resolution evidence: docs/releases/V08-01_RELEASE_BASELINE_REPORT.md
Baseline commits: 735dad5, 9391dcc, 38c7acd, d5a2a1a
```

此 blocker 曾表示缺少外部執行證據；V08-01 已以 commit grouping、驗證紀錄與明確排除清單解除。

## Current blocker record

```text
Blocker ID: BLOCKED_EXTERNAL_ROTATION
Since: 2026-07-17
Affected task: V08-02 Secret containment
Local containment evidence: docs/security/V08-02_SECRET_CONTAINMENT_REPORT.md
Required change to resume: provider/hosting access for credential rotation, Cloudflare/PHP secret provisioning, and signed smoke test on the authorized pre-launch integration path
```

2026-07-17 owner decision：Highlight Signal 尚未正式啟用，沿用現行智邦
`/highlightsignal/v2` 與現有 MySQL database 作為 pre-launch integration
environment；不建立 staging 目錄、子網域或測試 DB。測試資料與 table 可在備份及
可回滾 migration 前提下調整，但不得對現有 DB 執行破壞性的 failure simulation。

2026-07-17 owner risk decision：共用 MySQL 帳號連動 10+ 系統，不變更現有密碼；
`SERVICE_AUTH_SECRET` 亦維持現值。HTTP containment 已完成，但曝露風險未因不輪替
而消失，因此 V08-02 維持 `BLOCKED_EXTERNAL_ROTATION`。未來替代方案是新增
Highlight Signal 專用最小權限 DB user，只切換本系統，不修改共用帳號。

2026-07-17 owner PHP verification decision：PHP 僅以線上 URL 執行 smoke／negative
tests，不執行全 payload `php -l`。已呼叫 route 的結果有效，但未載入 PHP 檔案的
PHP 7.0 相容性維持未驗證風險，不標記為 PASS。

2026-07-17 owner deployment decision：Cloudflare 正式部署延後至 V1.2 全部功能、
migration、CI、驗收與風險清單完成後。V0.8～V1.1 期間可以 push GitHub 工作
branch、執行本機／OpenNext build、Wrangler `--dry-run`、GitHub CI 與既有智邦
pre-launch target URL 驗證；禁止 push／merge 到 `main`，因 `main` 由外部
Cloudflare Git integration 自動部署。所有後續 roadmap 工作使用 `codex/*` branch，
不得因單一 milestone 通過而更新 `main` 或觸發 Cloudflare production deployment。

在此規則確認前，2026-07-17 的兩次 main push 已由外部 integration 自動部署
預設 Worker `highlightsignal`（Cloudflare deployment timestamps 09:04Z、09:07Z）。
這兩次不是 named-environment dry-run。部署後 status-only smoke：首頁、登入、註冊
HTTP 200，未登入 Dashboard HTTP 307 導向登入。未擅自 rollback；是否保留或回滾
由 owner 決定。

2026-07-17 URL-only DB verification：signed Workspace context、GA integration、
Dashboard workflow read 均為 HTTP 200；測試 context `v08-db-smoke-20260717`
的 `create_task` mutation 與 readback 亦為 HTTP 200。核心 `010`–`012` table
已由實際讀寫 flow 證實可用，不再重跑 migration；其餘 backfill／optional schema
必須依 inventory 與功能需求個別審查。

2026-07-17 已驗證：

* `npm run lint`：PASS
* `npx tsc --noEmit --pretty false`：PASS
* `npm run build`：PASS
* `npm run build:cf`：PASS
* `npx wrangler deploy --dry-run`：PASS
* 官網、登入、註冊、PHP health endpoint：先前基準為 HTTP 200；V08-01 未部署，未對最新 baseline 執行線上 smoke test
* 自動化測試檔案：0
* 本機 PHP runtime：未安裝，PHP lint 尚未驗證
* 工作樹：已整理為四個 code/config baseline commits；僅剩兩個含 legacy credential 的 PHP files 明確排除並交由 V08-02

2026-07-17 V09-01／V09-02／V09-03 程式完成（同一 `codex/v09-roadmap` 分支對話，尚未
commit）：

* `V09-01`：新增 `backend/sql/migrations/`（`010`–`016`），`backend/api/src/Migration/MigrationRunner.php`
  與 `backend/api/bin/migrate.php`（`status`／`migrate`／`baseline`，`GET_LOCK` 併發鎖、checksum
  fail-closed、CLI-only guard）。5 個 request-time `CREATE TABLE IF NOT EXISTS`
  call site（`dashboard_ai_logs`／`dashboard_ai_plan_logs`／`seo_pagespeed_cache`／
  `seo_pagespeed_history`）已改為 no-op，DDL 移至 `migrations/013`。
* `V09-02`：`WorkspaceService::listForMember()` 移除 write branch，改純讀；新增
  `WorkspaceProvisioningService`（slug 碰撞重試、`WorkspaceAlreadyProvisionedException`）
  與明確 `POST /api/v1/workspaces` endpoint。`migrations/014` 為既有 owner backfill
  （來源：`ga_connections`／`seo_sites`／`si_sites`／dashboard／pagespeed 各表
  member/user id 聯集，因本專案無本地 members table）。
* `V09-03`：`migrations/015`（expand，nullable `workspace_id`）、`016`（backfill，
  經 `legacy_member_workspace_map` 精確對應)。`GaIntegrationRepository` 改為直接
  以 `workspace_id` 查詢，不再用 `owner_member_id` 假 join。OAuth state
  （`account_fetch.php`／`oauth_callback.php`）新增 `workspace_id`＋`nonce` 綁定與
  重放防護（複用 `service_request_nonces`）。Contract migration
  （`017_..._DEFERRED.sql`）已寫好但刻意排除在 `migrations/` 外，未套用。

2026-07-17 owner 決定：智邦生活館「虛擬主機」方案確認**沒有 SSH／cron**（後台
管理工具清單裡沒有 Terminal／排程功能，僅 FTP＋phpMyAdmin 等網頁工具）。owner
決定不申請 SSH，`backend/api/bin/migrate.php` 因此無法在此主機執行。改用
`backend/sql/manual_apply_bookkeeping.sql` 作為實際操作方式：逐一把
`migrations/010`–`016` 貼進 phpMyAdmin 手動執行，再執行對應的 `schema_migrations`
bookkeeping INSERT（checksum 已預先算好），讓 `schema_migrations` 保持誠實紀錄。
Runner 程式碼本身保留，作為未來若換主機或申請到 SSH／排程時可直接使用的正式工具，
不是廢棄程式碼。

此決定過程中也修正兩個小問題：(1) `bin/migrate.php` 原本開頭有 shebang 寫在
`<?php` 標籤外，用瀏覽器打網址時觸發 `strict_types` fatal error（CLI 執行不受
影響，但暴露了此檔案其實可被網址直接存取）；已移除 shebang。(2)
`backend/api/.htaccess` 的目錄擋清單漏了 `bin/`（只擋了 `src`/`config`/`workers`），
已補上，現在 `.../v2/bin/migrate.php` 對外是 403，符合「不提供 public HTTP
migration endpoint」要求，已由 owner 實際打網址確認。

**已知缺口，尚未解決**：

1. `V09-01` 的三個 destructive 驗證情境（checksum 竄改、故意失敗的 migration、
   併發 runner）需要拋棄式資料庫且需要 CLI 執行 runner；本機無 PHP／MySQL
   runtime，且主機無 SSH／cron，owner 決定不申請。這三項確定不會有可重現證據，
   列為長期接受風險，不是暫時待辦，見 `backend/sql/VERIFICATION_RUNBOOK.md` 第 1 節。
2. `V09-02` 移除 lazy-GET 建立 Workspace 後，目前沒有任何呼叫方會呼叫新的
   `POST /api/v1/workspaces`；在 V12-01 Onboarding BFF 或臨時銜接方案完成前，
   從未觸發過舊 lazy-GET 的全新會員不會自動取得 Workspace。此為刻意不擴大範圍
   到 frontend／V09-06 的直接後果，需要 owner 決定銜接方式與時程。
3. 尚未執行任何驗證指令；本節與各 Task 狀態為 VERIFY，不是 DONE。

2026-07-20 於真實 pre-launch host（智邦，phpMyAdmin 手動套用）執行驗證，
executor=hank：

* `schema_migrations` 7 筆（010–016）checksum 與 applied_at 均已記錄。
* V09-02 postflight（`backend/sql/postflight_workspace_backfill_invariants.sql`）：
  `unmapped_count=0`、`workspaces_without_owner_membership=0`、
  `orphaned_legacy_mappings=0`。無重複 owner membership。
* V09-03 postflight（`backend/sql/postflight_ga_workspace_backfill_invariants.sql`）：
  `ga_connections` 9 筆全數回填（`still_null=0`），`workspace_id` 欄位確認為
  nullable BIGINT + MUL index；`connections_with_missing_workspace=0`、
  `connections_mapped_to_inaccessible_workspace=0`。
* 上述證據使 V09-02／V09-03 的**資料完整性**驗收項目可標記 DONE（見下方工作清單）。
  V09-01 的 runner 機制本身（`bin/migrate.php` 的 lock／checksum-mismatch／並行
  保護）從未被實際執行，維持 VERIFY，不算 DONE。
* 尚未執行：V09-02／V09-03 的即時 HTTP 測試（跨 Workspace negative test、OAuth
  竄改／重放／過期）——這幾項不需要 SSH，只需要發 HTTP request，尚待 owner 決定
  是否要做。

2026-07-20（稍晚）owner 實際觸發一次真實 GA OAuth 連接流程（member_id=1,
workspace_id=2），完整跑完並成功導回 `https://highlightsignal.com/ga?connected=1`
——確認 `account_fetch.php`／`oauth_callback.php` 的 workspace 綁定、角色檢查、
nonce 認領、`ga_connections` upsert（含 `workspace_id`）在真實環境下正常運作。
取得該次真實 `state` 後，針對 `oauth_callback.php` 執行以下 negative test（curl
直接打 highlight.url.tw，不需 SSH）：

* 重放同一個（已使用過的）state → `OAuth state already used`，HTTP 400 ✅
* 竄改該 state 簽章一個字元 → `Invalid OAuth state`，HTTP 400 ✅
* 等待該 state 超過 600 秒過期窗口後重放 → `Expired OAuth state`，HTTP 400 ✅

OAuth state 竄改／重放／過期三項 negative test 全部確認通過，證據為 2026-07-20
針對 `oauth_callback.php` 的三次真實 curl 請求與回應。

順手修正一個發現的既有小問題（非本次新增）：`oauth_callback.php` 缺少 `code`
參數時原本回 HTTP 200（body 為 `Missing code`），已改為 HTTP 400。

尚未執行：跨 Workspace negative test（需要第二個測試帳號/Workspace 才能測 Member A
讀 Workspace B 連線被拒絕）；V09-02 的 GET 純讀即時行為、backfill 重跑冪等性。

同一時段也修好一個跟 V09 無關但擋住本機測試的問題：本機 `npm run dev` 因為
`node --env-file=...` 與 Next.js 16 dev server 內部子行程的 `NODE_OPTIONS`
限制衝突而無法啟動（Node 明確禁止 `--env-file`／`-r` 出現在 NODE_OPTIONS 裡）。
改用 `scripts/dev.mjs`（純 `dotenv.config()`，不經過 CLI 旗標／NODE_OPTIONS）解決，
`npm run dev`／`lint`／`tsc --noEmit` 均已確認正常。新增 `scripts/dev.mjs`，
`package.json` 的 `dev` script 改指向它，新增 `dotenv` 為明確 devDependency。

2026-07-20（同批次接續）`V09-04` 程式完成（同一 `codex/v09-roadmap` 分支，尚未
commit／尚未套用到真實主機）：

* **Schema 盤點**：任務包列出的表分兩類。9 張根表（`seo_sites`／
  `seo_summary_cache`／`seo_scan_history`／`si_sites`／`si_analysis_runs`／
  `dashboard_ai_logs`／`dashboard_ai_plan_logs`／`seo_pagespeed_cache`／
  `seo_pagespeed_history`）在程式碼與既有 SQL 參考檔中確認有直接 `user_id`
  欄位，比照 GA 模式加 `workspace_id`。5 張子表（`seo_site_integrations`
  只有 `site_id`；`si_analysis_metrics`／`si_analysis_items`／
  `si_analysis_actions`／`si_analysis_side_items` 只有 `run_id`）判斷為不需
  直接加欄位，改為查詢時 join 回根表取得 `workspace_id`。因本機無 DB 存取，
  新增 `backend/sql/preflight_v09_04_seo_si_dashboard_inventory.sql`
  （information_schema 盤點腳本），需 owner 在 phpMyAdmin 執行後比對這份分類
  是否與真實 schema一致，再套用 `018`／`019`。
* **Migration**：`backend/sql/migrations/018_seo_si_dashboard_workspace_expand.sql`
  （9 張根表 nullable `workspace_id`＋index）、
  `019_seo_si_dashboard_workspace_backfill.sql`（透過
  `legacy_member_workspace_map` 回填，未對應到的維持 NULL 不猜測）、
  `backend/sql/postflight_v09_04_seo_si_dashboard_workspace_backfill_invariants.sql`
  （比照 GA 版本，含子表 sanity join）。Contract migration
  （`backend/sql/020_seo_si_dashboard_workspace_contract_DEFERRED.sql`）已寫好，
  刻意排除在 `migrations/` 外，未套用。
* **PHP 查詢層**：`legacy_auth.php` 新增 `hs_resolve_member_workspace_id()`；
  `api_helpers.php` 新增 `hs_member_workspace_id()` wrapper；
  `si/common.php`／`si/save_common.php`／`si/generate_common.php`／
  `si/sites/list.php`／`si/seo/list.php`／`si/seo/add.php`／
  `si/seo/summary.php`／`si/seo/pagespeed.php`／
  `si/seo/pagespeed_history.php`／`dashboard/ai_usage.php`／
  `dashboard/ai_plan.php`／`dashboard/ai_compose.php` 改為 `user_id`＋
  `workspace_id` 雙條件查詢，新增資料寫入時一併寫 `workspace_id`。
* **關鍵發現（非本次要解決，但影響設計）**：比對 Next.js BFF 呼叫端
  （`lib/signedPhpFetch.ts`／`lib/seo/seoApi.ts`／`lib/si/siApi.ts`／
  `lib/dashboardAiQuota.ts`／`app/api/dashboard/ai-compose/route.ts`）後發現，
  除了 `app/api/seo/pagespeed/route.ts` 會呼叫 `resolveWorkspaceContext()`
  取得真實 Workspace 外，其餘呼叫都只傳 `memberId`；
  `lib/signedPhpFetch.ts` 的 `workspaceId: identity.workspaceId ??
  identity.memberId` fallback 會把 member 自己的數字 id 簽成
  `x-hs-workspace-id`，這不是真正的 `workspaces.id`。因此 PHP 端**沒有**採用
  信任該簽章 header 的做法（會等於任務包明確禁止的
  `member_id === workspace_id` 猜測），改為在伺服器端用
  `legacy_member_workspace_map` 從已驗證的 `member_id` 解析 `workspace_id`。
  這對目前「每個 member 剛好一個自己的 Workspace」的現況是正確的，但還不是
  真正的多人 Workspace 授權檢查；等 V09-06 把真實 Workspace 切換接到這些
  legacy 端點時，需要改成真正的 `workspace_members` 權限檢查，列為已知後續
  缺口。
* **文件**：`backend/sql/README.md`、`VERIFICATION_RUNBOOK.md`（新增第 4 節）、
  `manual_apply_bookkeeping.sql`（新增 018／019 bookkeeping 區塊，checksum
  為真實 `sha256sum` 計算值）已更新。
* **尚未執行**：`018`／`019` 尚未在真實主機套用，postflight 尚未跑過；PHP
  變更尚未上傳（部署順序要求 migration 先套用並確認 postflight 歸零，PHP
  才能上傳，否則會因缺少 `workspace_id` 欄位而 500）。抽查至少一個 SEO/SI
  端點的改動前後回應格式相容性，需等實際套用後才能驗證。

2026-07-20（同批次接續，真實 pre-launch host 驗證，executor=hank）`V09-04`
migration 套用與驗證完成：

* **Preflight**：`preflight_v09_04_seo_si_dashboard_inventory.sql` 在 phpMyAdmin
  執行，最後一段 `has_user_id/has_site_id/has_run_id/already_has_workspace_id`
  摘要查詢回傳 14 列，對應任務包全部 14 張表都存在且欄位分類（9 根表／5 子表）
  與 `migrations/018`／`019` 的假設一致，未發現 schema 落差。
* **Migration 套用**：`migrations/018_seo_si_dashboard_workspace_expand.sql`、
  `019_seo_si_dashboard_workspace_backfill.sql` 已於 phpMyAdmin 手動貼上執行；
  `schema_migrations` 確認 9 筆（010–016、018、019）皆已記錄，018/019 的
  `applied_at` 為 `2026-07-20 13:55:28`／`13:55:36`，checksum 與
  `manual_apply_bookkeeping.sql` 記錄一致。
* **Postflight**：`postflight_v09_04_seo_si_dashboard_workspace_backfill_invariants.sql`
  六段查詢全數執行，結果：
  * 第 1 段（9 張根表 `without_workspace`）：全部 0。
  * 第 2 段（`mapped_to_missing_workspace`）：全部 0。
  * 第 3 段（`mapped_to_inaccessible_workspace`）：全部 0。
  * 第 4 段（無 legacy mapping 的孤兒 anomaly report）：0 列（空結果）。
  * 第 5 段（5 張子表透過 join 回根表的 `root_missing_workspace`）：全部 0。
  * 第 6 段（`legacy_member_workspace_map` 一對多重複檢查）：0 列（空結果）。
  九張根表全數回填、無孤兒、無跨 Workspace 錯誤歸屬，子表 join 回根表也全部
  可解析 `workspace_id`。
* **PHP 上傳與 smoke test**：本批 12 個 PHP 檔案（`legacy_auth.php`、
  `api_helpers.php`、`si/common.php`、`si/save_common.php`、
  `si/generate_common.php`、`si/sites/list.php`、
  `si/seo/{list,add,summary,pagespeed,pagespeed_history}.php`、
  `dashboard/{ai_usage,ai_plan,ai_compose}.php`）已上傳智邦主機。前端「搜尋
  健康度」頁面（AEO/GEO 站點 workspace-scoped 讀取）載入既有快取資料正常，
  格式與改動前一致（`資料來源：gsc+crawl`），確認 `seo_sites`／
  `seo_summary_cache` 的 workspace_id-scoped 查詢在真實環境下正常執行。
  手動觸發「重新掃描」時遇到 `Google Search Console credentials are not
  configured`——此為主機既有、與本次 migration 無關的既存缺口
  （`GOOGLE_APPLICATION_CREDENTIALS`／`GOOGLE_SERVICE_ACCOUNT_JSON` 未設定，
  `gsc_access_token()` 這段程式本次未改動），不影響 V09-04 驗收，但代表
  `seo_scan_history`／`seo_summary_cache` 的 workspace_id 寫入路徑（GSC 之後
  的程式碼）尚未被這次 smoke test 實際觸發到；建議後續有機會時用
  `si/seo/add.php` 或 Dashboard AI 端點另外驗證寫入路徑。
* 上述證據使 V09-04 的**資料完整性**與**查詢層改動**驗收項目可標記 DONE。
  跨 Workspace negative test（Member A 讀 Workspace B 的 SEO/SI 資料）——
  **未實測**，原因同 V09-02/03，需要第二個測試帳號/Workspace。

2026-07-20（同批次接續）`V09-05` Backend Workspace Authorization Policy 程式
完成（同一 `codex/v09-roadmap` 分支，尚未 commit／尚未上傳）：

* **端點盤點**：對照新架構（`public/index.php` 路由，經
  `WorkspaceAccessPolicy::requireActiveMembership()`）與全部 legacy 平鋪端點
  （`backend/api/ga/**/*.php`、`si/**/*.php`、`dashboard/**/*.php`，約 28 個
  檔案）逐一確認授權檢查現況。發現的問題分三類：
  1. **角色檢查散落各處，未收斂**：`GaIntegrationService::updateConnectionStatus()`
     與 `WorkflowController::update()` 各自寫死一份
     `in_array($membership['role'], [...])`，`ga/account_fetch.php`／
     `ga/oauth_callback.php` 又各自複製一份相同邏輯——四處四份，不是單一
     定義。
  2. **shadow endpoint 繞過新架構的角色閘門**：`ga/update_connection_status.php`
     這支 legacy 平鋪檔案改的是與 `GaIntegrationService::updateConnectionStatus()`
     完全相同的欄位（`ga_connections.status`），但完全沒有 workspace 或角色
     檢查，任何已簽章的 member（含 viewer）都能直接改；`ga/get_connections.php`
     也只用 `member_id` 查詢，未套用 `workspace_id`。
  3. **完全無驗證的端點**：`ga/report/report_excel.php` 的 direct-HTTP
     分支（`?id=` 可下載任一租戶的報表 CSV，未認證 IDOR）、
     `ga/report/delete_csv.php`（無驗證即可刪除全部報表匯出檔）、
     `ga/report/report_runner.php`（無驗證即可觸發全站所有排程報表寄送）、
     `ga/report/check_phpspreadsheet.php`（無驗證的除錯頁面，洩漏伺服器路徑與
     dependency 狀態）。`ga/report/report_mailer.php` 的 direct-HTTP 分支則已
     正確做了 `hs_require_service_member()` ＋ `ga_report_schedules.user_id`
     ownership 檢查，是本次唯一發現「已經做對」的對照組。
  4. **被停權成員仍可用**：`legacy_auth.php` 的 `hs_resolve_member_workspace_id()`
     （V09-04 新增）只 join `legacy_member_workspace_map`，沒有檢查
     `workspace_members.status`——一個被設為 `suspended` 的成員，其
     `legacy_member_workspace_map` 資料列仍然存在，因此仍能解析出可用的
     `workspace_id`，繞過停權狀態。這個函式被 `si/common.php`／
     `si/save_common.php`／`si/generate_common.php`／`si/sites/list.php`／
     `si/seo/*.php`／`dashboard/ai_*.php` 全部使用，是單一函式、影響面最廣的
     缺口。
* **中央 role permission matrix**：新增
  `backend/api/src/Workspace/WorkspacePermissions.php`（`allows()`／
  `requirePermission()`，對照 `workspace_members.role` 的完整 ENUM：
  owner/admin/manager/member/viewer/billing/external_viewer）。目前定義三個
  action：`read`（任何 active 角色）、`integrations.manage`
  （owner/admin/manager）、`workflow.mutate`（owner/admin/manager/member，
  viewer 不行）——與既有程式碼原本各自寫死的檢查完全對應，不改變任何現有
  合法操作的行為。已接回：`GaIntegrationService::updateConnectionStatus()`、
  `WorkflowController::update()`、`ga/account_fetch.php`、
  `ga/oauth_callback.php`、新修的 `ga/update_connection_status.php`。
* **修復（已寫完，未上傳）**：
  * `legacy_auth.php`：`hs_resolve_member_workspace_id()` 改為 join
    `workspace_members` 並要求 `status='active'`，不再只信任
    `legacy_member_workspace_map` 的存在。對現有資料無影響（V09-02
    postflight 確認所有既有 membership 都是 active），純粹補上防禦。
  * `ga/get_connections.php`／`ga/update_connection_status.php`：改用
    `hs_resolve_member_workspace_id()` 解析 `workspace_id`（取代單純
    `member_id`），`update_connection_status.php` 另外接上
    `WorkspaceAccessPolicy::requireActiveMembership()` ＋
    `WorkspacePermissions::requirePermission(..., 'integrations.manage')`，
    與新架構的行為完全對齊。
  * `ga/report/report_excel.php`：direct-HTTP 分支補上
    `hs_require_service_member()` ＋ `ga_report_schedules.user_id` ownership
    檢查（複製 `report_mailer.php` 已驗證正確的做法，不是發明新模式）。
  * `ga/report/delete_csv.php`、`ga/report/check_phpspreadsheet.php`：補上
    `hs_require_service_identity()` 簽章驗證。
  * `ga/report/report_runner.php`：補上 fail-closed 的 `REPORT_CRON_SECRET`
    共享密鑰驗證（環境變數未設定時回 503，不是靜默放行）——這支是跨全部
    tenant 的批次 cron 進入點，不適合套用給單一 BFF 呼叫端設計的 HMAC
    簽章機制；本機 `ga/report/config.php` 目前根本不存在（只有
    `config.php.example`），對應 execution board 的「report delivery config
    未配置」已知缺口，此次是先把驗證閘門補好，等 owner 之後真的建立
    `config.php` 並設定 `REPORT_CRON_SECRET` 環境變數時就會生效。
  * 移除 `backend/api/auth.php`——確認除了剛改掉的兩個呼叫端外沒有其他地方
    使用（`grep` 全 repo 確認），純粹是 `hs_require_service_member()` 的薄
    包裝，非廢棄功能。
* **已知風險、刻意不在本次修**：`ga/ga_report_list.php`／
  `ga_report_detail.php`／`ga_report_save.php`／`ga_report_update.php`／
  `data_sync.php`／`get_query.php` 這組 GA 報表排程端點，仍是透過
  `ga_require_connection_ownership()` 做 `member_id`-only ownership 檢查，
  對應的 `ga_report_schedules`／`ga_daily_summary`／`ga_pages`／`ga_events`／
  `ga_traffic_sources`／`ga_conversions` 這六張表**從未被 V09-03/04 的
  workspace_id migration 納入範圍**——要把這組表真正 workspace 化需要一次
  獨立的 expand/backfill migration，不是角色矩陣可以解決的問題，建議另立
  task（暫定 `V09-08`）處理，不擴大本次範圍。另外 `si/aeo_summary.php`／
  `si/geo_summary.php` 是 `si/aeo/summary.php`／`si/geo/summary.php` 的重複
  路由（body 只有一行 `require_once`），`si/save_summary.php` 的 module
  參數不像其 aeo/geo 手足由伺服器端強制指定（但 `si_create_summary_payload()`
  內部仍有 `in_array($module, ['aeo','geo'])` 白名單檢查，非安全漏洞，僅為
  命名/一致性問題）——列為待清理項目，非本次阻擋。
* **尚未執行**：跨 Workspace read/write negative test（GA 與 SEO/SI 各一組）
  需要第二個測試帳號；role 邊界測試（viewer 嘗試 owner/admin 操作被拒絕）
  **目前 production 資料裡不存在任何非 owner 角色的 membership**（V09-02
  postflight 已確認），無法用真實資料測，需要手動在 phpMyAdmin 建立一筆
  `role='viewer'` 的測試 membership 才能驗證。

2026-07-20（稍晚）`V09-05` PHP 上傳完成，suspended membership fail-closed
測試於真實 pre-launch host 執行並通過（member_id=1, workspace_id=2，與
V09-03 真實 GA OAuth 測試同一組帳號）：

* 執行前確認：`workspace_members` 該筆 `role=owner`, `status=active`。
* 執行 `UPDATE workspace_members SET status='suspended' WHERE workspace_id=2
  AND member_id=1;` 後，重新整理「搜尋健康度」／GA 連線頁面，資料變為空
  （非錯誤訊息，是正常的「查無資料」）——確認 `hs_resolve_member_workspace_id()`
  補上的 `status='active'` 檢查在真實環境下正確生效，被停權成員無法再透過
  `legacy_member_workspace_map` 繞過。
* 執行 `UPDATE workspace_members SET status='active' WHERE workspace_id=2
  AND member_id=1;` 復原後，同一頁面資料恢復正常顯示。
* 上述證據使 V09-05 的 **suspended membership fail-closed** 驗收項目可標記
  DONE。跨 Workspace negative test（需要第二個測試帳號）與 role 邊界測試
  （需要手動建立非 owner 角色的測試 membership）仍待執行。

2026-07-21（同批次接續）`V09-05` 跨 Workspace negative test 完成，執行 GA 與
V09-04 模組（SEO/SI）各一組：

* 第二個真實測試帳號 `member_id=8`（`hank.zou@tradeserv.com`）取得後，
  發現 `lib/subscription.ts` 的訂閱方案比對 bug（見下方獨立 dated note）
  一併修復，讓這個帳號能正常進入 SI 模組進行測試。
* 用 `member_id=8` 登入，打開「搜尋健康度」頁面：站點下拉選單顯示「尚未新增
  站點」（空），**未**看到 `member_id=1`／`workspace_id=2` 加的站點
  （「AR馬上鏈」）。
* 同一帳號打開 GA 連線頁面：連線列表同樣是空的，**未**看到 `member_id=1`
  連過的 GA 帳號。
* 兩項確認 `ga_connections`／`seo_sites` 等表的 `workspace_id` 範圍查詢在
  真實跨帳號情境下正確隔離，Member A（`member_id=8`）讀不到 Workspace B
  （`workspace_id=2`）的資料。
* 上述證據使 V09-05 的**跨 Workspace read/write fail-closed**驗收項目可標記
  DONE。Role 邊界測試（viewer 角色嘗試 owner/admin 操作被拒絕）仍待執行——
  production 目前沒有任何非 owner 角色的 membership，需要手動在 phpMyAdmin
  建立一筆 `role='viewer'` 的測試 membership 才能驗證，是 V09-05 唯一剩下的
  未驗證項目。

2026-07-21（籌備 V09-05 跨 Workspace 測試的第二帳號時意外發現，與 V0.9
Workspace Foundation 無關，記錄於此純粹因為同一批次發現）：`lib/subscription.ts`
的 `hasActiveHighlightSignalPlan()` 用完全比對
`["starter","pro","business","demo"].includes(planId)` 判斷 SI／GA／ADS 存取權，
但真實訂閱系統回傳的 `subscription` 值帶 billing 週期後綴（例如
`starter_month`），完全比對永遠比不中，導致**任何 `role` 不是 `admin` 的真實
付費會員都被擋在 SI／GA／ADS 模組外**，即使已付費訂閱。對照
`lib/dashboardAiQuota.ts` 對同一個欄位正確使用 `subscription.includes(tier)`
部分比對，兩處邏輯本來就沒對齊。已修正為
`["starter","pro","business","demo"].some(tier => planId.startsWith(tier))`，
`npx tsc --noEmit`／`npm run lint` 皆 PASS。**尚未部署**：這是前端 Next.js
改動，不像 PHP 是上傳到智邦主機即生效；owner 目前用本機 `npm run dev`
驗證，尚未推上任何可部署分支，正式站的實際生效時間點待 owner 決定部署方式
（現行規則禁止 push/merge 到 `main`，因為 `main` 由外部 Cloudflare Git
integration 自動部署）。

2026-07-21（同批次接續）`V09-06` Frontend Workspace Context 程式完成（同一
`codex/v09-roadmap` 分支對話，尚未 commit／尚未部署）：

* **解決 V09-02 known gap #2**：`app/api/workspaces/route.ts` 新增 `POST`
  handler，簽章轉發到 PHP `POST /api/v1/workspaces`（demo 帳號回 403）。
  `components/workspace/WorkspaceProvider.tsx` 的 `refresh()` 改為：GET 清單
  為空且回應正常時，先呼叫 POST 進行 provisioning（409
  `WORKSPACE_ALREADY_PROVISIONED` 視為正常，代表併發已建立），再重新 GET 一次
  才判定失敗。全新會員第一次載入即可自動拿到 Workspace，不恢復「GET 隱式
  建立」，provisioning 永遠是獨立明確的 POST。
* **Workspace 切換時的 state 隔離**：檢查全部 `useWorkspace()` 使用點後發現
  資料抓取的依賴陣列已經普遍包含 `currentWorkspace.id`（re-fetch 會正確觸發），
  但多個元件在新資料回來前會短暫殘留舊 Workspace 的畫面內容，已修正
  `components/dashboard/DashboardWorkspace.tsx`、`DashboardTasksPage.tsx`、
  `app/(app)/seo/page.tsx`、`components/si/SiInsightPage.tsx`、
  `app/(app)/ga/page.tsx`：切換時立即清空各自的 workspace-scoped local
  state（`workflow`／`sites`／`summary`／`selectedSiteId`／`selectedIds` 等），
  不等舊資料被新資料覆蓋。順手修掉 `seo/page.tsx` 原本
  `setSelectedSiteId((current) => current || ...)` 會沿用前一個 Workspace 站點
  ID 的問題。
* **`lib/workspaceServer.ts` legacy-fallback：收斂，不整支移除**。原邏輯只要
  backend 回 403（`WORKSPACE_FORBIDDEN`）就一律 fallback、忽略是否明確要求了
  別的 workspace——等於任何 403（被停權會員、或明確要求別人 Workspace 被拒絕）
  都會被吞掉並偷換成「假裝成功回傳自己的預設 Workspace」，這正好是
  V09-02／V09-05 明確禁止的「用 legacy fallback 繞過 membership check」。已
  改為：`WORKSPACE_FORBIDDEN` 永遠原樣往外拋；只有真正的 backend-unavailable
  （network／DB／格式錯誤）且沒有明確指定別的 workspace 時才 fallback。保留
  （而非移除）的理由：這個 fallback 只被舊版 member-scoped BFF route
  （GA／SEO／SI／report，約 25 條）用來取得 `legacyOwnerMemberId`（恆等於
  呼叫者自己的 `session.id`），真正的 tenant 邊界檢查在 PHP 端
  `hs_resolve_member_workspace_id()`（V09-04／05 已補 `status='active'`
  檢查）獨立重新解析，不信任這裡回傳的任何欄位；整支移除只會讓這 25 條路由
  在 backend 短暫不可用時直接掛掉，換不到額外安全性。
* **驗證**：`npm run lint`／`npx tsc --noEmit --pretty false`／`npm run build`
  三項皆 PASS（新 `POST /api/workspaces` route 出現在 build 產物的路由清單
  中）。本機 `npm run dev`（沿用既有 `backend/private/frontend.env`，指向
  真實 pre-launch PHP host）確認未登入時 `GET`／`POST /api/workspaces`
  均正確回傳 `401 UNAUTHORIZED`，新 route 有掛載、未破壞既有 API。
* **未執行**：登入後的完整「全新會員 provisioning」與「兩個 Workspace 來回
  切換資料隔離」實機驗證——需要一個從未 provisioning 過的真實會員，或第二個
  測試 Workspace（不是第二個帳號；本節上方 `member_id=8` 測試帳號用於驗證
  跨帳號資料隔離，但沒有確認過它本身是否原本就沒有 Workspace，也沒有其登入
  憑證可供本次直接驗證）。與 V09-02～05 已記錄的相同缺口一致，待 owner 有
  對應測試帳號／環境後再補。

2026-07-21（同批次接續）`V09-07` Workspace migration rehearsal 完成，owner
選擇方向 1（真實 backup 演練），於本機 Docker disposable 環境執行：

* **環境**：真實 pre-launch DB 匯出（`D:\7.Highlight\3.Backup\vhost125121-8.sql`，
  MySQL 5.6.36-log，產生於 2026-07-17 14:13）還原至本機 `docker run mysql:5.6`
  容器（僅綁定 `127.0.0.1`，用完即 `docker rm -f`＋`docker volume prune`
  銷毀），拆成 `rehearsal_main`（happy path）與 `rehearsal_break`
  （destructive 測試）兩個獨立 database。本機 PHP（`D:\4.Tool\php`，啟用
  mysqli）搭配 scratch-only env 檔連線，不動 repo 內任何檔案／設定，
  `backend/private/.env` 本身不存在，不會誤連正式主機。
* **這份 backup 恰好是「進行中」的 migration 快照**：`workspaces`／
  `workspace_members`／`legacy_member_workspace_map`（010–014）已有真實資料
  （member_id=1→workspace_id=2、member_id=7→workspace_id=3），但
  `ga_connections`／`seo_sites` 等表**還沒有** `workspace_id` 欄位（015/016、
  018/019 尚未套用）——比空 schema 更貼近真實演練情境。
* **Happy path**：`status`（全部 pending）→`baseline 010-014`→`migrate`
  **這是這支 runner 第一次被真正執行**：015（21ms）、016（2ms）、018
  （193ms）、019（21ms）全部套用成功；postflight 兩份 invariant 檔全部 0
  異常，除了一筆真實既有異常（`dashboard_ai_logs` `id=1`／`user_id=8`，
  2026-07-17 當時尚無 legacy mapping，設計上正確被隔離未猜測歸屬，需 owner
  之後確認 `member_id=8` 現在是否已有 Workspace 並考慮重跑 019 backfill）；
  重跑 `migrate` 確認 idempotent（`No pending migrations.`）。
* **V09-01 原列為「確定無法測試」的三個 destructive 情境，全部在
  `rehearsal_break` 驗證通過**：(1) 竄改已套用檔案內容 → `status` 正確顯示
  `checksum_mismatch`，`migrate` 在套用任何新 migration 前 fail closed；
  (2) 刻意寫壞的 migration 檔 → 清楚失敗、不寫入 `schema_migrations`、
  `status` 之後仍正確顯示 pending，鎖有正常釋放；(3) 兩個 `migrate`
  process 相隔 2 秒同時啟動（其中一個跑 `SELECT SLEEP(15)`）→ 先啟動的成功
  套用，後啟動的等待 10 秒 lock timeout 後正確失敗，`schema_migrations`
  無重複記錄。
* **額外發現並修好一支 runner 真實 bug**：模擬 018（9 條 ALTER 語句）在第 4
  條語句中途失敗，預期 runner 應該失敗且不記錄；實際上 runner **回報
  `applied` 成功、完全沒有錯誤**，且只有前 3 個 table 真的拿到欄位，後 6 個
  沒有，`019` backfill 接著也用同樣方式靜默只處理有欄位的 3 張表。根因：
  `MigrationRunner::applyOne()` 的 result-draining 迴圈用
  `more_results() && next_result()` 當作結束條件，但 `mysqli::next_result()`
  在「下一條語句真的失敗」與「真的沒有更多語句」兩種情況下都回傳 `false`，
  現有程式碼無法區分，迴圈直接安靜結束，從未檢查失敗語句的 `errno`（用最小
  重現腳本確認：迴圈結束後 `$connection->errno` 其實已經是真實錯誤碼
  `1146`，只是程式碼沒去看）。已修復
  `backend/api/src/Migration/MigrationRunner.php`：迴圈結束後多檢查一次
  `errno`，非 0 就往外拋。用同一個情境重新驗證：修好後 runner 正確回報
  `Migration 018 ... failed on statement 4`、不寫入 `schema_migrations`，且
  完整重跑一次 happy path（015/016/018/019）確認修復未影響正常流程。
* **手動復原程序已實際演練並寫成 runbook**（見報告第 6 節）：對於已經
  auto-commit 一部分 DDL 的 expand migration，正確作法是逐表核對哪些
  ALTER 真的成功、手動補完剩下的（MySQL 5.6 的 `ADD COLUMN` 沒有
  `IF NOT EXISTS`，不能直接重跑整份檔案），確認 schema 完全對齊檔案定義後
  用 `baseline` 記錄，而不是硬重跑。已在 `rehearsal_break` 完整演練一次
  （手動補完 6 個 ALTER → baseline 018 → migrate 撿 019 → postflight
  確認結果與 happy path 完全一致）。
* **完整報告**：`docs/releases/V09-07_MIGRATION_REHEARSAL_REPORT.md`（含所有
  數據、SQL、逐項情境結果）。
* **上述證據使 `V09-07` DONE，`V09-01` 由 VERIFY 升級為 DONE**（runner 機制
  本身不再是未知數；主機仍無 SSH，仍無法在真正主機上執行這支程式，這點不變）。
* **未涵蓋**：empty database rehearsal（用的是真實 mid-migration snapshot，
  非空 schema）；此份 backup 是 2026-07-17 的快照，不代表主機現在的即時狀態，
  異常清單需要 owner 對照真實主機現況再確認一次。

2026-07-21（同批次接續）`V09-08` GA Reporting Workspace Ownership 程式＋SQL
完成（同一 `codex/v09-roadmap` 分支對話，尚未 commit／尚未套用到真實主機）：

* **Schema 盤點結論**：六張表分兩類。1 張根表 `ga_report_schedules`（有直接
  `user_id`）比照 GA/SEO 模式做 expand（`migrations/021`）＋backfill
  （`migrations/022`），直接持有 `workspace_id`；5 張子表
  （`ga_daily_summary`／`ga_pages`／`ga_events`／`ga_traffic_sources`／
  `ga_conversions`）只有 `connection_id` 外鍵指回已於 V09-03 回填完成的
  `ga_connections.workspace_id`，判斷為不需直接加欄位，改為查詢時 join 回
  `ga_connections` 取得 ownership，與 V09-04 對子表的處理方式一致。新增
  `backend/sql/preflight_v09_08_ga_reporting_inventory.sql`，待 owner 於
  phpMyAdmin 執行後比對是否與真實 schema 一致。
* **這批獨有的額外檢查**：`ga_report_schedules.connection_ids` 是手維護的
  JSON 陣列（TEXT，非正規化外鍵），可能引用多筆 `ga_connections`，因此
  postflight 額外新增一項 schedule／connection 跨 Workspace 洩漏檢查（複用
  `ga_report_list.php`/`ga_report_detail.php` 既有的 `FIND_IN_SET(...)` join
  手法）——若某 schedule 的 `connection_ids` 引用了別的 Workspace 的 GA
  連線，會被抓出來，這是六張表 backfill 完整性之外，這批表特有的資料完整性
  風險。
* **Migration**：`backend/sql/migrations/021_ga_reporting_workspace_expand.sql`
  （`ga_report_schedules` nullable `workspace_id`＋index）、
  `022_ga_reporting_workspace_backfill.sql`（透過
  `legacy_member_workspace_map` 回填）、
  `backend/sql/postflight_v09_08_ga_reporting_workspace_backfill_invariants.sql`
  （比照 GA/SEO 版本，含子表 join 回 `ga_connections` 的 sanity check 與上述
  跨 Workspace 洩漏檢查）。Contract migration
  （`backend/sql/023_ga_reporting_workspace_contract_DEFERRED.sql`）已寫好，
  刻意排除在 `migrations/` 外，未套用。
* **PHP 修正**：`backend/api/ga/ownership.php` 的
  `ga_require_connection_ownership()` 改為以 `workspace_id` 比對
  `ga_connections`（原本用 `member_id`，是任務包禁止的假設）；
  `ga_report_list.php`／`ga_report_detail.php`／`ga_report_save.php`／
  `ga_report_update.php`／`data_sync.php`／`get_query.php` 六個端點全部改為：
  解析呼叫者 `workspace_id`（`hs_resolve_member_workspace_id()`，V09-04/05
  已有的 active-membership-checked resolver）→要求 active membership→依動作
  性質要求 `read` 或 `integrations.manage` 角色權限→查詢/寫入改為
  `workspace_id` 範圍。`data_sync.php` 原本完全無驗證（只用
  `$_GET['member_id']` 猜範圍），是本次發現的另一個無驗證缺口，一併補齊。
* **設計決策（非單純遷移）**：`ga/report/report_excel.php`／
  `ga/report/report_mailer.php` 的 direct-HTTP ownership 檢查，從「比對
  `ga_report_schedules.user_id` 是否等於呼叫者 member_id」（只有建立者本人
  能存取）改為「比對呼叫者 `workspace_id` 是否等於 schedule 的
  `workspace_id`」——讓報表匯出／寄送與其他 GA 資源一樣以 Workspace 為存取
  邊界，符合本任務「以 Workspace 作為正式 tenant boundary」的目標。目前正式
  資料每個 Workspace 僅有一個 owner membership（V09-02 postflight 已確認），
  此改動對現有資料無行為差異，但如果之後某 Workspace 有多名成員，會讓所有
  active 成員（而非僅建立者）都能存取自己 Workspace 的報表匯出——此為刻意
  接受的設計選擇，非本次遺漏。
* **驗證**：本機 `D:\4.Tool\php\php.exe -l`（PHP 8.3，非正式站 7.0，但可抓
  語法錯誤）對全部 9 個修改檔案執行，皆 `No syntax errors detected`。
* **Migration／postflight rehearsal**：比照 V09-07 方法論，於 disposable 本機
  Docker `mysql:5.6` 容器（僅綁定 127.0.0.1，驗證後 `docker rm -f` 銷毀）建立
  依程式碼推斷欄位的合成 schema（非真實主機 schema），種入 2 個真實情境租戶
  ＋1 筆孤兒 schedule＋1 筆刻意跨 Workspace 引用的 schedule＋1 筆刻意懸空的
  子表列。結果：preflight 欄位分類與假設一致；`021`／`022` 套用成功；
  postflight 全部符合預期——`schedules_without_workspace=1`（孤兒，正確保留
  NULL）、`mapped_to_missing_workspace=0`、`mapped_to_inaccessible_workspace=0`、
  anomaly report 正確只列孤兒、子表 sanity check 正確抓到懸空列、跨
  Workspace 洩漏檢查正確抓到刻意跨接的 schedule；重跑 `022` 為 no-op（冪等），
  重跑 `021` 正確以 `Duplicate column name` 失敗。
* **上述證據使 `V09-08` 由 READY 升級為 VERIFY，不是 DONE**：程式與 SQL 本身
  已完成且通過可重現的 disposable rehearsal，但下列四項需要 owner 執行正式
  環境操作，非本次工具可直接完成：(1) 真實主機 preflight／021／022／
  postflight（上方 rehearsal 用的是合成 schema，非真實欄位讀取結果）；
  (2) 9 個 PHP 檔案上傳智邦主機（須等 postflight 歸零後才能上傳，否則
  500）；(3) 真實跨 Workspace HTTP 負向測試（需要第二個測試帳號/Workspace，
  同 V09-03/04/05 已知缺口；`data_sync.php`/`get_query.php` 的 viewer 角色
  拒絕測試需要一筆非 owner 角色的測試 membership，同 V09-05 尚未解決的缺口）；
  (4) 真實報表 smoke test（需 owner 對既有真實 schedule 觸發匯出/寄送確認
  未退化）。V0.9 出口條件前兩項因此維持未勾選，需真實主機驗證完成後才能
  重新判定。

2026-07-21（同批次接續，owner 決定先跳過 V09-08 剩餘正式環境步驟、直接啟動
`V10-01`）`V10-01` Signal Persistence 程式＋SQL 完成（同一
`codex/v09-roadmap` 分支對話，尚未 commit／尚未套用到真實主機）：

* **新 Domain**：`signals` 是全新表（`backend/sql/migrations/024_signal_persistence.sql`），
  不同於 V09 系列的既有資料 Workspace 化，`workspace_id` 從建表就是
  `NOT NULL`＋正式 FK，不需要 expand/backfill/deferred-contract 三階段。任務包
  原本假設的編號 `021` 已被同一分支對話裡的 `V09-08` 用掉，改用下一個可用的
  `024`。
* **兩個任務包留給執行時決定的開放問題，已決定**：(a) 不建立獨立
  `priority` 欄位，排序只用 `severity`，真正 priority 留給 `V10-04` 一起算；
  (b) 偵測規則同步掛在 `si/seo/summary.php` 的 scan 完成後觸發，不做成
  cron/queue job（`V11-02` Queue Worker 尚不存在），用 try/catch 包住不讓
  偵測失敗影響 SEO 掃描本身的回應。
* **程式**：新增 `backend/api/src/Signal/`
  （`SignalRepository`／`SignalService`／`SignalController`）與
  `Signal/Detector/SeoTechnicalIssueDetector.php`，分層比照既有
  `WorkflowController`／`GaIntegrationController` 慣例；路由掛在
  `public/index.php` 既有 `WorkspaceAccessPolicy::requireActiveMembership()`
  之後（`GET/PATCH /api/v1/workspaces/{id}/signals[/{signalId}]`）。狀態歷程
  重用既有 `audit_logs`（`entity_type='Signal'`），只在真正的狀態轉換寫入，
  單純 occurrence_count 遞增不寫入。去重／resolve／reopen 規則：`resolved`
  （系統推斷）被重新偵測到會重開為 `new`；`dismissed`（人類決定）不會被
  自動重開，只靜默 bump occurrence_count。人類 PATCH 只能設
  `acknowledged`／`dismissed`，直接設 `new`／`resolved` 會被拒絕。
* **偵測觸發點**：`si/seo/summary.php` 在 `seo_scan_history` INSERT 後，重用
  該檔案本來就有的 `$issues`／`$previousIssues` 呼叫
  `SignalService::runSeoTechnicalIssueDetection()`。
* **前端最小串接**：新增 `app/api/workspaces/[workspaceId]/signals/route.ts`
  （比照既有 dashboard/workflow route 轉發模式），`app/(app)/seo/page.tsx`
  「技術問題」分頁新增「Signal（系統偵測事件）」區塊，讀真實資料並可
  acknowledge/dismiss，非 `V10-06` 正式整合，只滿足最低驗收要求。
* **驗證**：PHP `php -l` 對全部新/改檔案通過；前端 `npm run lint`／
  `npx tsc --noEmit`／`npm run build` 三項 PASS，新路由出現在 build 產物；
  本機 `npm run dev`（連向真實 pre-launch PHP host）確認未登入打新路由正確
  回傳 401、未登入造訪 `/seo` 正確導向登入頁、無 crash。
* **Migration／邏輯 rehearsal**：比照 V09-07/V09-08 方法論，disposable 本機
  Docker `mysql:5.6`＋本機 PHP CLI（`mysqli`）直接呼叫
  `SignalRepository`/`SignalService`/`SeoTechnicalIssueDetector`（不經過
  HTTP/簽章層）。模擬 4 輪 SEO 掃描：第 1 輪建立 2 筆 Signal；第 2 輪同一
  問題重複偵測，0 筆新建、全程只有 2 筆 row（去重確認）；第 3 輪 1 個問題
  修復，正確轉為 `resolved`；第 4 輪該問題重新出現，正確重開為 `new`。
  `audit_logs` 精確只有 4 筆相關紀錄（Detected×2／Auto-Resolved×1／
  Reopened×1），單純 bump 未產生額外紀錄。第二個腳本驗證
  `listForWorkspace()` 過濾、跨 Workspace 隔離（workspace 2 全程 0 筆）、
  viewer 角色被拒絕 PATCH、member 角色可 acknowledge/dismiss、直接 PATCH
  `status=new/resolved` 被拒絕、以及關鍵負向案例——dismissed 的 Signal
  重新偵測後**維持** dismissed（不會被自動重開），證實這條規則真的被執行而
  非只是文件。
* **上述證據使 `V10-01` 由 READY 升級為 VERIFY，不是 DONE**：程式與 SQL 本身
  已完成且通過可重現的 disposable rehearsal，但下列項目需要 owner 執行正式
  環境操作：(1) 真實主機套用 `migrations/024`；(2) 上傳
  `backend/api/src/Signal/**`／`public/index.php`／`si/seo/summary.php`；
  (3) 對一個已有 ≥2 筆 `seo_scan_history` 的真實站點觸發重新掃描，驗證真正
  的 end-to-end HTTP 新增/修復/去重流程；(4) 跨 Workspace HTTP 負向測試
  （需要第二個測試帳號/Workspace，同 V09 系列已知缺口）。

2026-07-21（同批次接續）`V10-02` Evidence Persistence & Traceability 程式＋
SQL 完成（同一 `codex/v09-roadmap` 分支對話，尚未 commit／尚未套用到真實
主機）：

* **`docs/5.database/05_Evidence_Database.md` 的取捨**：該草稿文件假設
  UUID 主鍵／PostgreSQL JSONB／獨立 `evidence_sources`／
  `evidence_relationships` graph 表，與主規格文件（MySQL-only、最小化 V1
  module boundary）直接衝突，依任務包指示只沿用不衝突的概念（evidence_type／
  source attribution／snapshot／traceability），比照 `signals` 表已確立的
  BIGINT PK＋CHAR(36) public_id 慣例，不建立獨立 lookup／graph 表。
* **Schema**：`backend/sql/migrations/025_evidence_persistence.sql`
  （`evidence_items`／`signal_evidence_links`，同 `signals` 是全新表、正式
  NOT NULL FK，不需要 expand/backfill）。**Snapshot 設計決策**：
  `payload_json` 是觀測事實的完整複本，不是指回 `seo_scan_history` 的外鍵，
  來源列被刪除或清理（`V11-08`）後 Evidence 仍完整可驗證（`content_hash`）。
  **Dedup 設計**：`content_hash` 只對定義事實本身的欄位算 sha256（排除
  scan-run metadata），`dedup_key = sha256(signal_dedup_key . content_hash)`
  複用 `signals.dedup_key` 同一個值，讓 `EvidenceService` 不需要額外 lookup
  表就能找到對應 Signal。同內容重複偵測只更新既有 row，內容真的改變才產生
  新 row 且舊 snapshot 不被覆寫。
* **程式**：新增 `backend/api/src/Evidence/`
  （`EvidenceRepository`／`EvidenceService`／`EvidenceController`，唯讀
  Controller，Evidence 只由系統偵測寫入）。`EvidenceService` 獨立重新呼叫
  `SeoTechnicalIssueDetector::diff()`（不依賴 `SignalService`，兩者是同一個
  stateless Detector 的獨立消費者），透過 `SignalRepository::findByDedupKey()`
  找到對應 Signal 才建立連結。路由：
  `GET /api/v1/workspaces/{id}/evidence`、
  `GET /api/v1/workspaces/{id}/signals/{signalId}/evidence`（直接對應
  Signal→Evidence traceability 驗收要求）。
* **觸發點**：`si/seo/summary.php` 在既有 Signal 偵測呼叫之後，緊接著呼叫
  `EvidenceService::recordSeoTechnicalIssueEvidence()`，只在
  `seo_scan_history` INSERT 真的成功時才觸發，同樣包在 try/catch 內。
* **驗證**：PHP `php -l` 全部新/改檔案通過。Disposable 本機 Docker
  `mysql:5.6`＋本機 PHP CLI rehearsal（延續 V10-01 環境，額外建立
  `seo_scan_history` 替身表），模擬 3 輪掃描：第 1 輪建立 2 筆 Evidence 並
  連結；第 2 輪內容不變，0 筆新建、全程只有 2 筆 row/link（去重確認）；
  第 3 輪 1 個問題 severity 改變，產生 1 筆新 Evidence（舊 snapshot 完整
  保留、`content_hash` 與第 1 輪一致），連到同一個 Signal。完整性檢查：
  從最舊 row 的 `payload_json` 重新計算 `content_hash` 與儲存值一致。
  **來源刪除存活測試**：實際刪除替身 `seo_scan_history` 全部列後，3 筆
  Evidence 完全保留、`content_hash` 不變。跨 Workspace 隔離（workspace 2
  全程 0 筆）；全部 `source='seo'` Signal 皆有 ≥1 筆連結 Evidence（0 筆
  未連結）。
* **上述證據使 `V10-02` 由 PLANNED 升級為 VERIFY，不是 DONE**：程式與 SQL
  本身已完成且通過可重現的 disposable rehearsal，但真實主機套用
  `migrations/025`、上傳 PHP、真實站點 end-to-end HTTP 驗證、跨 Workspace
  HTTP 負向測試（需要第二個測試帳號）仍待 owner 執行正式環境操作。

---

# 3. 版本路線

| 版本 | 主題 | 版本出口條件 |
|---|---|---|
| V0.7 | Current Beta Baseline | 現有功能與缺口完成盤點 |
| V0.8 | Release Safety | 安全、環境、部署、PHP staging 與基本 CI 可控 |
| V0.9 | Workspace Foundation | 正式資料全面 Workspace 化，跨 Workspace 測試 fail closed |
| V1.0 | Decision Intelligence Core | Signal → Evidence → Recommendation → Human Decision 可完整運作 |
| V1.1 | Execution & Operations | Task、Queue、Result、Outcome、Notification、Audit 可營運 |
| V1.2 | Production & Specification Complete | 測試、監控、文件、Pilot、備份與發布驗收完成 |

建議依賴順序：

```text
V0.8 Release Safety
    → V0.9 Workspace Foundation
        → V1.0 Decision Intelligence Core
            → V1.1 Execution & Operations
                → V1.2 Production Acceptance
```

---

# 4. V0.8 — Release Safety

目標：讓現有 Beta 能安全、可回滾地部署到 staging，建立後續開發基線。

## 工作清單

- [x] `V08-01` 整理工作樹與建立 Release baseline
  - 確認 modified、deleted、untracked 檔案歸屬。
  - 解決 README 所述外部 PHP source of truth 與目前 `backend/` 目錄的矛盾。
  - 建立可重現的 baseline commit／tag。
  - 驗收：乾淨工作樹或有明確列管的未提交檔案。
  - 證據：`docs/releases/V08-01_RELEASE_BASELINE_REPORT.md`；僅保留兩個已列管且未納入 Release 的 legacy OAuth PHP files。

- [ ] `V08-02` Secret containment 與正式環境設定
  - 輪替資料庫、OpenAI、Google/API 等可能曝露的憑證。
  - 確認秘密不在 Git、公開目錄、Wrangler vars 或前端 bundle。
  - 補齊 production secret inventory，不記錄實際值。
  - 驗收：secret scan、部署環境變數清單、輪替紀錄。
  - 本機 containment 已完成：Git/history/public payload/clean Worker bundle scan 通過；legacy mirror exposure 已列管。狀態維持 `BLOCKED_EXTERNAL_ROTATION`，證據見 `docs/security/V08-02_SECRET_CONTAINMENT_REPORT.md`。

- [x] `V08-03` Next.js → PHP Service Authentication 完整覆蓋
  - 所有正式 PHP business endpoints 驗證簽章、timestamp、nonce／重放條件。
  - PHP 不信任外部 `X-Member-*` 權限宣告。
  - 統一 JSON error contract，限制 CORS。
  - 驗收：偽造 identity header、錯誤簽章、過期簽章全部被拒絕。
  - 本機 implementation commit：`ad6f46d`；等待單次上傳智邦後執行 legacy endpoint URL 驗證。
  - 第一輪 upload 驗證通過主要 signed/negative flows；cache replay 與 OAuth state ordering hotfix 為 `538ab3e`，等待兩檔重傳驗證。
  - `538ab3e` 上傳後確認 cache header 與 OAuth state PASS；legacy replay 根因為 non-strict MySQLi 未檢查 duplicate INSERT false，已補 authenticator hotfix。
  - authenticator 與 `/v2` OAuth redirect 最終七項 PASS；sync/OAuth unsigned 401。report mailer direct-request detection 由 `ad38e96`／`581b6a7` 完成。
  - `581b6a7` 上傳後 report unsigned unique/no-cache request 回 401 JSON，確認在 dependency 與 mail side effect 前拒絕；V08-03 DONE。

- [x] `V08-04` 建立 staging／production Cloudflare 設定
  - Wrangler 定義 staging 與 production environment。
  - 分離網址、API base、secret、Worker name 與觀測設定。
  - 處理 `middleware` → `proxy` deprecation。
  - 驗收：兩個環境均能 dry-run，設定不互相污染。
  - 本機環境隔離、self binding、secret names、observability、startup 與 OpenNext build 已完成；staging／production named-environment dry-run 均 PASS。因 OpenNext 尚不支援 Node Proxy，暫時保留可部署的 Edge middleware。

- [x] `V08-05` PHP staging 驗證
  - 在實際 PHP runtime 執行所有 PHP syntax lint。
  - 驗證 Apache rewrite、`.htaccess`、environment loader 與 `/api/v1/health`。
  - 確認 PHP 7.0 相容性，列出升級 PHP 8.1+ 的決策與期限。
  - 驗收：lint、health、auth、DB connection smoke test 全部通過。
  - 依 owner 決策改用現有 pre-launch target URL-only 驗證；upload manifest 已建立，等待 V08-03 overlay 上傳後完成新版驗證。
  - 第一輪新版 URL 驗證完成並建立測試 context `v08-upload-smoke-20260717`；等待 `538ab3e` 兩檔 hotfix 上傳後收尾。
  - V08-03～V08-05 完整 URL matrix、DB mutation/readback 與 hosting-specific hotfix 均已驗證；依 owner URL-only 決策 DONE，未執行 payload-wide PHP lint。

- [x] `V08-06` 最小 CI Quality Gate
  - 自動執行 ESLint、TypeScript、Next build、OpenNext build、Wrangler dry-run。
  - 失敗時阻止發布。
  - 驗收：CI 成功與故意失敗案例各一份紀錄。
  - GitHub Actions、Release boundary、typecheck、build、OpenNext、Wrangler checks 已建立；等待 push 後首次 hosted CI evidence。
  - main commit `0811a25` 的 GitHub Actions run `29568711140` 全 step PASS；V08-06 DONE，無 deployment step。

## V0.8 出口條件

- [ ] Security P0 無未處理項目。
- [ ] Staging 可重現部署。
- [ ] PHP staging smoke test 通過。
- [ ] 有 baseline、release note 與 rollback 目標。

---

# 5. V0.9 — Workspace Foundation

目標：讓 Workspace 成為唯一 tenant、資料隔離、權限及 AI context 邊界。

## 工作清單

- [x] `V09-01` Migration runner 與 `schema_migrations` — **DONE（runner 機制已於 2026-07-21 透過 V09-07 disposable 環境實際驗證）**
  - 建立固定順序、不可重複執行及失敗停止機制。→ `backend/api/src/Migration/MigrationRunner.php`、`backend/api/bin/migrate.php` 已完成；2026-07-21 於本機 Docker MySQL 5.6 disposable 環境（真實 backup 還原）**首次被實際執行**，status／baseline／migrate／idempotent re-run／checksum-mismatch fail-closed／故意失敗 migration／併發 runner lock 全部驗證通過，詳見 `docs/releases/V09-07_MIGRATION_REHEARSAL_REPORT.md`。過程中發現並修好一個真實 bug：多語句 migration 中途失敗時，`MigrationRunner::applyOne()` 因 `mysqli::next_result()` 回傳 `false` 與「沒有更多語句」無法區分，會被誤記為成功（已修復，見報告第 5.4 節）。
  - 移除 request runtime DDL。→ DONE。`backend/sql/migrations/013_runtime_ddl_extraction.sql` 與 5 個 PHP call site no-op 化，已於真實主機確認 `dashboard_ai_logs`／`seo_pagespeed_cache` 等表存在正常。
  - 驗收：真實主機仍改用 `backend/sql/manual_apply_bookkeeping.sql` 手動套用＋人工記錄 `schema_migrations`（因無 SSH／cron，此操作方式不變）；原列為「確定無法測試」的 checksum 竄改、故意失敗 migration、併發 runner 三項情境已於 disposable 環境全部驗證通過，長期接受風險解除。Empty database rehearsal（非 mid-migration snapshot）本次未測，風險低，列為次要缺口。

- [x] `V09-02` Workspace 基礎表與既有會員 backfill — **DONE（資料完整性）／部分待驗證**
  - 驗證 `workspaces`、`workspace_members`、`workspace_settings`、legacy mapping。→ 2026-07-20 於真實 pre-launch host 執行 `postflight_workspace_backfill_invariants.sql`：`workspaces_without_owner_membership=0`、`orphaned_legacy_mappings=0`，無重複 owner membership。
  - 每個既有 owner 建立正確預設 Workspace。→ `000_preflight_inventory.sql` 的 owner 統計查詢確認 `unmapped_count=0`（2 個 product-usage candidate 全部已有 mapping）。
  - 驗收：無重複 owner、無孤兒 membership — **DONE**，證據如上。Backfill 重跑冪等性、GET 純讀的即時行為、multi-workspace membership 情境、restore 演練——這幾項**未實測**（無重複執行測試、無即時 HTTP 前後行數比對、資料量太小沒有 multi-workspace 案例）。`POST /api/v1/workspaces` 已由 `V09-06`（2026-07-21）補上前端呼叫方（`WorkspaceProvider.refresh()` 於 GET 回傳空陣列時觸發），known gap #2 已解決，惟該呼叫路徑本身尚未用真實「從未 provisioning 過的會員」實測（見 V09-06 dated note）。

- [x] `V09-03` GA Workspace ownership migration — **DONE（資料完整性）／部分待驗證**
  - `ga_connections` 先 nullable、回填、檢查，再轉成正式 constraint。→ 2026-07-20 於真實 pre-launch host 確認：`workspace_id` 欄位已加入（nullable, MUL index），9 筆 `ga_connections` 全數回填（`still_null=0`），`017_..._DEFERRED.sql`（contract）刻意不套用。
  - 驗收：所有 connection 歸屬正確 — **DONE**，`connections_with_missing_workspace=0`、`connections_mapped_to_inaccessible_workspace=0`。
  - OAuth state 竄改／重放／過期 — **DONE**（2026-07-20 用真實一次 GA 連接流程取得的 state 測試）：重放已用過的 state → `OAuth state already used` (400)；竄改簽章 → `Invalid OAuth state` (400)；過期 → `Expired OAuth state` (400)。三項全部確認。
  - 舊 API 相容性、跨 Workspace negative test（Member A 讀 Workspace B 連線）——**未實測**，跨 Workspace 測試需要第二個測試帳號/Workspace 才能做。

- [x] `V09-04` SEO／AEO／GEO／Reporting ownership migration — **DONE（資料完整性）／部分待驗證**
  - 所有 Workspace-owned tables 加入直接或不可混淆的 ownership。→ 真實 schema 盤點（preflight 14 列，與假設一致）確認 9 張根表（`seo_sites`／`seo_summary_cache`／`seo_scan_history`／`si_sites`／`si_analysis_runs`／`dashboard_ai_logs`／`dashboard_ai_plan_logs`／`seo_pagespeed_cache`／`seo_pagespeed_history`）有直接 `user_id`，比照 GA 模式做 expand（`migrations/018`）＋backfill（`migrations/019`），**2026-07-20 已於真實 pre-launch host 套用**；5 張子表（`seo_site_integrations`／`si_analysis_metrics`／`si_analysis_items`／`si_analysis_actions`／`si_analysis_side_items`）判斷為只需 join 回根表，不加欄位。Contract migration（`020_..._DEFERRED.sql`）寫好未套用。
  - 驗收：沒有以 `member_id` 作為唯一 tenant boundary 的正式資料表。→ PHP 查詢層（`si/common.php`／`si/save_common.php`／`si/generate_common.php`／`si/sites/list.php`／`si/seo/*.php`／`dashboard/ai_*.php`）已改為 `workspace_id`＋`user_id` 雙條件查詢並**已上傳真實主機**；`workspace_id` 由新增的 `hs_resolve_member_workspace_id()`（`legacy_auth.php`）在伺服器端從 `legacy_member_workspace_map` 解析，**不信任** 簽章的 `x-hs-workspace-id` header——因為盤點 Next.js BFF 呼叫端後發現，除了 `app/api/seo/pagespeed/route.ts` 會呼叫 `resolveWorkspaceContext()` 外，其餘呼叫（`lib/seo/seoApi.ts`／`lib/si/siApi.ts`／`lib/dashboardAiQuota.ts`／`dashboard/ai-compose`）都只傳 `memberId`，`lib/signedPhpFetch.ts` 的 `workspaceId: identity.workspaceId ?? identity.memberId` fallback 會把 member 自己的數字 id 簽成 workspaceId——這正是任務包禁止的「member_id === workspace_id」假設，因此不能直接信任該 header。此為已知、刻意接受的限制，非本次要解決範圍（見 `backend/sql/VERIFICATION_RUNBOOK.md` 第 4 節）。
  - **2026-07-20 postflight**（真實 pre-launch host）：9 張根表 `without_workspace`／`mapped_to_missing_workspace`／`mapped_to_inaccessible_workspace` 全部 0；孤兒 anomaly report 與 `legacy_member_workspace_map` 重複 mapping 檢查均為空結果；5 張子表 join 回根表的 `root_missing_workspace` 全部 0。`schema_migrations` 確認 9 筆（010–016、018、019）。前端 SEO 健康度頁面 smoke test：既有快取資料正常顯示、格式相容。
  - **未實測**：跨 Workspace negative test（Member A 讀 Workspace B 的 SEO/SI 資料）需要第二個測試帳號/Workspace；`si/seo/summary.php` 的「重新掃描」因主機缺少 GSC 憑證設定（既有缺口，非本次迴歸）未能驗證到 workspace_id 的完整寫入路徑，建議後續用 `si/seo/add.php` 或 Dashboard AI 端點補測。

- [x] `V09-05` Backend Workspace Authorization Policy 全面覆蓋 — **DONE（程式修復＋suspended membership 驗證）／部分待驗證**
  - Authentication、membership、role、status 每次 request 都由後端驗證。→ 盤點新架構（`public/index.php`）與全部 28 個 legacy 平鋪端點；修復 `legacy_auth.php` 的 `hs_resolve_member_workspace_id()` 補上 `workspace_members.status='active'` 檢查（原本被停權成員仍可解析出可用 workspace_id，此為影響面最廣的單一缺口，一次覆蓋所有 V09-04 legacy 端點）；修復 `ga/update_connection_status.php`／`ga/get_connections.php` 這組繞過新架構角色閘門的 shadow endpoint；補上 `ga/report/report_excel.php`／`delete_csv.php`／`check_phpspreadsheet.php`／`report_runner.php` 這四支完全無驗證的端點的簽章或共享密鑰驗證。
  - 定義 owner／admin／manager／member／viewer permission matrix。→ 新增 `backend/api/src/Workspace/WorkspacePermissions.php`（涵蓋完整 7 種角色 ENUM），收斂原本散落在 `GaIntegrationService`／`WorkflowController`／`ga/account_fetch.php`／`ga/oauth_callback.php` 四處的重複 `in_array(...)` 角色檢查為單一定義，行為與原本完全一致（`integrations.manage`＝owner/admin/manager，`workflow.mutate`＝owner/admin/manager/member）。
  - 驗收：跨 Workspace read/write 測試全部 fail closed。→ **suspended membership 測試 DONE**（2026-07-20，member_id=1/workspace_id=2 暫時停權後 SEO/GA 資料變空，復原後恢復正常）；**跨 Workspace negative test DONE**（2026-07-21，第二真實帳號 member_id=8 登入後，SEO 站點列表與 GA 連線列表皆正確顯示為空，未看到 member_id=1/workspace_id=2 的資料）。Role 邊界測試（viewer 角色被拒絕）**仍未實測**——production 目前無非 owner 角色的 membership，需手動建立測試資料，是本 task 唯一剩下的未驗證項目。
  - **已知風險、刻意不在本次修**：`ga/ga_report_list.php`／`ga_report_detail.php`／`ga_report_save.php`／`ga_report_update.php`／`data_sync.php`／`get_query.php` 與其對應的 `ga_report_schedules` 等 6 張表仍是 `member_id`-only ownership，從未被 V09-03/04 納入 workspace_id migration 範圍，需要獨立 migration 才能解決，建議另立 task（暫定 `V09-08`）。

- [x] `V09-06` Frontend Workspace Context — **DONE（程式完成＋靜態驗證）／部分待驗證**
  - Workspace selector、Server Component、BFF route、快取 key 全面對齊。→ 新增 `POST /api/workspaces` 明確 provisioning 觸發點（解決 V09-02 known gap #2），`lib/workspaceServer.ts` legacy-fallback 收斂為不再吞掉 `WORKSPACE_FORBIDDEN`（詳見上方 2026-07-21 dated note）。
  - 切換 Workspace 時不殘留前一個 Workspace 狀態。→ `DashboardWorkspace.tsx`／`DashboardTasksPage.tsx`／`seo/page.tsx`／`SiInsightPage.tsx`／`ga/page.tsx` 切換時立即清空各自 workspace-scoped local state。
  - 驗收：兩個 Workspace 來回切換資料完全隔離。→ **未實測**：需要一個從未 provisioning 過的真實會員或第二個測試 Workspace，本次沒有這兩種測試資料，與 V09-02～05 已記錄的相同缺口一致。`npm run lint`／`npx tsc --noEmit`／`npm run build` 三項 PASS；未登入時 `GET`／`POST /api/workspaces` 於本機 `npm run dev`（指向真實 pre-launch host）確認正確回傳 401，路由掛載正常。

- [x] `V09-07` Workspace migration rehearsal — **DONE（2026-07-21，owner 選方向 1，本機 Docker 完成真實 backup 演練）**
  - 使用 production-like backup 演練 preflight、migration、backfill、verify、rollback。→ 真實 pre-launch DB 匯出（`vhost125121-8.sql`，2026-07-17）還原至本機 Docker `mysql:5.6` disposable 容器（僅綁定 127.0.0.1，用完即銷毀），完整跑過 preflight／baseline／migrate／postflight／idempotent re-run，並額外演練四個 destructive 情境（含發現並修好一個 runner 真實 bug）。
  - 驗收：留下資料筆數、異常清單、耗時與 rollback 證據。→ 完整報告見 `docs/releases/V09-07_MIGRATION_REHEARSAL_REPORT.md`；rollback 以本專案 expand/backfill 設計為準，記錄的是「中途失敗後的手動復原程序」而非傳統 DDL rollback。

- [x] `V09-08` GA Reporting Workspace ownership — **VERIFY（2026-07-21，程式＋SQL 完成，disposable rehearsal 驗證通過，真實主機套用／PHP 上傳／跨 Workspace HTTP 測試待 owner 執行）**
  - 將 `ga_report_schedules`（根表，直接加 `workspace_id`）／`ga_daily_summary`／`ga_pages`／`ga_events`／`ga_traffic_sources`／`ga_conversions`（5 張子表，join 回已回填的 `ga_connections.workspace_id`，不加欄位）六張表納入 Workspace ownership。→ `backend/sql/migrations/021`（expand）／`022`（backfill）／`023_..._DEFERRED.sql`（contract，未套用）／`preflight_v09_08_ga_reporting_inventory.sql`／`postflight_v09_08_ga_reporting_workspace_backfill_invariants.sql`。
  - 修正 `ga_report_list/detail/save/update.php`／`data_sync.php`／`get_query.php` 與 `report_excel.php`／`report_mailer.php` 的 Workspace authorization（active membership＋角色權限＋workspace ownership 三重檢查），保留 legacy response compatibility。→ `ga/ownership.php` 的 `ga_require_connection_ownership()` 改為 workspace_id 比對；6 個端點與 2 個 report 匯出/寄送端點皆已修正。
  - 驗收：2026-07-21 於 disposable 本機 Docker MySQL 5.6（合成 schema，非真實主機資料）完成 expand/backfill/postflight rehearsal，含孤兒 schedule、跨 Workspace 洩漏 schedule、懸空子表列三種刻意情境，結果全部符合預期，backfill 冪等、expand 重跑正確 fail closed。PHP lint（本機 PHP 8.3）全部 9 個檔案通過。真實主機套用、PHP 上傳、cross-workspace read/write/export negative test、真實報表 smoke test **尚未執行**，需要 owner 於 phpMyAdmin/FTP 操作與第二個測試帳號；詳見 `docs/task-packets/V09-08_GA_REPORTING_WORKSPACE_OWNERSHIP.md` 執行紀錄。

## V0.9 出口條件

- [ ] 所有正式 Business API 都有 Workspace authorization。（V09-05 已覆蓋盤點到的 28 個端點；`ga_report_*`／`data_sync.php`／`get_query.php` 由 `V09-08` 補齊，程式已完成，待真實主機上傳與驗證後才能勾選）
- [ ] 所有正式 Business Record 都有可靠 Workspace ownership。（`ga_report_schedules` 等 6 張表由 `V09-08` 補齊，migration 已完成並通過 disposable rehearsal，待真實主機套用與 postflight 確認後才能勾選）
- [ ] Cross-tenant integration tests 通過。（GA／SEO/SI 已用 `member_id=8` 驗證一組；role 邊界測試與其餘模組仍待第二個測試帳號／測試 membership）
- [x] Migration／rollback 演練通過。→ `V09-07`，2026-07-21，見 `docs/releases/V09-07_MIGRATION_REHEARSAL_REPORT.md`。

---

# 6. V1.0 — Decision Intelligence Core

目標：完成 V1 核心的 Human-in-the-loop 決策閉環。

## 工作清單

- [x] `V10-01` Signal persistence、Service 與 API — **VERIFY（2026-07-21，程式＋SQL 完成，disposable rehearsal 驗證通過，真實主機套用待 owner 執行）**
  - Signal 類型、severity、status、source、detected_at，`priority` 刻意不建獨立欄位（留給 `V10-04` 一起算，見任務包執行紀錄）。→ `backend/sql/migrations/024_signal_persistence.sql`（全新表，正式 NOT NULL FK，非 nullable backfill）。
  - 去重、狀態歷程與 Workspace ownership。→ `backend/api/src/Signal/`（Repository/Service/Controller）＋`Signal/Detector/SeoTechnicalIssueDetector.php`；狀態歷程重用既有 `audit_logs`（未建獨立表）；resolved 會重開、dismissed 不會自動重開的規則已在 disposable rehearsal 驗證通過。
  - 驗收：GA 或 SEO 至少一種真實資料可產生可追溯 Signal。→ SEO 技術問題差異偵測已接上 `si/seo/summary.php`，disposable rehearsal 以合成資料證明新增/修復/去重/重開四種情境皆正確；真實 SEO 站點的 end-to-end HTTP 驗證待真實主機套用 migration 後執行，詳見 `docs/task-packets/V10-01_SIGNAL_PERSISTENCE.md`。

- [x] `V10-02` Evidence persistence 與 traceability — **VERIFY（2026-07-21，程式＋SQL 完成，disposable rehearsal 驗證通過，真實主機套用待 owner 執行）**
  - Evidence、Signal-Evidence Link、source reference、observation window。→ `backend/sql/migrations/025_evidence_persistence.sql`（`evidence_items`／`signal_evidence_links`，正式 NOT NULL FK）；snapshot（非 reference）＋content-hash dedup 設計，詳見任務包執行紀錄。
  - 驗收：每個正式 Signal 與 Recommendation 可追到原始資料或快照。→ SEO 技術問題 Evidence 記錄已接上 `si/seo/summary.php`，disposable rehearsal 證明 dedup、內容變更保留舊 snapshot、來源列刪除後 Evidence 仍可驗證、跨 Workspace 隔離、Signal→Evidence 100% 可追溯；真實站點 end-to-end HTTP 驗證待真實主機套用 migration 後執行，詳見 `docs/task-packets/V10-02_EVIDENCE_TRACEABILITY.md`。

- [x] `V10-03` Explanation 與 Business Impact 分離 — **VERIFY（2026-07-21，程式＋SQL 完成，disposable rehearsal 驗證通過，真實主機套用待 owner 執行）**
  - AI Explanation 不冒充 Evidence；Impact 有明確依據與不確定性。→ `backend/sql/migrations/026_signal_analysis_persistence.sql`（`signal_analyses`，正式 NOT NULL FK）；**規則式生成**（非外部 AI 呼叫，理由見任務包執行紀錄），`evidence_ids_json` 引用而非覆寫 Evidence。
  - 驗收：API contract 與 UI 均分開顯示。→ `ExplanationService::normalize()` 輸出 `explanation`／`business_impact` 分開物件；`seo/page.tsx` 新增可展開區塊分三區視覺呈現 Evidence／Explanation／Business Impact。disposable rehearsal 證明 idempotency（同 Evidence 組合不重複產生版本）、fail-closed（無 Evidence 時內容全為 null/unknown）、跨 Workspace 隔離；詳見 `docs/task-packets/V10-03_EXPLANATION_BUSINESS_IMPACT.md`。

- [x] `V10-04` Recommendation 正式化 — **VERIFY（2026-07-21，程式＋SQL 完成，disposable rehearsal 驗證通過，真實主機套用待 owner 執行）**
  - 持久化、優先度、來源、模型／規則版本、狀態與版本更新。→ `backend/sql/migrations/027_recommendation_formalization_expand.sql`（既有 `recommendations` 表 nullable expand，非破壞性）；`seo:{siteId}:{issueType}` context_key 正式化為 Signal-backed（`generator_type=backend_rule`），其餘 5 種 onboarding-style context_key 完全保留 legacy 行為。
  - 驗收：Recommendation 可重現、可審查、不可因重新整理消失。→ disposable rehearsal 證明：前端偽造內容被忽略、idempotent 重跑不遞增 revision、跨 Workspace 偽造 site_id 安全 fallback 不外洩資料、Signal resolved 後自動 archive（過程中發現並修好一個真實 bug：archive 狀態曾被同一 request 內的 recordDecision() 蓋掉，已修正並重新驗證通過）；詳見 `docs/task-packets/V10-04_RECOMMENDATION_FORMALIZATION.md`。

- [x] `V10-05` Human Review／Decision 正式化 — **VERIFY（2026-07-21，程式＋SQL 完成，disposable rehearsal 驗證通過，真實主機套用待 owner 執行）**
  - accept／reject／skip／defer／modified／needs_more_evidence、reason、actor、timestamp、history。→ `backend/sql/migrations/028_decision_formalization_expand.sql`（既有 `decisions` 表 nullable/opt-in expand，非破壞性，`accepted`/`skipped` 語意完全保留）；新增 `recommendation_revision`／`expected_outcome`／`idempotency_key`。append-only 歷史（`recordDecision()` 恆 INSERT）為既有設計，本次未變動。
  - 權限、交易與 idempotency。→ `WorkflowController` 沿用既有 `workflow.mutate` 權限矩陣（viewer 等角色仍拒絕）；`WorkflowService::mutate()` 單一交易包住 Recommendation 儲存＋Decision 寫入＋動作邏輯＋audit log；`idempotency_key` 命中時直接回傳既有 Decision，不重複寫入。
  - 驗收：Decision 不只存在前端 session，重複提交不產生重複紀錄。→ disposable rehearsal（45 項斷言全數通過）證明：六種 outcome 皆正確記錄且對應 `recommendations.status`；無效 decision 值使整筆 mutate() rollback（0 筆半套 Recommendation）；同一 idempotency_key 重複提交（含刻意不同的 decision/reason）只產生 1 筆記錄；append-only 歷史正確（第二次決策為新增而非覆寫）；跨 Workspace 隔離；viewer 角色被拒；`recordDecision()` 本身的交易原子性以手動 rollback 驗證兩個寫入一起復原；詳見 `docs/task-packets/V10-05_HUMAN_REVIEW_DECISION.md` 與 `backend/sql/VERIFICATION_RUNBOOK.md` 第 10 節。

- [x] `V10-06` Decision-first Dashboard — **VERIFY（2026-07-21，程式完成，disposable rehearsal＋typecheck/lint/build 通過，真實瀏覽器登入互動驗證待 owner 執行）**
  - Today's Signals → Evidence → Explanation → Impact → Recommendation → Review。→ 新增 `components/dashboard/TodaySignals.tsx`，掛載於 `DashboardWorkspace.tsx`；`WorkflowService.php` 新增 `signal_id` 直查路徑與 `refresh_recommendation` 動作（重用既有 formalization 邏輯，未新增業務規則）讓任何 Signal 皆可在決策前先顯示正式 Recommendation 內容。
  - GA／SI 模組保留為 Evidence drill-down。→ `ga/page.tsx`／`seo/page.tsx` 未修改。
  - 驗收：使用者可在單一流程完成理解與正式決策。→ disposable rehearsal（12 項斷言）證明 signal_id 解析、formalization 不落入半套 Decision/Task、idempotent 重跑、跨 Workspace 偽造 fallback 安全、另一租戶正常路徑、refresh 與 save_decision 正確組合；前端 `AbortController` 保證 Workspace 快速切換不殘留 late response；真實瀏覽器登入互動驗證需要正式後端憑證，待 owner 執行，詳見 `docs/task-packets/V10-06_DECISION_FIRST_DASHBOARD.md` 與 `backend/sql/VERIFICATION_RUNBOOK.md` 第 11 節。

- [x] `V10-07` GA／SEO／AEO／GEO Adapter 對齊 — **VERIFY（2026-07-21，GA/SEO vertical slice 程式完成，disposable rehearsal 通過；AEO/GEO 明確 deferred gap；真實主機驗證待 owner 執行）**
  - 既有能力透過 Service／Repository 接到 Workspace、Signal、Evidence。→ `SignalService::applyDetectionPlan()` 收斂為 SEO/GA 共用的單一 upsert/resolve/audit 邏輯；新增 `GaTrafficAnomalyDetector`（流量下滑規則）＋ `EvidenceService::recordGaTrafficAnomalyEvidence()`，接到 `ga/data_sync.php`。
  - 保持 legacy response compatibility。→ `data_sync.php` 的 HTML console 輸出格式未變；新邏輯 try/catch 保護，失敗不影響原本回應。
  - 驗收：至少 GA 與 SEO 兩條 vertical slice 通過。→ disposable rehearsal（22 項斷言）證明 GA 偵測生命週期（建立/bump/resolve/reopen）、跨 Workspace 隔離、Evidence dedup/連結皆正確，且 SEO 路徑經 `applyDetectionPlan()` 重構後回歸測試仍正確；AEO/GEO 因缺少 scan-history 等價持久化層，明確記錄為後續任務（非假裝完成），詳見 `docs/task-packets/V10-07_DOMAIN_ADAPTER_ALIGNMENT.md` 與 `backend/sql/VERIFICATION_RUNBOOK.md` 第 12 節。

- [x] `V10-08` Core E2E 驗收 — **VERIFY（2026-07-21，disposable rehearsal 全鏈路通過，真實主機執行待 owner，V1.0 milestone 不轉 DONE）**
  - 使用真實 Workspace 執行 Data Source → Signal → Evidence → Recommendation → Decision。→ disposable Docker 串接 SEO＋GA 兩條完整 golden path，33 項斷言全數通過（含跨 Workspace、角色權限、全鏈路 idempotency、fail-closed 傳遞、自動 resolve/archive）；過程中發現並修復 `RuleBasedAnalysisGenerator` 的真實跨來源缺陷（impact_area 曾寫死為 seo，GA Signal 會誤報）。真實 Workspace／真實資料執行仍待 owner 於正式主機進行，這是唯一剩餘缺口。
  - 驗收：資料、權限、audit 及 audit 及 UI 全部可追溯。→ Decision→Recommendation→Signal→Evidence 全鏈路可 join、`actor_member_id` 恆為真實簽章身分（程式碼檢視確認 SignalService/EvidenceService/ExplanationService 皆不建立 Decision）；詳見 `docs/releases/V10-08_CORE_E2E_ACCEPTANCE_REPORT.md`。

## V1.0 出口條件

- [ ] 核心決策流程可由真實資料驅動。**BLOCKED**——disposable rehearsal 已證明程式鏈路正確（33/33 assertions，見 `docs/releases/V10-08_CORE_E2E_ACCEPTANCE_REPORT.md`），但真實 Workspace／真實資料執行需 owner 於正式主機進行，尚未執行。
- [x] AI 不代替 Human 做正式 Decision — 程式碼檢視＋disposable rehearsal 確認 `decisions.actor_member_id` 恆為簽章請求的真實 member，無系統/AI 觸發路徑。
- [x] Signal、Evidence、Recommendation、Decision 均已持久化與隔離（rehearsal 層級，真實主機套用待 owner）。

---

# 7. V1.1 — Execution & Operations

目標：讓正式 Decision 能執行、追蹤、通知並衡量結果。

## 工作清單

- [ ] `V11-01` Action／Manual Task lifecycle
  - 負責人、期限、status、steps、history、permission。

- [ ] `V11-02` MySQL Queue Worker reliability
  - claim、lock、retry、backoff、timeout、idempotency、dead-letter、stuck recovery。

- [ ] `V11-03` Execution Result
  - 記錄執行內容、狀態、輸出、錯誤與完成時間。

- [ ] `V11-04` Business Outcome
  - baseline、measurement window、outcome metrics、status。

- [ ] `V11-05` Evaluation／Feedback
  - Recommendation 有效性、人工回饋、結果評估；不實作 Autonomous Learning。

- [ ] `V11-06` Notification
  - Domain Event 驅動、偏好、delivery attempt、retry、去重。

- [ ] `V11-07` Audit Log 完整覆蓋
  - Security-sensitive mutation、AI mutation、Decision、Task、Integration。
  - 一般使用者不可修改 Audit Log。

- [ ] `V11-08` Retention、cleanup 與 backup jobs
  - 依資料類別執行保留、刪除、備份及還原。

## V1.1 出口條件

- [ ] Decision → Action → Result → Outcome → Feedback 可完整運作。
- [ ] Queue failure 可復原且不重複執行。
- [ ] Notification 與 Audit 可供營運追蹤。

---

# 8. V1.2 — Production & Specification Complete

目標：通過正式產品、技術規格與營運驗收。

## 工作清單

- [ ] `V12-01` Registration／Onboarding BFF 重整
  - Browser 不直接呼叫 legacy register endpoint。
  - User、Workspace、Membership 建立具交易或補償機制。
  - Email verification、forgot password、錯誤恢復。

- [ ] `V12-02` Automated Test Suite
  - Unit、API integration、migration、authorization、queue、critical E2E。
  - 最低必要情境包含 JWT、signature、cross-workspace、Decision、rollback。

- [ ] `V12-03` Release CI/CD
  - Frontend、PHP、migration 有明確發布順序與阻擋條件。
  - staging approval、production deploy、version tag、rollback。

- [ ] `V12-04` Observability 與 incident readiness
  - Worker／PHP error、API latency、queue backlog、AI cost/quota、email failure、uptime alert。
  - Runbook、owner、告警門檻與事故紀錄方式。

- [ ] `V12-05` Performance／Security／Privacy release audit
  - Core Web Vitals、API timeout、rate limit、dependency／secret scan。
  - Privacy、data deletion、retention、backup restore 驗證。

- [ ] `V12-06` 文件與實作對齊
  - API、Database、Backend、Infrastructure、Frontend、ADR 與實際程式一致。
  - 移除重複、過時或互相衝突的文件。

- [ ] `V12-07` Pilot validation
  - 3–5 個真實 Workspace 完成 onboarding 到 Business Outcome。
  - 收集失敗點、完成率、使用者回饋與營運問題。

- [ ] `V12-08` Final acceptance 與正式發布
  - Security、migration、domain、operations、backup、rollback checklist 全部簽核。
  - 建立 V1.2 release note、tag、部署證據與已知限制。
  - **2026-07-21 owner 決定**：V1.2 全部任務完成後，以完整換版取代目前正式站，
    不在此之前逐一修復現有正式站上的既有問題（owner 已知現有正式站有未指明
    的錯誤，決定擱置、留到換版時一次解決，不插隊）。換版同時把 PHP 後端路徑
    從 `https://www.highlight.url.tw/highlightsignal/v2` 改為同網域、拿掉
    `v2` 區段的較短路徑（例如 `https://www.highlight.url.tw/highlightsignal/`，
    確切路徑待 V12-08 執行時定案）。此變更需要同步更新：
    `NEXT_PUBLIC_HIGHLIGHT_PHP_API_BASE_URL`／`NEXT_PUBLIC_BASE_URL`
    （`backend/private/frontend.env`）、智邦主機上的實際目錄結構（FTP 搬移，
    非 code 變更）、以及 Google Cloud Console 註冊的 GA OAuth
    `GOOGLE_OAUTH_REDIRECT_URI`（網址變了舊的 redirect URI 會失效，GA 連線
    功能需要重新走一次 OAuth 授權）。這是 V12-08 執行時才動作的項目，不是
    現在的任務；記錄於此避免後續任務忘記這個已定案的换版範圍。

## V1.2 出口條件

- [ ] Technical Specification Alignment v1.2 的固定決策全部成立。
- [ ] 無 P0／P1 未處理上線阻擋。
- [ ] Pilot、備份還原、rollback、staging promotion 全部通過。
- [ ] Production monitoring 與 owner 已就緒。
- [ ] 正式 Release 可重現、可觀測、可回滾。

---

# 9. Acquisition／Public Snapshot 獨立 Track

此 Track 用於增加客群，不計入 V1.2 Core 完成條件；預設在 V1.0 Core 穩定後開始。

- [ ] `ACQ-01` ICP、價值主張、成功指標與成本上限定義
- [ ] `ACQ-02` Anonymous Acquisition Domain 與 Queue scope 衝突解決
- [ ] `ACQ-03` Public Snapshot、SSRF protection、Turnstile、rate limit
- [ ] `ACQ-04` Public report token、有限內容、expiration、noindex
- [ ] `ACQ-05` Lead claim、email verification、acquisition events
- [ ] `ACQ-06` Lead → User → Workspace conversion
- [ ] `ACQ-07` Trial lifecycle、limits、notification、conversion measurement
- [ ] `ACQ-08` 轉換漏斗驗證與是否擴大投放的決策

注意：目前 `queue_jobs.workspace_id` 為必填，與匿名 Snapshot 不建立 Workspace 的原則衝突。開始 `ACQ-02` 前必須先決定 acquisition job scope model，禁止使用假 Workspace 污染 tenant boundary。

---

# 10. 新執行對話的任務格式

每個新對話建議直接貼上：

```text
請執行 Highlight Signal Roadmap Task：<Task ID>

專案：D:\7.Highlight\1.Project\5.web\highlightsignal
進度文件：docs/00_V07_TO_V12_PROGRESS_TRACKER.md

請先讀進度文件、Technical Specification Alignment v1.2，以及本 Task 直接相依的程式與文件。
完成實作、測試與必要文件更新，但不要擴張到其他 Task。

完成後請回報：
1. Task ID 與狀態
2. 修改檔案
3. 完成內容
4. 驗證指令與結果
5. Migration／部署影響
6. 風險或未完成項目
7. Commit hash（若有）
```

---

# 11. 回報主追蹤對話的格式

```text
Task ID：
執行對話：
狀態：DONE / VERIFY / BLOCKED
修改摘要：
驗證結果：
Commit：
Migration／部署影響：
已知風險：
下一個建議 Task：
```

主追蹤對話收到回報後應：

1. 核對程式碼、Git diff 與驗證證據。
2. 將 Task 更新為 `VERIFY` 或 `DONE`。
3. 更新版本出口條件與整體完成度。
4. 指定下一個不衝突的 Task ID。
5. 記錄新發現的阻擋或技術債。

---

# 12. 第一批建議執行順序

1. `V08-01` 整理工作樹與 Release baseline
2. `V08-02` Secret containment
3. `V08-03` Service Authentication 完整覆蓋
4. `V08-04` staging／production 設定
5. `V08-05` PHP staging 驗證
6. `V08-06` 最小 CI Quality Gate
7. 通過 V0.8 Gate 後，再開始 `V09-01`

同一時間避免多人同時修改 Authentication、Workspace schema 與 Migration；這三者必須依序整合。
