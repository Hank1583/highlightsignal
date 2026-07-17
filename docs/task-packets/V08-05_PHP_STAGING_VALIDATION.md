# Task Packet — V08-05 PHP Staging Validation

Status: WAITING_FOR_V08-01_TO_V08-04  
Milestone: V0.8 Release Safety  
Dependencies: `V08-01`–`V08-04`  
Tracker: `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`

---

# Objective

在與正式主機相同或足夠接近的 PHP／Apache／MySQL 環境，驗證 PHP payload、rewrite、environment、authentication、database connection 與最小 business flow。

# Current evidence

* 本機沒有 `php` executable，現有 PHP 尚未完成 syntax lint。
* 文件指出 shared hosting runtime 為 PHP 7.0.26，且資料庫需維持 MySQL 5.6 相容。
* `backend/api/UPLOAD_README.md` 宣告 `backend/api/` 是完整 upload payload。
* Root README 同時宣告 PHP source of truth 位於另一個 project；此衝突必須先在 `V08-01` 解決。
* 線上 `/highlightsignal/v2/api/v1/health` 曾回應 HTTP 200，但不能證明線上版本等於目前工作樹。

# Required work

1. 確認唯一 PHP source of truth 與部署 payload manifest。
2. 記錄 staging 的 PHP、Apache、MySQL、extensions 與 `open_basedir` 實際版本／限制。
3. 對 payload 中所有 PHP files 執行 syntax lint，不只 `src/`。
4. 驗證 Composer autoload／custom bootstrap、mysqli、JSON、OpenSSL/hash 等必要能力。
5. 驗證 `.htaccess` rewrite 只暴露核准入口，internal files 不可直接下載。
6. 以 staging-only secrets 建立 `.env`，確認檔案不在 public download 範圍。
7. 驗證 health、signed auth、nonce replay、Workspace authorization、DB connection。
8. 驗證至少一個 read 與一個允許的 mutation flow。
9. 驗證 error log、production-safe error response 與 timeout。
10. 建立 PHP 7.0 risk acceptance 或 PHP 8.1+ upgrade decision；不得把 unsupported runtime 當作已解決。

# Mandatory verification

```text
php -v
php -m
php -l <every deployable PHP file>
```

Staging HTTP tests：

* health → 200
* internal source／`.env` download → 403／404
* unsigned business request → 401
* invalid signature → 401
* valid signed request → expected 2xx
* replayed nonce → 401
* non-member Workspace → 403
* invalid JSON → stable 400 contract
* unknown route → stable 404 contract
* DB unavailable simulation or safe equivalent → stable non-sensitive error

# Safety constraints

* 不得以 production database 作為 migration／failure 測試環境。
* 不得在回報中輸出 `.env`、DB DSN、password、service secret 或 account path。
* 不得把 `ga_runner.php` 或已排除的 diagnostic utility 上傳到 production payload。
* 不得因 health 200 就宣稱 PHP application 完整通過。
* 不得在 PHP 7.0 上使用未經 lint／runtime 驗證的 PHP 7.1+ syntax。

# Required deliverables

1. Redacted runtime inventory。
2. Deploy payload manifest。
3. PHP lint report：總數、pass、fail、excluded 及原因。
4. HTTP smoke／negative test report。
5. Error-log evidence，不含敏感資訊。
6. PHP runtime upgrade decision／risk owner／deadline。

# Acceptance criteria

- [ ] 所有 deployable PHP files 在 target-compatible runtime lint 通過。
- [ ] Rewrite、public entry point 與 private config 邊界通過。
- [ ] Signed auth 與 Workspace negative tests 通過。
- [ ] Read／mutation positive flow 通過 staging。
- [ ] Staging 使用隔離資料與秘密。
- [ ] Runtime unsupported risk 有正式決策，不被隱藏。
- [ ] 主 Tracker 收到可重現證據。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V08-05。

專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V08-05_PHP_STAGING_VALIDATION.md

請依任務包在 staging／target-compatible PHP runtime 完成 lint 與 HTTP 驗證。不要使用 production database 做破壞性測試，不要輸出任何 secret。

完成後依 Required deliverables 回報。
```
