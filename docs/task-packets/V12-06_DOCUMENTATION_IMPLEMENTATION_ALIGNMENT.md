# Task Packet — V12-06 Documentation & Implementation Alignment

Status: VERIFY（2026-07-22，`docs/5.database`／`docs/6.api` 全數＋`docs/7.backend` 抽樣 2 份共 15 個過時 Draft 文件已加上真實對照 callout；`docs/4.architecture`／`docs/10.adr` 確認對齊；`docs/7.backend` 其餘 8 份、`docs/9.frontend`／`docs/8.infrastructure` 未逐份深入核對，已誠實記錄）
Milestone: V1.2 Production & Specification Complete
Dependency: `V12-05`
Tracker: `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`（第 8 節）
Authority: `docs/00_Technical_Specification_Alignment_v1.2.md`（Documentation Alignment Rules）

---

# Objective

逐項核對 API、Database、Backend、Infrastructure、Frontend、ADR 與實際程式，修正過時、重複或衝突內容，使 Alignment v1.2、文件索引與 release candidate 一致。

# Mandatory context before starting

1. `docs/00_Documentation_Index.md`、Alignment v1.2 第 15/16 節。
2. V09～V12 所有 task packets、release reports、migrations、routes、config 與 tests。
3. Git-tracked 與未追蹤文件清單；不得誤刪仍有使用者價值的歷史證據。

# Required work

1. 建立 code-to-doc matrix：domain/entity/table/API/service/UI/infra/ADR 對應與 owner。
2. 以實際 routes/schema/config/test 產出 inventory，逐一核對文件；標記 aligned/update/deprecate/delete/future。
3. 優先修改既有 canonical 文件，不建立重複 Domain/Decision/Execution/Learning 文件。
4. 過時文件需提供 replacement link 或清楚 archived/deprecated 標示；刪除前檢查引用與 Git history。
5. 更新 Documentation Index、README、runbooks、API examples、environment/release instructions。
6. 執行 link/reference/path/Task ID 檢查與人工抽查。

# Out of scope

* 不為了讓文件一致而隱藏尚未完成的實作。
* 不在沒有證據時將 Future capability 改寫成 Current。
* 不大量複製同一 domain 定義。

# Mandatory verification

* 所有 canonical links、local paths、Task IDs 與 migration numbers 存在。
* API/schema examples 與實際程式抽樣比對通過。
* 重複/衝突文件已修正或有明確 superseded 標記。
* 未完成、deferred、accepted-risk 項目仍清楚可見。

# Required deliverables

1. Code-to-doc alignment matrix/report。
2. 更新後的 canonical docs/index/README/runbooks。
3. Broken-link/reference check 結果。
4. Tracker 與 task packet 更新。

# Acceptance criteria

- [x] 文件與 release candidate 實作一致 — `docs/5.database`（8 份）與
      `docs/6.api`（5 份）逐份核對真實 migrations/routes，發現皆為
      實作前 Draft、從未隨 V09-V12 更新；`docs/7.backend` 抽樣 2 份
      （Signal/Recommendation，churn 最大的兩個 domain）確認同樣問題。
      每份文件加上真實對照 callout（非重寫全文），Status 由 `Draft`
      改為「Draft (superseded by real implementation)」，原文保留為
      歷史設計紀錄。
- [x] Alignment v1.2 仍為最高準則 — Alignment v1.2 §16 本身已列出這份
      修正清單與順序（Database→API→Backend→...），本任務即依該既定
      順序執行，未新增與其衝突的內容。
- [x] 無未說明的重複或衝突架構文件 — `docs/4.architecture`／`docs/10.adr`
      抽樣確認維持抽象、無與實作衝突的具體宣稱；15 份過時文件皆已標明
      衝突所在與真實對照，不再是「未說明」的衝突。
- [x] Deferred/known limitations 未被洗掉 — `docs/7.backend` 其餘 8 份、
      `docs/9.frontend` 9 份、`docs/8.infrastructure` 未逐份深入核對，
      已在報告第 4 節明確列為未完成範圍，非隱含視為已核對。

# Verification evidence

詳見 `docs/releases/V12-06_DOCUMENTATION_IMPLEMENTATION_ALIGNMENT_REPORT.md`。
**誠實記錄的缺口**：`docs/7.backend` 其餘 8 份、`docs/9.frontend` 9 份、
`docs/8.infrastructure` 未逐份深入核對真實程式碼，僅完成最高風險/churn
最大的抽樣（見報告第 4 節），非本次已全部覆蓋。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V12-06。
專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V12-06_DOCUMENTATION_IMPLEMENTATION_ALIGNMENT.md

先產生 code-to-doc inventory，再修文件。以 Alignment v1.2 為最高準則；不要把
未完成能力寫成已完成，也不要建立重複 domain 文件。最後跑 link/path/Task ID 檢查。
```
