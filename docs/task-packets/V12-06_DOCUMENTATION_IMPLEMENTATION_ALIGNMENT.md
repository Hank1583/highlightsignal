# Task Packet — V12-06 Documentation & Implementation Alignment

Status: PLANNED
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

- [ ] 文件與 release candidate 實作一致。
- [ ] Alignment v1.2 仍為最高準則。
- [ ] 無未說明的重複或衝突架構文件。
- [ ] Deferred/known limitations 未被洗掉。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V12-06。
專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V12-06_DOCUMENTATION_IMPLEMENTATION_ALIGNMENT.md

先產生 code-to-doc inventory，再修文件。以 Alignment v1.2 為最高準則；不要把
未完成能力寫成已完成，也不要建立重複 domain 文件。最後跑 link/path/Task ID 檢查。
```
