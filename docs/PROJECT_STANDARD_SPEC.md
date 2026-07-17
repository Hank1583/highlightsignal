# Project Standard Specification

Version: v1.0

Purpose: This document defines the reusable frontend, backend, API, database, security, and deployment standards for Highlight-style projects. Use this as the baseline when starting new projects that should stay consistent with the Highlight Signal architecture.

---

## 1. Frontend Standard

### Technology Stack

Use the following frontend baseline:

```text
Framework: Next.js 16
Runtime: React 19
Language: TypeScript 5
Styling: Tailwind CSS 4
Routing: Next.js App Router
Deployment: OpenNext on Cloudflare Workers
Icons: lucide-react
Animation: framer-motion
Charts: recharts
Auth / Token: jose
```

### Recommended Package Baseline

```json
{
  "dependencies": {
    "@opennextjs/cloudflare": "^1.19.11",
    "framer-motion": "^12",
    "jose": "^6",
    "lucide-react": "^0.554",
    "next": "^16",
    "react": "^19",
    "react-dom": "^19",
    "recharts": "^3"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "cross-env": "^10",
    "eslint": "^9",
    "eslint-config-next": "^16",
    "tailwindcss": "^4",
    "typescript": "^5",
    "wrangler": "^4"
  }
}
```

### Standard Scripts

```json
{
  "scripts": {
    "dev": "cross-env NEXT_DISABLE_TURBOPACK=1 next dev",
    "build": "next build --webpack",
    "build:cf": "opennextjs-cloudflare build",
    "preview:cf": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
    "deploy:cf": "opennextjs-cloudflare build && opennextjs-cloudflare deploy",
    "upload:cf": "opennextjs-cloudflare build && opennextjs-cloudflare upload",
    "start": "next start",
    "lint": "eslint"
  }
}
```

### TypeScript Standard

Use strict TypeScript.

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Frontend Folder Structure

```text
app/                 Next.js App Router pages, layouts, route handlers
components/          Shared UI and feature components
lib/                 API clients, config, auth, server helpers
types/               Shared TypeScript types
public/              Static assets
docs/9.frontend/     Frontend architecture documents
```

### Frontend Responsibility

The frontend is the presentation layer.

Frontend should handle:

```text
User interface
Navigation
Page rendering
Component rendering
Form interaction
API requests
UI state
Application state
Server state display
Loading, empty, error, and retry states
```

Frontend should not handle:

```text
Business rule execution
Permission final decisions
Database access
Background processing
AI decision execution
Recommendation calculation
Evidence analysis
Queue processing
Secret management
```

### Frontend Design Principles

```text
Workspace-first
Dashboard-first
Decision-focused
Simple
Consistent
Responsive
Fast
Accessible
Modular
```

### UI State Standard

Separate state into:

```text
UI State: sidebar, dialogs, loading, local interaction
Application State: user, session, workspace
Server State: signals, recommendations, notifications, reports
```

### Theme Standard

Define design tokens for:

```text
Color
Typography
Spacing
Radius
Shadow
Border
Motion
Icon
Status
```

Use semantic colors:

```text
Primary
Secondary
Success
Warning
Danger
Information
Neutral
```

Accessibility requirements:

```text
Visible focus state
Readable contrast
Keyboard navigation
Responsive layout
Reduced motion support
```

---

## 2. Backend Standard

### Technology Stack

Use the following backend baseline:

```text
Language: PHP
Minimum PHP Version: >=7.0.26
Architecture: PHP-first modular monolith
Database: MySQL
Database Driver: mysqli
Autoload: Composer PSR-4
API Style: HTTPS REST API
Queue Strategy: Database-driven jobs
```

### Composer Baseline

```json
{
  "type": "project",
  "require": {
    "php": ">=7.0.26",
    "ext-json": "*",
    "ext-mysqli": "*"
  },
  "autoload": {
    "psr-4": {
      "App\\": "src/"
    }
  },
  "scripts": {
    "migrate": "php bin/migrate.php",
    "lint": "php bin/lint.php"
  }
}
```

### Backend Folder Structure

```text
backend/api/
  public/
    index.php

  config/
    bootstrap.php

  src/
    Auth/
    Config/
    Database/
    Http/
    Workspace/
    Dashboard/
    Integration/

  workers/
    worker.php
    cron.php

  migrations/
  tests/
```

For larger projects, use module folders:

```text
backend/api/src/
  Modules/
    Workspace/
      Controllers/
      Services/
      Repositories/
      DTO/
      Policies/
      Validators/
    UserAccount/
    Signal/
    Evidence/
    Recommendation/
    Notification/
    Widget/
    AuditLog/
    Retention/
```

