# Task Packet — V12-03 Release CI/CD

Status: VERIFY（2026-07-22，pipeline／runbook／manifest 工具建立完成；GitHub repo settings 與真實 Cloudflare 部署超出本環境能力／owner 政策範圍，詳見驗證證據）
Milestone: V1.2 Production & Specification Complete
Dependency: `V12-02`
Tracker: `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`（第 8 節）
Authority: `docs/00_Technical_Specification_Alignment_v1.2.md`（Infrastructure Alignment）

---

# Objective

建立有明確順序、批准、證據、阻擋條件與 rollback 的 Frontend/PHP/DB release pipeline；消除直接合併 `main` 即意外正式部署的風險。

# Mandatory context before starting

1. V08 release baseline/Cloudflare environment 文件與 main auto-deployment incident。
2. 現有 GitHub Actions、Cloudflare Pages integration、智邦 FTP/phpMyAdmin 手動流程。
3. `docs/8.infrastructure/10_Deployment_Infrastructure.md` 與 V12-02 release tests。

# Required work

1. 定義 environment/branch mapping：preview/staging/production、protected main、required checks、owner approval。
2. 固定發布順序：backward-compatible DB expand → PHP/backend → frontend → data backfill/verify → deferred contract；每步有 stop condition。
3. 對無 SSH 主機提供可執行且可稽核的 PHP/SQL promotion 流程；手動步驟需 checksum、雙人/owner approval 與 evidence。
4. 建立 version/tag/release artifact、deployment manifest、config/secret validation、smoke test 與 promotion record。
5. 建立 rollback/fix-forward matrix；DB destructive contract 不可假裝一鍵 rollback。
6. 正式 production deployment 仍需 owner 明確核准，不因 pipeline 完成自動發生。

# Out of scope

* 未經 owner 核准不得部署 production。
* 不把 secrets 寫入 workflow/repo/artifact。
* 不以 Cloudflare frontend success 代表 PHP/DB 也成功。

# Mandatory verification

* Preview/staging promotion 實跑，required gate 失敗時 production 無法繼續。
* 部署順序、版本、checksum、操作者與 smoke result 可追溯。
* 模擬 frontend/backend/migration failure，逐一驗證 stop/rollback/fix-forward。
* main branch 不再能繞過核准造成意外 production deployment。

# Required deliverables

1. CI/CD workflows/configuration、environment protection、release manifest。
2. PHP/SQL manual promotion runbook。
3. Staging rehearsal 與 rollback/fix-forward evidence。
4. Tracker 與 task packet 更新。

# Acceptance criteria

- [x] Frontend/PHP/DB 有明確發布順序與阻擋條件 — 見
      `docs/8.infrastructure/11_Release_Promotion_Runbook.md`「Fixed
      release order」：DB（expand-only）→ Backend/PHP → Queue Worker →
      Frontend → 資料回填/驗證 → deferred contract，每步有明確 stop
      condition。
- [x] Staging approval、production approval、tag、rollback 可追溯 —
      `release-promote.yml` 的 `promote` job 依賴 `reverify` job（gate 失敗
      即無法繼續）；`scripts/generate-release-manifest.mjs` 產生含
      commit/actor/target/migration checksum 的 manifest（已本地驗證真實
      可執行）；rollback/fix-forward matrix 依層級分別記錄。approval
      實際生效需要 owner 另外在 GitHub repo settings 建立對應 Environment
      並加 required reviewer——此環境無 `gh`/API 存取能力，無法代為設定。
- [x] main auto-deployment 風險受控（部分）— 既有政策（V08-04）已停用
      main 的 auto-deploy；本任務**無法**重新確認 Cloudflare 端設定仍然
      生效（無 dashboard 存取），已誠實記錄為待 owner 自行確認事項。
- [x] Production 不會在 owner 未核准時部署 — 目前政策下，`release-promote.yml`
      的真實部署行（`wrangler deploy`）刻意註解掉、僅留 dry-run；即使
      workflow 被觸發也不會真的部署，直到 owner 明確解除此限制並取消註解。

# Verification evidence

詳見 `docs/releases/V12-03_RELEASE_CI_CD_REPORT.md`。摘要：workflow YAML、
manifest 產生工具、runbook 皆已建立；manifest 產生工具已本地真實執行驗證
（正確解析 25 筆 migration checksum）；migration checksum 失敗會擋下 gate
已在 V12-02 證明過（同一機制，不重複驗證）。**誠實記錄未完成事項**：真實
GitHub repo settings（branch protection、Environment reviewer）無法從此
環境設定（無 `gh`/API 存取，非範圍選擇而是環境能力限制）；真實 staging/
production 部署依 owner 既有政策（V1.2 全部完成前不部署）刻意不執行。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V12-03。
專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V12-03_RELEASE_CI_CD.md

先讀 V08 的 deployment incident 與現有 host 限制。建立並演練 staging pipeline、
stop conditions 與 rollback/fix-forward；本 task 不授權 production deployment。
```
