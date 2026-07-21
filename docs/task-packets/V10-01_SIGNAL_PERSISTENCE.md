# Task Packet — V10-01 Signal Persistence, Service & API

Status: VERIFY（程式與 SQL 完成，2026-07-21 於 disposable 本機 Docker MySQL 5.6＋PHP CLI harness 驗證去重/resolve/reopen/權限邏輯；尚未套用至真實主機，尚未上傳 PHP，尚未以真實 SEO 站點跑過真正的 end-to-end HTTP 流程）
Milestone: V1.0 Decision Intelligence Core
Dependency: V0.9 Workspace Foundation（`V09-01`～`V09-07` DONE；`V09-08`
仍需在 V1.0 milestone 驗收前關閉，但本 task 建議的 SEO vertical slice 不依賴
GA reporting migration，可獨立執行）
Tracker: `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`（第 6 節）
Authority: `docs/00_Technical_Specification_Alignment_v1.2.md`（第 6/7/8 節 —
Signal Domain 定義、Module Boundary、Database Alignment）

---

# Objective

建立 Signal 這個目前完全不存在的 Domain：可持久化、可去重、有狀態歷程、有
Workspace ownership，並至少讓一種真實資料來源（GA 或 SEO）能產生一筆可追溯
的真實 Signal——不是 mock 資料，也不是前端硬寫的規則字串。

# Why this task exists (read before writing any code)

Spec（`00_Technical_Specification_Alignment_v1.2.md` 第 4 節 Unified V1 Domain
Flow）要求：

```text
Raw Observation / Metric → Signal → Evidence → Explanation + Business Impact
→ Recommendation → Human Review → Decision → Action → ...
```

Signal 回答「發生了什麼？」，必須與一般 Metric 及正式 Decision 明確分開
（spec 第 6 節）。這是整條 Decision-first Flow 的第一個持久化節點，也是目前
完全空白的一環。

# Mandatory context before starting

1. `docs/00_Technical_Specification_Alignment_v1.2.md` 全文，至少第 4、6、7、
   8、13 節（Domain Flow、Domain Responsibilities、Module Boundaries、
   Database Alignment、V1 Scope）。
2. **現有的「假 Recommendation」實作，已存在但沒有 Signal／Evidence 支撐**：
   - `backend/sql/migrations/011_dashboard_decision_workflow.sql`（`012` 也要看）
     已經建立 `recommendations`／`decisions`／`tasks`／`task_steps`／
     `business_outcomes` 五張表，`recommendations` 用
     `(workspace_id, context_key)` 當唯一鍵。
   - `backend/api/src/Dashboard/WorkflowController.php`／`WorkflowService.php`／
     `WorkflowRepository.php` 是目前唯一在用這五張表的程式碼，被
     `DashboardWorkspace.tsx`／`DashboardTasksPage.tsx`／`seo/page.tsx` 呼叫。
   - **關鍵問題**：目前的「Recommendation」完全沒有 Signal 或 Evidence 佐證
     ——`context_key`（例如 `"dashboard:overview"`、
     `"seo:4:MISSING_META_DESCRIPTION"`）與 `title`/`description` 都是**前端
     JS 用硬寫規則現場算出來**（`buildDefaultRecommendation()` in
     `components/dashboard/DashboardWorkspace.tsx`），呼叫 API 時當參數傳過去
     存檔，後端只是原封不動存起來，從未驗證它是否對應任何真實偵測到的變化。
   - `recommendations` 表目前**沒有** spec 要求的 `priority`／`confidence`／
     `expected_impact`／`reason`／`signal_id` 欄位（只有
     `source VARCHAR(50) DEFAULT 'dashboard'`，未真正使用）。這是預期中的
     schema 落差——formalize `recommendations` 是 `V10-04` 的工作，**不是**
     `V10-01` 的範圍，但 `V10-01` 設計 `signals` 表時要預留未來被
     `recommendations.signal_id` 引用的乾淨介面（nullable FK，`V10-04` 再接）。
