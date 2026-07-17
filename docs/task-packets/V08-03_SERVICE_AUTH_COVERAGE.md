# Task Packet — V08-03 Service Authentication Coverage

Status: IMPLEMENTED_LOCAL_PENDING_TARGET_UPLOAD
Milestone: V0.8 Release Safety  
Dependencies: `V08-01`, `V08-02`  
Tracker: `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`

---

# Objective

讓所有正式 PHP business endpoint 都有不可偽造、可防重放、可追蹤的 server-to-server authentication，並禁止以外部 `X-Member-*` header 作為授權事實。

# Current evidence

目前已存在：

* Next.js `createPhpServiceHeaders()`：HMAC-SHA256、body hash、timestamp、nonce、member ID、workspace ID。
* PHP `ServiceRequestAuthenticator`：TTL、HMAC verify、nonce claim 與 replay rejection。
* `/api/v1` front controller：CORS allowlist、統一 JSON errors、Workspace membership policy。

已知缺口：

* 新簽章架構目前主要覆蓋 `/api/v1` Workspace、GA integration 與 Dashboard workflow routes。
* Legacy GA、SEO、AEO、GEO、Dashboard、Reporting endpoints 數量仍多。
* 必須逐一證明 legacy endpoint 已被 front controller／shared auth 保護、只允許可信 server path，或已正式停用。

# Required work

1. 建立所有 deployable PHP endpoint inventory，分類為：
   * public unauthenticated（只能是明確核准路由）
   * OAuth callback／scheduler special authentication
   * signed BFF business endpoint
   * internal worker／CLI only
   * deprecated／not deployed
2. 追蹤每個 Next.js BFF route 實際呼叫的 PHP endpoint 與 identity propagation。
3. 對所有 signed endpoint 統一 canonical request contract：method、path、body hash、timestamp、nonce、member、workspace。
4. 確認 canonical path 在 Next.js 與 shared-host rewrite 後完全一致。
5. 所有 authorization facts 必須由資料庫 membership／role 解析；header 只提供 signed identity claim。
6. 將 legacy endpoint 收斂至 front controller、共用 bootstrap/auth guard，或從 production payload 排除。
7. 定義 OAuth callback、GAS scheduler、report worker 的獨立 authentication，不得共用瀏覽器 identity header。
8. 限制 CORS、methods、headers；沒有 origin 不代表自動可信，仍需 service auth。
9. 統一錯誤碼，production 不回傳 stack、SQL、secret 或內部路徑。
10. 實作 nonce cleanup／retention，避免 nonce table 無限成長。

# Mandatory negative tests

以下每項都需對實際 staging runtime 執行：

* 無簽章 → 401
* 錯誤簽章 → 401
* 過期 timestamp → 401
* 未來超出 TTL timestamp → 401
* nonce 重放 → 401 `REPLAY_DETECTED`
* body 被修改 → 401
* path 被修改 → 401
* member ID 被修改 → 401
* workspace ID 被修改 → 401／403
* 有效簽章但非 Workspace member → 403
* inactive membership → 403
* viewer 執行 restricted mutation → 403
* forged legacy `X-Member-*` without signed contract → 401
* disallowed CORS preflight → 403
* production error 不曝露內部資訊

# Positive tests

* 列出使用者可存取 Workspace。
* 讀取 Workspace context。
* 讀取 GA integration。
* 執行一個允許的 PATCH mutation，產生 audit evidence。
* Next.js BFF 在 production-like URL／rewrite 下正常運作。

# Safety constraints

* 不得把 `SERVICE_AUTH_SECRET` 傳給 browser。
* 不得用固定 signature、永久 token 或 IP allowlist 取代 HMAC 驗證。
* 不得用 frontend route guard 取代 PHP authorization。
* 不得為保持 legacy compatibility 而保留可直接偽造的 identity header path。
* 不得未經盤點就一次刪除 legacy endpoint；先從部署 payload 排除或提供相容 adapter。

# Required deliverables

1. Endpoint authentication matrix。
2. Next.js BFF → PHP mapping。
3. Code/config changes。
4. Negative／positive test results。
5. Legacy endpoint keep／wrap／deprecate／exclude 決策。
6. Nonce retention／cleanup 設計與驗證。

# Acceptance criteria

- [ ] 每個 production PHP endpoint 都有明確 authentication class。
- [ ] 除 health／核准 public flow 外，business endpoint 無法匿名直接呼叫。
- [ ] 所有 Workspace operation 執行 membership 與 permission check。
- [ ] Replay、tampering、cross-workspace 測試全部 fail closed。
- [ ] Legacy `X-Member-*` spoof path 已消除或從 production payload 排除。
- [ ] Signed BFF positive flow 在 staging 通過。
- [ ] Endpoint matrix 與部署 payload 一致。
- [ ] 主 Tracker 收到可重現驗證證據。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V08-03。

專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V08-03_SERVICE_AUTH_COVERAGE.md

請先完成 endpoint authentication matrix，再修正程式並執行所有 mandatory negative／positive tests。不要為相容性保留可偽造 identity path，也不要部署 production。

完成後依 Required deliverables 回報。
```
