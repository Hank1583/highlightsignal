# Task Packet — V10-03 Explanation & Business Impact Separation

Status: VERIFY（程式與 SQL 完成，2026-07-21 於 disposable 本機 Docker MySQL 5.6＋PHP CLI harness 驗證 idempotency/fail-closed/citation 邏輯；尚未套用至真實主機，尚未上傳 PHP）
Milestone: V1.0 Decision Intelligence Core
Dependency: `V10-02`
Tracker: `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`（第 6 節）
Authority: `docs/00_Technical_Specification_Alignment_v1.2.md`（Explanation、Business Impact、Human governance）

---

# Objective

讓系統能根據 Signal 與 Evidence 分別產生「如何解讀」和「可能造成何種商業影響」，並在 DB、API、UI 中維持兩者與 Evidence 的明確界線。

# Mandatory context before starting

1. V10-01/02 的實際 schema、API 與驗證紀錄。
2. 既有 Dashboard AI compose/plan 流程與 AI usage logging。
3. Alignment v1.2 第 3、4、6、7、10、11 節；不得建立獨立 Insight table/module。

# Required work

1. 決定並記錄 Explanation/Impact 的持久化模型；可同屬 Evidence Domain 的 analysis record，但 API 欄位必須分開。
2. 每次產生需保存 evidence references、rule/model/provider/version、prompt/template version、產生時間與不確定性；AI 輸出不得回寫成 Evidence。
3. Business Impact 至少包含 impact area、direction、magnitude/confidence 或 unknown、依據與限制；不得用沒有 Evidence 的確定語氣。
4. 建立 Workspace-scoped read/generate API；AI 呼叫需有 quota/error handling，重試不得產生無限重複版本。
5. 在最小 UI 中分區顯示 Evidence、Explanation、Business Impact，標示資料來源與 AI/規則性質。

# Out of scope

* 不建立 Recommendation、Decision 或 Action。
* 不實作 Autonomous Learning 或獨立 Insight Domain。
* 不以 AI 文字覆蓋原始 Evidence snapshot。

# Mandatory verification

* API contract 與 UI 明確輸出三個區塊：Evidence、Explanation、Business Impact。
* 每段 Explanation/Impact 都能列出使用的 evidence IDs。
* Evidence 不足、模型 timeout、quota exhausted 時 fail closed 並顯示限制，不捏造結果。
* Workspace 隔離、版本重現與 audit/AI usage 記錄通過。

# Required deliverables

1. Persistence/API/UI separation 實作與契約。
2. AI/rule metadata、uncertainty 與 evidence citation 規則。
3. 正常、Evidence 不足與模型失敗三類驗證證據。
4. Tracker 與 task packet 更新。

# Acceptance criteria

- [x] Explanation 不冒充 Evidence。→ `signal_analyses` 沒有覆寫任何
      `evidence_items` 欄位，只用 `evidence_ids_json` 引用。
- [x] Business Impact 與 Explanation 分開儲存及呈現。→ 同一 row 但欄位分組
      （`explanation_*` vs `impact_*`），API `normalize()` 輸出為
      `explanation`／`business_impact` 兩個獨立物件。
- [x] 輸出可回到 Evidence 並保留模型/規則版本。→ `evidence_ids_json` 記錄
      引用的 Evidence id；`generator_type`／`generator_version` 記錄規則
      版本（`rule-v1`）。
- [x] 失敗與不確定性不被隱藏。→ `status` 欄位（`ok`／`insufficient_evidence`／
      `failed`）明確標示，disposable rehearsal 確認無 Evidence 時所有內容
      欄位皆為 null/unknown，不捏造。

**設計決策：規則式產生，非呼叫外部 AI**——理由與 dashboard_ai_compose.php
既有 fallback 模式的關係，見下方執行紀錄。

**尚未完成（需要 owner 執行正式環境操作）**：真實主機套用
`migrations/026`、上傳 `backend/api/src/Explanation/**`、真實站點
end-to-end HTTP 驗證。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V10-03。
專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V10-03_EXPLANATION_BUSINESS_IMPACT.md

