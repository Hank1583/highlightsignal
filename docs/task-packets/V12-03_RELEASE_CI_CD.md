# Task Packet — V12-03 Release CI/CD

Status: PLANNED
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

- [ ] Frontend/PHP/DB 有明確發布順序與阻擋條件。
- [ ] Staging approval、production approval、tag、rollback 可追溯。
- [ ] main auto-deployment 風險受控。
- [ ] Production 不會在 owner 未核准時部署。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V12-03。
專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V12-03_RELEASE_CI_CD.md

先讀 V08 的 deployment incident 與現有 host 限制。建立並演練 staging pipeline、
stop conditions 與 rollback/fix-forward；本 task 不授權 production deployment。
```
