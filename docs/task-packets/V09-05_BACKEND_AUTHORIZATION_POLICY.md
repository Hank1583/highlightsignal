# Task Packet — V09-05 Backend Workspace Authorization Policy

Status: DONE（程式修復＋suspended membership fail-closed＋跨 Workspace negative test 均已於真實 pre-launch host 驗證，2026-07-20／2026-07-21）／僅剩 role 邊界測試待驗證（production 目前無非 owner 角色的 membership，需手動建立測試資料才能測 viewer 角色被拒絕）
Milestone: V0.9 Workspace Foundation
Dependency: `V09-04`（SEO／AEO／GEO／Reporting 要先有 workspace_id 可查，這個
task 的跨模組覆蓋才有意義；`V09-04` 的 9 張根表 expand/backfill 與 PHP
查詢層改動已完成並驗證，見 `docs/task-packets/V09-04_SEO_AEO_GEO_REPORTING_WORKSPACE_OWNERSHIP.md`）
Tracker: `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`
Evidence: `backend/api/src/Workspace/WorkspacePermissions.php`（新增，中央
role permission matrix）；`GaIntegrationService.php`／`WorkflowController.php`
改用中央 matrix；`legacy_auth.php` 的 `hs_resolve_member_workspace_id()`
新增 `workspace_members.status='active'` 檢查（原本只查
`legacy_member_workspace_map`，被停權成員仍可解析出可用 workspace_id，此為
本次修的最高槓桿缺口，一次覆蓋所有 V09-04 legacy 端點）；`ga/get_connections.php`／
`ga/update_connection_status.php` 補上 workspace_id 範圍與角色檢查（原本是
繞過新架構角色閘門的 shadow endpoint）；`ga/account_fetch.php`／
`ga/oauth_callback.php` 角色檢查改用中央 matrix；`ga/report/report_excel.php`
direct-HTTP 分支、`ga/report/delete_csv.php`、`ga/report/check_phpspreadsheet.php`
補上簽章身分驗證（原本完全無驗證）；`ga/report/report_runner.php` 補上
fail-closed 的 `REPORT_CRON_SECRET` 共享密鑰驗證（原本完全無驗證，且是
跨全部 tenant 的批次觸發點）；移除已無人使用的 `backend/api/auth.php`
（原本只是 `hs_require_service_member()` 的薄包裝，兩個呼叫端都已改用
`legacy_auth.php`）。完整端點盤點見下方主追蹤文件 dated note。
Known gap（未修，已記錄）：`ga_report_schedules`／`ga_daily_summary`／
`ga_pages`／`ga_events`／`ga_traffic_sources`／`ga_conversions` 這組 GA report
排程表仍是 member_id-only ownership（`ga_require_connection_ownership()`），
從未被 V09-03/04 納入 workspace_id migration 範圍，需要獨立的新 migration
才能真正 workspace 化，非本次角色矩陣可解決，建議另立 task。

---

# Objective

讓「每一個正式 Business API」在每次 request 都由後端獨立驗證
authentication／membership／role／status，不信任前端聲稱的身分。定義
owner／admin／manager／member／viewer 的 permission matrix，並讓跨 Workspace
read/write 測試全部 fail closed。

# Mandatory context before starting

1. `docs/00_V07_TO_V12_PROGRESS_TRACKER.md` 第 5 節、V09-01～04 的 dated notes。
2. `backend/api/src/Auth/ServiceRequestAuthenticator.php`（簽章驗證，已存在，
   V09-01～04 都沒動這支）。
3. `backend/api/src/Workspace/WorkspaceAccessPolicy.php`（目前只有
   `requireActiveMembership()`，沒有 role-based permission matrix）。
4. `backend/api/src/Integration/GoogleAnalytics/GaIntegrationService.php` 裡
   `updateConnectionStatus()` 對 role 的檢查（`owner`／`admin`／`manager` 才能
   改）——目前這個 role 檢查是**寫死在 service 層、每個 service 各自複製一份**，
   不是一個中央 policy。這是本 task 要解決的核心問題。
