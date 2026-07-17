# Task Packet — V08-04 Cloudflare Environments

Status: WAITING_FOR_V08-01_TO_V08-03  
Milestone: V0.8 Release Safety  
Dependencies: `V08-01`, `V08-02`, `V08-03`  
Tracker: `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`

---

# Objective

將目前單一 Cloudflare Worker 設定拆成可辨識、不可互相污染、可獨立 dry-run 與回滾的 staging／production environments。

# Current evidence

* OpenNext Cloudflare build 已通過。
* Wrangler 4.98.0 dry-run 已通過 top-level configuration。
* 目前 `wrangler.jsonc` 沒有 `$schema`、`env.staging`、`env.production` 或明確 observability。
* `API_HOST` 目前是 top-level plain var。
* `WORKER_SELF_REFERENCE` 目前指向 `highlightsignal`，新增環境後必須核對 environment-specific Worker name。
* 專案仍使用 `middleware.ts`；Next.js build 已警告改用 `proxy` convention。

# Current Cloudflare rules to preserve

依 Cloudflare 官方文件：

* `vars`、bindings 與 secrets 是 environment non-inheritable，必須在每個 environment 明確定義。
* Environment deployment 會形成獨立 Worker name；service binding 必須指到同 environment 的 Worker。
* Sensitive values 不得放入 `vars`，應使用 environment-specific secrets。
* Workers Logs 可用 `observability.enabled` 與 `head_sampling_rate` 設定，staging／production 可分別配置。

References:

* https://developers.cloudflare.com/workers/wrangler/environments/
* https://developers.cloudflare.com/workers/wrangler/configuration/
* https://developers.cloudflare.com/workers/observability/logs/workers-logs/

# Required work

1. 在 `wrangler.jsonc` 加入 config schema reference。
2. 定義 staging 與 production environment，明確指定非秘密 vars、assets、services、routes／workers.dev 與 observability。
3. 確認 Worker naming policy，不在 environment name 曝露敏感專案資訊。
4. `WORKER_SELF_REFERENCE` 在 staging 指向 staging Worker，在 production 指向 production Worker。
5. 盤點每個 environment 的 required secrets；只記名稱，不寫值。
6. 確認 staging 不會呼叫 production PHP／Java backend，除非有明確核准且只讀。
7. 檢查 `NEXT_PUBLIC_*` build-time values 與 Worker runtime vars 的邊界。
8. 將 `middleware.ts` 遷移成 Next.js 支援的 `proxy` convention，驗證保護路由行為不變。
9. 加入或驗證 environment-specific deployment／dry-run scripts。
10. 建立 promotion 與 rollback runbook；本 Task 不實際 production deploy。

# Mandatory verification

```text
npm run lint
npx tsc --noEmit --pretty false
npm run build
npm run build:cf
npx wrangler deploy --env staging --dry-run
npx wrangler deploy --env production --dry-run
npx wrangler types --check
npx wrangler check startup
```

若 `types --check` 或 `check startup` 不適用目前 OpenNext bundle，必須留下工具輸出、原因與替代證據，不能靜默略過。

另外驗證：

* staging／production Worker name 不相同。
* 每個 environment 都有完整的 non-inheritable vars／bindings。
* dry-run 顯示的 service binding 指向正確 environment。
* bundle 不含 secret value。
* staging URL 的登入、受保護 route、logout 與一個 signed BFF route smoke test。

# Safety constraints

* 不得執行 production deploy。
* 不得把 secret 寫入 `wrangler.jsonc`、命令列、commit 或回報。
* 不得讓 staging service binding 指向 production Worker。
* 不得用 top-level fallback 掩蓋 environment 缺少的 non-inheritable 設定。
* 不得將 OpenNext Worker 改成 Pages deployment。

# Required deliverables

1. Environment matrix：Worker、route、API hosts、bindings、secret names、observability。
2. Wrangler／middleware-proxy config changes。
3. 兩個 environment 的 dry-run evidence。
4. Startup／types verification。
5. Promotion／rollback runbook。

# Acceptance criteria

- [ ] staging／production 設定與名稱完全分離。
- [ ] Non-inheritable vars、bindings、secrets 每個 environment 均明確定義。
- [ ] Self service binding 不跨環境。
- [ ] Staging 不寫入 production system。
- [ ] 兩個 dry-run 均通過。
- [ ] Protected route 在 `proxy` migration 後行為不變。
- [ ] Observability 與 rollback 路徑已定義。
- [ ] 主 Tracker 收到可重現證據。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V08-04。

專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V08-04_CLOUDFLARE_ENVIRONMENTS.md

請先讀 Cloudflare 與 Wrangler skill／官方文件，再依任務包調整 staging／production 設定並執行 dry-run。不要部署 production，也不要輸出 secret。

完成後依 Required deliverables 回報。
```