3. **可以拿來偵測 Signal 的真實既有資料**（V10-01 至少要接上其中一種）：
   - GA：`ga_daily_summary`（`connection_id, date, sessions, users, new_users,
     pageviews, events, avg_session_duration, bounce_rate`）、
     `ga_conversions`。目前 `lib/ga/gaApi.ts` / `dashboard/page.tsx` 只做
     30 天加總與前後半段成長率比較（`growthPack`），從未持久化「這次流量
     下滑算不算一個事件」的判斷。
   - SEO：`seo_scan_history`（`site_id, health_score, issue_count,
     issues_json, summary_json, scanned_at`）——**每筆 `summary_json` 已經
     內建 `comparison.issues.added_items`／`fixed_items`**（比對本次與上次
     掃描的技術問題差異），這是全專案唯一已經半成品「事件偵測」的地方
     （在 `si/seo/summary.php` 內即時計算，從未存成一筆可查詢、可追溯的
     Signal 記錄，重新整理頁面就等於重算一次，舊的比較結果不會留下痕跡）。
   - **建議 V10-01 的第一個真實偵測規則**：SEO 技術問題新增／修復
     （讀 `seo_scan_history` 前後兩筆 `issues_json` 的差異）比 GA 流量下滑
     更適合當第一個真實案例——資料已經結構化（`type`／`severity`／`url`），
     不需要自己定義「下滑多少算異常」這種需要業務判斷的門檻。GA 流量偵測
     可以留給後續 task 或本 task 的第二個規則（視執行時間決定，非阻擋項）。
4. `backend/api/src/Workspace/WorkspacePermissions.php`（角色矩陣）、
   `backend/api/src/Workspace/WorkspaceAccessPolicy.php`（membership gate）
   ——Signal 的 read／list API 要走一樣的 `requireActiveMembership()` 模式，
   不得另外發明一套授權檢查。
5. `backend/api/public/index.php` 現有路由註冊方式（`$router->add(...)`），
   新的 `/api/v1/workspaces/{workspaceId}/signals` 系列路由要照同樣模式加入，
   不要繞過 `WorkspaceAccessPolicy`。

# Critical operational constraints（沿用 V08～V09 全部）

* 主機（智邦生活館 虛擬主機）沒有 SSH／cron；任何新 migration 一樣要走
  `backend/sql/manual_apply_bookkeeping.sql` 手動套用流程，不能假設
  `bin/migrate.php` 能在真實主機上跑（雖然 `V09-07` 已經證明這支 runner
  本身邏輯正確，那是在本機 Docker 環境驗證的，不代表主機能跑它）。
* PHP 執行環境目標仍是 7.0.26 相容（`backend/sql/VERIFICATION_RUNBOOK.md`
  與 tracker 的既有風險）；不要用 PHP 7.1+ 才有的語法。
* 前端一樣禁止 push／merge 到 `main`（Cloudflare 自動部署），用
  `codex/v09-roadmap` 或新分支工作。
* `npm run dev` 之前壞過的 NODE_OPTIONS 問題已用 `scripts/dev.mjs` 解決，
  遇到同樣錯誤不用重查。

# Required work

