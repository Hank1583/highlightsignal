# Permission Framework

Version: v1.0
Status: Draft
Owner: Hank
Last Update: 2026-07

---

# Highlight Signal

Highlight Your Signal.

Don't start with dashboards.
Start with decisions.

The best AI doesn't tell you everything.
It tells you what matters most.

---

# Purpose

Permission Framework 定義 Highlight AI 產品中的權限、角色、資料存取與操作邊界。

本文件回答：

誰可以看什麼？

誰可以連接資料來源？

誰可以查看 Recommendation？

誰可以執行 Action？

誰可以管理 Workspace？

AI 可以替使用者做什麼？

Permission Framework 是 Enterprise、Agency、多 Workspace、多 Module 與 AI Execution 的基礎。

---

# Philosophy

Highlight AI 是 Decision Intelligence Platform。

它不只顯示資料。

它會產生 Recommendation，未來甚至可能執行 Action。

因此權限設計不能只停留在：

Can View Dashboard

Can Edit Settings

而必須涵蓋：

- Data Access
- Module Access
- Recommendation Access
- Evidence Access
- Notification Access
- Action Approval
- AI Execution Permission
- Workspace Administration

權限的核心原則：

Right user.

Right data.

Right action.

Right scope.

---

# Core Idea

Permission 是保護 Workspace、Data、AI Decision 與 Action 的邊界。

所有系統行為都應以 Workspace 為基礎判斷權限。

任何 API、Worker、AI Engine、Notification、Report、Widget 都不應繞過 Permission Check。

---

# Workspace As Permission Boundary

Workspace 是最重要的權限邊界。

所有資料皆屬於 Workspace。

所有使用者皆透過 Workspace Role 取得權限。

一位 User 可以屬於多個 Workspace。

同一位 User 在不同 Workspace 可有不同 Role。

例如：

User A 在 Workspace 1 是 Owner。

User A 在 Workspace 2 是 Viewer。

這兩個權限必須完全獨立。

---

# Permission Layers

Highlight AI 權限分為多層：

1. Workspace Permission
2. Module Permission
3. Data Source Permission
4. Signal Permission
5. Recommendation Permission
6. Evidence Permission
7. Action Permission
8. Report Permission
9. Billing Permission
10. AI Execution Permission

每一層都可獨立控制。

---

# Default Roles

第一階段建議角色：

Owner

Admin

Manager

Member

Viewer

Billing

External Viewer

未來 Enterprise 可支援 Custom Role。

---

# Owner

Owner 是 Workspace 的最高權限角色。

Owner 可：

- 管理 Workspace
- 管理 Members
- 管理 Billing
- 連接 Data Sources
- 查看所有 Modules
- 查看所有 Signals
- 查看所有 Recommendations
- 查看所有 Evidence
- 匯出 Reports
- 批准 AI Actions
- 刪除 Workspace

Owner 應數量有限。

---

# Admin

Admin 負責 Workspace 管理與設定。

Admin 可：

- 管理 Members（部分限制）
- 連接 Data Sources
- 管理 Modules
- 查看大部分資料
- 管理 Notifications
- 管理 Reports
- 執行或批准部分 Actions

Admin 不一定能管理 Billing 或刪除 Workspace。

---

# Manager

Manager 是主要營運使用者。

Manager 可：

- 查看 Workspace Home
- 查看 Modules
- 查看 Signals
- 查看 Recommendations
- 查看 Evidence
- 標記 Recommendation 狀態
- 指派 Action
- 查看 Reports

Manager 通常不能：

- 管理 Billing
- 刪除 Workspace
- 管理高風險 Data Sources
- 執行高風險 AI Actions

---

# Member

Member 是一般協作者。

Member 可：

- 查看被授權的 Modules
- 查看相關 Signals
- 查看被指派的 Recommendations
- 更新 Action Status
- 查看部分 Evidence

Member 權限應依 Module 或 Team 限制。

---

# Viewer

Viewer 是唯讀角色。

Viewer 可：

- 查看 Workspace Home
- 查看被授權 Reports
- 查看部分 Signals
- 查看部分 Evidence Preview

Viewer 不可：

- 連接 Data Sources
- 修改 Settings
- 執行 Actions
- 管理 Members
- 查看敏感 Raw Data

---

# Billing

Billing Role 專門管理付款與方案。

Billing 可：

- 查看 Billing
- 修改 Plan
- 更新付款方式
- 查看 Invoice

Billing 不一定能查看 Business Data。

這點對企業客戶很重要。

---

# External Viewer

External Viewer 用於顧問、客戶、外部合作方。

External Viewer 可：

- 查看指定 Report
- 查看指定 Module Summary
- 查看有限 Evidence

External Viewer 不可：

- 查看 Raw Data
- 查看敏感設定
- 連接資料來源
- 查看所有 Workspace Members
- 執行 Actions

