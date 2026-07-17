# Highlight Signal V1 Implementation Gap Analysis

Version: v1.0  
Status: Ready for Implementation Planning  
Date: 2026-07-02  
Authority: `00_Technical_Specification_Alignment_v1.2.md`

---

# 1. Scope

本報告比對：

* Next.js project: `D:\7.Highlight\1.Project\5.web\highlightsignal`
* PHP project: `D:\7.Highlight\1.Project\4.php\highlightsignal`
* Existing SQL files in the PHP project
* Highlight Signal V1 Technical Specification Alignment v1.2

本次只進行靜態盤點，沒有修改 Next.js、PHP 或 Database。

---

# 2. Current System Architecture

目前實際架構為：

```text
Browser
    ↓
Next.js / OpenNext on Cloudflare
    ├── Page Rendering
    ├── JWT Cookie Verification
    └── Next.js Route Handlers as BFF / Proxy
            ↓ X-Member-* Headers
Standalone PHP Endpoint Scripts
    ├── GA
    ├── Search Intelligence
    ├── Dashboard AI
    └── Report Generation
            ↓ mysqli
MySQL
```

目前 PHP 是依功能資料夾與 endpoint script 組織，尚未形成 Alignment v1.2 定義的 Controller、Service、Repository、Policy、DTO 與 Worker 邊界。

---

# 3. Next.js Project Inventory

## Technology

* Next.js 16
* React 19
* TypeScript 5
* Tailwind CSS 4
* OpenNext for Cloudflare
* Cloudflare Wrangler
* `jose` JWT
* Recharts
* Framer Motion

此技術組合與 Alignment v1.2 基本一致。

## Application Areas

目前主要 UI 區域：

* Dashboard
* GA
* Search Intelligence
  * SEO
  * AEO
  * GEO
* Ads
* CRM
* Account
* Team
* Billing
* Support

## API Layer

Next.js 目前包含 Auth、Dashboard、GA、SEO、AEO、GEO 與 Site 等 Route Handlers。

多數 Route Handler：

1. 讀取 HttpOnly JWT cookie。
2. 在 Next.js 驗證 JWT。
3. 將 member identity 轉成 `X-Member-*` Headers。
4. 呼叫外部 PHP endpoint。

這使 Next.js 實際扮演 BFF / authentication proxy，而 PHP 並未自行驗證原始使用者 JWT。

## Positive Findings

* 使用 HttpOnly cookie。
* Middleware 有 protected route 與 product access 概念。
* Frontend 沒有直接連線 MySQL。
* PHP base URL 已集中於 config helper。
* Cloudflare/OpenNext 部署結構已存在。

## Gaps

* Authentication 同時依賴外部 legacy login API、Next.js JWT 與另一組 Java backend token，Identity Boundary 分散。
* Frontend route permission 以 product key 為主，尚未具備 Workspace membership 與 Workspace role。
* Next.js BFF 對 PHP 使用可偽造的 identity headers，沒有 backend-to-backend request signature。
* 尚無 Workspace route/context，例如 `/workspaces/{workspace_id}/...`。
* Dashboard 首頁已於 2026-07-03 建立 AI Summary → Top Recommendation → Evidence → Business Impact → Human Review → Action / Task Creation 的第一屏流程；GA、SEO、AEO、GEO 模組頁仍待逐步對齊。Human Review 目前為前端工作階段狀態，尚未持久化為正式 Decision。

---

# 4. PHP Project Inventory

## Current Structure

```text
highlightsignal/
├── api_helpers.php
├── auth.php
├── db_connect.php
├── ga_runner.php
├── dashboard/
├── ga/
├── si/
│   ├── aeo/
│   ├── geo/
│   ├── seo/
│   └── sites/
└── sql/
```

目前約有 44 個 PHP files。

大型 endpoint / helper files 已出現：

* `si/generate_common.php` 超過 1,000 行。
* `si/seo/summary.php` 超過 700 行。
* `ga_runner.php` 超過 600 行。
* `dashboard/ai_compose.php` 超過 600 行。

這些檔案同時承擔 Request、Business Logic、External API、SQL、AI Prompt、Response Composition 與 Runtime DDL，已超出單一責任。

## Existing Capabilities

* MySQL access through `mysqli`。
* 多數資料操作使用 prepared statements。
* GA OAuth、sync、query、report。
* SEO sites、summary、PageSpeed cache/history。
* AEO/GEO analysis run、metrics、items、actions。
* Dashboard AI compose、plan、usage logging。
* Report runner、Excel、email。

## Missing Modular Monolith Boundaries

目前沒有一致的：

* Front Controller / Router
* Authentication Middleware
* Workspace Authorization Policy
* Controller Layer
* Service Layer
* Repository Layer
* DTO / Response Contract
* Domain Event Dispatcher
* Audit Service
* Queue Service / Worker Contract
* Migration Runner
* Transaction Boundary conventions