1. **新增 `signals` table**（新 migration，版本號接續 `019` 之後，例如
   `021_signal_persistence.sql`——`020` 已被
   `020_seo_si_dashboard_workspace_contract_DEFERRED.sql` 佔用且刻意不放進
   `migrations/`，下一個可用編號是 `021`）：
   * `id`／`public_id`（比照既有表的 `BIGINT` + `CHAR(36) UUID` 慣例）。
   * `workspace_id BIGINT UNSIGNED NOT NULL`，FK 到 `workspaces(id)`（這是
     全新表，直接建立正式 FK，不需要像 Workspace migration 那樣先 nullable
     expand——**沒有既存資料要相容**）。
   * `type VARCHAR(100)`（例如 `seo.technical_issue.new`、
     `seo.technical_issue.resolved`、未來 `ga.sessions.drop`）。
   * `severity ENUM('critical','high','medium','low','info')`。
   * `priority` 或直接沿用 `severity` 排序（決定要不要獨立欄位，寫 packet
     時先提出兩個選項讓 owner/後續執行對話決定，不要自己定案：(a) 只用
     `severity` 排序，`priority` 留給 `V10-04` Recommendation 階段再算；
     (b) Signal 自己也存一個數值 `priority`，方便將來多個 Signal 排序。
     **建議選 (a)**——避免這張表還沒接上真正的 Recommendation 排序邏輯就
     先猜一個 priority 公式）。
   * `status ENUM('new','acknowledged','resolved','dismissed')`
     `DEFAULT 'new'`。
   * `source VARCHAR(50)`（`'seo'`／`'ga'`／未來其他）、
     `source_ref_type VARCHAR(50)` NULL、`source_ref_id BIGINT UNSIGNED` NULL
     （例如 `source_ref_type='seo_site'`, `source_ref_id=<seo_sites.id>`——
     這是給 `V10-02` Evidence 之後要做的正式 Signal–Evidence Link 用的過渡
     指標，`V10-01` 不建立正式 Evidence 表，只確保這裡有東西可以被將來的
     Evidence 記錄引用回來，不是叫 `V10-01` 自己做完整 traceability）。
   * `dedup_key VARCHAR(191)`，`UNIQUE KEY (workspace_id, dedup_key)`——
     去重的核心欄位，見下方「去重規則」。
   * `title VARCHAR(255)`、`summary TEXT NULL`（人類可讀描述，來自偵測規則
     本身產生的固定文字模板，不是 AI 生成——AI Explanation 是 `V10-03` 的
     範圍，`V10-01` 的 Signal 本身不含 AI 解讀）。
   * `detected_at DATETIME`（第一次偵測到的時間）、
     `last_seen_at DATETIME`（最近一次重複偵測到的時間）、
     `occurrence_count INT UNSIGNED DEFAULT 1`。
   * `created_at`／`updated_at`（標準慣例）。
   * Index：`(workspace_id, status, detected_at)`、
     `(workspace_id, source, source_ref_type, source_ref_id)`。
2. **去重規則（dedup）**：`dedup_key` 由偵測規則自己算出一個穩定字串（例如
   SEO 技術問題可以是
   `sha256("seo_issue:{site_id}:{issue_type}:{url}")` 的前綴，不含時間戳），
   確保同一個底層問題重複偵測時是 `INSERT ... ON DUPLICATE KEY UPDATE
   last_seen_at=..., occurrence_count=occurrence_count+1`，不是新增一筆。
   狀態轉為 `resolved` 的規則：偵測規則跑過一輪後，若上次還存在、這次已經
   不在真實資料裡的同一個 `dedup_key`，該做的是把它的 `status` 更新為
   `resolved`（不是刪除，Signal 是可追溯記錄）。
3. **狀態歷程（history）**：**建議重用既有 `audit_logs` 表**（已存在、
   workspace-scoped、append-only設計），而不是另建一張
   `signal_status_history` 表——理由：`decisions`/Workflow 系統本身也沒有
   獨立 history 表，是靠 `WorkflowService::audit()` 寫進 `audit_logs`
   （`entity_type='RecommendationWorkflow'`）達成可追溯；Signal 的狀態轉換
   （`new → acknowledged → resolved/dismissed`）比照同一模式寫
   `entity_type='Signal'`, `entity_id=<signals.public_id>`。這樣不會違反
   spec 第 15 節「不建立內容重複的 Domain 文件／表」的精神。**這是設計提案，
   不是定案**——如果執行時發現 `audit_logs` 的欄位（`event_type` 是自由格式
   字串）不足以支撐之後 Signal 列表要顯示「狀態變化了幾次」這種查詢，再回頭
   評估是否需要獨立表，並在 tracker 記錄理由。
4. **Service／Repository／Controller**（比照 `WorkspaceProvisioningService`／
   `WorkflowController` 現有分層慣例，不要發明新的分層方式）：
   * `SignalRepository`：`upsertByDedupKey()`、`listForWorkspace()`
     （分頁、依 `status`／`severity` 過濾）、`markResolved()`、
     `updateStatus()`（human 手動 acknowledge/dismiss，非偵測規則觸發）。
   * `SignalService`：包裝 repository，處理 dedup 邏輯與狀態轉換規則
     （例如已經 `dismissed` 的 Signal 若又被偵測到，要不要重新開啟——
     這個規則由這個 task 決定並寫進程式與文件，不要留模糊地帶）。
   * `SignalController`：
     - `GET /api/v1/workspaces/{workspaceId}/signals`（list，走
       `WorkspaceAccessPolicy::requireActiveMembership()`，`read` 權限即可）。
     - `PATCH /api/v1/workspaces/{workspaceId}/signals/{signalId}`
       （human acknowledge/dismiss，需要哪個 permission 等級由這個 task
       決定並套用 `WorkspacePermissions`，建議比照 `workflow.mutate`）。
   * **偵測規則本身放哪裡**：建議獨立成
     `backend/api/src/Signal/Detector/SeoTechnicalIssueDetector.php` 這類
     class，由誰觸發（見下一點）呼叫，不要把偵測邏輯寫進 Controller。
