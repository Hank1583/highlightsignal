# Highlight Signal V1 Technical Specification Alignment

Version: v1.2  
Status: Accepted  
Date: 2026-07-02  
Scope: V1 Documentation Alignment

---

# 1. Purpose

本文件是 Highlight Signal V1 技術規格的最高對齊準則。

當 Handbook、Concepts、Framework、Architecture、Database、API、Backend、Infrastructure、Frontend 或 ADR 之間出現矛盾時，V1 實作與後續文件修訂應以本文件為準。

本文件只統一既有產品架構與技術邊界，不建立新的產品方向，也不代表所有 Future 能力已納入 V1。

---

# 2. Fixed V1 Decisions

Highlight Signal V1 採用以下固定決策：

1. Production Database 使用 MySQL。
2. Backend 使用 PHP Modular Monolith；目前 Shared Hosting 過渡 Runtime 為 PHP 7.0.26，程式須維持相容，並保留日後升級 PHP 8.1+ 的邊界。
3. Frontend 使用 Next.js、React、TypeScript 與 Tailwind CSS。
4. Frontend 部署於 Cloudflare。
5. Backend 是唯一 Business API Entry Point。
6. 對外通訊使用 HTTPS REST API。
7. Background Jobs 使用 MySQL Database Job Queue。
8. Google Apps Script 只負責排程觸發，不承載 Business Logic。
9. Workspace 是 V1 唯一 Tenant、資料隔離、權限與 AI Context 邊界。
10. V1 採用 Human-in-the-loop。
11. V1 不實作 Autonomous Decision。
12. V1 不實作 Autonomous Learning。
13. Architecture 維持 Stable Core，Implementation 可漸進替換。
14. 優先修改既有文件，不建立內容重複的 Domain、Framework 或 Architecture 文件。

---

# 3. Product Position

Highlight Signal V1 是一套 Workspace-centric、Human-in-the-loop 的 AI Decision Intelligence SaaS。

系統的目的不是展示最多資料，而是協助使用者理解重要變化、確認依據、評估商業影響、採納建議、執行行動並檢視結果。

AI 在 V1 中提供：

* Signal Detection
* Analysis
* Explanation
* Business Impact Assessment
* Priority Suggestion
* Recommendation

AI 不在 V1 中取代人類做出正式 Decision，也不在未經明確授權的情況下自主執行 Action。

---

# 4. Unified V1 Domain Flow

V1 的統一 Domain Flow 為：

```text
Workspace Context
        ↓
Integration / Data Source
        ↓
Raw Observation / Metric
        ↓
Signal
        ↓
Evidence
        ↓
Explanation + Business Impact
        ↓
Recommendation
        ↓
Human Review
        ↓
Decision
        ↓
Action
   ├── Manual Task
   └── System Queue Job
        ↓
Execution Result
        ↓
Business Outcome
        ↓
Evaluation / Feedback
```

此流程描述 Domain Responsibility，不要求每個步驟都成為獨立部署服務或獨立 V1 Module。

---

# 5. Cross-cutting Capabilities

Notification、Audit Log 與 Permission 不屬於線性 Domain Flow 的單一步驟。

```text
Domain Event
    → Notification Service

Important Mutation
    → Audit Log

Every Workspace Operation
    → Authentication + Workspace Authorization
```

## Notification

Notification 是 Domain Event 的訂閱者，可由 Signal、Recommendation、Decision、Task、Queue Job 或 Result 等事件觸發。

Notification 負責 Alert、Reminder、Delivery 與 Status Update，不參與 Business Decision。

## Audit Log

Audit Log 是橫切能力。所有重要的使用者、系統與 AI Mutation 都應留下不可任意修改、可搜尋且可追溯的紀錄。

## Permission

Backend 必須對所有 Workspace-scoped Request 執行 Authentication、Workspace Membership 與 Authorization 檢查。Frontend Route Guard 只改善 User Experience，不是最終安全邊界。

---

# 6. Domain Responsibilities

## Workspace

Workspace 是 V1 唯一 Tenant Boundary，負責 Data Isolation、Permission Boundary、Business Context、Module Context 與 AI Context。

所有 Workspace-owned Business Records 必須直接具有 `workspace_id`，或透過不可混淆的父層關係驗證其 Workspace Ownership。

Global Reference Tables 不強制具有 `workspace_id`。

## Integration

Integration 表示 Workspace 與外部平台之間的連線設定、授權狀態與同步設定。

## Data Source

Data Source 表示可被系統分析的邏輯資料來源。Data Source 可由 Integration、手動輸入或內部系統提供。

## Connector

Connector 是實際與外部平台通訊的技術 Adapter，負責 Authentication、Token Refresh、API Fetch、Rate Limit 與 Error Handling。

```text
Integration
    → configures access to an external platform

Data Source
    → identifies analyzable information

Connector
    → performs technical communication
```