---

# 5. P0 Security Findings

## Hard-coded Secrets

PHP database configuration currently contains production credentials and third-party API keys directly in source code.

Required action:

1. Treat all committed credentials as compromised.
2. Rotate database password.
3. Revoke and rotate OpenAI API key.
4. Revoke and rotate PageSpeed / Google API key.
5. Move secrets to server environment variables or a non-public secret configuration outside the web root.
6. Remove secrets from deployable source and repository history where applicable.

## Spoofable Identity Headers

PHP trusts `X-Member-Id`, email, name, role, and enabled-products headers without cryptographic verification.

Anyone who can call the PHP endpoint directly may impersonate another member by supplying these headers.

Required action:

* PHP must validate a signed backend token or a short-lived service assertion.
* Do not trust user-supplied role or product headers as authorization facts.
* Resolve membership and permissions from MySQL after token verification.

## Permissive CORS

PHP currently allows `Access-Control-Allow-Origin: *` while accepting identity-bearing headers.

Required action:

* PHP business endpoints should normally be server-to-server only.
* Restrict allowed origins where browser access is genuinely required.
* Restrict methods and headers per endpoint.

## Error and Configuration Exposure

Configuration and connection logic are mixed with runtime code. Database connection failures terminate directly with JSON.

Required action:

* Centralize exception handling.
* Return stable public error codes.
* Keep infrastructure details out of responses and logs.

---

# 6. Database Inventory

## Existing SQL-managed Tables

Known schema files define or alter:

* `team_members`
* `support_tickets`
* `dashboard_ai_logs`
* `seo_pagespeed_cache`
* `seo_pagespeed_history`
* `si_sites`
* `si_analysis_runs`
* `si_analysis_metrics`
* `si_analysis_items`
* `si_analysis_actions`
* `si_analysis_side_items`

PHP also references operational tables such as:

* `ga_connections`
* `ga_daily_summary`
* `ga_traffic_sources`
* `ga_pages`
* `ga_events`
* `ga_conversions`
* `ga_report_schedules`
* `ga_report_logs`
* `seo_sites`
* `seo_site_integrations`
* `seo_summary_cache`
* `dashboard_ai_plan_logs`

Not every referenced table has a corresponding versioned schema file in this project.

## Critical Alignment Gap

Current PHP and SQL contain no `workspace_id` references.

Ownership currently uses a mixture of:

* `user_id`
* `member_id`
* `owner_member_id`

Therefore the database is user-centric, not Workspace-centric.

## Missing V1 Domains

There are no aligned persistent models for:

* Workspaces
* Workspace Members / Roles
* Workspace Integrations
* Signals
* Evidence and Evidence Links
* Recommendations
* Human Review / Decisions
* Business Actions
* Tasks / Execution Results
* Business Outcomes / Feedback
* Notifications and Delivery Attempts
* Audit Logs
* MySQL Queue Jobs

## Runtime DDL

Several PHP request files execute `CREATE TABLE IF NOT EXISTS` at runtime.

This occurs in Dashboard AI and SEO PageSpeed code.

Required action:

* Move DDL into versioned migrations.
* Application requests must not create or alter tables.
* Deployment must run migrations before backend activation.

## Migration Gap

There is no single ordered migration history or schema version table.

Required action:

* Add a migration directory with ordered SQL files.
* Add `schema_migrations`.
* Make each migration idempotent or strictly version-controlled.
* Document deployment and rollback behavior.

---

# 7. Target V1 Architecture

The recommended transition is incremental:

```text
Next.js / Cloudflare
    ↓ HTTPS REST
PHP Front Controller
    ↓
Authentication Middleware
    ↓
Workspace Context Middleware
    ↓
Controller
    ↓
Service / Transaction
    ↓
Repository
    ↓
MySQL
```

Background work:

```text
Service
    ↓
MySQL queue_jobs
    ↓
PHP Worker
    ↓
execution_results
    ↓
Domain Event
    ├── Notification
    └── Audit Log
```

Legacy endpoints can remain temporarily, but new V1 modules must use the new shared kernel and module boundaries.

---

# 8. Recommended Migration Strategy

Current runtime constraint: the shared host reports PHP 7.0.26 as its maximum version. The transition backend therefore uses PHP 7.0-compatible syntax and avoids framework dependencies, while preserving API and Domain boundaries for a later PHP 8.1+ upgrade. PHP 7.0 is an unsupported runtime and remains an explicit infrastructure risk.

## Phase 0 — Credential and Access Containment

Priority: P0

