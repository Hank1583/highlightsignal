# Highlight Signal｜免費診斷入口與獲客架構調整需求

Version: v1.0
Status: Architecture Review Request
Target: Codex
Project: Highlight Signal

---

# 1. 文件目的

本文件用來評估 Highlight Signal 因應第一位客戶獲取策略，是否需要調整現有程式架構，以及應如何以最小改動加入新的獲客流程。

本次策略不是重新定義 Highlight Signal，也不是將 RiskRadar 併入 Highlight Signal。

核心需求是：

> 在既有 Highlight Signal 正式產品流程之前，新增一個從陌生訪客、公開分析、免費成效診斷，到正式 Workspace 與 Trial 的轉換流程。

請 Codex 根據目前程式碼與文件架構，評估：

1. 現有系統是否已具備可延伸基礎。
2. 哪些模組可以直接沿用。
3. 哪些模組需要新增。
4. Database、API、Backend、Frontend、Queue、Infrastructure 需要修改哪些部分。
5. 應採取一次完成或分階段實作。
6. 是否存在與目前文件或程式碼衝突的地方。

---

# 2. 背景

Highlight Signal 目前的核心定位是：

> AI Decision Intelligence Platform

它不是單純的網站掃描工具，而是透過企業自己的數據，持續發現變化、整理證據、提供建議，並協助使用者做出決策。

現有核心流程為：

```text
Workspace
→ Data Source
→ Raw Data / Metric
→ Signal
→ Evidence
→ AI Analysis / Explanation
→ Recommendation
→ Human Review
→ Decision
→ Action / Task / Queue Job
→ Result
→ Evaluation / Feedback
```

Notification 為事件訂閱者。

Audit Log 為橫切關注點。

目前主要資料來源包含：

* Google Analytics 4
* Google Search Console
* SEO／GEO／AEO 分析結果
* 系統內部分析與歷史資料

現有技術原則：

```text
Backend:
PHP Modular Monolith

Database:
MySQL

Frontend:
Next.js
React
TypeScript
Tailwind CSS

Deployment:
Cloudflare
Shared Hosting

API:
REST API

Queue:
MySQL Job Queue

Scheduler:
Google Apps Script 僅負責呼叫排程 PHP

Tenant Model:
Workspace 為 Tenant

Decision Model:
Human-in-the-loop
```

以上核心技術與架構原則原則上不變。

---

# 3. 商業策略調整

原本討論的獲客入口是：

> 免費 AI 網站健檢報告

但這個名稱與功能容易偏向：

* 網站弱點掃描
* SSL 與 Security Header
* 網站健康狀態
* 技術問題
* 安全風險

這些較接近 RiskRadar 的產品範圍。

Highlight Signal 真正要提供的價值是：

> 最近發生了什麼？
> 為什麼重要？
> 現在應該優先做什麼？

因此，Highlight Signal 的免費入口應調整為兩層。

---

# 4. 新獲客流程

## 4.1 第一層：公開數位快照

名稱暫定：

> Digital Presence Snapshot
> 公開數位快照

這個階段不需要客戶建立帳號，也不需要連接 GA4 或 Search Console。

系統只分析公開可取得的資訊。

可能包含：

* 網站是否可正常存取
* 頁面標題與 Meta Description
* 基本搜尋引擎可理解性
* 結構化資料
* 網站內容結構
* 品牌與服務描述是否清楚
* GEO／AEO 可理解性
* 公開頁面的轉換路徑
* 重要頁面是否容易被找到
* 基礎技術觀察
* 可選的 RiskRadar 公開掃描結果

公開數位快照的目的不是完整診斷。

它只是讓陌生潛在客戶先看到一至三個具體發現，願意進入下一個階段。

---

## 4.2 第二層：免費 AI 成效診斷

名稱暫定：

> Free AI Performance Diagnosis
> 免費 AI 成效診斷

潛在客戶願意進一步使用後：

1. 建立帳號。
2. 建立 Workspace。
3. 連接 GA4。
4. 連接 Google Search Console。
5. 系統分析近 30 天或指定期間的數據。
6. 產生一次性的 AI 成效診斷。

