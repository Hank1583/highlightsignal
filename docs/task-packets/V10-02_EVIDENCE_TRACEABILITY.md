# Task Packet — V10-02 Evidence Persistence & Traceability

Status: VERIFY（程式與 SQL 完成，2026-07-21 於 disposable 本機 Docker MySQL 5.6＋PHP CLI harness 驗證 dedup/immutability/traceability 邏輯；尚未套用至真實主機，尚未上傳 PHP）
Milestone: V1.0 Decision Intelligence Core
Dependency: `V10-01`
Tracker: `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`（第 6 節）
Authority: `docs/00_Technical_Specification_Alignment_v1.2.md`（Evidence、Database/API Alignment）

---

# Objective

建立可持久化、不可混淆且可回到原始資料或快照的 Evidence，並以正式關聯連接 Signal；Evidence 必須是可驗證事實，不得混入 AI Explanation 或 Business Impact。

# Mandatory context before starting

1. `V10-01_SIGNAL_PERSISTENCE.md` 的 Signal schema、dedup 與 source reference 決策。
2. `seo_scan_history`、GA summary/conversion tables 與既有 API response。
3. Alignment v1.2 第 4、6、7、8、9 節；`docs/5.database/05_Evidence_Database.md` 只能在不衝突時採用。

# Required work

1. 建立 `evidence` 與 `signal_evidence`（或等價且文件化的關聯）migration；所有資料必須有 `workspace_id`、`public_id`、source type/reference、observation window、captured/observed time、內容摘要與完整性 hash。
2. 明確決定 Evidence 儲存 snapshot、normalized metric、外部 reference 或組合；若只存 reference，來源刪除後仍須保留可審查的最小快照。
3. 建立 Evidence Repository/Service/Controller，列表與單筆讀取均走 Workspace policy。
4. 將 V10-01 的第一個真實 Signal 接上至少一筆 Evidence，並保證重跑不重複建立相同 snapshot。
5. 提供未來 Recommendation 引用 Evidence 的穩定介面，但本 task 不正式化 Recommendation。

# Out of scope

* 不產生 AI Explanation、Business Impact 或 Recommendation。
* 不建立獨立 Metric Domain；Metric 屬 Evidence Domain。
* 不把可變的外部 URL 當作唯一證據。

# Mandatory verification

* 從一筆真實 Signal 可追到原始 scan/metric 或保存的快照。
* 來源變更或刪除後，既有 Evidence 仍能呈現當時事實與 hash。
* Workspace A 無法讀取 Workspace B Evidence；錯誤 signal/evidence workspace 組合被 DB 或 Service 拒絕。
* 重跑同一偵測資料不會產生重複 Evidence link。

# Required deliverables

1. Evidence schema、migration、postflight 與 bookkeeping。
2. Repository/Service/Controller/API contract。
3. 至少一條真實 Signal → Evidence traceability 證據。
4. Tracker 與 task packet 更新。

# Acceptance criteria

- [x] 每個正式 Signal 至少可連到一筆可驗證 Evidence。→ `EvidenceService::recordSeoTechnicalIssueEvidence()`
      對每筆偵測到的 SEO 問題都建立/更新 Evidence 並連結到對應 Signal；
      disposable rehearsal 確認全部 `source='seo'` Signal 皆有 ≥1 筆連結
      （`postflight_v10_02_evidence_invariants.sql` 第 3 段查詢驗證此不變量）。
- [x] Evidence 與 Explanation／Impact 欄位及 API 明確分離。→ `evidence_items`
      沒有任何 AI 解讀或 Business Impact 欄位，`payload_json` 只存客觀事實
      （type/severity/url/message），程式碼未引用 `recommendations` 表。
- [x] Snapshot/reference retention 決策有文件與測試。→ 選擇「snapshot」
      （`payload_json`＋`content_hash`，非外部 reference），理由與 rehearsal
      證據見下方執行紀錄；rehearsal 實際刪除來源 `seo_scan_history` 列後確認
      Evidence 仍完整可驗證。
- [x] Workspace ownership 與 dedup 驗證通過。→ 正式 `NOT NULL` FK；rehearsal
      確認同內容重複偵測不產生重複 row/link，內容真的改變才產生新 row 且舊
      snapshot 不被覆寫；跨 Workspace 隔離（workspace 2 全程 0 筆）。

