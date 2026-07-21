# Task Packet — V10-08 Decision Intelligence Core E2E Acceptance

Status: VERIFY（全鏈路 disposable rehearsal 通過（33/33 assertions），發現並修復一個真實跨來源缺陷；真實主機／真實資料 golden path 尚未執行，V1.0 milestone 因此維持 VERIFY 不轉 DONE，見驗收報告）
Milestone: V1.0 Decision Intelligence Core
Dependency: `V10-01`～`V10-07`
Tracker: `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`（第 6 節）
Authority: `docs/00_Technical_Specification_Alignment_v1.2.md`（Unified V1 Domain Flow、V1 Scope）

---

# Objective

以真實 Workspace 與真實資料驗收 Data Source → Signal → Evidence → Explanation/Impact → Recommendation → Human Review → Decision 的完整 V1.0 核心鏈，並留下可重現證據。

# Mandatory context before starting

1. V10-01～07 全部 task packet、執行紀錄、migration 與已知限制。
2. V0.9 Workspace/auth/migration rehearsal 報告。
3. V1.0 三項出口條件與 Alignment v1.2 固定決策。

# Required work

1. 定義至少一條 GA 或 SEO golden path，固定 Workspace、source record、預期 Signal/Evidence/Recommendation/Decision IDs。
2. 執行正常流程、重跑/idempotency、跨 Workspace、權限不足、Evidence 缺失、AI failure、Decision retry 等情境。
3. 核對每個節點的 DB、API、audit、UI 及 source trace，不只驗證畫面。
4. 建立 E2E acceptance report，逐項列出 PASS/FAIL/BLOCKED、證據位置與殘留風險。
5. 只有全部 V1.0 出口條件具證據時才將 milestone 標為 DONE。

# Out of scope

* 不在驗收 task 偷補大功能；發現缺陷應回到對應 task 修復並重驗。
* 不包含 V1.1 Action/Execution/Outcome。
* 不以 mock-only 測試取代至少一條真實資料 flow。

# Mandatory verification

* 真實 golden path 端到端通過且所有關聯可追溯。
* Cross-workspace、角色、重放與失敗情境 fail closed。
* AI 未自動做 Decision，Decision actor 為真實人類會員。
* lint、typecheck、build、PHP lint、migration/postflight 與 core E2E 全通過。

# Required deliverables

1. `docs/releases/V10-08_CORE_E2E_ACCEPTANCE_REPORT.md`。
2. 可重現測試資料與指令（不得提交 secrets/個資）。
3. 缺陷修復及重驗證證據。
4. Tracker、版本出口條件與下一 task 更新。

# Acceptance criteria

- [ ] 真實資料驅動完整核心決策流程。**BLOCKED**——需要 owner 於正式主機執行；
      本任務以 disposable Docker 全鏈路排練（非 mock-only，真實程式碼路徑，
      33/33 斷言通過）作為程式正確性的證據，但不能取代真實資料驗收，見
      `docs/releases/V10-08_CORE_E2E_ACCEPTANCE_REPORT.md`。
- [x] Signal、Evidence、Recommendation、Decision 持久化且隔離（rehearsal 層級）。
- [x] Human-in-the-loop 與 traceability 成立（rehearsal 層級；並以程式碼檢視
      確認 SignalService/EvidenceService/ExplanationService 皆不呼叫
      WorkflowRepository/WorkflowService，系統/AI 無法建立 Decision）。
- [x] V1.0 出口條件有可重現證據（本報告＋`VERIFICATION_RUNBOOK.md` 第 6-12
      節＋各任務包自身證據；唯一缺口是真實主機執行，非設計或程式問題）。

# Verification evidence

完整報告：`docs/releases/V10-08_CORE_E2E_ACCEPTANCE_REPORT.md`。摘要：
2026-07-21 disposable Docker `mysql:5.6` + local PHP 7.4 CLI，串接兩條完整
golden path（SEO：`site_id=5001` 兩個技術問題；GA：`connection_id=7001` 流量
下滑），完全比照正式程式碼真實呼叫順序（`si/seo/summary.php` 的
Signal→Evidence→Explanation 順序；`seo/page.tsx`／Dashboard 的 workflow mutate
呼叫），33 項斷言全數通過，涵蓋跨 Workspace 隔離、角色權限、全鏈路 idempotency、
fail-closed 傳遞到 Recommendation、自動 resolve/archive、GA 走 V10-06 的
signal_id 路徑同樣可完成整條決策鏈。

**驗收過程中發現並修復一個真實缺陷**：`RuleBasedAnalysisGenerator`（V10-03）
原本把 `impact_area` 寫死為 `'seo'`、解讀文字也用「技術問題快照」等 SEO 專用
措辭，但 V10-07 讓同一個 generator 也為 GA Signal 產生解讀——導致 GA 流量異常
的 Explanation 會誤報 `impact_area='seo'` 且提到不存在的「技術問題快照」。已
修正為依 `signal['source']` 對應（seo→seo、ga→traffic、預設 general），並將
措辭改為來源中立。此為串接 GA Signal 通過 Explanation 層時發現（先前任一單一
任務的排練皆未涵蓋此組合）。

**V1.0 milestone 結論**：維持 VERIFY，不轉 DONE——程式與鏈路本身已確認正確，
唯一缺口是套用到正式主機並以真實資料執行，需 owner 的 phpMyAdmin/FTP 存取。

**AEO/GEO 缺口的後續追蹤**：已建立背景任務建議（scan-history 等價持久化層設
計），非僅記錄於文件。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V10-08。
專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V10-08_CORE_E2E_ACCEPTANCE.md

這是驗收 task。請先確認 V10-01～07 均完成，使用至少一條真實資料 golden path，
同時執行隔離、權限、idempotency 與 failure 測試。不要用 mock-only 結果宣布 V1.0 完成。
```