5. **偵測規則觸發時機**（這個 task 要明確決定，不要留給後續 task 猜）：
   建議掛在 `si/seo/summary.php` 產生新的 `seo_scan_history` 列之後
   （也就是每次重新掃描 SEO 站點時，順便跑一次 Signal 偵測，比對這次與上次
   `issues_json` 的差異），**不要**做成獨立的 cron/queue job——`queue_jobs`
   表雖然已存在，但 Queue Worker 本身（`V11-02`）還沒做，這個 task 不應該
   提前依賴一個尚未存在的可靠 worker。同步偵測（讀完新掃描結果後立刻算
   Signal）符合 spec「Signal Detection 是 AI 提供的能力，不需要 Human
   Review 才能執行」（只有 Decision 才需要）。
6. **前端最小串接**：至少一個畫面能讀到 `GET .../signals` 並列出真實資料
   （不需要做完整 UI，`V10-06` 才是 Decision-first Dashboard 正式整合）；
   建議暫時掛在既有「搜尋健康度」頁面加一個簡單區塊，或先用一個內部除錯用
   路由驗證即可，由執行時決定，不是這個 task 的驗收重點。

# Explicitly out of scope for V10-01（避免範圍蔓延）

* **不**修改 `recommendations`／`decisions`／`tasks` 表或
  `WorkflowController`——那是 `V10-04`／`V10-05` 的工作。`signals.id` 只需要
  是一個乾淨、將來可被 `recommendations.signal_id`（尚不存在）引用的欄位。
* **不**建立正式 Evidence 表或 Signal–Evidence Link——那是 `V10-02`。
* **不**做 AI Explanation 或 Business Impact 計算——那是 `V10-03`。
* **不**做 GA 流量下滑偵測的門檻調校（如果時間夠可以做第二個規則，但不是
  驗收必要條件；只做的話門檻先用最簡單的規則如「兩期比較下滑超過
  X%」，不要花時間做統計顯著性之類的進階判斷）。
* **不**建立獨立 `signal_status_history` 表，除非第 3 點的重用 `audit_logs`
  提案在實作時證明不可行。

# Mandatory verification

* 真實 SEO 資料：對一個已有 ≥2 筆 `seo_scan_history` 的真實站點觸發重新掃描，
  確認新出現的技術問題產生一筆新 `signals`（`status='new'`），且該次掃描前
  已存在、這次已修復的問題被標記為 `resolved`。
* 去重：對同一個站點連續掃描兩次、兩次都偵測到同一個技術問題，確認
  `signals` 只有一筆（`occurrence_count` 遞增，`last_seen_at` 更新），不是
  兩筆。
* Workspace 隔離：Workspace A 的 Signal 不會出現在 Workspace B 的
  `GET .../signals` 回應中（用既有 `WorkspaceAccessPolicy` 驗證即可，不需要
  重新設計）。
* 權限：非 active membership／權限不足的角色呼叫 list／update API 被拒絕
  （沿用 `WorkspacePermissions`）。
* `npm run lint`、`npx tsc --noEmit --pretty false`、`npm run build`
  （若前端有改動）全部通過；PHP 新檔案 `php -l` 通過。

# Safety constraints

* 不得讓 Signal 偵測自動建立 Recommendation 或 Decision——Signal 只回答
  「發生了什麼」，不得跨過 Evidence／Explanation／Recommendation／Human
  Review 直接產生正式決策動作（違反 spec 第 3／6 節的 Human-in-the-loop
  原則）。
