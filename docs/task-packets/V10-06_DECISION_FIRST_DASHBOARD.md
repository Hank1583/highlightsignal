# Task Packet — V10-06 Decision-first Dashboard

Status: VERIFY（程式碼完成、disposable Docker 排練＋typecheck/lint/build 通過；真實瀏覽器互動驗證需要正式主機登入憑證，待 owner 執行）
Milestone: V1.0 Decision Intelligence Core
Dependency: `V10-05`
Tracker: `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`（第 6 節）
Authority: `docs/00_Technical_Specification_Alignment_v1.2.md`（Frontend Alignment）

---

# Objective

把 Dashboard 改成單一可理解、可審查、可正式決策的流程：Today's Signals → Evidence → Explanation → Business Impact → Recommendation → Human Review → Decision。

# Mandatory context before starting

1. V10-01～05 的實際 API contract 與 state machine。
2. `DashboardWorkspace.tsx`、`DashboardTasksPage.tsx`、GA/SEO/SI 現有頁面與 WorkspaceProvider。
3. Alignment v1.2 第 11 節；GA/SI 頁面保留為 Evidence/raw-data drill-down。

# Required work

1. 建立 Workspace-scoped Today's Signals query/view，具 loading、empty、partial、error 狀態。
2. 用清楚層次呈現 Signal、Evidence、Explanation、Impact、Recommendation，避免 AI 文字與事實混淆。
3. 接上 V10-05 Human Review，支援五種 Decision outcome、理由、pending/failed/success feedback 與防重送。
4. 切換 Workspace 時取消舊請求並清除所有 domain state/cache；URL、Server Component/BFF、query key 必須一致。
5. 保留 GA／SEO／AEO／GEO drill-down link；不得複製 domain data 到 widget 私有 state 當正式來源。
6. 基本 accessibility、responsive 與 keyboard flow 必須可用。

# Out of scope

* 不在 UI 重新實作 detector、recommendation 或 permission rule。
* 不建立 V1.1 Action/Task 執行功能。
* 不把 widget 當 Business Data owner。

# Mandatory verification

* 真實 Workspace 可在單一流程看懂資料並提交正式 Decision。
* Workspace A/B 快速切換不殘留前一租戶內容或 late response。
* Refresh 後 Recommendation/Decision 不消失，重複點擊不重複提交。
* lint、typecheck、build、主要 responsive/a11y smoke test 通過。

# Required deliverables

1. Dashboard/BFF/query integration。
2. Loading/error/empty/permission/decision states。
3. Workspace isolation 與完整 UI flow 證據。
4. Tracker 與 task packet 更新。

# Acceptance criteria

- [x] 單一流程完成理解與正式決策 — `components/dashboard/TodaySignals.tsx`
      在單一區塊內依序呈現 Signal → Evidence → Explanation → Business Impact
      → Recommendation → 人工審查（六種 outcome + 理由 + 預期結果），並掛載於
      `DashboardWorkspace.tsx`。
- [x] Evidence 與 AI 解讀視覺上明確分開 — 沿用 `seo/page.tsx` 已驗證的視覺分區
      慣例（Evidence／Explanation／Business Impact／Recommendation 各自獨立
      色塊），不混在同一段文字。
- [x] Workspace 切換、錯誤恢復與防重送通過 — `AbortController` 隨
      workspaceId 變更建立並在下次切換／卸載時 abort，避免舊 Workspace 的
      late response 寫入新畫面；每個 Signal 有獨立 idempotency_key（成功送出
      後才重新產生），配合 V10-05 的 idempotency 保護重複提交。
- [x] GA/SI 保持 drill-down 而非第二套核心流程 — 未修改 `ga/page.tsx`／
      `seo/page.tsx` 既有頁面，本任務只新增 Dashboard 上的 Signal 決策區塊。

# Verification evidence

程式面：`backend/api/src/Dashboard/WorkflowService.php` 兩處小幅新增
（`resolveSignalContext()` 的 `signal_id` 直查路徑；新的
`refresh_recommendation` 動作，重用既有 formalization 邏輯，不新增規則）通過
`php -l`；`components/dashboard/TodaySignals.tsx`（新檔）與
`DashboardWorkspace.tsx` 的整合通過 `npm run typecheck`／`npm run lint`／
`npm run build`。

2026-07-21 disposable Docker `mysql:5.6` + local PHP 7.4 CLI（`mysqli`）排練
（12 項斷言全數通過）：`signal_id` 直查正確解析真實 Signal 並以其內容覆蓋前端
偽造的 title；`refresh_recommendation` 正確formalize Recommendation 但不建立
Decision／Task；重複呼叫 idempotent（revision 不遞增）；跨 Workspace 偽造
`signal_id` 正確 fallback 到呼叫者自己的 legacy 內容，無資料外洩；另一租戶
（workspace 2）解析自己的 signal_id 的正常路徑也正確；`refresh_recommendation`
之後接著 `save_decision` 正確組合運作。詳見
`backend/sql/VERIFICATION_RUNBOOK.md` 第 11 節。

**尚未執行**：真實瀏覽器登入互動驗證。本專案前端 dev server 是透過網路呼叫正式
PHP 後端（非本機執行 PHP），真實登入需要正式後端憑證（`PHP_SERVICE_AUTH_SECRET`
等），此環境不應取得也不應嘗試取得；因此 Workspace 快速切換與一條真實 Decision
flow 的「即時點擊」證據待 owner 於正式主機／有憑證環境執行，與先前每個 V10
任務「需要真實主機」的缺口屬同一類別。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V10-06。
專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V10-06_DECISION_FIRST_DASHBOARD.md

先讀 V10-01～05 的實際 API 與完成紀錄。建立 Decision-first Dashboard，但不要
把 domain rule 搬到前端，也不要做 V1.1 Action/Task。完成後附 Workspace 快速切換
與一條真實 Decision flow 的證據。
```