## Raw Observation

Raw Observation 是從 Data Source 收集的原始觀測、紀錄或快照，用於 Traceability、Reprocessing 與 Evidence 建立。

## Metric

Metric 是由 Raw Observation 計算或正規化後的量化指標。

V1 不建立獨立 Metric Domain Module。Metric 歸 Evidence Domain 管理，可依資料量與查詢需求選擇持久化或計算產生。

## Signal

Signal 是值得關注、可驗證且具有行動意義的變化、異常、風險或機會。

Signal 回答：

> 發生了什麼？

Signal 不等於一般 Metric，也不等於正式 Decision。

## Evidence

Evidence 是支持 Signal、Explanation、Business Impact 或 Recommendation 的可追溯事實。

Evidence 可引用 Source、Snapshot、Metric、Observation、Scan Result 或 Supporting Record。

Evidence 不等於 AI Explanation，也不等於 Business Impact。

## Explanation

Explanation 是 AI 或規則對 Signal、Evidence 與 Context 的解讀，負責說明資料可能代表什麼以及判斷如何形成。

Explanation 必須可連回 Evidence，不能把未經支持的 AI 推測當成 Evidence。

## Business Impact

Business Impact 描述 Signal 或 Recommendation 對 Revenue、Risk、Operation、SEO、Security、Customer 或其他 Business Goal 的可能影響。

Business Impact 與 Evidence、Explanation 分開表達。

## Insight

Insight 在 V1 是分析內容，不是獨立持久化 Entity。

Insight 可存在於 Recommendation Summary、Explanation、Business Impact 或 Reasoning 中。V1 不建立獨立 Insight Table、API 或 Backend Module。

## Recommendation

Recommendation 是系統根據 Signal、Evidence、Explanation、Business Impact 與 Workspace Context 提出的具體建議。

Recommendation 應具備 Priority、Confidence、Expected Impact、Suggested Action 與 Reason。

Recommendation 是建議，不是正式 Decision，也不得未經 Human Review 自動執行 Action。

## Human Review

Human Review 是使用者檢查 Recommendation、Evidence、Explanation 與 Business Impact 的流程階段，不是 Domain Entity，也不能取代 Decision。

## Decision

Decision 是人類對 Recommendation 做出的正式判斷。

V1 Decision 至少支援：

* Accepted
* Rejected
* Deferred
* Modified
* Needs More Evidence

Decision 應記錄 Decision Maker、Reason、Timestamp、Related Recommendation 與 Expected Outcome。

V1 的 Decision 與 Action 暫歸 Recommendation Domain 管理，不建立內容重複的獨立頂層模組。

## Action

Action 是由 Decision 產生的 Business-level Intent，表示決定要做什麼。

Action 可以建立 Manual Task，或在明確授權後建立 System Queue Job。

## Task

Task 是 Work Management Unit，記錄 Owner、Due Date、Status 與 Progress，歸 Execution Domain 管理。

## Queue Job

Queue Job 是 Infrastructure Execution Unit，負責 Background Processing、Worker Claim、Retry、Lock、Payload 與執行狀態。

Queue Job 不等於 Action，也不等於 Task。

## Execution Result

Execution Result 記錄 Task 或 Queue Job 的技術執行結果，例如 Success、Failure、Output、Error 與 Duration。

## Business Outcome

Business Outcome 記錄 Action 執行後的商業變化，例如 CTR 提升、CPA 降低、Traffic 回升、Conversion 增加或 Risk 降低。

Execution Result 與 Business Outcome 必須分開，不得將「工作成功完成」直接視為「商業目標已達成」。

## Evaluation / Feedback

Evaluation / Feedback 負責評估 Recommendation、Decision、Action 與 Business Outcome 是否有效。

V1 支援 Manual Feedback、Basic Evaluation、Outcome Tracking 與 Recommendation Adoption Metrics，歸 Learning Domain 管理。

V1 不進行 Automatic Model Update、Self-optimizing AI 或 Autonomous Learning。

---

# 7. V1 Module Boundaries

為避免 V1 過度設計，概念物件不必全部拆成獨立 Module。

V1 採用以下聚合邊界：

```text
Workspace Domain
    ├── Workspace
    ├── Membership
    ├── Settings
    ├── Integration
    └── Data Source Context

Signal Domain
    └── Signal

Evidence Domain
    ├── Raw Observation
    ├── Metric
    ├── Evidence
    ├── Explanation Reference
    └── Business Impact Reference

Recommendation Domain
    ├── Recommendation
    ├── Human Review
    ├── Decision
    └── Action

Execution Domain
    ├── Task
    ├── Workflow
    ├── Queue Job Interface
    └── Execution Result

Learning Domain
    ├── Business Outcome
    ├── Evaluation
    └── Feedback

Communication Domain
    └── Notification

Governance Domain
    ├── Permission
    ├── Approval
    └── Audit Log
```