診斷內容應回答：

* 最近流量發生了什麼變化
* 哪些頁面正在成長或衰退
* 哪些搜尋字詞值得關注
* 哪些異常可能影響成果
* 哪個問題應優先處理
* 建議下一步做什麼

這個階段才正式展示 Highlight Signal 的核心價值。

---

## 4.3 第三層：Trial

免費 AI 成效診斷完成後，引導使用者進入：

> 14～30 天 Highlight Signal Trial

Trial 期間持續提供：

* Signal
* Evidence
* AI Explanation
* Recommendation
* Weekly Report
* Email Notification
* Human Review
* Decision

Trial 結束後再轉換為正式訂閱。

---

# 5. 完整轉換流程

```text
104／LinkedIn／個人官網／陌生開發
                    ↓
提交網站網址
                    ↓
執行公開數位快照
                    ↓
顯示 1～3 個公開發現
                    ↓
留下 Email／認領報告
                    ↓
建立 User Account
                    ↓
建立 Workspace
                    ↓
連接 GA4／Google Search Console
                    ↓
執行免費 AI 成效診斷
                    ↓
產生 Signal／Evidence／Recommendation
                    ↓
開通 14～30 天 Trial
                    ↓
持續產生 Decision Intelligence
                    ↓
轉換為付費訂閱
```

---

# 6. 架構調整結論

本次需求不應重做 Highlight Signal Core。

正確方向是：

```text
既有 Highlight Signal Core
完整保留

＋

新增 Acquisition / Public Snapshot Layer
```

新增層負責尚未正式成為客戶的人。

正式成為使用者後，再轉入既有 Workspace 與 Decision 流程。

---

# 7. Domain Boundary

建議將系統分為兩個主要區域。

## 7.1 Acquisition Domain

負責：

* 陌生訪客
* Lead
* 潛在網站
* 公開數位快照
* 免費報告
* Email 收集
* Demo 申請
* Report Claim
* Trial Conversion
* Workspace Conversion

Acquisition Domain 中的資料不應直接視為正式 Tenant 資料。

---

## 7.2 Highlight Signal Core Domain

負責：

* Workspace
* Data Source
* Metrics
* Signal
* Evidence
* AI Analysis
* Recommendation
* Human Review
* Decision
* Action
* Reporting
* Notification
* Audit Log

只有完成帳號與 Workspace 建立後，才進入 Core Domain。

---

# 8. 為什麼公開快照不能直接建立 Workspace

使用者只輸入網址時，尚未代表：

* 他是網站擁有者
* 他願意註冊
* 他會連接資料來源
* 他會使用 Trial
* 他是有效客戶

若每次公開分析都建立正式資料：

* User
* Workspace
* Data Source
* Signal
* Evidence
* Recommendation

資料庫會產生大量無效 Tenant 與未完成資料。

因此需要獨立的 Acquisition Data Model。

Lead 只有在完成轉換時，才建立正式 Workspace。

---

# 9. 建議新增 Backend Modules

請先檢查目前程式碼的模組命名與結構，再決定是否直接採用以下名稱。

建議新增：

```text
Modules/
├── Acquisition/
├── Lead/
├── PublicSnapshot/
├── Conversion/
└── Trial/
```

可能的責任分配如下。

---

## 9.1 Acquisition Module

負責整體獲客流程協調：

* 接收公開分析請求
* 建立 Lead 或 Anonymous Prospect
* 追蹤來源
* 管理漏斗狀態
* 管理 Report Claim
* 協調 Lead 轉換

---

## 9.2 Lead Module

負責：

* Lead 基本資料
* Email
* 公司名稱
* 聯絡人
* Lead Source
* Lead Status
* Lead Activity
* Demo Request
* Lead Conversion

---

## 9.3 Public Snapshot Module

負責：

* 驗證網址
* 建立 Snapshot Request
* 執行公開資料收集
* 分析公開資料
* 儲存 Finding
* 產生公開報告
* 控制 Public Token
* 控制報告有效期限

---

## 9.4 Conversion Module

負責：

