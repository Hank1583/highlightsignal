# Task Packet — V08-01 Release Baseline

Status: READY  
Milestone: V0.8 Release Safety  
Prepared: 2026-07-17  
Tracker: `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`

---

# Objective

將目前大量未提交變更整理成可審查、可驗證、可回滾的 Release baseline，且不遺失任何既有使用者修改。

# Starting evidence

```text
HEAD: 399fd51a27cf0d6a579020f4b5daddf1a6ae5d25
Modified: 54
Deleted: 1
Untracked entries: 33
Automated test files: 0
```

已知主要變更群組：

* Next.js page、route handler 與 shared library
* Workspace selector、context 與 API
* Dashboard Decision／Task／Outcome UI
* PHP modular backend 與 SQL migrations
* V1 architecture／database／API／infrastructure documents
* Cloudflare/OpenNext deployment configuration

# Required work

1. 取得完整 `git status`、`git diff --stat` 與 untracked file inventory。
2. 按下列類型分類每個變更群組：
   * V1 implementation
   * deployment/configuration
   * documentation
   * generated artifact
   * obsolete/deprecated candidate
   * uncertain ownership
3. 核對 README 所述 PHP source of truth 與目前 untracked `backend/` 的關係。
4. 判斷 `docs/claude-feature-inventory.md` 刪除是否為刻意變更。
5. 確認 `.env.local`、實際 secrets、build output 沒有被納入 release。
6. 產出建議的 commit grouping 與順序。
7. 重新執行 baseline quality checks。
8. 僅在所有權與範圍明確時建立 commit；不明變更保持原狀並列為待確認。

# Mandatory verification

```text
npm run lint
npx tsc --noEmit --pretty false
npm run build
npm run build:cf
npx wrangler deploy --dry-run
```

另外記錄：

* PHP runtime 是否可用
* PHP syntax lint 是否可執行
* migration 是否只完成靜態檢查，或已在資料庫實跑
* 線上 smoke test 是否測試到最新程式碼

# Safety constraints

* 不得執行 `git reset --hard`。
* 不得使用 `git checkout --`、`git restore` 或刪除不明檔案來製造乾淨工作樹。
* 不得輸出 `.env.local` 或任何 secret value。
* 不得假設 untracked `backend/` 可以刪除。
* 不得因 README 與工作樹衝突就擅自選定 PHP source of truth。
* 不得把 production deploy 當成 baseline 整理的一部分。

# Required deliverables

1. 變更分類表。
2. 保留／提交／延後／待確認清單。
3. 建議 commit grouping。
4. Quality check 結果。
5. PHP source-of-truth 結論或明確待決事項。
6. 可回報主追蹤對話的摘要。

# Acceptance criteria

V08-01 只有在以下全部成立時才能標記 `DONE`：

- [ ] 所有 tracked 與 untracked 變更均已分類。
- [ ] 沒有秘密或 generated build output 被納入 release。
- [ ] PHP backend source of truth 已確定，或被明確列為阻擋事項。
- [ ] 刪除檔案的意圖已確認。
- [ ] Commit grouping 可讓後續 security、workspace、migration 工作獨立審查。
- [ ] 五項 mandatory verification 均有可重現結果。
- [ ] 建立 baseline commit／tag，或清楚說明尚不能建立的原因。
- [ ] 主 Tracker 已收到執行證據。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V08-01。

專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V08-01_RELEASE_BASELINE.md

請完整依照任務包盤點、分類及驗證。保留所有既有使用者修改，不要用 restore、reset 或刪檔方式清理工作樹；不要部署 production。

完成後依任務包的 Required deliverables 回報。
```
