# Task Packet — V11-06 Notification

Status: PLANNED
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

- [ ] Notification 由 Domain Event 觸發且不參與 Decision。
- [ ] Preference、attempt、retry、dedup 可追蹤。
- [ ] 至少 in-app channel 真實可用。
- [ ] Queue/provider failure 不阻斷核心 domain transaction。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V11-06。
專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V11-06_NOTIFICATION.md

Notification 必須是 Domain Event subscriber，delivery 經可靠 queue。先完成 in-app；
email 只有在 provider/credentials 可驗證時標記可用，否則保留誠實 degraded 狀態。
```