* Lead 轉換為 User
* Prospect Website 轉換為 Workspace Site
* 建立 Workspace
* 綁定初始網站
* 將必要的公開快照資料轉為 Initial Context
* 建立 Trial
* 寫入 Conversion Event

---

## 9.5 Trial Module

負責：

* Trial 開始與結束時間
* Trial 狀態
* Trial Feature Access
* Trial Usage Limit
* Trial Conversion
* Trial Expiration
* Trial Notification

若目前 Subscription 或 Plan 模組已處理 Trial，則不應重複建立新的 Trial Domain。

請 Codex 優先沿用現有 Billing／Subscription／Plan 結構。

---

# 10. Public Snapshot Provider 設計

公開快照不應把所有掃描邏輯直接寫死在 Acquisition Module。

建議建立統一的 Provider Interface。

概念如下：

```text
PublicSnapshotProvider
├── SeoPublicScanner
├── ContentStructureScanner
├── GeoAeoScanner
├── ConversionPathScanner
└── RiskRadarAdapter
```

每個 Provider 回傳統一格式的 Finding。

概念欄位：

```text
category
severity
title
summary
evidence
business_impact
recommended_action
source_provider
raw_reference
```

這樣未來可以增加或移除掃描器，不必修改整個 Acquisition 流程。

---

# 11. RiskRadar 邊界

RiskRadar 不應直接併入 Highlight Signal Core。

RiskRadar 應視為：

> 可選的 Public Snapshot Data Provider

RiskRadar 可以提供：

* SSL 狀態
* Security Header
* 網站可用性
* HTTP 狀態
* 公開技術風險
* 基礎安全觀察

但 Highlight Signal 對外報告不應直接使用過度技術化描述。

例如：

```text
RiskRadar 原始 Finding：

HTTP response returned 5xx status.
```

Highlight Signal 報告可轉換為：

```text
部分重要頁面目前無法正常存取，
可能影響搜尋引擎收錄與潛在客戶瀏覽。
```

RiskRadar 負責技術發現。

Highlight Signal 負責商業影響與決策語言。

---

# 12. 建議資料表

實際命名需配合現有 Database Convention。

以下為概念設計，不要求照單全收。

---

## 12.1 leads

```text
id
email
name
company_name
source
status
metadata_json
created_at
updated_at
converted_at
```

建議 `source`：

```text
linkedin
104
personal_website
cold_email
organic
referral
manual
other
```

建議 `status`：

```text
anonymous
identified
report_claimed
demo_requested
qualified
workspace_created
trial_started
converted
lost
expired
```

---

## 12.2 prospect_websites

```text
id
lead_id nullable
domain
normalized_url
company_name nullable
ownership_status
status
created_at
updated_at
```

同一網域應避免無限制重複建立資料。

---

## 12.3 snapshot_requests

```text
id
prospect_website_id
request_type
status
requested_by_ip_hash
requested_at
completed_at
failed_at
error_code
```

`request_type` 可包含：

```text
public_snapshot
manual_outreach_snapshot
refresh_snapshot
```

---

## 12.4 snapshot_runs

```text
id
snapshot_request_id
job_id nullable
status
provider_count
started_at
completed_at
error_message
created_at
```

---

## 12.5 snapshot_provider_runs

```text
id
snapshot_run_id
provider
status
started_at
completed_at
raw_result_json
error_message
```

若資料量不大，也可以先不拆表，直接放入 Snapshot Run。

---

## 12.6 snapshot_findings

```text
id
snapshot_run_id
provider
category
severity
priority
title
summary
evidence_json
business_impact
recommended_action
is_public
created_at
```

`is_public` 用來控制哪些 Finding 可以在未登入狀態顯示。

---

## 12.7 snapshot_reports

```text
id
snapshot_run_id
public_token
status
summary
expires_at
view_count
last_viewed_at
claimed_at
created_at
updated_at
```

Public Token 必須：

* 不可預測
* 有效期限
* 可撤銷
* 不包含自增 ID

---

## 12.8 report_claims

```text
id
snapshot_report_id
lead_id
email
verification_status
verification_token
verified_at
created_at
```

