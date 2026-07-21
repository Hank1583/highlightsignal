# Task Packet — V10-04 Recommendation Formalization

Status: VERIFY（程式與 SQL 完成，2026-07-21 於 disposable 本機 Docker MySQL 5.6＋PHP CLI harness 驗證 backend-derived content／idempotency／cross-workspace forgery fallback／archive-on-resolve 邏輯（過程中發現並修好一個真實 bug：archive 狀態被同一 mutate() 呼叫內的 recordDecision() 蓋掉）；尚未套用至真實主機，尚未上傳 PHP／前端）
Milestone: V1.0 Decision Intelligence Core
Dependency: `V10-03`
Tracker: `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`（第 6 節）
Authority: `docs/00_Technical_Specification_Alignment_v1.2.md`（Recommendation Domain）

---

# Objective

把目前由前端臨時組裝、只靠 `context_key` 保存的 Recommendation，升級為由真實 Signal、Evidence、Explanation 與 Business Impact 支撐、可重現且可審查的正式 Domain record。

# Mandatory context before starting

1. V10-01～03 的完成紀錄。
2. `011_dashboard_decision_workflow.sql` 與 Workflow Controller/Service/Repository。
3. `DashboardWorkspace.tsx` 的 `buildDefaultRecommendation()` 及所有 recommendation 呼叫端。

# Required work

1. 對既有 `recommendations` 做 expand/backfill/verify；加入正式關聯、priority、confidence、expected impact、suggested action、reason、generator/version、version/revision 與必要狀態欄位。
2. 保留舊 `context_key` 相容路徑直到所有呼叫端切換；不得直接刪欄位或讓舊資料失聯。
3. Recommendation 必須由後端根據已存在的 Signal/Evidence/analysis 建立；前端送來的 title/description 不可被當成可信業務事實。
4. 定義相同底層 Signal 更新時的 revision 規則、idempotency 與 archive/supersede 行為。
5. 建立 Workspace policy、read/list/create-or-refresh API 與 audit events。

# Out of scope

* 不替人類自動做 Decision。
* 不建立 Action、Task 或 Queue Job。
* 不一次移除 legacy dashboard/SEO 相容流程。

# Mandatory verification

* 一筆正式 Recommendation 可追到 Signal、Evidence、Explanation/Impact 與 generator version。
* 重新整理頁面後資料仍存在；同一 idempotency key 不重複建立。
* 前端偽造不存在的 signal/evidence 或跨 Workspace ID 時被拒絕。
* 舊資料 backfill 與舊 response contract 有明確相容/隔離結果。

# Required deliverables

1. Recommendation migration、backfill、postflight 與 deferred cleanup plan。
2. Backend/API/呼叫端 formalization。
3. Traceability、idempotency、revision、authorization 測試。
4. Tracker 與 task packet 更新。

# Acceptance criteria

- [x] Recommendation 具備 Alignment 規定的核心欄位。→
      `backend/sql/migrations/027_recommendation_formalization_expand.sql`
      新增 `signal_id`／`priority`／`confidence`／`expected_impact`／
      `suggested_action`／`reason`／`generator_type`／`generator_version`／
      `revision`（nullable expand，既有資料相容）。
- [x] 正式 Recommendation 由後端可驗證資料建立。→ `WorkflowService` 解析
      `signal_context`（真實 site_id/issue_type/url）比對出調用者自己
      workspace 內的真實 Signal 後,忽略前端 title/description,改用
      Signal＋Evidence＋Explanation 建立內容;disposable rehearsal 確認
      偽造的前端文字完全未出現在儲存結果中。
- [x] 可重現、可審查且不因重新整理消失。→ 沿用既有 `UNIQUE(workspace_id,
      context_key)` upsert；重跑相同 Signal 狀態時 `revision` 不遞增
      （idempotency 確認）。
- [x] 未越過 Human Review 產生 Decision/Action。→ 本次修改完全未動
      `decisions`／`tasks` 的既有人類決策流程,只改變 `recommendations`
      內容從哪裡來。

**已知限制／刻意保留**：不符合 signal_context 或解析失敗時（含跨 Workspace
偽造嘗試）完全走既有 legacy 路徑，前端 title/description 仍被信任——這是
任務包明確要求的「保留舊 context_key 相容路徑直到所有呼叫端切換」，不是
遺漏。

**尚未完成（需要 owner 執行正式環境操作）**：真實主機套用
`migrations/027`、上傳 `backend/api/src/Dashboard/**`／`public/index.php`／
`seo/page.tsx` 變更、真實 end-to-end HTTP 驗證。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V10-04。
專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V10-04_RECOMMENDATION_FORMALIZATION.md

