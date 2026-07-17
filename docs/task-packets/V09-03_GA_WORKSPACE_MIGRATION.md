# Task Packet — V09-03 GA Workspace Migration

Status: WAITING_FOR_V09-01_AND_V09-02  
Milestone: V0.9 Workspace Foundation  
Dependencies: `V09-01`, `V09-02`  
Tracker: `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`

---

# Objective

以 expand → backfill → verify → contract 的方式，將 GA connection、OAuth 與查詢流程從 member-centric ownership 遷移成 Workspace ownership，同時維持受控的 legacy response compatibility。

# Current evidence

* `030_ga_connections_workspace_backfill_review.sql` 只有 review SELECT 與註解中的 write steps。
* `ga_connections` 目前主要依 `member_id` ownership。
* 新 `/api/v1/workspaces/{workspaceId}/integrations/ga` vertical slice 已存在。
* Legacy GA endpoints 與 Next.js BFF 仍大量使用 member identity。
* MySQL DDL implicit commit；ALTER rollback 需依 backup／forward recovery。

# Required work

1. 取得 `ga_connections` 實際 schema、index、row count、member distribution、OAuth token storage 與 FK inventory。
2. 定義一個 legacy connection 對應 Workspace 的唯一規則；ambiguous mapping 必須列入人工 review。
3. Expand migration：加入 nullable `workspace_id` 與必要 index，不立即移除 `member_id`。
4. Backfill：只更新有唯一 verified mapping 的 rows。
5. Postflight：驗證 null、orphan、cross-owner、duplicate external account 與 token ownership。
6. API dual-read／dual-write 過渡需有明確期限與觀測，不可永久存在。
7. GA list、query、sync、report、status update 全部以 authorized Workspace scope 查詢。
8. OAuth initiation state 必須綁定 member、Workspace、nonce、expiry；callback 不接受任意 workspace ID。
9. Contract migration 只在 null=0、compatibility tests 通過及 backup restore 已演練後執行。
10. 保留 `member_id` 到 V1 migration 安全完成；是否移除另開後續決策。

# Mandatory negative tests

* Member A 不能讀取／同步／修改 Workspace B 的 GA connection。
* 修改 request `workspace_id` 不會改變授權結果。
* OAuth callback state 被修改、過期或重放時拒絕。
* Ambiguous legacy mapping 不自動選 Workspace。
* Missing mapping row 不會在 contract migration 前被遺漏。
* Disabled／expired connection 不會被錯誤當作 active。

# Mandatory positive tests

* Authorized Workspace list connection。
* Add／link connection to selected Workspace。
* Sync selected Workspace data。
* GA dashboard／report 只顯示該 Workspace 資料。
* Legacy compatible response 在過渡期仍符合既有 frontend contract。

# Verification queries

至少證明：

```text
connections_without_workspace = 0
connections_with_missing_workspace = 0
connections_mapped_to_inaccessible_workspace = 0
ambiguous_member_workspace_mappings = 0 or explicitly quarantined
```

# Safety constraints

* 不得一次完成 add column、backfill、NOT NULL、drop legacy ownership。
* 不得用 `member_id === workspace_id` 猜 mapping。
* 不得在 OAuth URL／unsigned state 暴露可竄改 Workspace ownership。
* 不得把 token／credential 複製到多個 Workspace 來解決 ambiguous mapping。
* 不得在沒有 backup restore evidence 時執行 contract DDL。

# Required deliverables

1. GA schema／ownership inventory。
2. Expand、backfill、postflight、contract migration files。
3. API／OAuth／query scope changes。
4. Dual-read／dual-write removal plan。
5. Negative／positive test evidence。
6. Backup／forward recovery evidence。

# Acceptance criteria

- [ ] 所有 GA connection 有正確且可證明的 Workspace ownership。
- [ ] GA read／write／sync／report 全部 enforce Workspace authorization。
- [ ] OAuth state 綁定 Workspace 並防竄改／重放。
- [ ] Ambiguous mapping 不被自動猜測。
- [ ] Contract gate 的四項 verification query 通過。
- [ ] Legacy compatibility 有明確終止條件。
- [ ] 主 Tracker 收到可重現證據。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V09-03。

專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V09-03_GA_WORKSPACE_MIGRATION.md

請以 expand/backfill/verify/contract 完成 GA Workspace migration，包含 OAuth、sync、query、report 與跨 Workspace negative tests。不要用 member_id 等同 workspace_id 猜資料歸屬。

完成後依 Required deliverables 回報。
```