若系統已有 Email Verification，可直接沿用。

---

## 12.9 acquisition_events

```text
id
lead_id nullable
prospect_website_id nullable
snapshot_report_id nullable
workspace_id nullable
event_type
event_data_json
created_at
```

建議事件：

```text
snapshot_requested
snapshot_completed
snapshot_failed
report_viewed
email_submitted
report_claimed
demo_requested
account_created
workspace_created
ga_connected
gsc_connected
diagnosis_started
diagnosis_completed
trial_started
subscription_started
lead_lost
```

---

## 12.10 lead_conversions

若 `acquisition_events` 已能完整追蹤，可以不另外建立。

若需要明確轉換紀錄，可建立：

```text
id
lead_id
user_id
workspace_id
trial_id nullable
converted_at
conversion_source
```

---

# 13. 與現有資料模型的轉換

當 Lead 完成帳號與 Workspace 建立後：

```text
Lead
→ User Account

Prospect Website
→ Workspace Site / Property

Claimed Snapshot
→ Initial Workspace Context

Public Findings
→ Initial Evidence or Baseline Reference

Conversion Event
→ Audit / Acquisition Analytics
```

不建議將所有公開掃描的 Raw Data 全部搬入正式 Workspace。

只保留：

* 初始網站狀態
* 重要 Finding
* Baseline
* 與正式成效診斷有關的 Context
* 報告來源連結

公開資料與正式 Workspace Data Source 應保持可追蹤但不要混在一起。

---

# 14. API 建議

實際 Route Style 應配合目前 API 規範。

---

## 14.1 Public API

```http
POST /api/public/snapshots
GET  /api/public/snapshots/{token}
POST /api/public/snapshots/{token}/claim
POST /api/public/demo-requests
```

### POST /api/public/snapshots

輸入：

```json
{
  "url": "https://example.com"
}
```

回傳：

```json
{
  "request_id": "public-id",
  "status": "queued"
}
```

---

### GET /api/public/snapshots/{token}

回傳：

* 網站基本資料
* Snapshot 狀態
* 公開 Findings
* Report Summary
* Report Expiration
* 下一步 CTA

未認領狀態只顯示部分內容。

---

### POST /api/public/snapshots/{token}/claim

輸入：

```json
{
  "email": "user@example.com",
  "name": "Optional Name",
  "company_name": "Optional Company"
}
```

用途：

* 建立或更新 Lead
* 寄送驗證信
* 認領完整公開報告
* 引導建立帳號

---

## 14.2 Authenticated API

```http
POST /api/workspaces
POST /api/workspaces/{workspaceId}/data-sources/google/connect
POST /api/workspaces/{workspaceId}/diagnostics
GET  /api/workspaces/{workspaceId}/diagnostics/{diagnosticId}
POST /api/workspaces/{workspaceId}/trials
```

若目前已有相同能力，請直接沿用，避免建立重複 Endpoint。

---

## 14.3 Internal Conversion API

```http
POST /api/acquisition/leads/{leadId}/convert
```

這個 API 是否需要公開，請依現有 Application Service 設計判斷。

比較理想的做法可能是由：

```text
Account Created Event
或
Workspace Created Event
```

自動觸發 Conversion Service。

---

# 15. Queue Job Types

沿用現有 MySQL Queue。

建議新增 Job Type：

```text
public_snapshot_collect
public_snapshot_provider_run
public_snapshot_analyze
public_snapshot_report_generate
public_snapshot_cleanup
workspace_initial_diagnosis
trial_weekly_report
trial_expiration_check
```

可能流程：

```text
public_snapshot_collect
        ↓
執行各 Provider
        ↓
public_snapshot_analyze
        ↓
public_snapshot_report_generate
        ↓
Snapshot Completed Event
```

Snapshot Job 必須具備：

* Idempotency
* Retry
* Timeout
* Provider Failure Isolation
* Partial Success
* Error Logging
* Maximum Execution Time

單一 Provider 失敗，不應讓整份公開快照完全失敗。

---

# 16. Frontend 頁面

建議新增或調整以下頁面：