* 不得修改既有 `recommendations`／`decisions`／`tasks` 表結構或行為。
* 不得把 Signal 偵測做成依賴尚未存在的 Queue Worker（`V11-02`）。
* 不得對 SEO/GA 既有真實資料表做破壞性變更；`signals` 是全新表，正常建立
  FK 即可，不需要 Workspace migration 那種 expand/backfill/contract 三階段
  （那是給「既有資料要相容」的情境用的，Signal 沒有這個問題）。
* 新 migration 一樣要準備 preflight／postflight 查詢腳本，並更新
  `backend/sql/manual_apply_bookkeeping.sql`（比照既有慣例）。

# Required deliverables

1. `signals` migration（含欄位、index、FK）與其 postflight 驗證腳本。
2. `SignalRepository`／`SignalService`／`SignalController` 與路由註冊。
3. 至少一個真實資料偵測規則（建議 SEO 技術問題差異），並說明觸發時機的
   決定與理由。
4. 去重與狀態轉換規則的文件說明（寫進這份 packet的執行紀錄或
   `backend/sql/VERIFICATION_RUNBOOK.md` 新增章節）。
5. Mandatory verification 各項的可重現證據。
6. 主 Tracker 與本 task packet 狀態更新。

# Acceptance criteria

- [x] `signals` table 已建立，Workspace ownership 為正式 FK（非 nullable
      backfill）。→ `backend/sql/migrations/024_signal_persistence.sql`，
      disposable rehearsal 確認 FK 與兩個 unique key 皆正確建立；真實主機套用
      待 owner 執行。
- [x] 至少一種真實資料來源（建議 SEO）可產生可追溯、可重現的 Signal。→
      `SeoTechnicalIssueDetector` 已接上 `si/seo/summary.php`，disposable
      rehearsal 以合成資料證明新增/修復/去重/重開四種情境皆正確；真實 SEO
      站點的 end-to-end HTTP 驗證待真實主機套用 migration 後執行。
- [x] 重複偵測不會產生重複 Signal（去重驗證通過）。→ rehearsal 連續 4 輪
      偵測，同一問題全程只有 1 筆 row，`occurrence_count` 正確遞增
      （1→2→（resolve 不變）→3 in reopen）。
- [x] 狀態歷程可查（不論是 `audit_logs` 重用方案或獨立表，需可查詢「這個
      Signal 什麼時候變成什麼狀態」）。→ 重用 `audit_logs`
      （`entity_type='Signal'`），rehearsal 確認只在真正的狀態轉換
      （建立／自動解決／重開／人工確認／人工忽略）寫入，單純 occurrence_count
      遞增不寫入,避免洗版。
- [x] Workspace 授權沿用既有 `WorkspaceAccessPolicy`／`WorkspacePermissions`，
      未另外發明一套檢查。→ `SignalController`／`SignalService::updateStatus()`
      走與 `GaIntegrationController`／`WorkflowController` 完全相同的
      `requireActiveMembership()`＋`WorkspacePermissions::requirePermission()`
      模式；rehearsal 確認 viewer 角色被拒絕、member 角色可執行
      acknowledge/dismiss。
- [x] 未跨過 Human Review 自動產生 Recommendation／Decision。→
      `SignalService`／`SignalRepository`／`SeoTechnicalIssueDetector` 完全未
      引用 `recommendations`／`decisions`／`tasks` 表，程式碼審視確認。
- [x] 主 Tracker 收到可重現證據。→ 見 `backend/sql/VERIFICATION_RUNBOOK.md`
      第 6 節與下方執行紀錄。

**尚未完成（需要 owner 執行正式環境操作）**：真實主機套用
`migrations/024`、上傳 `backend/api/src/Signal/**`／`public/index.php`／
`si/seo/summary.php`、對一個已有 ≥2 筆 `seo_scan_history` 的真實站點觸發
重新掃描以驗證真正的 end-to-end HTTP 流程與跨 Workspace HTTP 負向測試。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V10-01。

專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V10-01_SIGNAL_PERSISTENCE.md

請先讀 docs/00_Technical_Specification_Alignment_v1.2.md 全文，再讀任務包裡
「Mandatory context before starting」列出的既有程式（尤其是
WorkflowController/Service/Repository 這組「假 Recommendation」實作，理解它
目前完全沒有 Signal/Evidence 支撐的現況），再讀任務包全文。

