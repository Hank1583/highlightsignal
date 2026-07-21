# Task Packet — V12-01 Registration & Onboarding BFF

Status: PLANNED
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

- [ ] Browser 不直連 legacy register endpoint。
- [ ] User/Workspace/Membership 建立一致且 idempotent。
- [ ] Verification/reset 安全與錯誤恢復通過。
- [ ] 真實全新會員 onboarding E2E 通過。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V12-01。
專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V12-01_REGISTRATION_ONBOARDING_BFF.md

先盤點所有 Browser → legacy auth 路徑。完成 BFF、idempotent provisioning、token
安全與 partial-failure recovery；最後必須用全新會員跑一次真實 onboarding E2E。
```