5. V09-03 完成的 OAuth negative test（跨 Workspace 存取被擋、state 竄改/重放/
   過期）可以當作「怎麼測」的參考模式。

# Critical operational constraints（沿用 V09-01～04）

* 主機沒有 SSH／cron，任何 migration 只能手動貼 phpMyAdmin。這個 task 如果需要
  新表（例如把 role 定義成正式表而不是 ENUM），一樣要走
  `manual_apply_bookkeeping.sql` 那套流程，版本號接續 V09-04 用到的號碼。
* 驗證跨 Workspace fail-closed，不能自己組簽章 HTTP request（沒有
  `SERVICE_AUTH_SECRET`）；要嘛請 owner 用兩個真實帳號在瀏覽器操作，要嘛用
  curl 打不需要簽章就能觸發 4xx 的路徑（例如缺 header、或用 V09-03 那種「已知
  合法但可竄改」的素材）。

# Required work

1. 盤點所有正式 `/api/v1/**` 與 legacy `backend/api/**/*.php` business endpoint，
   列出目前各自的授權檢查方式（有沒有查 membership、有沒有查 role、role 檢查
   寫在哪裡）。
2. 把 role permission matrix（owner/admin/manager/member/viewer 對應可做的
   操作）收斂成一個中央定義，不要讓每個 service 各自複製一份 `in_array(...)`。
   放在 `HighlightSignal\Workspace` namespace 下，比照 `WorkspaceAccessPolicy`
   的風格。
3. 確認 `WorkspaceAccessPolicy::requireActiveMembership()` 這個檢查點有被所有
   business endpoint 呼叫到，沒有遺漏的路徑（尤其是 legacy 平鋪檔案，例如
   `backend/api/ga/*.php`、`backend/api/si/**/*.php` 這些還沒被 V09-01～04
   動過的）。
4. 確認 `status`（pending/suspended/removed）也在每次檢查時生效，不是只在
   membership 建立當下檢查一次。

# Mandatory verification

* 跨 Workspace read/write：至少 GA 與一個 V09-04 新增的模組，各測一組「A 存取
  B 的資料」被拒絕。
* Role 邊界：viewer 嘗試執行 owner/admin 才能做的操作被拒絕。
* Suspended membership：被停權的成員，即使 token/簽章仍有效，也要被拒絕。
* 沒有遺漏的 endpoint：列出所有 business endpoint 與其授權檢查現況的對照表，
  不能有「假設有檢查但沒實際驗證過」的項目。

# Safety constraints

* 不得只改 src/ 下的新架構就宣稱完成，legacy 平鋪端點也要覆蓋或明確列為
  已知風險。
* 不得用前端聲稱的 role/identity 取代後端查詢的結果。
* 中央 permission matrix 的改動要保持向下相容，不能讓現有合法操作突然被擋。

# Required deliverables

1. 所有 business endpoint 的授權檢查現況盤點表。
2. 中央 role permission matrix 實作。
3. 跨 Workspace／角色／狀態的 fail-closed 測試證據。
4. 主 Tracker 更新。

# 執行對話開場請直接貼

```text
請執行 Highlight Signal Roadmap Task V09-05。

專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V09-05_BACKEND_AUTHORIZATION_POLICY.md

請先讀主追蹤文件第 5 節與 V09-01~04 的 dated notes，確認 V09-04 的實際完成範圍
（哪些模組已經有 workspace_id），再讀任務包全文。這台主機沒有 SSH／cron，任何
新 migration 一樣只能手動貼 phpMyAdmin，測試跨 Workspace fail-closed 不能自己
組簽章請求，需要真實帳號操作或不需簽章就能觸發的路徑。

請先盤點所有正式 endpoint 目前的授權檢查現況，再做出中央 role permission
matrix，覆蓋 legacy 平鋪端點與新架構端點。完成後依任務包 Required deliverables
回報，並更新主追蹤文件與本任務包狀態。
```
