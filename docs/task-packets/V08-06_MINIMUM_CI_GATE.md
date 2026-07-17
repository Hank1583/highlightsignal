# Task Packet — V08-06 Minimum CI Gate

Status: IMPLEMENTED_LOCAL_PENDING_FIRST_CI_RUN
Milestone: V0.8 Release Safety  
Dependencies: `V08-01`–`V08-05`  
Tracker: `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`

---

# Objective

建立每次變更都會執行、失敗即阻止發布的最小 CI Gate，固定 V0.8 已驗證的前端、Cloudflare 與 PHP 品質門檻。

# Current evidence

* Repository 目前沒有可辨識的 CI workflow。
* `package.json` 有 lint、Next build、OpenNext build，但沒有 `typecheck`、`test` 或統一 `verify` script。
* 自動化 test files 為 0；完整測試套件排在 `V12-02`，但 V0.8 不能沒有基本 release gate。
* PHP 本機無 runtime，CI／staging 必須提供 syntax lint evidence。

# Required work

1. 選定現有 repository 實際使用的 CI provider；不要平行建立第二套 CI。
2. 固定 Node 與 package manager version，使用 lockfile deterministic install。
3. 新增清楚的 `typecheck` 與 aggregate verification scripts。
4. CI 執行 ESLint、TypeScript、Next build、OpenNext build。
5. 驗證 staging／production Wrangler config dry-run，不執行 deploy。
6. 對所有 deployable PHP files 執行 target-compatible syntax lint。
7. 加入 secret／forbidden artifact check，禁止 `.env`、credential JSON、`.open-next`、runtime storage 被提交。
8. 保存必要 build／verification summary；不得保存含 secret 的 artifact。
9. 設定 failure propagation，任何必要 job 失敗都使整體 workflow 失敗。
10. 建立一個受控的故意失敗案例，證明 Gate 真的阻擋。

# Minimum CI commands

```text
npm ci
npm run lint
npm run typecheck
npm run build
npm run build:cf
npx wrangler deploy --env staging --dry-run
npx wrangler deploy --env production --dry-run
php -l <every deployable PHP file>
```

如 Cloudflare dry-run 需要 credentials，應使用最小權限的 CI secret／token，且只能驗證指定 account/project；若 dry-run 可在無登入狀態完成，優先避免提供部署 token。

# Required negative proof

至少示範一項受控失敗，並在證明後恢復正確程式：

* ESLint violation
* TypeScript error
* PHP syntax error
* 缺少 required environment configuration
* forbidden secret/artifact fixture

CI 必須因此失敗；僅有綠色執行紀錄不足以證明 Gate 有效。

# Safety constraints

* CI 不得自動 production deploy。
* Pull request／一般 branch 不得取得 production secrets。
* 不得在 workflow、log 或 artifact 中輸出 secret。
* 不得用 `continue-on-error`、忽略 exit code 或空的 fallback 讓必要檢查假綠。
* 不得把沒有測試檔案的 `test` command 當成測試已完成。

# Required deliverables

1. CI workflow／configuration。
2. Package scripts 與版本固定方式。
3. Success run evidence。
4. Controlled failure evidence。
5. CI secret／permission matrix，不含值。
6. Known gap：完整 automated tests 仍由 `V12-02` 追蹤。

# Acceptance criteria

- [ ] 每個必要 command 都在乾淨 CI environment 執行。
- [ ] Frontend、OpenNext、Wrangler config 與 PHP lint 均受 Gate 保護。
- [ ] 必要步驟失敗會阻止 merge／release。
- [ ] PR／branch 無 production deployment capability。
- [ ] 綠色與受控紅色執行證據均存在。
- [ ] Workflow 沒有 secret leakage 或假綠設定。
- [ ] 主 Tracker 收到可重現證據。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V08-06。

專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V08-06_MINIMUM_CI_GATE.md

請依任務包建立最小 CI Gate，提供成功與受控失敗證據。不要自動部署 production，也不要把沒有測試的狀態宣稱為測試已完成。

完成後依 Required deliverables 回報。
```
