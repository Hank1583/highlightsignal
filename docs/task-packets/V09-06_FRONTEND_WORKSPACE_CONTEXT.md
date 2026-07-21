# Task Packet — V09-06 Frontend Workspace Context

Status: DONE（程式完成＋靜態驗證）／部分待驗證 — 2026-07-21，同一
`codex/v09-roadmap` 分支對話，尚未 commit／尚未部署
Milestone: V0.9 Workspace Foundation
Dependency: `V09-02`（`POST /api/v1/workspaces` 與純讀 GET 已完成，這個 task 要
補上前端呼叫方）
Tracker: `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`
Evidence: `app/api/workspaces/route.ts`（新增 POST handler）、
`components/workspace/WorkspaceProvider.tsx`（GET 空陣列時呼叫 POST 補足
provisioning）、`lib/workspaceServer.ts`（legacy-fallback 收斂，見下方決策）、
`components/dashboard/DashboardWorkspace.tsx`／`DashboardTasksPage.tsx`／
`app/(app)/seo/page.tsx`／`components/si/SiInsightPage.tsx`／
`app/(app)/ga/page.tsx`（Workspace 切換時清除前一個 Workspace 的本地 state）。
`npm run lint`／`npx tsc --noEmit --pretty false`／`npm run build` 均 PASS
（2026-07-21）。
Known gap（未實測，非程式問題）：跨 Workspace 實機切換驗證與「全新會員」
provisioning 流程需要第二個測試帳號／從未 provisioning 過的真實會員，本次
沒有這兩種測試資料（與 V09-02～05 相同的既有已知缺口），僅完成程式層與
單一真實帳號下的路由 smoke test（見下方「Mandatory verification」執行記錄）。

---

# Objective

讓 Workspace selector、Server Component、BFF route、快取 key 全面對齊，切換
Workspace 時不殘留前一個 Workspace 的狀態；並解決 V09-02 留下的已知缺口：目前
沒有任何前端呼叫方會呼叫新的 `POST /api/v1/workspaces`。

# Mandatory context before starting

1. `docs/00_V07_TO_V12_PROGRESS_TRACKER.md` 第 5 節、V09-02 的 dated note（known
   gap #2：lazy-GET 移除後，全新會員沒有自動建立 Workspace 的路徑）。
2. `backend/api/src/Workspace/WorkspaceController.php`／`WorkspaceService.php`／
   `WorkspaceProvisioningService.php`——GET 現在純讀，POST 是新增的明確
   provisioning 動作，回傳 `WorkspaceAlreadyProvisionedException` → HTTP 409。
3. 前端既有檔案（V09-01～05 都沒有動這些，狀態可能與這幾個 task 進行時不同，
   執行前重新讀一次）：
   - `components/workspace/WorkspaceProvider.tsx`
   - `components/workspace/WorkspaceSelector.tsx`
   - `lib/workspaceFetch.ts`（設定 `X-Workspace-Id` header）
   - `lib/workspaceServer.ts`（`resolveWorkspaceContext()`，呼叫 PHP
     `/api/v1/context`，**目前有 legacy-fallback 分支**——V09-02 決定先不移除，
     這個 task 要重新評估是否該收斂／移除，並記錄理由）
   - `app/api/workspaces/[workspaceId]/**`（已存在的新架構 proxy route）
   - `app/api/ga/**`（舊版 member-scoped route，跟新架構並存）

# Critical operational constraints（沿用 V09-01～05）

* 主機沒有 SSH／cron；如果這個 task 需要後端小改動（例如新增一個 BFF route
  呼叫 `POST /api/v1/workspaces`），PHP 端如果沒有新 migration 就不受此限制，
  但如果動到 SQL 一樣要走手動 phpMyAdmin 流程。
* 這個 task 主要是前端（Next.js），可以用 `npm run dev` 本機測試——**注意
  `npm run dev` 曾經因為 `node --env-file` 與 Next.js 16 dev server 的
  NODE_OPTIONS 相容性問題壞掉過，已經修好（`scripts/dev.mjs`）。如果又遇到
  `--env-file is not allowed in NODE_OPTIONS` 這種錯誤，先看 git log 裡
  `scripts/dev.mjs` 這次的修法，不要重新調查一次。**

# Required work

1. 解決 V09-02 known gap：決定新會員第一次需要 Workspace 的時機點（例如註冊完
   成後、或第一次 `GET /api/v1/workspaces` 回傳空陣列時），在前端明確呼叫
   `POST /api/v1/workspaces`，而不是依賴後端隱式建立。