Queue 的儲存與 Worker Coordination 屬於 Infrastructure；Execution Domain 只透過 Queue Interface 使用它。

---

# 8. Database Alignment

## Database Engine

V1 Production Database 與 Job Queue 統一使用 MySQL。

PostgreSQL、SQLite、Redis、RabbitMQ、Kafka、Cloud Tasks 或 Managed Queue 只能列於 Future Evolution，不是 V1 Baseline。

## Workspace Ownership

Workspace-owned Business Records 必須具備明確 Workspace Ownership。

Global Reference Data，例如 Default Types、System Configuration 或 Public Reference Data，可以不具有 `workspace_id`。

## Persistence Rules

* Insight 不建立獨立 Table。
* Metric 不建立獨立 Domain Schema；必要 Metric 可由 Evidence Domain 持久化。
* Decision 與 Action 納入 Recommendation Domain Schema。
* Task 與 Execution Result 納入 Execution Domain Schema。
* Business Outcome、Evaluation 與 Feedback 納入 Learning Domain Schema。
* Audit Log 採 Append-friendly、Immutable-during-retention 設計。
* Business Entity 優先使用 Soft Delete、Archive 與 Retention Policy。

---

# 9. API Alignment

V1 使用 HTTPS REST API，PHP Backend 是唯一 Business API Entry Point。

Frontend 不直接存取 Database、Queue Worker 或外部平台 Secret。

API 應依既有 Domain Boundary 聚合，不因每個概念物件存在就建立獨立頂層服務。

Cron Endpoint：

* 僅供受信任 Scheduler 呼叫。
* 必須驗證 Authentication、Timestamp 與 Replay Risk。
* 只負責觸發或建立 Job。
* 不承載長時間 Business Processing。

Notification API 仍以 Notification Resource、Preference、Read、Acknowledge 與 Delivery Status 為主。Domain Event Subscription 是 Backend Internal Architecture，不直接暴露為 Frontend Business API。

---

# 10. Backend Alignment

V1 Backend 使用 PHP Modular Monolith。

標準 Request Flow：

```text
Request
→ Authentication Middleware
→ Workspace Authorization
→ Controller
→ Validator
→ Service
→ Repository
→ MySQL
→ DTO Response
→ Domain Event / Audit Log
```

Controllers 保持薄層；Business Rule 與 Transaction Boundary 位於 Service；Repository 只負責 Persistence。

外部平台必須透過 Connector Adapter 存取。Domain Service 不直接呼叫未封裝的外部 API。

Background Work Flow：

```text
Service
→ MySQL Queue Job
→ PHP Worker
→ Execution Result
→ Domain Event
→ Notification / Audit Log
```

Python、Cloud Run、Microservices 與 Managed Queue 只屬於 Future Evolution。

---

# 11. Frontend Alignment

V1 Frontend 使用 Next.js、React、TypeScript 與 Tailwind CSS，部署於 Cloudflare。

Frontend 是 Presentation Layer，負責 UI、Navigation、State、API Integration 與 Human Review Experience。

Frontend 不負責：

* 最終 Permission Decision
* Business Rule Execution
* Direct Database Access
* Queue Execution
* Autonomous Decision

V1 的 Decision-first UI Flow 為：

```text
Workspace
→ Today's Signals
→ Signal
→ Evidence
→ Explanation + Business Impact
→ Recommendation
→ Human Review
→ Decision
→ Action / Task Status
→ Execution Result
→ Business Outcome / Feedback
```

Widget 是 Presentation Model，不擁有 Signal、Evidence、Recommendation 或 Decision 等 Business Data。

Next.js 不承載核心 Business Logic；所有正式 Business Mutation 必須經由 PHP REST API。

---

# 12. Infrastructure Alignment

V1 Infrastructure：

```text
Browser
    ↓
Cloudflare
    ├── DNS / HTTPS / CDN / Reverse Proxy
    └── Next.js Frontend
            ↓ HTTPS REST
PHP Shared Hosting
            ↓
MySQL
    ├── Business Data
    └── Database Job Queue

Google Apps Script
    ↓ HTTPS Cron Trigger
PHP Backend / Worker
```

Cloudflare 不承載核心 Business Logic。Google Apps Script 不理解 Queue、Recommendation 或 Domain Rule。MySQL 是 V1 唯一 Production Relational Database 與 Queue Storage。

---

# 13. V1 Scope

V1 必須包含：

* Workspace-based Tenant Isolation
* Authentication and Workspace Authorization
* Integration / Data Source Context
* Signal
* Evidence
* Explanation
* Business Impact
* Recommendation
* Human Review
* Decision
* Action Intent
* Manual Task or Authorized Queue Job
* Execution Result
* Basic Business Outcome Tracking
* Basic Evaluation / Feedback
* Notification
* Audit Log
* MySQL Retention and Queue Support