### Backend Responsibility

Backend should handle:

```text
API request handling
Authentication
Authorization
Domain service execution
Database access
Database transactions
Worker job creation
Audit log creation
External integration calls
OpenAI API calls
Notification dispatch
Report preparation
```

Backend should not redefine:

```text
Product concepts
Database schema ownership
API contract ownership
Architecture principles
```

### Backend Request Flow

Every private API request should follow:

```text
Request
-> Controller
-> Authentication Middleware
-> Authorization Policy
-> Request Validation
-> Service
-> Repository
-> Database
-> DTO Response
-> Audit Event
```

### Module Standard

Each domain module should include:

```text
Controller
Service
Repository
DTO
Validator
Policy
Event Handler
```

Controller rules:

```text
Parse request
Validate input
Check permission
Call service
Return response
Keep business logic out of controllers
```

Service rules:

```text
Own business logic
Own transaction boundaries
Call repositories
Create worker jobs
Emit audit events
```

Repository rules:

```text
Own database access
Do not contain business decisions
Expose find, create, update, delete, search, and paginate methods
```

### Database Connection Standard

Use `mysqli` with strict error reporting and `utf8mb4`.

Recommended session SQL mode:

```sql
STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION
```

---

## 3. API Standard

### API Style

Use HTTPS REST APIs.

Most business APIs should be workspace-scoped:

```text
/api/workspaces/{workspace_id}/...
```

Backend versioned APIs may use:

```text
/api/v1/...
```

### Resource Naming

Use plural nouns:

```text
/workspaces
/users
/signals
/evidence
/recommendations
/notifications
/widgets
/audit-logs
```

Use explicit lifecycle action endpoints:

```text
POST /signals/{signal_id}/resolve
POST /recommendations/{recommendation_id}/accept
POST /notifications/{notification_id}/acknowledge
```

### Request Standard

```text
Content-Type: application/json
Date Format: ISO 8601
ID Format: UUID for new systems, integer IDs allowed for legacy integrations
```

### Response Standard

Successful response:

```json
{
  "data": {},
  "meta": {}
}
```

List response:

```json
{
  "data": [],
  "meta": {
    "pagination": {
      "page": 1,
      "per_page": 20,
      "total": 120
    }
  }
}
```

Error response:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": {}
  }
}
```

Legacy-compatible PHP APIs may also include:

```json
{
  "ok": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid service signature."
  }
}
```

### Pagination Standard

```text
page = 1
per_page = 20
maximum per_page = 100
```

### Filtering Standard

Common filters:

```text
status
type
severity
priority
created_after
created_before
```

### Sorting Standard

Use a `sort` query parameter:

```text
sort=created_at_desc
sort=priority_desc
sort=score_desc
```

### HTTP Status Mapping

```text
200 OK
201 Created
204 No Content
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Validation Error
429 Too Many Requests
500 Internal Server Error
503 Service Unavailable
```

### Error Codes

```text
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
VALIDATION_ERROR
CONFLICT
RATE_LIMITED
INTERNAL_ERROR
SERVICE_UNAVAILABLE
```

---

## 4. Database Standard

### Database Baseline

```text
Production Database: MySQL
Local Development Database: MySQL
Queue Storage: MySQL tables
Primary Business Boundary: workspace
```

### Core Entity Groups

```text
Workspace
User Account
Signal
Evidence
Recommendation
Notification
Widget
Audit Log
Worker Job
Integration
Report
```

### Common Table Fields

Most tables should include:

```text
id
created_at
updated_at
```

Workspace-owned tables should include:

```text
workspace_id
```

User-action tables should include:

```text
created_by_user_id
```

Soft-deletable tables should include:

```text
deleted_at
```

### Index Strategy

Workspace query:

```sql
CREATE INDEX idx_table_workspace_id ON table_name(workspace_id);
```

Workspace timeline query:

```sql
CREATE INDEX idx_table_workspace_created_at ON table_name(workspace_id, created_at);
```

Workspace status query:

```sql
CREATE INDEX idx_table_workspace_status ON table_name(workspace_id, status);
```

Worker queue query:

```sql
CREATE INDEX idx_jobs_status_scheduled_at ON jobs(status, scheduled_at);
```

### Data Principles

```text
Workspace isolation
Decision traceability
Append-friendly history
Soft delete for user-visible records
Audit logs for meaningful actions
Explicit foreign keys for core relationships
```

---

## 5. Security Standard

### General Rules

Never expose:

```text
Password hash
Refresh token hash
OAuth token
API secret
Credential value
OpenAI API key
Provider secret
Database password
Internal service token
```

### Browser and Backend Boundary

The browser must not call the database directly.

Recommended flow:

```text
Browser
-> Next.js frontend
-> Next.js route handler / server action
-> PHP backend API
-> MySQL database
```

### Service-to-Service Auth

Use HMAC signed requests between Next.js and PHP backend.

Required headers:

```text
X-HS-Timestamp
X-HS-Nonce
X-HS-Member-Id
X-HS-Workspace-Id
X-HS-Signature
```

Canonical signature input:

```text
HTTP_METHOD
REQUEST_PATH
SHA256_BODY_HASH
TIMESTAMP
NONCE
MEMBER_ID
WORKSPACE_ID
```

Signature algorithm:

```text
HMAC-SHA256
```

Service secret requirements:

```text
Minimum length: 32 characters
Default TTL: 60 seconds
Replay prevention: store nonce and reject duplicate nonce
```

### Cookie Standard

Auth cookies should use:

```text
HttpOnly
Secure
SameSite=Lax
Path=/
```

---

## 6. Environment Standard

### Frontend Environment Variables

```env
NEXT_PUBLIC_BASE_URL=
NEXT_PUBLIC_HIGHLIGHT_PHP_API_BASE_URL=
NEXT_PUBLIC_HIGHLIGHT_UPGRADE_URL=
API_DOMAIN=
JWT_SECRET=
PHP_SERVICE_AUTH_SECRET=
```

### Backend Environment Variables

```env
APP_ENV=production
APP_DEBUG=false
APP_ALLOWED_ORIGINS=

DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=
DB_USER=
DB_PASSWORD=

SERVICE_AUTH_SECRET=
SERVICE_AUTH_TTL_SECONDS=60

OPENAI_API_KEY=
OPENAI_API_URL=https://api.openai.com/v1/chat/completions
OPENAI_MODEL=gpt-4.1-mini

PAGESPEED_API_KEY=
GOOGLE_APPLICATION_CREDENTIALS=
GOOGLE_SERVICE_ACCOUNT_JSON=
```

---

## 7. Deployment Standard

### Frontend Deployment

Deploy the frontend as a Cloudflare Worker through OpenNext.

Do not deploy this architecture as a Cloudflare Pages-only project.

Recommended Cloudflare config:

```jsonc
{
  "main": ".open-next/worker.js",
  "compatibility_date": "2026-06-01",
  "compatibility_flags": ["nodejs_compat", "global_fetch_strictly_public"],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  }
}
```

Build and deploy commands:

```bash
npm run build:cf
npx wrangler deploy
```

### Production Checklist

Before release:

```text
Run npm run lint
Run npx tsc --noEmit --pretty false
Run npm run build
Run npm run build:cf
Confirm JWT_SECRET exists
Confirm PHP_SERVICE_AUTH_SECRET matches backend SERVICE_AUTH_SECRET
Confirm auth cookie settings
Confirm logout clears auth cookie
Confirm protected routes redirect anonymous users
Confirm workspace and product gates work
Confirm PHP backend smoke tests pass
```

---

## 8. Documentation Standard

Use this documentation structure for larger projects:

```text
docs/
  1.handbook/
  2.concepts/
  3.framework/
  4.architecture/
  5.database/
  6.api/
  7.backend/
  8.infrastructure/
  9.frontend/
  10.adr/
```

Minimum documentation for smaller projects:

```text
docs/
  PROJECT_STANDARD_SPEC.md
  ARCHITECTURE.md
  API.md
  DATABASE.md
  DEPLOYMENT.md
```

---

## 9. New Project Starter Checklist

When creating a new project, start with:

```text
Next.js 16
React 19
TypeScript strict mode
Tailwind CSS 4
App Router
components / lib / types structure
OpenNext Cloudflare Worker deployment
PHP modular monolith backend
MySQL database
REST API
Workspace-first route design
Service / Repository / Policy backend layers
Next.js route handlers as backend bridge
HMAC signed service requests
Environment files for frontend and backend
Documentation folders
Production checklist
```

---

## 10. Final Rule

Keep the architecture simple enough to deploy cheaply, but structured enough to grow.

Use Next.js for presentation and edge delivery.

Use PHP for core backend business logic.

Use MySQL for operational state, history, and database-driven jobs.

Use REST APIs as the stable contract.

Use workspace isolation and service-to-service signatures as the default security boundary.
