# Task Packet — V09-02 Workspace Backfill

Status: WAITING_FOR_V09-01  
Milestone: V0.9 Workspace Foundation  
Dependency: `V09-01`  
Tracker: `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`

---

# Objective

將既有會員安全轉換成正式 Workspace owner／member，建立可重跑、可核對、可恢復的 backfill，並移除 read request 隱式建立 Workspace 的過渡行為。

# Current evidence

* `workspaces`、`workspace_members`、`workspace_settings`、`legacy_member_workspace_map` schema 已草擬。
* `legacy_member_workspace_map` 是一個 member 對一個 default Workspace 的過渡 mapping，不代表完整 membership model。
* `WorkspaceService::listForMember()` 在 GET list 無結果時呼叫 `ensureDefaultForMember()`，造成讀取請求寫資料。
* `ensureDefaultForMember()` 使用 `member-{id}` slug 並在 request transaction 建立四組 records。
* `020_workspace_backfill_template.sql` 永遠 rollback，尚不是正式 backfill。
* Frontend 仍會在 backend unavailable 時合成 legacy Workspace。

# Required work

1. 從實際 production-like inventory 定義「既有 owner／account group」來源，不可只猜 `member_id`。
2. 建立 deterministic、idempotent backfill plan 與 reviewed data mapping。
3. 為每個既有 owner 建立一個 default Workspace、owner membership、settings 與 legacy default mapping。
4. 處理 slug collision、已存在 partial records、重跑及並行執行。
5. 定義 invariants：
   * 每個 active Workspace 恰有可辨識 owner。
   * owner 必須有 active owner membership。
   * default mapping 指向該 member 可存取的 Workspace。
   * 一個 member 可透過 `workspace_members` 加入多個 Workspace。
6. 將新使用者 provisioning 移至明確 registration／onboarding application service。
7. Backfill 完成後，Workspace GET 必須 read-only；不得因讀取列表而建立 tenant。
8. 將 legacy fallback 改為可觀測的 migration-only fallback，並制定移除條件；正式 Workspace authorization 不可依 fallback 放行。
9. 建立 backfill anomaly report 與人工處理 queue。
10. 演練 backup、backfill、verify 與 restore／compensating recovery。

# Mandatory verification

* No existing Workspace：建立正確四組 records。
* Re-run：不新增重複 Workspace／membership／mapping。
* Partial Workspace：補齊或報錯，不產生第二個 owner Workspace。
* Duplicate／collision slug：安全產生唯一且穩定 slug。
* Member with multiple memberships：list 全部回傳，default mapping 不限制其他 membership。
* Suspended／removed membership：不出現在 active list。
* GET `/api/v1/workspaces`：backfill 後不產生任何 DB write。
* Concurrent provisioning：不產生 duplicate tenant。
* Owner／mapping invariant SQL：異常數為 0。
* Restore／compensation rehearsal：可回到已知狀態。

# Safety constraints

* 不得直接編輯並 COMMIT `020_workspace_backfill_template.sql`。
* 不得以使用者第一次開頁面作為正式 backfill 機制。
* 不得將 `member_id === workspace_id` 當作正式 ownership 規則。
* 不得用 legacy fallback 繞過 membership check。
* 不得自動合併無法確定歸屬的既有資料；列入 anomaly review。

# Required deliverables

1. Owner source inventory 與 mapping rules。
2. Versioned backfill migration／command。
3. Preflight／postflight invariant queries。
4. Workspace provisioning service 調整。
5. GET read-only 與 legacy fallback removal plan。
6. Re-run、partial、concurrent、restore test evidence。

# Acceptance criteria

- [ ] 所有可判定既有 owner 均有正確 default Workspace。
- [ ] Backfill 可重跑且不重複。
- [ ] 異常歸屬不被自動猜測。
- [ ] Workspace GET 不再隱式寫資料。
- [ ] 新使用者 provisioning 有明確 transaction boundary。
- [ ] Multi-Workspace membership 不被 legacy mapping 限制。
- [ ] Invariant 與 recovery rehearsal 通過。
- [ ] 主 Tracker 收到可重現證據。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V09-02。

專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V09-02_WORKSPACE_BACKFILL.md

請依任務包建立正式 Workspace backfill 與 provisioning 邊界。不要使用第一次 GET 隱式建 tenant，也不要用 member_id 等同 workspace_id 當正式規則。

完成後依 Required deliverables 回報。
```