2. Workspace selector 切換時，確認：
   - 所有快取 key（React Query／SWR／Server Component cache，視實際使用的
     資料抓取方式而定）都包含 workspace_id，不會殘留上一個 Workspace 的資料。
   - `X-Workspace-Id` header 在切換後立刻反映到所有後續請求。
3. 重新評估 `lib/workspaceServer.ts` 的 legacy-fallback 分支：backend 已經是
   純讀＋明確 provisioning，這個 fallback 是否還需要存在；如果移除，要先確認
   V09-02 known gap 已經有正式取代方案。
4. 確認 `app/api/ga/**`（舊 member-scoped）與 `app/api/workspaces/[workspaceId]/**`
   （新 workspace-scoped）並存期間，UI 不會同時打兩套造成資料不一致。

# Mandatory verification

* 兩個 Workspace 來回切換：資料完全隔離，沒有殘留前一個 Workspace 的畫面內容
  或快取。
* 全新會員（或模擬全新會員）走過一次真實流程，確認會拿到 Workspace，不需要
  手動介入。
* `npm run lint`、`npx tsc --noEmit --pretty false`、`npm run build` 全部通過。

# Safety constraints

* 不得恢復「GET 隱式建立 Workspace」這個已經被 V09-02 拿掉的行為。
* 不得在沒有確認 known gap 已解決前就移除 legacy-fallback。
* 不得引入需要 SSH 才能驗證的部署步驟。

# Required deliverables

1. 前端呼叫 `POST /api/v1/workspaces` 的明確觸發點。
2. 快取 key／Workspace 切換行為的程式碼改動。
3. Legacy-fallback 的保留／移除決策與理由。
4. 主 Tracker 更新，含 known gap #2 的解決紀錄。

# 執行紀錄（2026-07-21）

1. **前端呼叫 `POST /api/v1/workspaces`**：`app/api/workspaces/route.ts` 新增
   `POST` handler，簽章轉發到 PHP `POST /api/v1/workspaces`（demo 帳號回
   403 `DEMO_READ_ONLY`，比照既有 workflow PATCH route 的慣例）。
   `components/workspace/WorkspaceProvider.tsx` 的 `refresh()` 改為：GET 清單為
   空陣列時（且回應 `ok`，不是 backend 掛掉）→ 呼叫 POST 進行 provisioning →
   若非 409 `WORKSPACE_ALREADY_PROVISIONED` 的失敗才視為錯誤 → 重新 GET 一次。
   全新會員因此會在第一次載入時自動拿到 Workspace，不需要手動介入，也不會
   恢復舊的「GET 隱式建立」行為（provisioning 一律是獨立的明確 POST，不是
   GET 的副作用）。
2. **Workspace 切換時的快取／state 隔離**：逐一檢查所有 `useWorkspace()` 的
   client component 後發現，資料抓取的 `useCallback`/`useEffect` 依賴陣列已經
   普遍包含 `currentWorkspace.id`（因此 re-fetch 會正確觸發），但多個元件在
   舊 Workspace 的 fetch 完成前，仍會短暫顯示舊 Workspace 的殘留畫面內容或
   讓舊資料混進新請求的參數，已修正：
   - `components/dashboard/DashboardWorkspace.tsx`：切換時清空
     `workflow`／`reviewDecision`／`composedBlocks`／`workflowError`，避免
     舊 Workspace 的任務卡片殘留到新 Workspace 載入完成前。
   - `components/dashboard/DashboardTasksPage.tsx`：切換時清空 `items`。
   - `app/(app)/seo/page.tsx`：切換時清空 `sites`／`selectedSiteId`／
     `summary`／`pageSpeed`／`pageSpeedHistory`／`workflow`／`errorText`；
     同時修掉 `setSelectedSiteId((current) => current || ...)` 會沿用前一個
     Workspace 站點 ID 的問題（因為 `current` 現在會先被清成 `null`）。
   - `components/si/SiInsightPage.tsx`：切換時清空 `sites`／`summary`／
     `history`／`errorText`。
   - `app/(app)/ga/page.tsx`：切換時清空 `selectedIds`，避免舊 Workspace 的
     GA connection id 被帶進新 Workspace 的 `/api/ga/query` 請求參數（雖然
     PHP 端本來就會用實際 workspace 邊界擋掉不屬於自己的 connection id，這裡
     修的是前端不該把錯的 id 送出去）。
   `X-Workspace-Id` header：所有既有呼叫已經是逐次 fetch 時即時帶入
   `currentWorkspace.id`／`workspaceId`（不是存在某個 module-level 常數），
   切換後立刻反映到後續請求，不需要額外修改。