```text
/free-diagnosis
/free-diagnosis/analyzing
/free-diagnosis/result/{token}
/free-diagnosis/claim
/signup
/connect-google
/trial/welcome
```

實際 Route 可以依現有 Frontend Convention 調整。

---

## 16.1 免費診斷首頁

內容：

* 輸入網址
* 簡短說明會分析什麼
* 說明不需要先註冊
* 明確標示這不是弱點掃描
* CAPTCHA／Turnstile

CTA：

> 免費查看公開數位快照

---

## 16.2 分析中頁面

顯示：

* 已收到請求
* 分析進度
* 可稍後透過 Token 返回
* 不應依賴前端長連線才能完成

可採：

* Polling
* Status Endpoint
* Queue Completion

---

## 16.3 公開結果頁

未留下 Email 前顯示：

* Overall Snapshot
* 一至三個 Findings
* 部分 Business Impact
* CTA

CTA：

> 免費查看完整公開報告

---

## 16.4 Claim 頁面

收集最少必要資訊：

* Email
* 名稱，可選
* 公司名稱，可選

不要一開始要求：

* 密碼
* 信用卡
* 完整公司資料
* Google 授權
* 電話

---

## 16.5 正式成效診斷流程

Claim 後：

```text
建立帳號
→ 建立 Workspace
→ 連接 Google
→ 選擇 GA4 Property
→ 選擇 Search Console Property
→ 執行 30 天 AI 成效診斷
```

---

# 17. Security Requirements

公開網址輸入功能具有高風險，必須處理以下安全問題。

---

## 17.1 SSRF 防護

必須阻擋：

```text
localhost
127.0.0.0/8
0.0.0.0
10.0.0.0/8
172.16.0.0/12
192.168.0.0/16
169.254.0.0/16
IPv6 localhost
IPv6 private range
Cloud Metadata Endpoint
內部 Hostname
非 HTTP/HTTPS Scheme
```

Redirect 後的每一個新網址都必須重新驗證。

不能只驗證原始輸入網址。

---

## 17.2 Rate Limit

至少限制：

* IP 每小時請求數
* Domain 每日掃描數
* Email 每日 Claim 數
* 同一 Token 嘗試次數
* Snapshot Refresh 次數

建議使用 Cloudflare Rate Limit 或應用層限制。

---

## 17.3 Bot Protection

使用：

* Cloudflare Turnstile
* Request Fingerprint
* 基本 Bot Detection

不要只依賴前端驗證。

---

## 17.4 Token Security

Public Report Token 必須：

* 使用高熵隨機值
* 不使用資料表 ID
* 有期限
* 支援撤銷
* 不在 Log 中完整輸出
* 避免被搜尋引擎索引

結果頁應設定：

```text
noindex
nofollow
```

---

## 17.5 URL Fetch Policy

需限制：

* 只允許 HTTP／HTTPS
* 最大 Redirect 次數
* 最大 Response Size
* Connect Timeout
* Read Timeout
* Content Type
* User Agent
* 禁止下載大型檔案
* 禁止無限制 Crawling

初版只分析首頁與有限數量公開頁面。

---

# 18. Retention Policy

未轉換資料不可永久保留。

建議：

```text
未完成 Snapshot Request：
7 天後清除

未認領 Snapshot Report：
30 天後清除或匿名化

已認領但未註冊 Lead：
90 天後依規則清除或匿名化

Provider Raw Result：
30～90 天

正式轉換資料：
依 Workspace Retention Policy
```

Email 與個資應遵守既有 Privacy Policy。

請確認現有 Retention Module 是否能支援 Acquisition Data。

---

# 19. Notification

可新增事件：

```text
SnapshotCompleted
SnapshotFailed
ReportClaimed
LeadQualified
DemoRequested
WorkspaceConverted
InitialDiagnosisCompleted
TrialStarted
TrialExpiring
TrialExpired
```

可能通知：

* 公開報告完成 Email
* Claim 驗證 Email
* GA／GSC 尚未連接提醒
* AI 成效診斷完成 Email
* Trial 即將到期 Email

應沿用現有 Notification 架構，不建立第二套寄信系統。