V1 不包含：

* Autonomous Decision
* Autonomous Action without Explicit Authorization
* Autonomous Learning
* Independent Insight Entity
* Organization Tenant Model
* Full Custom Role / ABAC
* Multi-Agent System
* Microservices
* Python Primary Backend
* Cloud Run Production Backend
* Redis / RabbitMQ / Kafka
* GraphQL as Primary API
* Managed Queue as V1 Infrastructure

---

# 14. Future Scope

Future 可透過 Incremental Evolution 加入：

* Organization to Workspace Hierarchy
* Independent Insight Entity
* Advanced Evaluation and Learning Loop
* Autonomous Workflow with Governance
* AI Agent and Multi-Agent Collaboration
* Python or Cloud Run Worker
* Managed Queue
* Redis or Cloud Tasks
* Streaming API
* Enterprise Permission, SSO and SCIM
* Plugin System
* Cross-workspace Intelligence

Future Capability 不得推翻 Workspace Boundary、Evidence Traceability、Human Governance、Domain Isolation 與 Stable Core。

---

# 15. Documentation Alignment Rules

後續文件修訂必須遵守：

1. 優先修改既有文件，不建立重複的 Decision、Execution、Learning 或 Domain Model 文件。
2. `06_Decision_Concept.md` 是 Decision Concept 的既有位置。
3. `03 Decision Framework.md` 是 Decision Framework 的既有位置。
4. `04 Execution Framework.md` 與 `11_Execution_Architecture.md` 承載 Task、Workflow、Execution 與 Execution Result。
5. `05 Learning Framework.md` 承載 Business Outcome、Evaluation 與 Feedback。
6. Metric 歸 Evidence Domain，不建立獨立 Metric Module。
7. Decision 與 Action 歸 Recommendation Domain，不建立重複的頂層 V1 Module。
8. Insight 在 V1 不建立獨立 Database、API 或 Backend Module。
9. Notification 的 Event Subscriber 身分屬於 Backend Architecture；Frontend API 仍提供 Notification Resource。
10. Audit Log 是橫切能力，不是 Domain Pipeline 的最後一步。
11. 所有 Future Capability 必須明確標示 Future，不得以 V1 現行能力描述。
12. 文件狀態必須使用一致語意：Draft、Stable、Accepted 或 Frozen。
13. Frozen Architecture 若需依本文件調整，應標示為 Alignment Patch，不應暗中改變 Stable Core。

---

# 16. Required Documentation Corrections

後續應依下列順序修訂既有文件：

1. Documentation Index
2. Handbook
3. Concepts
4. Framework
5. Architecture
6. Database
7. API
8. Backend
9. Infrastructure
10. Frontend
11. ADR

最低必要修正包含：

* 將 Production Database 全面統一為 MySQL。
* 統一 Domain Flow 與 Decision 定義。
* 將 Insight 標示為 V1 非獨立持久化內容。
* 分離 Evidence、Explanation 與 Business Impact。
* 分離 Action、Task、Queue Job、Execution Result 與 Business Outcome。
* 將 Notification 定義為 Domain Event Subscriber。
* 將 Audit Log 定義為 Cross-cutting Capability。
* Learning Architecture 若於 Future 新增，必須承載 Business Outcome、Evaluation 與 Feedback，不得複製 Domain Model。
* 統一 Draft、Stable、Accepted 與 Frozen 狀態。
* 明確區分 V1 Scope 與 Future Scope。

---

# 17. Final Unified Statement

Highlight Signal V1 是一套 Workspace-centric、Human-in-the-loop 的 AI Decision Intelligence SaaS。

系統以 PHP Modular Monolith 作為 Backend，以 MySQL 作為 Production Database 與 Database Job Queue，以 HTTPS REST API 作為唯一 Business Communication Interface，以 Next.js Frontend 部署於 Cloudflare，並由 Google Apps Script 觸發排程。

AI 負責找出 Signal、整理 Evidence、提供 Explanation、評估 Business Impact 並提出 Recommendation；人類透過 Human Review 做出正式 Decision，再形成 Action、Manual Task 或經授權的 System Queue Job。

Execution Result 只表示工作是否成功完成，Business Outcome 則表示實際商業目標是否改善。Evaluation 與 Feedback 用於建立 V1 的基本閉環，但不進行 Autonomous Learning。

Notification 是 Domain Event Subscriber，Audit Log 是重要 Mutation 的 Cross-cutting Capability，Permission 則由 Workspace-scoped Backend Authorization 強制執行。

所有後續文件與實作都必須遵循本 Alignment，並以 Incremental Evolution 擴充能力，不得推翻 V1 Stable Core。