External Viewer 適合 Agency 場景。

---

# Custom Roles

Enterprise 階段可支援 Custom Roles。

Custom Role 可設定：

- Module Access
- Data Source Access
- Report Access
- Recommendation Access
- Action Permission
- Notification Preference
- AI Execution Permission

第一階段不一定實作 Custom Role。

但資料模型應保留擴充空間。

---

# Module Permission

Module 可設定存取權限。

例如：

Marketing Team：

- Website
- Search
- Social
- Advertising

IT / Security Team：

- Security
- System
- Data Sources

Executive：

- Workspace Home
- Reports
- Business Pulse

Module Permission 可控制：

- View Module
- Manage Module
- Connect Data Source
- View Raw Data
- Export Data

---

# Data Source Permission

Data Source 是高敏感區域。

權限應包含：

- View Connection Status
- Connect Data Source
- Disconnect Data Source
- Refresh Token
- View Raw Data
- Manage Credentials

一般 Viewer 不應看到 token、credential 或敏感設定。

---

# Signal Permission

Signal 可依 Module、Severity、Sensitivity 控制存取。

例如：

Marketing Signal 可給 Marketing Manager。

Security Signal 可給 IT / Security。

Billing Signal 可給 Owner / Billing。

System Signal 可給 Admin。

Signal Permission 決定：

- 是否可見
- 是否可通知
- 是否可展開 Evidence
- 是否可建立 Action

---

# Recommendation Permission

Recommendation 可能包含具體商業策略或技術修補步驟。

權限應控制：

- View Recommendation
- Assign Recommendation
- Mark As Done
- Snooze
- Dismiss
- Approve Execution
- Execute Action

不是所有人都應能完成或忽略重要 Recommendation。

---

# Evidence Permission

Evidence 可能包含敏感資料。

例如：

- Revenue
- Conversion
- Customer Data
- Security Finding
- Raw Logs
- Campaign Spend

Evidence Permission 應支援：

- View Evidence Preview
- View Evidence Detail
- View Raw Data Reference
- Export Evidence

部分角色只能看 Preview，不能看 Raw Data。

---

# Raw Data Permission

Raw Data 權限應最嚴格。

Raw Data 可能包含：

- API Response
- Customer Data
- Security Scan Detail
- Log
- Campaign Cost
- Conversion Detail

只有 Owner、Admin 或指定角色可查看 Raw Data。

AI 可以使用 Raw Data 進行分析，但 UI 不一定開放所有使用者查看。

---

# Report Permission

Report 可以被分享給不同角色。

Report 權限包含：

- View Report
- Export Report
- Share Report
- Comment
- Approve Report
- Delete Report

External Viewer 可使用 Report Permission，而不需要完整 Workspace 權限。

---

# Notification Permission

Notification 應根據角色與權限發送。

例如：

Owner：

接收 Critical Business / Security / Billing 通知。

Marketing Manager：

接收 Search / Social / Ads 通知。

IT：

接收 Security / System 通知。

Viewer：

只接收 Summary。

Notification 不應把使用者無權查看的內容推送出去。

---

# Action Permission

Action 是權限設計中最重要的部分之一。

Action 可分為：

Low Risk Action

Medium Risk Action

High Risk Action

Critical Action

例如：

Low Risk：標記 Recommendation 已完成。

Medium Risk：建立任務或寄送內部通知。

High Risk：修改網站內容、暫停廣告 Campaign。

Critical Action：刪除資料、修改安全設定、調整付款方案。

不同風險等級需要不同批准流程。

---

# AI Execution Permission

未來 AI Execution Engine 必須依權限執行。

AI 不應自動執行高風險 Action。

AI Execution 權限包含：

- Suggest Only
- Draft Action
- Request Approval
- Execute With Approval
- Auto Execute Low Risk

第一階段建議：

AI 只提供 Recommendation，不直接執行外部系統變更。

---

# Approval Flow

高風險 Action 應需要 Approval Flow。

流程：

Recommendation

↓

Action Draft

↓

Approval Request

↓

Owner / Admin Approval

↓

Execution

↓

Audit Log

Approval Flow 是 Enterprise 信任基礎。

---

# Workspace Isolation

Workspace 必須完全隔離。

包含：

- Data
- Signals
- Decisions
- Recommendations
- Evidence
- Notifications
- Reports
- AI Memory
- Settings

任何 API 查詢都必須帶 Workspace Scope。

不可只依 User ID 查資料。

---

# Agency Scenario

Agency 可能管理多個客戶 Workspace。

需求：

- Agency Owner 可管理所有 Client Workspace
- Client Owner 只能管理自己的 Workspace
- External Viewer 可查看指定 Report
- Consultant 可跨 Workspace 查看有限 Summary

Agency 場景需要嚴格避免資料外洩。

---

# Enterprise Scenario