---

# 20. Audit Log

公開匿名行為不必全部寫入正式 Workspace Audit Log。

建議：

```text
Acquisition Event
負責匿名與獲客行為

Audit Log
負責登入後與 Workspace 內的重要操作
```

轉換後的重要事件再寫入 Audit Log，例如：

* Workspace Created
* Data Source Connected
* Trial Started
* Subscription Started

---

# 21. Infrastructure 影響

現有：

* PHP
* Shared Hosting
* Cloudflare
* MySQL
* GAS Cron
* MySQL Queue

原則上可以維持。

初版不要求：

* Cloud Run
* Python Worker
* Redis
* Kafka
* 新增 Microservice
* 新增 Message Broker

但需檢查 Shared Hosting 是否適合執行：

* 外部網站抓取
* 多 Provider 掃描
* 長時間分析
* HTML Parsing
* AI Report Generation

若工作時間過長，仍先透過 MySQL Queue 分段處理。

只有在實際資源不足時，才將特定 Scanner 搬到 Cloud Run 或獨立 Worker。

---

# 22. MVP Scope

第一版不要一次完成全部掃描能力。

建議 MVP 僅包含：

## Public Snapshot

* 輸入網址
* URL Security Validation
* Cloudflare Turnstile
* 建立 Snapshot Request
* Queue 非同步執行
* 分析首頁
* 產生三類 Finding
* 公開結果頁
* Email Claim
* Lead 紀錄
* Report Expiration

初版 Finding 類別：

```text
search_visibility
content_clarity
conversion_path
```

可選：

```text
structured_data
geo_aeo_readiness
basic_technical_observation
```

RiskRadar Adapter 可放到第二階段。

---

## Conversion

* Claim Report
* 建立帳號
* 建立 Workspace
* 將 Domain 帶入 Workspace
* 引導連接 Google
* 執行初始成效診斷

---

## Trial

* Trial Start
* Trial End
* 使用方案限制
* Trial Weekly Report
* Trial Expiration Reminder

---

# 23. Non-Goals

本次不要處理：

* 完整 CRM
* 大型銷售自動化
* 大量 Cold Email 寄送系統
* 自動抓取企業聯絡人 Email
* 全網站無限制爬蟲
* 完整 RiskRadar 功能整合
* 企業版客製流程
* 複雜 Marketing Automation
* 多階段 Lead Scoring
* 新增微服務架構
* 重寫 Workspace Core
* 重寫 Signal／Evidence／Recommendation

---

# 24. 建議分階段實作

## Phase 1：Architecture Review

請 Codex 先完成：

1. 檢查現有模組結構。
2. 檢查目前 User／Workspace 建立流程。
3. 檢查目前 Queue 實作。
4. 檢查目前 Reporting 與 Notification。
5. 檢查是否已有 Trial／Subscription。
6. 列出可直接重用的 Service。
7. 列出文件與程式碼不一致之處。
8. 提出最小改動方案。

Phase 1 不直接大量修改程式碼。

---

## Phase 2：Public Snapshot MVP

實作：

* Public Snapshot Domain
* URL Validator
* SSRF Protection
* Snapshot Request
* Queue Job
* 最小 Scanner
* Snapshot Findings
* Public Report Token
* Result Page
* Turnstile
* Rate Limit

---

## Phase 3：Lead Claim

實作：

* Lead
* Email Claim
* Email Verification
* Acquisition Event
* Report Claim
* Demo Request

---

## Phase 4：Workspace Conversion

實作：

* Lead to User
* Prospect Website to Workspace
* Initial Context
* Google Data Source Connection
* Initial AI Performance Diagnosis

---

## Phase 5：Trial Conversion

實作：

* Trial Activation
* Trial Limits
* Weekly Report
* Trial Reminder
* Subscription Conversion

---

## Phase 6：RiskRadar Adapter

確認 RiskRadar API 或內部程式邊界後，再加入：

* Basic Availability
* SSL
* HTTP Status
* Security Header
* Technical Risk Finding

只將適合公開且與商業影響有關的結果放進 Highlight Signal 報告。