請先盤點既有假 Recommendation 與 V10-01～03 的正式資料鏈。用 expand/backfill
方式保留相容性，將建立權收回後端；不要自動建立 Decision、Action 或 Task。
```

# 執行紀錄（2026-07-21）

## 盤點結論

`recommendations` 已是真實在用的表（`WorkflowController`／`Service`／
`Repository`，被 `DashboardWorkspace.tsx`（5 種 onboarding-style
`dashboard:*` context_key，例如 `dashboard:connect_ga`）與
`seo/page.tsx`（`seo:{siteId}:{issueType}` context_key）呼叫）。前者是
「缺少某個 Signal 前提的引導文案」，沒有真實 Signal 可以支撐；後者
`seo:{siteId}:{issueType}` 剛好對應到 V10-01～03 已建立的真實 SEO Signal。
因此本次只把「有真實 Signal 支撐」的這一條路徑正式化，另外 5 種
onboarding-style context_key 完全保留 legacy 行為不變——這正是任務包
「保留舊 context_key 相容路徑」的字面要求，不是縮小範圍。

## Schema（expand,非全新表)

`recommendations` 已有真實資料可能性,所以比照 V09 Workspace-retrofit 慣例
（nullable expand,不是 024-026 那種全新表模式）：新增 `signal_id`（nullable
FK）、`priority`／`confidence`／`expected_impact`／`suggested_action`／
`reason`／`generator_type`（預設 `frontend_legacy`）／`generator_version`／
`revision`。

## Signal 身分解析

`seo/page.tsx` 的 `contextKey = seo:{siteId}:{issueType}` 本身不含
`url`，無法唯一對應到 Signal 的 dedup_key（同 type 不同 url 會理論上衝突,
這是既有 legacy context_key 粒度限制,非本次引入,任務包「不一次重寫 legacy」
未要求修正)。解法：前端額外傳送自己已經有的真實觀測欄位
`signal_context: {site_id, issue_type, url}`（不是業務主張,只是它本來就有
的原始資料),後端用
`SeoTechnicalIssueDetector::computeDedupKey()`（新增的 public static 方法,
複用 V10-01 建立的同一份雜湊公式)重新算出 dedup_key,再用
`SignalRepository::findByDedupKey($callerOwnWorkspaceId, ...)`
（永遠用簽章驗證過的呼叫者自己 workspace_id,不是任何客戶端可控欄位)查找。

## 跨 Workspace 偽造為什麼是安全的

若攻擊者（workspace A）在 `signal_context.site_id` 填入 workspace B 的
site_id,算出的 dedup_key 雜湊值理論上會等於 workspace B 那筆 Signal 的
dedup_key,但查找條件是 `WHERE workspace_id = A AND dedup_key = ...`——
workspace A 底下不會有這筆資料,查找回傳 null,自動 fallback 到 legacy
路徑（trust 攻擊者自己 workspace 的前端內容,不會外洩 workspace B 的
Signal/Evidence 資料)。Disposable rehearsal 的 test 4 直接驗證了這個情境。

## Revision／Idempotency／Archive 規則

* **Revision**：`WorkflowRepository::saveFormalizedRecommendation()` 在
  PHP 端比較新舊內容（title/priority/expected_impact/suggested_action/
  reason/signal_id）是否真的不同,只有真的不同才遞增 `revision`。同一
  Signal 狀態重複呼叫不會產生新版本。
* **Archive/Supersede**：signal-backed Recommendation 背後的 Signal 若
  轉為 `resolved`／`dismissed`,下次讀取（`WorkflowService::get()`）時
  自動標記 `status='archived'`。

## 執行過程中發現並修好的真實 bug

原本把「signal 已 resolved → status=archived」的邏輯寫在
`saveFormalizedRecommendation()` 存檔當下,但 `mutate()` 的
`create_task`／`save_decision` action 本來就會呼叫
`WorkflowRepository::recordDecision()`,在**同一次 request** 裡把
`status` 無條件蓋成 `'accepted'`/`'skipped'`——導致我剛設定的 `archived`
立刻被蓋掉。這不是靠推理程式碼發現的,是 disposable rehearsal 的 test 5
直接跑出「signal 已 resolved 但 recommendation.status 仍是 accepted」
才抓到。修法：把 archive 判斷移到 `WorkflowService::get()`（讀取時機,
在同一次 request 的所有 mutate 副作用都執行完之後才是最終權威狀態),
`WorkflowRepository` 新增 `archiveRecommendation()`。修好後 rehearsal
test 5 通過。

## 前端

`seo/page.tsx` 的 `createIssueTask()` 在既有 `title`/`description` 欄位
外,額外傳送 `signal_context: {site_id, issue_type, url}`（真實已有的
觀測資料,非新業務主張)。`npm run lint`／`npx tsc --noEmit`／`npm run build`
三項 PASS。

## 驗證證據

**PHP lint**：`SeoTechnicalIssueDetector.php`（新增 public static
方法)／`WorkflowRepository.php`／`WorkflowService.php`／`public/index.php`
全部通過。

**Disposable 本機 Docker `mysql:5.6`＋PHP CLI rehearsal**（直接呼叫
`WorkflowService::mutate()`,真實整合點,非只測 repository)：

1. Signal-backed `create_task`,前端夾帶偽造的 title/description
   （"FRONTEND FAKE TITLE"）→ 儲存結果的 title 正確來自真實 Signal
   （「缺少 Title」）,`generator_type=backend_rule`,`priority=high`
   （對應 Signal 的 high severity),偽造文字完全沒出現在任何欄位。
2. 相同狀態重跑 → `revision` 維持 1（idempotency 確認）。
3. Legacy context_key（`dashboard:connect_ga`,無 `signal_context`）→
   `generator_type=frontend_legacy`,`signal_id=NULL`,行為與改動前完全
   一致。
4. Workspace 2 身分偽造 workspace 1 的 site_id → 正確 fallback 到 legacy
   （workspace 2 自己的內容),未洩漏 workspace 1 的 Signal 資料。
5. Signal 轉為 resolved 後重新讀取 → `status=archived`（修好上述 bug 後
   確認通過)。
6. Postflight：0 筆缺 `generator_type`／`revision`,0 筆跨 Workspace
   signal/recommendation 不一致,資料分布 1 筆 `backend_rule`＋2 筆
   `frontend_legacy`,與 rehearsal 情境精確吻合。

**尚未執行（需要 owner 執行正式環境操作）**：真實主機套用
`migrations/027`、上傳 `backend/api/src/Dashboard/**`／`public/index.php`／
`seo/page.tsx`、真實 end-to-end HTTP 驗證（用真實偵測到的 SEO 問題建立
Dashboard 任務,確認畫面顯示的 Recommendation 內容確實來自後端而非前端
輸入)。