* Rotate exposed credentials.
* Move secrets out of source code.
* Add environment config loader.
* Replace trusted identity headers with signed backend authentication.
* Restrict CORS.
* Prevent direct unauthenticated PHP endpoint access.

No new Domain feature should be deployed before Phase 0 is complete.

## Phase 1 — Backend Foundation

Priority: P0/P1

Create a small shared kernel without rewriting all legacy endpoints:

```text
src/
├── Http/
├── Auth/
├── Workspace/
├── Database/
├── Audit/
├── Queue/
└── Shared/
```

Add:

* Front Controller
* Router
* JSON response/error contract
* Authentication middleware
* Workspace context and authorization
* Database connection factory
* Transaction helper
* Migration runner
* Audit service interface
* Queue service interface

## Phase 2 — Workspace Migration

Priority: P1

Add:

* `workspaces`
* `workspace_members`
* `workspace_settings`
* `workspace_integrations`

Create a default Workspace for each existing account/member ownership group.

Add nullable `workspace_id` to existing business tables, backfill ownership, verify it, then make it required where applicable.

Do not derive Workspace ownership only from request parameters.

## Phase 3 — Existing Module Adapters

Priority: P1

Move GA and Search Intelligence behind Service and Repository interfaces while keeping response compatibility.

Mapping:

```text
GA connection / SEO integration
    → Workspace Integration

GA summary / PageSpeed / SI metrics
    → Raw Observation / Metric / Evidence

SI recommendation text / actions
    → Recommendation draft content
```

Do not rename or delete existing tables until ownership backfill and API compatibility tests pass.

## Phase 4 — Decision Intelligence Core

Priority: P1/P2

Add aligned domain persistence in this order:

1. Signal
2. Evidence and Signal-Evidence Link
3. Recommendation
4. Human Review / Decision
5. Action

Decision and Action remain within the Recommendation module in V1.

## Phase 5 — Execution and Learning

Priority: P2

Add:

* MySQL `queue_jobs`
* Worker claim, lock, retry, and dead-letter behavior
* Manual Tasks
* Execution Results
* Business Outcomes
* Evaluation / Feedback

Execution Result and Business Outcome must remain separate.

## Phase 6 — Notification and Audit

Priority: P2

Implement Domain Events internally, then subscribe Notification and Audit handlers.

Audit coverage should begin in Phase 1 for security-sensitive mutations even if the complete Domain Event system arrives later.

## Phase 7 — Frontend Workspace and Decision Flow

Priority: P2

Gradually introduce:

* Workspace selector/context
* Workspace-scoped routes
* Today's Signals
* Evidence view
* Explanation and Business Impact
* Recommendation review
* Decision capture
* Action / Task status
* Execution Result and Business Outcome feedback

Legacy GA and SI pages can remain as evidence/raw-data drill-down views.

---

# 9. First Implementation Slice

The safest first code change is not Signal UI.

The first implementation slice should be:

1. PHP environment configuration without embedded secrets.
2. Signed Next.js-to-PHP service authentication.
3. Restricted CORS and standardized JSON errors.
4. Versioned MySQL migration mechanism.
5. Workspace and workspace_members schema.
6. Workspace context resolution in PHP.
7. One read-only existing endpoint migrated through the new stack as a vertical proof.

Recommended proof endpoint:

```text
GET /api/v1/workspaces/{workspace_id}/integrations/ga
```

It can wrap existing GA connection data while demonstrating:

* JWT/service authentication
* Workspace authorization
* Controller
* Service
* Repository
* DTO
* MySQL ownership
* Audit-safe request handling

---

# 10. Verification Requirements

Before production deployment:

* All exposed secrets rotated.
* No credential remains in committed PHP source.
* Direct forged `X-Member-*` requests are rejected.
* Cross-workspace access tests fail closed.
* Migrations run on a clean MySQL database.
* Existing account data backfills to the correct Workspace.
* Legacy GA and SI responses remain compatible during migration.
* PHP syntax lint runs in a PHP-capable environment.
* Integration tests cover authentication, authorization, workspace isolation, and transaction rollback.

The current Windows environment does not have the `php` executable available on `PATH`, so PHP syntax lint could not be executed during this audit.

---

# 11. Conclusion

The current product already has valuable GA, SEO, AEO, GEO, report, and AI composition capabilities, but its backend and database are user-centric endpoint scripts rather than the accepted Workspace-centric Modular Monolith.

The correct path is an incremental strangler-style migration:

1. Contain security risk.
2. Establish the shared PHP foundation.
3. Introduce Workspace ownership.
4. Wrap existing GA/SI capabilities.
5. Add Signal, Evidence, Recommendation, Decision, and Action.
6. Add Queue, Execution Result, Business Outcome, Notification, and Audit.

This sequence preserves existing functionality while moving the implementation toward Alignment v1.2 without a high-risk full rewrite.