---

# 25. Codex 執行要求

請 Codex 不要直接假設本文件中的資料表與模組名稱一定正確。

請依序執行：

## Step 1：現況盤點

列出：

* 現有相關目錄
* 現有 Domain Modules
* 現有 Database Tables
* 現有 API Routes
* 現有 Queue Jobs
* 現有 Workspace 建立流程
* 現有 Trial／Subscription
* 現有 Notification
* 現有 Reporting
* 現有 RiskRadar 整合點

---

## Step 2：差異分析

將目前系統與本文件需求比較，分成：

```text
Already Supported
Can Be Extended
Needs New Module
Needs Refactor
Conflict Found
Not Recommended
```

---

## Step 3：提出技術方案

至少提供：

1. 最小改動方案。
2. 完整長期方案。
3. 兩者的工程差異。
4. 風險。
5. 建議採用方案。

優先採用最小改動、可逐步演進的方案。

---

## Step 4：建立修改清單

依檔案或模組列出：

```text
Create
Modify
Keep
Deprecate
```

並說明每個修改的原因。

---

## Step 5：Database Migration Plan

提供：

* 新增資料表
* 新增欄位
* Index
* Unique Constraint
* Foreign Key
* Retention
* Migration 順序
* Rollback 方法

---

## Step 6：API Contract

提供初版：

* Request
* Response
* Error Code
* Authentication
* Rate Limit
* Idempotency
* Permission

---

## Step 7：Implementation Plan

將工作拆成可獨立驗證的小任務。

每一項應包含：

* 目的
* 修改範圍
* 驗收條件
* 測試方式
* 相依任務

---

# 26. 驗收條件

Public Snapshot MVP 完成後，應符合以下條件。

## Functional

* 未登入使用者可以輸入公開網址。
* 系統不會立即建立 Workspace。
* 系統可以非同步執行 Snapshot。
* 使用者可以透過 Token 查看結果。
* 未留下 Email 只能看到有限內容。
* 使用者可以留下 Email 認領完整報告。
* Claim 後可建立帳號與 Workspace。
* Workspace 可繼續連接 GA4／Search Console。
* 可執行 Highlight Signal 正式成效診斷。

---

## Architecture

* Public Snapshot 不直接依賴 Workspace。
* Acquisition 與 Core Domain 邊界清楚。
* RiskRadar 只能透過 Adapter 或明確介面提供資料。
* Snapshot Finding 使用統一資料格式。
* 正式 Signal／Evidence 不被匿名掃描資料污染。
* 沿用既有 Queue、Notification 與 Reporting。

---

## Security

* 無法掃描 Private IP。
* 無法透過 Redirect 存取 Private IP。
* 有 Rate Limit。
* 有 Turnstile。
* Public Token 不可預測。
* 報告有有效期限。
* Fetch 有 Timeout 與 Response Size Limit。
* 結果頁不被搜尋引擎索引。

---

## Operation

* Job 可 Retry。
* Job 具備 Idempotency。
* Provider 可獨立失敗。
* 有錯誤紀錄。
* 有 Snapshot 清理排程。
* 可統計 Acquisition Funnel。

---

# 27. 最終原則

這次調整不是要將 Highlight Signal 改成網站掃描產品。

公開數位快照只是獲客入口。

產品核心仍然是：

```text
從企業自己的數據中發現 Signal
→ 提供 Evidence
→ 產生 Recommendation
→ 支援 Human Review
→ 形成 Decision
→ 追蹤 Result
```

正確的產品邊界為：

```text
Public Snapshot
負責取得陌生客戶注意

Free AI Performance Diagnosis
負責展示 Highlight Signal 核心價值

Trial
負責證明持續監控與決策建議的價值

Highlight Signal Core
負責正式持續服務

RiskRadar
負責技術與安全風險掃描，必要時透過 Adapter 提供資料
```

請以以下原則評估與修改：

> 保留現有核心架構。
> 新增獲客入口。
> 避免匿名資料污染正式 Workspace。
> 不建立重複系統。
> 優先沿用既有模組。
> 採取分階段、可回滾的實作方式。
