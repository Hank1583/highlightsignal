# Task Packet — V08-02 Secret Containment

Status: WAITING_FOR_V08-01  
Milestone: V0.8 Release Safety  
Dependency: `V08-01`  
Tracker: `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`

---

# Objective

建立完整的 secret inventory、移除程式碼與可公開目錄中的秘密、確認忽略規則，並以不曝露實際值的方式取得輪替與部署證據。

# In-scope secret classes

* MySQL credentials
* `JWT_SECRET`
* `PHP_SERVICE_AUTH_SECRET`／`SERVICE_AUTH_SECRET`
* OpenAI API key
* PageSpeed／Google API key
* Google service-account JSON
* AdFusion／internal backend token or key
* Mailer／SMTP credentials
* Cloudflare deployment secrets

# Required work

1. 建立只含名稱、owner、環境、用途、輪替狀態的 secret inventory；不得記錄實際值。
2. 掃描 tracked source、Git history、deployment payload 與 public web root 的 credential pattern。
3. 將 runtime secret 統一移至 environment 或 web root 外的受保護設定。
4. 核對 `.gitignore`：`.env*`、service-account JSON、report config、vendor/runtime storage、build output。
5. 驗證前端 bundle 沒有 server-only secret。
6. 核對 Next.js 與 PHP 的 service secret 名稱映射，但不輸出兩邊實際值。
7. 對已曝露或無法證明未曝露的 credential 建立 rotation plan。
8. 實際輪替外部／production credential 前，先取得使用者明確授權並準備相依服務切換順序與 rollback。

# Authoritative files to inspect

```text
.env.example
.gitignore
lib/jwtSecret.ts
lib/phpServiceAuth.ts
backend/api/.env.example
backend/api/src/Config/Environment.php
backend/api/config/bootstrap.php
backend/api/db_connect.php
backend/api/ga/report/config.php (若存在，只確認位置與 tracked 狀態)
wrangler.jsonc
```

# Mandatory verification

* `git ls-files` 證明 `.env.local`、PHP `.env`、credential JSON 未被 tracked。
* Source／history scan 只回報檔名、secret 類別與處置狀態，不輸出命中的值。
* Production bundle scan 不含 `JWT_SECRET`、service secret 或 private key material。
* 缺少必要 secret 時，Next.js／PHP 必須 fail closed，不可使用 production fallback。
* `.env.example` 只能包含安全 placeholder 與必要說明。

# Safety constraints

* 不得在 terminal、回報、diff、commit message 中輸出 secret value。
* 不得用 `echo SECRET=...`、命令列 argument 或 URL query 傳遞 secret。
* 不得未經授權撤銷或輪替 production credential。
* 不得用刪除 Git history 的方式處理秘密，除非另有明確核准與完整協作計畫。
* 若確認 credential 曾被提交，必須視為 compromised；只從目前檔案刪除不算完成。

# Required deliverables

1. Redacted secret inventory。
2. Exposure findings：secret 類別、位置、是否 tracked／historical、處置。
3. Rotation matrix：old credential 類別、依賴服務、切換順序、驗證與 rollback。
4. Code/config changes。
5. Verification evidence。
6. 尚需使用者授權的 production action 清單。

# Acceptance criteria

- [ ] 所有 in-scope secret class 均已盤點。
- [ ] Git、build output、public payload 不含有效秘密。
- [ ] Server-only secret 不可進入 `NEXT_PUBLIC_*` 或 browser bundle。
- [ ] PHP 與 Next.js 缺 secret 時 fail closed。
- [ ] 已曝露 credential 全部完成輪替，或明確標記 `BLOCKED_EXTERNAL_ROTATION`，不得宣稱完整 DONE。
- [ ] Staging 以新秘密完成 health、auth 與至少一個 signed API smoke test。
- [ ] 主 Tracker 收到不含秘密的驗證證據。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V08-02。

專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V08-02_SECRET_CONTAINMENT.md

請依任務包完成 redacted inventory、source/history/build scan、程式與設定修正。絕對不要輸出 secret value；實際輪替 production credential 前先取得我的明確授權。

完成後依 Required deliverables 回報。
```