3. **`lib/workspaceServer.ts` legacy-fallback 決策：收斂，不整支移除。**
   理由：
   - 這個 fallback 目前被 `resolveWorkspaceContext()` 的 ~25 個舊版
     member-scoped BFF route（GA／SEO／SI／report）使用，用途只是取得
     `legacyOwnerMemberId`（永遠等於呼叫者自己的 `session.id`，不會是別人
     的 member id）；真正的 tenant 邊界檢查在 PHP 端用
     `hs_resolve_member_workspace_id()`（V09-04／05 已補上
     `status='active'` 檢查）獨立重新解析，不信任這裡回傳的任何欄位。因此
     完全移除這個 fallback 只會讓這 25 條路由在後端短暫不可用或有 cookie
     不同步時直接整頁掛掉，換不到額外的安全性。
   - 但原本的條件邏輯有明確漏洞：只要錯誤是 `WORKSPACE_FORBIDDEN`，不論
     `workspaceId` 是不是等於 `session.id`，永遠會 fallback——等於任何 403
     （被停權會員、或明確要求別人 Workspace 被拒絕）都會被吞掉，換成「假裝
     成功回傳自己的預設 Workspace」，這正好是 V09-02／V09-05 明確禁止的
     「用 legacy fallback 繞過 membership check」。已收斂為：
     `WORKSPACE_FORBIDDEN` 永遠原樣往外拋，不再被吞掉；只有在真正的
     backend-unavailable（network／DB／格式錯誤）且沒有明確指定別的
     workspace（`workspaceId === session.id`）時才 fallback。
   - V09-02 known gap #2 現在有正式取代方案（見第 1 點），所以「全新會員
     沒有 Workspace」這個原本觸發 fallback 的主要情境已經被上游解決，不再
     需要靠這個 fallback 撐著。
4. **`app/api/ga/**`（舊）與 `app/api/workspaces/[workspaceId]/**`（新）並存**：
   確認 `app/(app)/ga/dataSource.ts` 的 `fetchConnections()`／
   `updateGAConnectionForWorkspace()` 已經是依 `workspace.source` 二選一
   （`backend` 走新路由，`legacy` 走舊路由，且新路由 404／502 時才會 fallback
   到舊路由），沒有同時打兩套的路徑；本次未發現需要修改的地方。

**驗證結果**：
* `npm run lint`：PASS。
* `npx tsc --noEmit --pretty false`：PASS。
* `npm run build`：PASS（含新 `POST /api/workspaces` route 出現在 build
  route 清單）。
* 本機 `npm run dev`（沿用既有 `backend/private/frontend.env`，指向真實
  pre-launch PHP host）：首頁與未登入時的 `GET`／`POST /api/workspaces`
  均正確回傳 `401 UNAUTHORIZED`，確認新 route 有掛載且沒有把整個 API 弄壞。
* **未執行**：登入後的完整「全新會員 provisioning」與「兩個 Workspace 來回
  切換資料隔離」實機驗證——需要一個從未 provisioning 過的真實會員帳號，或
  第二個測試 Workspace 才能做，本次沒有這兩種測試資料，與 V09-02～05 已記錄
  的相同缺口一致（見 tracker 2026-07-20 系列 dated note）。也沒有嘗試用猜測
  的帳密登入正式環境。

# 執行對話開場請直接貼

```text
請執行 Highlight Signal Roadmap Task V09-06。

專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V09-06_FRONTEND_WORKSPACE_CONTEXT.md

請先讀主追蹤文件第 5 節與 V09-02 的 dated note（known gap #2：POST
/api/v1/workspaces 目前沒有呼叫方），再讀任務包全文。本機 npm run dev 之前
因為 Node/Next.js 16 的 NODE_OPTIONS 相容性問題壞過，已經用 scripts/dev.mjs
修好，如果又遇到同樣錯誤訊息，直接參考那次的修法，不要重新調查。

請解決 known gap #2、確認 Workspace 切換時的快取/狀態隔離，並重新評估
lib/workspaceServer.ts 的 legacy-fallback 是否該收斂。完成後依任務包 Required
deliverables 回報，並更新主追蹤文件與本任務包狀態。
```