這個 task 只做 Signal 這一個 Domain：新建 signals 表、Repository/Service/
Controller、至少一種真實資料（建議 SEO 技術問題差異）的偵測規則、去重與狀態
歷程。不要動 recommendations/decisions/tasks 表，不要做 Evidence 或 AI
Explanation，不要讓 Signal 偵測自動產生 Recommendation 或 Decision。

完成後依 Required deliverables 回報，並更新主追蹤文件與本任務包狀態。
```

# 執行紀錄（2026-07-21）

## 任務包留給執行時決定的兩個開放問題，決定如下

1. **priority 欄位**：選 (a)——`signals` 不建立獨立 `priority` 欄位，排序只用
   `severity`（`FIELD(severity, 'critical','high','medium','low','info')`）。
   理由如任務包所述：真正的 priority 需要 Signal＋Evidence＋Business Impact
   一起計算，`V10-01` 自己猜一個公式只會製造之後要拆掉的技術債。
2. **偵測規則觸發時機**：同步掛在 `si/seo/summary.php` 的
   `seo_scan_history` INSERT 之後，不做成獨立 cron/queue job（`V11-02` Queue
   Worker 尚未存在）。用 `try/catch` 包住，偵測失敗只記錄 log、不讓 SEO 掃描
   本身的 API 回應失敗。

## Migration 編號調整

任務包寫作當時假設下一個可用編號是 `021`，但同一個 `codex/v09-roadmap`
分支對話裡，`V09-08`（本任務之前執行）已經用掉 `021`（GA report schedules
expand）／`022`（backfill）／`023`（GA report schedules DEFERRED contract）。
因此本任務改用 **`024`**：`backend/sql/migrations/024_signal_persistence.sql`。

## Schema 設計

`signals` 是全新表，不是既有資料的 Workspace 化，因此不需要 V09 那種
expand/backfill/deferred-contract 三階段——`workspace_id` 從建表就是
`NOT NULL`＋正式 FK 到 `workspaces(id)`。欄位、index、unique key 完全依任務包
第 1 點規格建立，唯一自行決定的是 `dedup_key` 用完整 sha256（64 字元），不是
「前綴」，因為 `VARCHAR(191)` 空間足夠且完整雜湊沒有碰撞風險。

`source_ref_type`／`source_ref_id` 依任務包規格，是給 `V10-02` Evidence 之後
引用的過渡欄位，本任務未建立 Evidence 表或正式 link。

## Repository／Service／Controller

比照 `WorkflowController`／`WorkflowService`／`WorkflowRepository` 與
`GaIntegrationController`／`GaIntegrationService`／`GaIntegrationRepository`
既有三層分層慣例，未發明新模式：

* `backend/api/src/Signal/SignalRepository.php`：純 persistence。
  `upsertByDedupKey()` 用 `INSERT ... ON DUPLICATE KEY UPDATE`，reopen 規則
  用 `status = IF(status = 'resolved', 'new', status)` 寫在 SQL 裡——`resolved`
  （系統推斷的狀態）被重新偵測到會重開；`dismissed`（人類的明確決定）不會被
  偵測結果覆蓋，只會靜默更新 `occurrence_count`／`last_seen_at`。
  `markResolvedByDedupKeyIfOpen()` 只把 `new`／`acknowledged` 轉成
  `resolved`，同樣不動 `dismissed`。動態參數個數的 `bind_param()` 呼叫比照
  `ga/ownership.php` 既有的 `call_user_func_array`＋by-reference 寫法（PHP 7.0
  相容，不能用 `...$params` 直接展開或 PHP 8.1 才有的
  `execute(array $params)`）。
* `backend/api/src/Signal/SignalService.php`：`updateStatus()`（人類 PATCH）
  要求 `ServiceIdentity`＋`membership`，用
  `WorkspacePermissions::requirePermission($membership, 'workflow.mutate')`
  （owner/admin/manager/member 皆可，viewer 不行），只接受
  `status ∈ {acknowledged, dismissed}`——`new`／`resolved` 是系統控制狀態，
  人類直接 PATCH 會被 `ValidationException` 拒絕。
  `runSeoTechnicalIssueDetection()` 是系統觸發入口，**不需要**
  `ServiceIdentity`／權限檢查（spec 明確說 Signal Detection 不需要 Human
  Review 才能執行,只有 Decision 才需要)。
* `backend/api/src/Signal/SignalController.php`：薄層，只做
  workspace-path-matches-signed-identity 檢查（比照
  `GaIntegrationController`/`WorkflowController`），轉呼叫 Service。
* 路由註冊於 `backend/api/public/index.php`：
  `GET /api/v1/workspaces/{workspaceId}/signals`、
  `PATCH /api/v1/workspaces/{workspaceId}/signals/{signalId}`，掛在既有
  `$membership = (new WorkspaceAccessPolicy(...))->requireActiveMembership(...)`
  之後，與 GA integrations／dashboard workflow 兩條既有路由同一個模式，未繞過
  `WorkspaceAccessPolicy`。

## 狀態歷程：重用 audit_logs（未建獨立表）

比照任務包提案，複用既有 `audit_logs`（`entity_type='Signal'`，
`entity_id=<signals.public_id>`）。只在真正的狀態轉換寫入
（`Signal Detected`／`Signal Auto-Resolved`／`Signal Reopened`／
`Signal Acknowledged`／`Signal Dismissed`），單純的 `occurrence_count` 遞增
（同一問題連續被偵測到但狀態沒變）不寫入，避免每次 SEO 重新掃描都洗版
audit_logs。系統觸發的三種事件 `actor_member_id` 為 `NULL`，人類觸發的兩種
事件為呼叫者的 `member_id`——rehearsal 證據中兩種都能從 `audit_logs`
正確分辨。目前判斷這樣的粒度已足夠回答「這個 Signal 什麼時候變成什麼狀態」，
未發現需要獨立表的情況。

## SEO 技術問題偵測規則

`backend/api/src/Signal/Detector/SeoTechnicalIssueDetector.php`：純邏輯、無
DB 存取，自己重新計算 current/previous 的 diff（不依賴
`si/seo/summary.php` 既有的 `$comparison` 變數命名），保持獨立可測試。
`dedup_key = sha256("seo_issue:{site_id}:{TYPE}:{normalized_url}")`。
`type` 欄位在偵測到（含首次／重開）時為 `seo.technical_issue.new`，被判定
修復時改為 `seo.technical_issue.resolved`（沿用 SQL 的
`REPLACE(type, '.new', '.resolved')`）。`severity` 對照 SEO 既有
HIGH/MEDIUM/LOW（大寫）到 signals 的 high/medium/low（小寫），未使用
critical/info（保留給未來其他偵測規則）。

觸發點：`backend/api/si/seo/summary.php` 在 `seo_scan_history` INSERT 之後，
重用該檔案已經算好的 `$issues`（本次掃描）與 `$previousIssues`（上次掃描，
本來就是為了 `$comparison` 顯示用途讀出來的），呼叫
`SignalService::runSeoTechnicalIssueDetection()`。整段包在 `try/catch` 內，
偵測失敗只 `error_log()`，不影響 SEO summary 本身的 API 回應——一次沒抓到的
Signal 下次掃描還能補上，讓整個請求失敗不成比例。

`const LABELS`／`const HUMAN_SETTABLE_STATUSES` 皆刻意不加 `private`
visibility 修飾詞——PHP 7.1+ 才支援 class constant 的 visibility 修飾詞，
本專案正式站目標是 PHP 7.0（此為任務包明文要求的相容性限制；既有
`WorkspacePermissions.php` 裡的 `private const MATRIX` 是先前對話留下的
既存風險，非本次新增，本次刻意不重複這個問題）。

## 前端最小串接

`app/api/workspaces/[workspaceId]/signals/route.ts`：BFF route，完全比照
`app/api/workspaces/[workspaceId]/dashboard/workflow/route.ts` 的
`getServerSession`／`createPhpServiceHeaders`／`highlightPhpApiUrl` 轉發模式，
GET 支援 `status`／`severity` query 轉發，PATCH 轉發 `signal_id`／`status`。
`app/(app)/seo/page.tsx`「技術問題」分頁新增一個「Signal（系統偵測事件）」
InfoCard 區塊：讀取真實 `GET .../signals`、顯示 title/summary/status/
occurrence_count，並提供「確認」／「忽略」按鈕呼叫 PATCH。切換 Workspace 時
比照既有其他 state 立即清空 `signals`（不殘留前一個 Workspace 的資料）。
這不是 `V10-06` Decision-first Dashboard 的正式整合，只滿足任務包「至少一個
畫面能讀到真實資料」的最低要求。

## 驗證證據（2026-07-21）

**PHP lint**：本機 `D:\4.Tool\php\php.exe -l` 對
`SignalRepository.php`／`SignalService.php`／`SignalController.php`／
`SeoTechnicalIssueDetector.php`／修改後的 `public/index.php`／
`si/seo/summary.php` 全部執行，皆 `No syntax errors detected`。

**前端**：`npm run lint`／`npx tsc --noEmit --pretty false`／`npm run build`
三項皆 PASS，`build` 產物路由清單包含新的
`/api/workspaces/[workspaceId]/signals`。本機 `npm run dev`
（連向真實 pre-launch PHP host）確認：未登入直接打
`GET /api/workspaces/1/signals` 正確回傳 `401 UNAUTHORIZED`（路由掛載正常，
未跳過驗證）；未登入造訪 `/seo` 正確導向登入頁，無 crash，伺服器 log
無錯誤。真實 signals 資料的畫面顯示因（a）真實主機尚未套用 migration、
（b）需要登入憑證，本次未執行。

**Migration／邏輯 rehearsal（disposable 本機 Docker `mysql:5.6`＋本機 PHP CLI
＋mysqli，非真實主機資料）**：比照 V09-07／V09-08 方法論，一次性容器（僅綁定
127.0.0.1，驗證後 `docker rm -f` 銷毀）。

* Preflight／`migrations/024`／postflight 全部執行成功；postflight 確認
  `fk_signals_workspace` FK 指向 `workspaces.id`、`uk_signals_public_id`／
  `uk_signals_workspace_dedup` 兩個 unique key 皆存在。
* 直接呼叫 `SignalRepository`／`SignalService`／`SeoTechnicalIssueDetector`
  （不經過 HTTP/簽章層，該層已由 V08-03/V09-05 另外證實）模擬 4 輪 SEO 掃描：
  * 第 1 輪（2 個問題,無上次掃描）：建立 2 筆 Signal，`occurrence_count=1`，
    `status=new`。
  * 第 2 輪（同 2 個問題不變）：0 筆新建、2 筆 bump 到 `occurrence_count=2`，
    全程只有 2 筆 row（去重確認）。
  * 第 3 輪（1 個問題修復）：該筆轉為 `resolved`
    （`occurrence_count` 在 resolve 這步不變，符合設計)，剩下 1 筆 bump 到 3。
  * 第 4 輪（該問題重新出現）：正確重開為 `new`／
    `seo.technical_issue.new`，`occurrence_count` 繼續 bump。
  * `audit_logs` 精確只有 4 筆相關紀錄
    （`Signal Detected`×2、`Signal Auto-Resolved`×1、`Signal Reopened`×1），
    單純 bump 沒有產生額外 audit 紀錄。
* 第二個腳本測試 `listForWorkspace()` 過濾、跨 Workspace 隔離
  （workspace 2 全程 0 筆）、`viewer` 角色被拒絕 PATCH
  （`AuthorizationException`：`Workspace role "viewer" cannot perform
  "workflow.mutate".`）、`member` 角色可 acknowledge/dismiss、直接 PATCH
  `status=new`／`status=resolved` 被 `ValidationException` 拒絕、以及關鍵的
  負向案例——把一筆 Signal `dismissed` 後重新偵測同一問題，`status` 維持
  `dismissed`（未被自動重開),證實「resolved 會重開、dismissed 不會」這條
  規則不只是文件寫好看,程式真的照做。

**尚未執行（需要 owner 執行正式環境操作）**：真實主機套用
`migrations/024`（含 preflight／postflight）、上傳
`backend/api/src/Signal/**`／`public/index.php`／`si/seo/summary.php`、對一個
已有 ≥2 筆 `seo_scan_history` 的真實站點觸發重新掃描以驗證真正的 end-to-end
HTTP 流程、跨 Workspace HTTP 負向測試（需要第二個測試帳號/Workspace，同
V09 系列已知缺口）。
