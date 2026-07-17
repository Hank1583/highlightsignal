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
| Last sync | 2026-07-17 |
| Active milestone | V0.8 — Release Safety |
| Active task | `V08-02` BLOCKED_EXTERNAL_ROTATION；`V08-03`～`V08-06` DONE |
| Next task | `V09-01` Migration Runner；Cloudflare deployment 依 owner 決策延後至 V1.2 完整驗收後 |
| Blocking issue | 舊 OAuth secret 與其他 V08-02 credentials 仍列為可能曝露；PHP 7.0／URL-only lint 為接受風險；report delivery config 未配置 |
| Last verified commit | `0811a25`；GitHub Actions run `29568711140` 全部 PASS |

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
migration、CI、驗收與風險清單完成後。V0.8～V1.1 期間只允許本機 build、
OpenNext build、Wrangler `--dry-run`、GitHub CI 與既有智邦 pre-launch target 的
URL 驗證；不得因單一 milestone 通過而執行 Cloudflare production deployment。

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

- [ ] `V09-01` Migration runner 與 `schema_migrations`
  - 建立固定順序、不可重複執行及失敗停止機制。
  - 移除 request runtime DDL。
  - 驗收：空資料庫及既有資料庫均可執行，重跑不破壞資料。

- [ ] `V09-02` Workspace 基礎表與既有會員 backfill
  - 驗證 `workspaces`、`workspace_members`、`workspace_settings`、legacy mapping。
  - 每個既有 owner 建立正確預設 Workspace。
  - 驗收：無重複 owner、無孤兒 membership、rollback 可行。

- [ ] `V09-03` GA Workspace ownership migration
  - `ga_connections` 先 nullable、回填、檢查，再轉成正式 constraint。
  - 驗收：所有 connection 歸屬正確且舊 API 相容。

- [ ] `V09-04` SEO／AEO／GEO／Reporting ownership migration
  - 所有 Workspace-owned tables 加入直接或不可混淆的 ownership。
  - 驗收：沒有以 `member_id` 作為唯一 tenant boundary 的正式資料表。

- [ ] `V09-05` Backend Workspace Authorization Policy 全面覆蓋
  - Authentication、membership、role、status 每次 request 都由後端驗證。
  - 定義 owner／admin／member／viewer permission matrix。
  - 驗收：跨 Workspace read/write 測試全部 fail closed。

- [ ] `V09-06` Frontend Workspace Context
  - Workspace selector、Server Component、BFF route、快取 key 全面對齊。
  - 切換 Workspace 時不殘留前一個 Workspace 狀態。
  - 驗收：兩個 Workspace 來回切換資料完全隔離。

- [ ] `V09-07` Workspace migration rehearsal
  - 使用 production-like backup 演練 preflight、migration、backfill、verify、rollback。
  - 驗收：留下資料筆數、異常清單、耗時與 rollback 證據。

## V0.9 出口條件

- [ ] 所有正式 Business API 都有 Workspace authorization。
- [ ] 所有正式 Business Record 都有可靠 Workspace ownership。
- [ ] Cross-tenant integration tests 通過。
- [ ] Migration／rollback 演練通過。

---

# 6. V1.0 — Decision Intelligence Core

目標：完成 V1 核心的 Human-in-the-loop 決策閉環。

## 工作清單

- [ ] `V10-01` Signal persistence、Service 與 API
  - Signal 類型、severity、priority、status、source、detected_at。
  - 去重、狀態歷程與 Workspace ownership。
  - 驗收：GA 或 SEO 至少一種真實資料可產生可追溯 Signal。

- [ ] `V10-02` Evidence persistence 與 traceability
  - Evidence、Signal-Evidence Link、source reference、observation window。
  - 驗收：每個正式 Signal 與 Recommendation 可追到原始資料或快照。

- [ ] `V10-03` Explanation 與 Business Impact 分離
  - AI Explanation 不冒充 Evidence；Impact 有明確依據與不確定性。
  - 驗收：API contract 與 UI 均分開顯示。

- [ ] `V10-04` Recommendation 正式化
  - 持久化、優先度、來源、模型／規則版本、狀態與版本更新。
  - 驗收：Recommendation 可重現、可審查、不可因重新整理消失。

- [ ] `V10-05` Human Review／Decision 正式化
  - accept／reject／skip／defer、reason、actor、timestamp、history。
  - 權限、交易與 idempotency。
  - 驗收：Decision 不只存在前端 session，重複提交不產生重複紀錄。

- [ ] `V10-06` Decision-first Dashboard
  - Today's Signals → Evidence → Explanation → Impact → Recommendation → Review。
  - GA／SI 模組保留為 Evidence drill-down。
  - 驗收：使用者可在單一流程完成理解與正式決策。

- [ ] `V10-07` GA／SEO／AEO／GEO Adapter 對齊
  - 既有能力透過 Service／Repository 接到 Workspace、Signal、Evidence。
  - 保持 legacy response compatibility。
  - 驗收：至少 GA 與 SEO 兩條 vertical slice 通過。

- [ ] `V10-08` Core E2E 驗收
  - 使用真實 Workspace 執行 Data Source → Signal → Evidence → Recommendation → Decision。
  - 驗收：資料、權限、audit 及 UI 全部可追溯。

## V1.0 出口條件

- [ ] 核心決策流程可由真實資料驅動。
- [ ] AI 不代替 Human 做正式 Decision。
- [ ] Signal、Evidence、Recommendation、Decision 均已持久化與隔離。

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