先讀 V10-01/02 的完成紀錄。請保持 Evidence、Explanation、Business Impact 三者
在 schema、API、UI 中可區分，不建立 Insight table，不產生 Recommendation 或
Decision。完成後更新 Tracker 並附失敗情境證據。
```

# 執行紀錄（2026-07-21）

## 規則式 vs AI 生成的決定

選擇規則式生成（`RuleBasedAnalysisGenerator`），不呼叫外部 AI API。理由：
(1) 這是接在 SEO 掃描之後同步觸發，每次掃描都呼叫外部 AI API 會有額外成本與
timeout 風險；(2) 規則式輸出對「Evidence 不足時 fail closed」更容易保證，不
會因為 AI 生成而意外捏造內容；(3) spec 明文允許「AI 或規則」，且
`backend/api/dashboard/ai_compose.php` 已經示範這個專案「AI 呼叫＋規則式
fallback」的既有模式——未來若要幫這裡加真正的 AI 呼叫，應該比照那個模式
（先試 AI、失敗時 fallback 到規則），而不是取代規則式生成。

## Schema／Idempotency

`signal_analyses`（`backend/sql/migrations/026_signal_analysis_persistence.sql`）
是全新表，正式 NOT NULL FK。Explanation 與 Business Impact 同表不同欄位群組
（`explanation_*` vs `impact_*`），API 輸出時拆成兩個獨立物件。

`analysis_key = sha256(signal.dedup_key . 排序後的 evidence id 清單 .
generator_version)`——同一 Signal、同一組 Evidence、同一版本規則重複產生時
upsert 同一筆（`attempt_count` 遞增），不會產生無限重複版本；Evidence 組合
真的改變（新連結一筆 Evidence）或規則版本升級才會產生新的一筆。

## 程式

`backend/api/src/Explanation/`（`ExplanationRepository`／`ExplanationService`／
`ExplanationController`，唯讀，同 Evidence 只由系統產生)＋
`Explanation/Generator/RuleBasedAnalysisGenerator.php`（無 DB 存取,可獨立
測試)。`ExplanationService::generateForSignal()`：Evidence 數量為 0 時直接
`insufficient_evidence`（不呼叫 generator）；generator 拋例外時記錄
`failed`；正常時記錄 `ok` 並附上 evidence citation。路由：
`GET /api/v1/workspaces/{id}/signals/{signalId}/analysis`。

## 觸發點與前端

`si/seo/summary.php` 在 Evidence 記錄之後，重新跑一次
`SeoTechnicalIssueDetector::diff()` 找出這次掃描觸及的 Signal，逐一呼叫
`ExplanationService::readOrGenerateForSignal()`。前端
`app/(app)/seo/page.tsx`「技術問題」分頁的 Signal 卡片新增「查看解讀與影響
評估」展開按鈕，讀取 `GET /api/workspaces/{id}/signals/{signalId}/analysis`
（新 BFF route），分三個視覺區塊顯示 Evidence 引用、Explanation（含信心度與
「規則式產生」標示）、Business Impact（含限制說明）。

## 驗證證據

**PHP lint**：全部新/改檔案 `php -l` 通過。**前端**：`npm run lint`／
`npx tsc --noEmit`／`npm run build` 三項 PASS（過程中順手清掉一份卡在
`.next/dev/types/validator.ts` 的損毀舊快取檔案，與本次程式改動無關，是先前
`npm run dev` session 留下的殘留物；清掉 `.next` 後 rebuild 正常，另外抓到並
修正一個真正的 TypeScript 型別錯誤——新的 `analysis` BFF route 呼叫
`createPhpServiceHeaders()` 少傳了正確的 identity 物件參數）。

**Disposable 本機 Docker `mysql:5.6`＋PHP CLI rehearsal**：
Signal 無 Evidence 時 → `insufficient_evidence`,內容全為 null；補上 Evidence
後重新產生 → `status=ok`,正確引用 Evidence id,HIGH severity 對應
`impact_magnitude=material`；同組 Evidence 重複產生 → 同一筆 row
（`attempt_count` 1→2),非新增第 3 筆；第二個獨立問題 → 自己的 Signal／
Evidence／Analysis,MEDIUM severity 對應 `moderate`。全程只有 3 筆
analysis row（非重複)。跨 Workspace 隔離：workspace 2 全程 0 筆。Postflight
的「fail-closed 狀態不得有捏造內容」檢查回傳 0 筆違規。

**尚未執行（需要 owner 執行正式環境操作）**：真實主機套用
`migrations/026`、上傳 `backend/api/src/Explanation/**`／`si/seo/summary.php`
變更、真實站點 end-to-end HTTP 驗證。