**尚未完成（需要 owner 執行正式環境操作）**：真實主機套用
`migrations/025`、上傳 `backend/api/src/Evidence/**`／`public/index.php`／
`si/seo/summary.php`、對真實 SEO 站點觸發重新掃描以驗證真正的 end-to-end
HTTP 流程與跨 Workspace HTTP 負向測試。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V10-02。
專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V10-02_EVIDENCE_TRACEABILITY.md

先確認 V10-01 已完成且讀完其實作紀錄。只建立 Evidence 與 Signal-Evidence
traceability，不做 Explanation、Impact 或 Recommendation。完成後附一條真實
資料的端到端追溯證據並更新 Tracker。
```

# 執行紀錄（2026-07-21）

## docs/5.database/05_Evidence_Database.md 的取捨

該份參考文件是為完全不同的架構假設寫的草稿（UUID 主鍵、PostgreSQL JSONB、
獨立 `evidence_sources`／`evidence_relationships` graph 表），與主規格文件
（`00_Technical_Specification_Alignment_v1.2.md` 第 7／8 節：MySQL-only、
最小化 V1 module boundary、避免過度設計）直接衝突，因此依任務包指示「只能在
不衝突時採用」，只沿用其中不衝突的概念（evidence_type／title／summary／
source attribution／snapshot／traceability），捨棄 UUID 主鍵、獨立
`evidence_sources` lookup 表、`evidence_relationships` graph——這些在 V1
沒有具體使用情境，比照 `signals` 表已經確立的 BIGINT PK＋CHAR(36) public_id
慣例與最小化欄位原則。

## Schema 設計

同 `signals`（V10-01），`evidence_items`／`signal_evidence_links` 是全新表，
不需要 expand/backfill/deferred-contract 三階段，`workspace_id` 從建表就是
正式 `NOT NULL` FK。

* **Snapshot，不是 reference**：`payload_json`（LONGTEXT）是觀測事實的完整
  複本，不是指回 `seo_scan_history` 的外鍵——來源列之後被刪除或清理
  （`V11-08` 資料保留機制）時，Evidence 仍完整呈現當時事實，`content_hash`
  仍可驗證完整性。這是任務包列出的兩個選項之一，已選定並在 rehearsal 中
  實際驗證（刪除來源列後 Evidence 仍完整）。
* **Dedup／不可變性設計**：`content_hash` 只對「定義這個事實是什麼」的欄位
  算 sha256（type／severity／url／message），刻意排除每次重新掃描都會變的
  `scanned_at`／`scan_history_id`。`dedup_key = sha256(signal_dedup_key .
  content_hash)`，其中 `signal_dedup_key` 就是 `signals.dedup_key`
  （migrations/024）算出來的同一個值——這讓 `EvidenceService` 不需要額外的
  lookup 表就能找到某筆 Evidence 屬於哪一個 Signal。結果：同樣內容重複偵測
  只會更新既有 row（`source_ref_id`／`last_observed_at`)，內容真的改變（例如
  severity 變了）才會產生新 row，舊 snapshot 永遠不會被覆寫。
  `signal_evidence_links` 用 `UNIQUE(signal_id, evidence_id)` ＋
  `INSERT IGNORE`，重複連結是靜默 no-op。

## Repository／Service／Controller

比照 `SignalRepository`／`SignalService`／`SignalController` 的分層慣例：

* `backend/api/src/Evidence/EvidenceRepository.php`：純 persistence。
  `upsertByDedupKey()` 的 `ON DUPLICATE KEY UPDATE` 子句刻意不包含
  `payload_json`／`content_hash`／`observed_at`，只更新
  `source_ref_id`／`last_observed_at`／`title`／`summary`，確保原始 snapshot
  凍結不變。`linkSignalEvidence()` 用 `INSERT IGNORE`。
* `backend/api/src/Evidence/EvidenceService.php`：`recordSeoTechnicalIssueEvidence()`
  是系統觸發入口（不需要 `ServiceIdentity`／權限檢查，理由同 V10-01 的
  Signal 偵測——這不是人類 mutation）。**獨立重新呼叫**
  `SeoTechnicalIssueDetector::diff()`（無 DB 存取、狀態，重算成本低），不依賴
  `SignalService` 回傳任何東西——兩者都是這個 stateless Detector 的獨立
  消費者，只共用同一份 plan 邏輯，不互相耦合。透過注入的 `SignalRepository`
  以 `item['dedup_key']`（= Signal 的 issue identity）查出對應 Signal 的
  `id` 後才建立連結；找不到對應 Signal 時記錄 fact 但不連結（`unmatched`
  計數），不假設 Signal 一定先存在。
* `backend/api/src/Evidence/EvidenceController.php`：**唯讀**，沒有任何
  mutation 端點需要 `WorkspacePermissions` 把關（Evidence 只由系統偵測寫入，
  從不由人類 PATCH/POST）。
* 路由：`GET /api/v1/workspaces/{workspaceId}/evidence`（依 workspace 列出/
  過濾）、`GET /api/v1/workspaces/{workspaceId}/signals/{signalId}/evidence`
  （單一 Signal 的 traceability 端點，直接對應任務包的驗收重點）。掛在
  `public/index.php` 既有 `WorkspaceAccessPolicy::requireActiveMembership()`
  之後,同一個模式。

## 觸發點

`si/seo/summary.php` 在既有 `SignalService::runSeoTechnicalIssueDetection()`
呼叫之後，緊接著呼叫
`EvidenceService::recordSeoTechnicalIssueEvidence()`，傳入同一批
`$issues`／`$previousIssues`，外加剛寫入的 `seo_scan_history` 的
`insert_id`（`$scanHistoryId`）與 `$currentScannedAt`。只有在
`seo_scan_history` INSERT 真的成功（`$scanHistoryId > 0`）時才呼叫，避免
Evidence 捏造一個不存在的 source reference。同樣包在 `try/catch` 內,失敗只
log,不影響 SEO 掃描本身的回應。

## 驗證證據（2026-07-21）

**PHP lint**：本機 `D:\4.Tool\php\php.exe -l` 對
`EvidenceRepository.php`／`EvidenceService.php`／`EvidenceController.php`／
修改後的 `public/index.php`／`si/seo/summary.php` 全部執行，皆
`No syntax errors detected`。

**Migration／邏輯 rehearsal（disposable 本機 Docker `mysql:5.6`＋本機 PHP CLI
＋mysqli，非真實主機資料）**：延續 V10-01 的 disposable 環境，額外建立一張
最小化的 `seo_scan_history` 替身表，讓 `SignalService`／`EvidenceService`
（真實整合點：`si/seo/summary.php` 呼叫兩者的順序）一起模擬 3 輪掃描：

* 第 1 輪（2 個問題,第一次掃描）：建立 2 筆 Evidence，各連結到對應 Signal
  （`linked=2`）。
* 第 2 輪（內容完全不變）：`recorded=0`／`refreshed=2`／`linked=0`——確認
  全程只有 2 筆 Evidence、2 筆 link（去重確認,不是新增或重複連結)。
* 第 3 輪（issueA 的 severity 從 HIGH 改為 MEDIUM,site/type/url 身分不變）：
  `recorded=1`（新 Evidence row)、`refreshed=1`（issueB 不變)、`linked=1`
  （新 row 連到**同一個** Signal——Signal 本身不分裂,只有 Evidence
  分裂）。確認總共 3 筆 Evidence,原本 HIGH severity 的 snapshot（id=1）
  完整保留、title/summary/content_hash 與第 1 輪完全一致,未被覆寫。
* 完整性檢查：從最舊的 Evidence row 自己存的 `payload_json` 重新計算
  `content_hash`,與儲存值完全一致。
* **來源刪除存活測試**：把替身 `seo_scan_history` 表的全部列刪除
  （模擬 V11-08 資料保留機制清除舊掃描紀錄），確認 3 筆 Evidence
  row 完全保留、`content_hash` 不變——證明 snapshot 設計真的能在來源刪除後
  存活,不只是文件寫的理論。
* 跨 Workspace 隔離：workspace 2 全程 0 筆 Evidence。
* Traceability：全部 `source='seo'` 的 Signal 都至少有 1 筆連結的
  Evidence（0 筆未連結）——符合 spec「No Signal should exist without
  traceable supporting Evidence」的要求。

**尚未執行（需要 owner 執行正式環境操作）**：真實主機套用
`migrations/025`（含 preflight／postflight）、上傳
`backend/api/src/Evidence/**`／`public/index.php`／`si/seo/summary.php`、
對一個已有 ≥2 筆 `seo_scan_history` 的真實站點觸發重新掃描以驗證真正的
end-to-end HTTP 流程、跨 Workspace HTTP 負向測試（需要第二個測試帳號/
Workspace，同 V09/V10-01 已知缺口）。
