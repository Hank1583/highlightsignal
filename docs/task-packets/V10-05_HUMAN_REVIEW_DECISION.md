# Task Packet — V10-05 Human Review & Decision Formalization

Status: VERIFY（程式碼與 SQL 完成、disposable Docker 排練通過；尚未套用至正式主機，需 owner 透過 phpMyAdmin/FTP 執行）
Milestone: V1.0 Decision Intelligence Core
Dependency: `V10-04`
Tracker: `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`（第 6 節）
Authority: `docs/00_Technical_Specification_Alignment_v1.2.md`（Human Review、Decision、Permission）

---

# Objective

把 Human Review 變成可驗證流程，讓人類針對正式 Recommendation 建立不可混淆、具理由、操作者、時間與歷程的 Decision。

# Mandatory context before starting

1. V10-04 正式 Recommendation contract。
2. 現有 `decisions` enum 僅有 `accepted/skipped`，Workflow update 與 audit 實作。
3. Alignment 要求至少支援 Accept、Reject、Skip、Defer、Needs More Evidence。

# Required work

1. 安全擴充 Decision schema/status，保留既有 `accepted/skipped` 資料語意。
2. 每筆 Decision 記錄 recommendation/version、actor、reason、timestamp、expected outcome 與 request/idempotency key。
3. 定義 Recommendation 可否重審、Decision 是否 append-only、何時以新 Decision supersede 舊決定；不得覆寫歷史。
4. 建立 review/read/submit API，交易內完成狀態更新、Decision insert 與 audit log。
5. 套用 WorkspacePermissions；AI、前端或背景 job 不得偽裝 decision maker。

# Out of scope

* Human Review 不是獨立 entity/table。
* 不在本 task 建立 Action/Task 執行生命週期。
* 不做 Autonomous Decision。

# Mandatory verification

* 五種 Decision outcome 均有 contract 與合法狀態轉換測試。
* 重複提交同一 idempotency key 只產生一次結果。
* 跨 Workspace、失效 membership、viewer/未授權角色均 fail closed。
* DB failure 不會留下 Recommendation 已更新但 Decision 未建立的半套狀態。

# Required deliverables

1. Migration 與 compatibility/backfill 文件。
2. Human Review UI/API、Decision Service/Repository/Policy。
3. Transaction、idempotency、permission、history 測試。
4. Tracker 與 task packet 更新。

# Acceptance criteria

- [x] Decision 只由已授權的人類建立 — `WorkflowController::update()` 沿用既有
      `WorkspacePermissions::requirePermission($membership, 'workflow.mutate')`
      （只有 owner/admin/manager/member 可執行，viewer/billing/external_viewer
      一律拒絕）；本次排練直接驗證 viewer 被拒、member 被允許。
- [x] 六種 outcome（accepted/skipped/rejected/deferred/modified/
      needs_more_evidence，超過任務包原定的五種，因為 accepted/skipped 是既有
      語意必須保留）、reason、actor（`actor_member_id`）、timestamp
      （`created_at`）、expected_outcome、recommendation_revision 皆完整記錄；
      history 為 append-only（只 INSERT 不 UPDATE，`latestDecision()` 取最新一筆）。
- [x] 重複提交（同一 `idempotency_key`）不重複記錄；`WorkflowService::mutate()`
      的交易包住 Recommendation 儲存 + Decision 寫入 + 動作專屬邏輯 +
      audit log，任一環節失敗即整體 rollback，不產生半套資料
      （排練以無效 decision 值驗證：rollback 後半套 Recommendation 為 0 筆）。
- [x] AI 不代替 Human 做正式決定 — `recordDecision()` 的 `actor_member_id`
      恆為呼叫者的 `ServiceIdentity->memberId`（來自簽章請求），沒有任何路徑
      允許背景 job 或 AI 產生 Decision 記錄。

# Verification evidence

2026-07-21 disposable Docker `mysql:5.6` + local PHP 7.4 CLI（含編譯安裝的
`mysqli` 擴充）排練，NOT this host's real data。完整過程與 45 項斷言結果見
`backend/sql/VERIFICATION_RUNBOOK.md` 第 10 節。摘要：六種 outcome 分別驗證
記錄內容與 `recommendations.status` 對應；無效 decision 值正確 rollback；
idempotency_key 重複提交只產生一筆記錄且第二次提交的內容被忽略；`create_task`
隱含 accept 正確蓋上 `recommendation_revision`；append-only 歷史正確（同一
Recommendation 第二次決策產生新的一筆，而非覆寫）；跨 Workspace 隔離正確；
角色權限矩陣正確拒絕 viewer；`recordDecision()` 本身的交易原子性以手動
begin/rollback 驗證兩個寫入（decisions insert + recommendations status
update）會一起復原。Migration 028 重複套用正確失敗（MySQL 5.6 DDL 不可重跑，
與既有所有 migration 行為一致）。

**尚未執行（需要正式主機）**：套用 `migrations/028` 至正式資料庫、上傳
`WorkflowRepository.php`/`WorkflowService.php`/`public/index.php`，以及一次
涵蓋六種 outcome 與真實跨 Workspace 負向測試的正式 HTTP 端到端驗證（需要
owner 的 phpMyAdmin/FTP 存取，與先前每個任務相同的缺口）。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V10-05。
專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V10-05_HUMAN_REVIEW_DECISION.md

請以正式 Recommendation 為前提，完成 Human Review 與 append-only Decision。
必須驗證五種 outcome、交易、idempotency、角色與跨 Workspace；不要建立自動 Decision。
```
