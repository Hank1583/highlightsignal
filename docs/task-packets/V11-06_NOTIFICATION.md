# Task Packet — V11-06 Notification

Status: VERIFY（程式碼與 SQL 完成、disposable Docker 排練通過（22/22，含真實 Queue 整合與 WorkflowService 整合），真實主機套用與真實 email provider 選型待 owner 執行）
Milestone: V1.1 Execution & Operations
Dependency: `V11-02`、`V11-05`
Tracker: `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`（第 7 節）
Authority: `docs/00_Technical_Specification_Alignment_v1.2.md`（Notification as Domain Event subscriber）

---

# Objective

建立由 Domain Event 驅動的 Notification resource、偏好、delivery attempt、retry 與去重；Notification 只負責提醒與狀態傳遞，不參與 Business Decision。

# Mandatory context before starting

1. V11-02 Queue reliability 與既有報表 email 流程。
2. Alignment v1.2 Notification 定義。
3. `docs/6.api/07_Notification_API.md`、`docs/7.backend/07_Notification_Backend.md`，衝突時以 Alignment 為準。

# Required work

1. 建立 notification、preference、delivery attempt persistence 與 domain-event subscriber interface。
2. 至少支援 in-app；email 只有在 credentials/provider 可驗證時才啟用，否則明確 degraded。
3. 定義 event type、recipient resolution、severity/priority、dedup key、read/ack/dismiss 與 delivery status。
4. Delivery 經 queue 執行，支援 retry/dead-letter/idempotency；不得在 domain transaction 內同步呼叫外部 provider。
5. 建立 list/read/ack/preferences API、Workspace/member permission、audit 與 operational metrics。

# Out of scope

* Notification 不建立 Recommendation、Decision 或 Action。
* 不承諾未配置 provider 的 email 已可用。
* 不把 domain event subscription 直接暴露為前端 business API。

# Mandatory verification

* Signal/Recommendation/Task 或 Result 至少兩種 event 可產生正確 notification。
* 同一 event/recipient 重放不重複通知；provider failure 可重試並進 dead-letter。
* 使用者偏好、Workspace isolation、read/ack 權限與 unsubscribe 行為通過。
* email 未配置時 in-app 仍可用且狀態誠實。

# Required deliverables

1. Notification schemas、subscriber、delivery handlers、API/UI。
2. Preference、dedup、retry、provider configuration 文件。
3. Event、failure、permission、degraded-mode 證據。
4. Tracker 與 task packet 更新。

# Acceptance criteria

- [x] Notification 由 Domain Event 觸發且不參與 Decision — 接上兩個真實事件
      （`si/seo/summary.php`／`ga/data_sync.php` 的 signal.detected，
      `WorkflowService` 的 task.completed），`NotificationService` 不建立
      Recommendation/Decision/Action。
- [x] Preference、attempt、retry、dedup 可追蹤 — `notification_preferences`
      per-event_type 生效；email delivery 經 `queue_jobs` 真實 attempt/retry/
      dead-letter；`UNIQUE(workspace_id, recipient_member_id, dedup_key)`
      保證去重。
- [x] 至少 in-app channel 真實可用 — in-app 為同步、立即可用，opt-out 預設
      啟用。
- [x] Queue/provider failure 不阻斷核心 domain transaction — email 一律經
      queue 非同步處理，never 在 domain transaction 內同步呼叫 provider；
      provider 未設定時明確標示 `skipped_unconfigured`，不假裝可用。

# Verification evidence

2026-07-21 disposable Docker `mysql:5.6` + local PHP 7.4 CLI 排練
（22 項斷言全數通過）：詳見 `backend/sql/VERIFICATION_RUNBOOK.md` 第 18 節。
摘要：dedup（重複提交不同內容不建立重複列，回傳原內容）；in-app 立即送達；
email 預設 opt-in 未啟用時 skipped_disabled；啟用但 provider 未設定時
skipped_unconfigured（不建立 queue job）；provider 設定後正確經真實 Queue
enqueue；**真實跑 queue batch 搭配真實 handler registry**（非測試假 handler）
證明 `EmailDeliveryHandler` stub 正確失敗並進入 retry/dead-letter，
delivery 狀態正確更新為 failed 且保留真實錯誤訊息；preference 為
per-event_type（取消某事件的 in-app 不影響其他事件）；read/dismiss 生命週期
與跨成員/跨 Workspace 隔離皆正確；**真實整合**——透過 `WorkflowService` 真實
完成任務步驟，正確觸發 task.completed 通知給真實 assignee。

**尚未執行（需要正式主機）**：套用 migration 035、上傳 PHP 變更、選定並串接
真實 email provider（目前 `EmailDeliveryHandler` 為明確記錄的 stub，尚未接任何
provider）、真實瀏覽器登入互動驗證通知列表/read/dismiss/preferences 端點。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V11-06。
專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V11-06_NOTIFICATION.md

Notification 必須是 Domain Event subscriber，delivery 經可靠 queue。先完成 in-app；
email 只有在 provider/credentials 可驗證時標記可用，否則保留誠實 degraded 狀態。
```