Enterprise 可能有多部門 Workspace。

例如：

- HQ Workspace
- Taiwan Workspace
- Japan Workspace
- Marketing Workspace
- Security Workspace

Enterprise 可能需要：

- Department Role
- Regional Permission
- Cross Workspace Summary
- Executive Overview

Cross Workspace 功能必須明確授權。

---

# Permission Check Points

系統應在以下位置檢查權限：

- Login
- Workspace Switch
- API Request
- Module Access
- Data Source Connection
- Signal View
- Evidence View
- Recommendation Update
- Report Export
- Notification Send
- Action Execution
- AI Tool Call

任何一層都不能假設前一層已檢查。

---

# Permission And API

所有 API 應遵守：

- Authenticate User
- Resolve Workspace
- Check Workspace Role
- Check Resource Permission
- Check Action Permission
- Return Scoped Data

API 不應回傳使用者無權查看的資料，即使前端不顯示也不可以。

---

# Permission And Frontend

Frontend 應根據權限顯示或隱藏功能。

但 Frontend 不是安全邊界。

真正安全檢查必須在 Backend / API。

Frontend 可做：

- Hide Menu
- Disable Button
- Show Permission Message
- Request Access

---

# Permission And AI

AI Engine 必須知道 Permission Context。

AI 不應在 Summary 中洩漏使用者無權查看的資訊。

例如：

Viewer 無權看 Campaign Spend。

AI Summary 不應寫出具體廣告成本。

AI 回答也必須依 User Permission 調整。

---

# Permission And Evidence

Evidence 顯示必須符合權限。

例如：

Owner：

看到完整 Evidence 與 Raw Data。

Manager：

看到 Evidence Detail。

Viewer：

只看到 Evidence Preview。

External Viewer：

只看到 Report 中被允許的 Evidence。

---

# Permission And Notification

Notification 發送前必須檢查：

- User Role
- Workspace Membership
- Module Access
- Notification Preference
- Sensitive Content

通知中不應包含使用者無權查看的內容。

若通知涉及敏感資料，應只顯示摘要並要求登入 Workspace 查看。

---

# Audit Log

所有重要權限與操作都應記錄 Audit Log。

包含：

- User Added
- Role Changed
- Data Source Connected
- Data Source Disconnected
- Report Exported
- Recommendation Dismissed
- Action Approved
- Action Executed
- Billing Changed
- Permission Changed

Audit Log 對 Enterprise 與 Security 很重要。

---

# Least Privilege

系統應遵守最小權限原則。

使用者只應取得完成工作所需的最小權限。

預設不應給高權限。

新增成員時，預設應為 Member 或 Viewer，而不是 Admin。

---

# Permission Lifecycle

Permission 生命週期：

Invited

↓

Accepted

↓

Active

↓

Changed

↓

Suspended

↓

Removed

角色變更應留下紀錄。

使用者移除後，應立即失去 Workspace Access。

---

# Sensitive Resources

以下資源應視為敏感：

- Credentials
- Tokens
- Raw API Response
- Security Findings
- Billing
- Revenue
- Customer Data
- Exported Reports
- AI Execution Approval

敏感資源應需要更高權限或額外確認。

---

# Engineering Principles

系統設計應支援：

- Workspace Scoped Permission
- Role Based Access Control
- Resource Based Permission
- Module Permission
- Action Permission
- Audit Log
- Permission Middleware
- Permission-aware AI Context
- Permission-aware Notification
- Permission-aware Report Export

權限不應散落在前端各處。

應有統一 Permission Layer。

---

# Product Principles

Permission 必須遵守：

- Secure by Default
- Workspace Isolation
- Least Privilege
- Role Clarity
- AI Safety
- Auditability
- Enterprise Ready

權限設計不應讓一般商家覺得複雜。

第一層應簡單。

進階權限留給 Enterprise。

---

# Future

Permission Framework 未來可加入：

- Custom Roles
- Attribute Based Access Control
- Cross Workspace Permission
- Temporary Access
- Approval Policy
- AI Tool Permission
- API Key Permission
- SCIM / SSO
- Enterprise Audit Export

未來 AI Execution Engine 必須依 Permission Framework 運作。

---

# Summary

Permission 是 Highlight AI 的信任邊界。

Highlight AI 不只顯示資料。

它會產生 Decision、Recommendation，未來甚至可能執行 Action。

因此權限必須涵蓋：

Workspace

Module

Data Source

Signal

Recommendation

Evidence

Report

Notification

Action

AI Execution

最好的 Permission Framework，不只是保護資料。

而是讓正確的人，在正確範圍內，安全地做出正確行動。

---

# Related Documents

01 AI Core Framework
02 Signal Framework
03 Workspace Framework
04 Module Framework
05 Evidence Framework
06 Notification Framework
07 Widget Framework
08 Data Flow Framework
10 Domain Model（Future）

