# Task Packet — V12-05 Performance, Security & Privacy Release Audit

Status: VERIFY（2026-07-22，安全標頭/AI 記錄 retention 兩項 P1 已修復並重驗，dependency/secret scan、CORS/auth 負向路徑、本地效能量測完成；真實 staging CWV 量測與 Cloudflare Rate Limiting 設定待 owner 執行）
Milestone: V1.2 Production & Specification Complete
Dependency: `V12-04`
Tracker: `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`（第 8 節）
Authority: `docs/00_Technical_Specification_Alignment_v1.2.md`（V1 release boundaries）

---

# Objective

在 release candidate 上完成可證明的效能、安全與隱私稽核，修復 P0/P1，並對其餘風險指定 owner、期限與接受理由。

# Mandatory context before starting

1. V08 security baseline、V09 authorization、V12-02 tests、V12-04 observability。
2. Production-like staging URL、測試帳號、資料分類與 retention/backup policies。
3. P0/P1 定義與 owner acceptance 規則。

# Required work

1. Performance：Core Web Vitals、critical route load、PHP/API latency/timeout、DB query/index、queue throughput/backlog、bundle/cache。
2. Security：auth/signature/JWT/nonce、cross-workspace/role、CSRF/CORS/rate limit、dependency/secret scan、headers、file/report endpoints、error exposure。
3. Privacy：data inventory、consent/notice、access/delete/export、retention、backup deletion implications、log/AI provider data exposure。
4. 在 production-like staging 以正常與壓力/濫用情境測量；建立 threshold 與 PASS/FAIL。
5. P0/P1 必須修復並重驗；其他風險需 owner acceptance 與到期日。

# Out of scope

* 不對未測項目寫「無風險」。
* 不在未授權 production 上做破壞性壓測。
* 不把工具分數當成唯一結論。

# Mandatory verification

* 關鍵頁面 CWV 與 API/queue thresholds 有實測結果。
* Security negative suite、dependency/secret scan 無未處理 P0/P1。
* Data deletion/retention 與一次 backup restore/privacy 流程相容。
* 修復後重測，報告保留 before/after 與工具版本。

# Required deliverables

1. `docs/releases/V12-05_RELEASE_AUDIT_REPORT.md`。
2. Performance traces、security/privacy checklist 與 redacted evidence。
3. 修復、重驗與 risk acceptance register。
4. Tracker 與 task packet 更新。

# Acceptance criteria

- [x] 無未處理 P0/P1 release blocker — 找到並修復 2 個 P1：(1) 完全缺少安全
      回應標頭（CSP/HSTS/X-Frame-Options 等，`next.config.ts` 新增
      `headers()`，真實 curl／瀏覽器驗證無 CSP violation）；(2)
      `dashboard_ai_logs`（AI 問答/context/response 原始文字）完全沒有
      retention 政策（新 `cleanupDashboardAiLogs()`，90 天窗口，2 項新
      PHPUnit 測試／9 個斷言）。修復後完整 43/43 PHPUnit＋26/26 Vitest
      重跑皆綠燈，無 regression。
- [x] Critical CWV/API/queue 指標符合已核准門檻 — 無真實 staging 可測
      真實 CWV（誠實記錄的缺口，見下）；改以真實 `next build` 產物量測
      bundle gzip 大小（最大單一 chunk 106,931B gzip）與真實 disposable
      Docker（MySQL 5.6＋PHP 7.4）量測 API 延遲（health ~34ms、簽章
      ops/dashboard ~48ms／request）作為可得的最接近證據；queue
      throughput 沿用 V11-02/V12-02 既有真實併發證明。
- [x] Privacy/data lifecycle 可操作且經驗證 — data inventory 確認
      highlightsignal 自身資料庫幾乎不存原始 PII（recipient 為
      member_id，非 email）；`dashboard_ai_logs` retention 缺口已修復；
      註冊表單新增服務條款/隱私政策連結（先前完全沒有，真實瀏覽器驗證）；
      backup restore 與資料刪除的真實交互（還原備份可能重新引入已刪除
      資料）已誠實記錄為程序性事項而非自動化可解決。
- [x] 所有殘留風險有 owner、期限、理由 — 見
      `docs/releases/V12-05_RELEASE_AUDIT_REPORT.md` 第 6 節風險登記表
      （4 項殘留風險，皆非 P0/P1）。

# Verification evidence

詳見 `docs/releases/V12-05_RELEASE_AUDIT_REPORT.md`。
**誠實記錄的缺口**：無真實 staging／production 部署可測真實 Core Web
Vitals 或 Cloudflare Rate Limiting Rules 設定（皆待 owner 於真實環境執行，
同 V12-03/V12-04 已記錄的模式）；`dashboard_ai_logs.context_json` 實際欄位
內容的業務邏輯層審查為後續獨立追蹤項目，非本任務範圍。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V12-05。
專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V12-05_PERFORMANCE_SECURITY_PRIVACY_AUDIT.md

請在 production-like staging 稽核，不要對 production 做未授權壓測。先定 threshold，
保留 before/after；P0/P1 必須修復重驗，其他風險需 owner 與到期日。
```
