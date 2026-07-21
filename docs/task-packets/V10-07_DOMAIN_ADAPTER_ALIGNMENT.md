# Task Packet — V10-07 GA/SEO/AEO/GEO Adapter Alignment

Status: VERIFY（GA/SEO 兩條 vertical slice 程式完成，disposable Docker 排練通過；AEO/GEO 為明確 deferred gap，見下方說明；真實主機驗證待 owner 執行）
Milestone: V1.0 Decision Intelligence Core
Dependency: `V10-01`～`V10-06`、`V09-08`
Tracker: `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`（第 6 節）
Authority: `docs/00_Technical_Specification_Alignment_v1.2.md`（Integration、Data Source、Connector、Module Boundaries）

---

# Objective

讓既有 GA、SEO、AEO、GEO 能力透過一致 Adapter/Service 邊界輸入 Signal 與 Evidence，同時保留 legacy response compatibility，避免每個模組自行建立第二套 domain flow。

# Mandatory context before starting

1. V09-03/04/08 的 ownership 決策與所有 legacy endpoints。
2. V10-01～06 的 Signal/Evidence/Recommendation contracts。
3. `GaIntegrationRepository/Service`、`lib/ga`、`lib/seo`、`lib/si` 與 PHP SI/SEO routes。

# Required work

1. 盤點四個來源的 observation、metric、scan result、identity 與 freshness contract。
2. 建立或收斂 Adapter interface，把 legacy payload 轉成穩定的 source observation/evidence DTO；不得讓 adapter 寫 Decision。
3. 至少完成 GA 與 SEO 兩條 vertical slice；AEO/GEO 若資料不足，必須提供 contract test 與明確 deferred gap。
4. 所有 Adapter 以真實 Workspace context 執行，移除 `memberId` fallback 作 tenant boundary。
5. Legacy routes/response 在相容期保留，並建立 deprecation/cleanup 條件。

# Out of scope

* 不一次重寫所有 legacy PHP。
* 不在 Adapter 內放 UI 或 Human Review logic。
* 不引入第二套 Signal/Evidence schema。

# Mandatory verification

* GA 與 SEO 各完成 Source → Adapter → Evidence/Signal → Dashboard trace。
* 同一輸入重跑維持 idempotent，錯誤來源不污染其他 Workspace。
* Legacy response contract tests 通過。
* AEO/GEO 未完成項有 owner、原因與後續 task，不得假裝完成。

# Required deliverables

1. Adapter contracts、implementations 與 mapping 文件。
2. GA/SEO vertical slice；AEO/GEO 實作或明確 gap。
3. Compatibility、idempotency、Workspace isolation 測試。
4. Tracker 與 task packet 更新。

# Acceptance criteria

- [x] GA、SEO 兩條 vertical slice 通過 — SEO 沿用 V10-01 既有
      `SeoTechnicalIssueDetector`／`si/seo/summary.php` 路徑；GA 新增
      `GaTrafficAnomalyDetector`（流量下滑規則），接到 `ga/data_sync.php`
      每日 `ga_daily_summary` 寫入後，與既有 `SignalService`/`EvidenceService`
      共用同一組 `signals`/`evidence_items` schema。
- [x] 四個來源共用正式 domain contracts — `SignalService::applyDetectionPlan()`
      抽出為共用收斂點，SEO 與 GA 的 detector 都只需回傳同一形狀的
      `{to_upsert, to_resolve}` plan；Dashboard（V10-06 `TodaySignals.tsx`）
      不分來源，GA 偵測到的 Signal 自動出現在同一決策流程，無需前端改動。
      AEO/GEO 為明確 deferred gap（見下方 Verification evidence）。
- [x] Legacy compatibility 與 tenant isolation 未退化 —
      `ga/data_sync.php` 的 HTML streaming console 輸出格式完全未變；新增邏輯
      使用既有已解析的 `$workspace_id`（`hs_resolve_member_workspace_id()`），
      非 memberId fallback；disposable rehearsal 證明跨 Workspace 對同一
      `connection_id` 數值各自獨立。
- [x] Adapter 不跨越 Human Review — `GaTrafficAnomalyDetector`／
      `SignalService`／`EvidenceService` 皆不建立 Recommendation 或 Decision，
      只寫入 Signal/Evidence（與既有 SEO 路徑相同分工）。

# Verification evidence

**GA/SEO vertical slice**：`backend/api/src/Signal/Detector/GaTrafficAnomalyDetector.php`
（新檔，無資料庫存取，trailing baseline drop 規則：≥50% 高、≥25% 中、基準天數
<3 或基準平均 sessions<10 一律不判定）；`SignalService.php` 抽出
`applyDetectionPlan()` 供 SEO／GA 共用；`EvidenceService.php` 新增
`recordGaTrafficAnomalyEvidence()`；`ga/data_sync.php` 每日摘要寫入後接上
偵測，try/catch 保護不影響原本 sync console 輸出。

2026-07-21 disposable Docker `mysql:5.6` + local PHP 7.4 CLI 排練（22 項斷言
全數通過）：detector 單元行為（基準天數不足／基準過小不判定、5% 不算異常會
resolve、30%/60% 對應 medium/high、dedup key 跨數值穩定）；完整 Signal
生命週期（建立→bump→resolve→reopen，全程只有 1 筆 row）；跨 Workspace 對同一
`connection_id` 各自獨立；Evidence 記錄與連結、相同數值 dedup、不同數值產生新
snapshot；**回歸測試**：抽出 `applyDetectionPlan()` 後 SEO 偵測仍正確建立/
解決；`data_sync.php` 實際使用的 baseline SQL 語法與計算結果正確。詳見
`backend/sql/VERIFICATION_RUNBOOK.md` 第 12 節。

**AEO/GEO：明確 deferred gap，非假裝完成**。讀完
`backend/api/si/generate_common.php` 確認：AEO/GEO 輸出是每次請求即時計算的
文案／內容建議草稿（衍生自 SEO 關鍵字與問題資料），沒有任何 scan-history
等價的持久化表可比對前後差異，也沒有像 SEO 問題（site+type+url）或 GA
sessions 那樣穩定可比對的「問題身分」。在沒有歷史快照表的情況下硬做 diff/
dedup，等同於臆造一個「AI 能見度分數變化多少算異常」的門檻，且比 SEO 當初的
情況更沒有根據。**Owner／後續任務**：需要先設計並建立 AEO/GEO 的
scan-history 等價持久化層（依 site+tab 儲存每次 score/item list），才能誠實地
寫偵測規則；新增資料表屬於 schema 決策，非本任務授權範圍（`不引入第二套
Signal/Evidence schema`）。建議另開任務包（例如 `V10-07b` 或併入後續 V1.1
任務）追蹤此缺口；在此之前，AEO/GEO 頁面維持任務包允許的現狀——Evidence/
raw-data drill-down，沒有 Signal-backed 決策流程。

**尚未執行（需要正式主機）**：對真實 Google Analytics property 執行真實多日
sync，確認偵測邏輯在真實（非合成）數值下正確觸發；真實跨 Workspace HTTP
負向測試；與先前每個 V10 任務相同的缺口類別。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V10-07。
專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V10-07_DOMAIN_ADAPTER_ALIGNMENT.md

先盤點再收斂 Adapter 邊界，至少完成 GA 與 SEO 兩條真實 vertical slice。
保持 legacy response compatibility；Adapter 不得建立 Decision 或 Action。
```
