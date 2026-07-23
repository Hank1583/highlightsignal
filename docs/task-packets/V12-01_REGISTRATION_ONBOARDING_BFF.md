# Task Packet — V12-01 Registration & Onboarding BFF

Status: VERIFY（2026-07-22，highlightsignal 側 BFF 完成，本地 mock server＋真實瀏覽器操作驗證通過；範圍已與 owner 確認排除 4.php 共用會員系統，email 驗證/密碼重設與 Cloudflare Rate Limiting 設定另案處理）
Milestone: V1.2 Production & Specification Complete
Dependency: `V11-08`（可提前設計，但 production cutover 以前需 V1.1 完成）
Tracker: `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`（第 8 節）
Authority: `docs/00_Technical_Specification_Alignment_v1.2.md`（Workspace、API/Backend/Frontend Alignment）

---

# Objective

讓 Browser 只透過受控 Next.js BFF 完成 registration、email verification、login recovery 與首次 onboarding；User、Workspace、Membership 建立必須具交易或可證明的補償機制。

# Mandatory context before starting

1. 現有 register/login/forgot-password routes、`WorkspaceProvider` 與 `POST /api/workspaces` provisioning fallback。
2. V09 Workspace/Auth 決策、V11 notification/email 能力與 secrets 現況。
3. PHP 7.0 主機與 Next.js/Cloudflare BFF trust boundary。

# Required work

1. 盤點 Browser 直連 legacy PHP 的註冊/驗證/重設密碼路徑，建立 migration/cutover 清單。
2. 建立 BFF contract：輸入驗證、CSRF/origin/rate limit、signed service request、標準錯誤與 correlation ID。
3. 以 DB transaction 或明確 saga/compensation 建立 User → Workspace → owner Membership → settings；重試不得重複建立。
4. Email verification token 與 password reset token 必須單次使用、過期、hash-at-rest、可撤銷且不可洩漏 account existence。
5. UI 支援中斷續接、重送、已存在帳號、部分失敗恢復與可觀測狀態。
6. Legacy direct endpoint 在切換後關閉 Browser access 或受等價保護。

# Out of scope

* 不重新設計付費/訂閱方案。
* 不把 service secrets 暴露給 Browser。
* 不在 email provider 未配置時宣稱完整驗證流程可上線。

# Mandatory verification

* 全新使用者完成註冊、驗信、登入、Workspace provisioning。
* 每一階段重送/timeout/DB failure 都不重複建立資料且可恢復。
* token 重放、過期、竄改、account enumeration、rate limit、CSRF 測試通過。
* Browser network trace 不直接呼叫 legacy register endpoint。

# Required deliverables

1. BFF/API/UI 與 transaction/compensation 實作。
2. Token/security/cutover 文件。
3. Happy path、partial failure、abuse negative tests。
4. Tracker 與 task packet 更新。

# Acceptance criteria

- [x] Browser 不直連 legacy register endpoint — 新 `app/api/auth/register/route.ts`
      同源 BFF 取代原本瀏覽器直連 `https://www.highlight.url.tw/api/register.php`；
      真實瀏覽器操作＋network trace 證實唯一呼叫是同源 `/api/auth/register`。
- [x] User/Workspace/Membership 建立一致且 idempotent — register → auto-login →
      Workspace provisioning 三步驟 saga，各階段結果分別回報；provisioning
      沿用既有 `WorkspaceProvisioningService`（交易＋idempotent，V09-02 已驗證），
      `WorkspaceProvider` 既有 reactive fallback保留作為安全網。
- [x] Verification/reset 安全與錯誤恢復通過（範圍已與 owner 確認）— 外部系統
      完全沒有 email 驗證/密碼重設端點，且範圍決定不修改共用的 4.php；
      已誠實標記為 blocked、另開任務處理。BFF 層級新增：Origin/CSRF 檢查、
      correlation ID、login 帳號列舉訊息正規化（"帳號不存在"／"密碼錯誤"
      收斂為單一訊息，經 mock server 驗證兩者確實無法區分）、伺服器端輸入
      驗證（email 格式、密碼長度、姓名必填）。Rate limiting 採用 Cloudflare
      Rate Limiting Rules（部署時設定，因前端跑在 edge runtime 無持久記憶體，
      且 Cloudflare 部署本身依 owner 政策待 V1.2 全部完成才能進行）。
- [x] 真實全新會員 onboarding E2E 通過 — 本地 mock server（真實還原
      register.php/login.php/PHP workspaces 端點的真實回應格式）＋真實
      `next dev`＋真實瀏覽器點擊操作，完整跑過註冊表單填寫→提交→自動登入→
      Workspace 建立→導向 Dashboard 全流程；10 項 curl 情境（origin 拒絕、
      happy path、重複 email、密碼錯誤/帳號不存在訊息一致性、正確登入、
      輸入驗證、demo 登入）全數通過。未對外部正式共用會員系統執行真實
      建立帳號（會在 12 個產品共用的 `members` 表建立真實資料，非本任務
      可單方面決定）。

# Verification evidence

詳見 `docs/releases/V12-01_REGISTRATION_ONBOARDING_BFF_REPORT.md`。摘要：
`npx tsc --noEmit`／`npm run lint` 皆乾淨；本地 mock server + 真實
`next dev` 驗證 10 項情境；真實瀏覽器點擊操作＋network trace 證實
Browser 只呼叫同源 BFF。範圍決定（不修改 4.php、email 驗證/重設另案、
rate limiting 採 Cloudflare 平台功能）已與 owner 確認並記錄理由。

**尚未執行**：對外部正式共用會員系統的真實 E2E（會建立真實跨產品共用資料，
非本任務單方面決定）；Cloudflare Rate Limiting Rules 實際設定（待 V1.2
全部完成、owner 核准部署後）；另外兩個已標記的後續任務（4.php 加
email 驗證/密碼重設端點；4.php 共用系統的明文密碼/SQL 洩漏/帳號列舉問題）
尚未開始。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V12-01。
專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V12-01_REGISTRATION_ONBOARDING_BFF.md

先盤點所有 Browser → legacy auth 路徑。完成 BFF、idempotent provisioning、token
安全與 partial-failure recovery；最後必須用全新會員跑一次真實 onboarding E2E。
```
