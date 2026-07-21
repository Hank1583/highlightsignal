# Task Packet — V12-05 Performance, Security & Privacy Release Audit

Status: PLANNED
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

- [ ] 無未處理 P0/P1 release blocker。
- [ ] Critical CWV/API/queue 指標符合已核准門檻。
- [ ] Privacy/data lifecycle 可操作且經驗證。
- [ ] 所有殘留風險有 owner、期限、理由。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V12-05。
專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V12-05_PERFORMANCE_SECURITY_PRIVACY_AUDIT.md

請在 production-like staging 稽核，不要對 production 做未授權壓測。先定 threshold，
保留 before/after；P0/P1 必須修復重驗，其他風險需 owner 與到期日。
```
