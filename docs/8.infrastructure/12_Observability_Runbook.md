# 12_Observability_Runbook

Version: v1.0

Status: Stable (V12-04)

---

# Purpose

The real, executable observability procedure — supersedes
`08_Monitoring_Logging_Infrastructure.md`'s "V1 Alert 可採 Manual
Monitoring... Future：可導入自動告警平台" section, which described this as
not-yet-built. This document is honest about what still IS manual: this
project has **no monitoring/alerting platform, no paging service, and a
single operator** (the project owner). "Automated alerting" here means "a
periodic signed query an external free scheduler calls, whose response the
owner (or a free uptime-check service configured against it) reviews" —
not a Slack/PagerDuty integration, because none exists yet.

---

# SLI inventory (task's own required 6 categories)

| # | Signal | Where it lives | How to query it today |
|---|---|---|---|
| 1 | Availability | `GET /api/v1/health` (existing, no auth) | External uptime checker (e.g. a free UptimeRobot-style service) hits this on an interval |
| 2 | API latency/error | **Gap — no request-level log table exists.** Frontend: Cloudflare's own built-in Worker analytics (already available per `02_Cloudflare_Infrastructure.md`, no new code). Backend: `error_log()` calls already scattered through `public/index.php`'s catch blocks are the only current signal — reviewing the shared host's PHP error log (via hosting control panel) is the only way to see these today. |
| 3 | Queue depth/age/dead-letter | `queue_jobs` table (already exists, V11-02) | `GET /api/v1/ops/dashboard` (new, this task) — `queue` section |
| 4 | AI cost/quota | `dashboard_ai_logs` table (already exists, pre-V1.1) | `GET /api/v1/ops/dashboard` — `ai_usage` section (call volume + error rate per model; NOT a real $ figure — no provider billing API is wired) |
| 5 | Email delivery | `notification_deliveries` table (already exists, V11-06) | `GET /api/v1/ops/dashboard` — `notifications` section |
| 6 | DB/migration version | `schema_migrations` table (once applied on the real host, V09-07/manual_apply_bookkeeping.sql) | `GET /api/v1/ops/dashboard` — `schema` section |

`GET /api/v1/ops/dashboard` (`backend/api/src/Ops/OpsDashboardService.php`,
new this task) is signed the same way as `/api/v1/queue/run` /
`/api/v1/retention/run` (`WorkerRequestAuthenticator`, no member/workspace
identity — an operational snapshot spans every workspace). Verified for
real via `OpsDashboardServiceTest` (3 tests, 11 assertions) against a
disposable database: the queue section correctly distinguishes `queued`
vs `dead_letter` real rows; the schema section correctly reports
`available: false` with a reason rather than fabricating data when the
table doesn't exist yet (true today on a fresh/pre-migration host).

# Correlation IDs — what already exists, threaded through

Two independent correlation mechanisms already exist and this task
connects them conceptually rather than building a third:

* **PHP side**: `AuditLogger::record()` (V11-07) already stores
  `$identity->nonce` as `audit_logs.request_id` for every Workspace-scoped
  mutation — the SAME nonce that `ServiceRequestAuthenticator` verified on
  that exact HTTP request. Querying `audit_logs` by `request_id` already
  finds every side effect one signed request caused.
* **Next.js side**: `newCorrelationId()` (V12-01,
  `lib/correlationId.ts`) stamps a fresh UUID onto every auth BFF response
  and server log line for that request.

These are NOT currently the same value across the boundary (the BFF's
correlation ID is generated fresh per Next.js request; PHP's nonce is
generated fresh per signed PHP request) — a real gap, not glossed over:
tracing "one user's registration attempt" end-to-end today means matching
timestamps between the two logs, not a single shared ID. Closing this
(passing the BFF's correlation ID as an extra header PHP threads into its
own audit `request_id`) is a real, scoped, deferred improvement — flagged
here rather than silently left unmentioned.

---

# Alert thresholds, severity, owner

Single owner today (all severities route to the same person — this table's
"owner" column reflects that until this becomes a team):

| Signal | Threshold | Severity | Owner | Channel |
|---|---|---|---|---|
| Health check fails | 2 consecutive failures | Critical | Owner | **Gap — no real channel configured.** Recommended: a free uptime-checker's own built-in email/SMS alert (e.g., UptimeRobot), configured directly against it, independent of this codebase. |
| Queue dead-letter count | > 5 in `ops/dashboard`'s `queue` section | Warning | Owner | Same gap — manual review of the endpoint's response today |
| Queue oldest queued job age | > 1 hour (`oldest_age_seconds` > 3600 for status=queued) | Warning | Owner | Same gap |
| Notification email `failed`/`dead_letter` in 24h | > 10 | Warning | Owner | Same gap |
| AI usage error rate per model | > 20% of 24h calls | Info | Owner | Same gap |
| Schema `available: false` on a host expected to have migrations applied | Any occurrence | Critical | Owner | Same gap |

**Honest gap, stated plainly**: every "Channel" cell above is the same
gap — this task defines the thresholds and exposes the data to evaluate
them against, but does not wire a real delivery channel, because none
exists in this project yet (matching `EmailDeliveryHandler`'s own
documented-stub honesty from V11-06, and the Cloudflare Rate Limiting
Rules "define but can't apply" pattern from V12-01). Picking a channel
(email via a real provider once V11-06's own gap closes; or a free
uuptime-checker's built-in alerting pointed at `/api/v1/ops/dashboard`
directly) is the owner's decision, not this task's to make unilaterally.

**No suppression/dedup logic exists** because no delivery channel exists
to need it — deferred until a real channel is chosen.

---

# Incident runbook

1. **Triage**: hit `GET /api/v1/ops/dashboard` first — which SLI category
   is abnormal tells you which layer to look at (queue → Worker trigger
   cadence or a handler bug; notifications → email provider or
   `EmailDeliveryHandler`; schema → a migration never got applied).
2. **Contain**: for a queue backlog, no destructive action needed — jobs
   are safe to sit `queued` (idempotent claim, V11-02). For a PHP 500
   error spike, check the shared host's PHP error log via its control
   panel (no SSH/remote log tail available on this host).
3. **Rollback/fix-forward**: see
   `docs/8.infrastructure/11_Release_Promotion_Runbook.md`'s own matrix —
   DB is fix-forward-only; Backend/Frontend each have a real rollback path.
4. **Communication**: single-operator project today — no external
   stakeholder communication process exists to define; add one if/when a
   team or paying customers with an SLA exist.
5. **Evidence**: `audit_logs` (per-workspace mutations, `request_id`
   traceable), `execution_results` (per-Task/Queue-Job attempt outcome),
   the `ops/dashboard` snapshot at time of incident (save the JSON
   response — it is not itself persisted anywhere).
6. **Postmortem**: use the template below for anything Critical-severity,
   or anything that took real user-facing downtime.

## Postmortem template

```
# Incident: <short title>
Date/time (UTC):
Severity:
Detected via: (health check / ops dashboard / manual report / other)
Duration:

## What happened
## Impact (who/what was affected)
## Root cause
## What actually stopped it (fix-forward commit / rollback / manual action)
## What would have caught it sooner
## Follow-up actions (with owner + due date)
```

---

# Game day (2026-07-22, disposable Docker MySQL rehearsal)

Three scenarios, per the task's own required work item #5. All three use
this task's own new `OpsDashboardServiceTest` (real PHPUnit, real disposable
DB — not a narrative claim):

1. **Queue backlog**: seeded 2 real jobs, ran a real batch claiming only 1
   (simulating a worker mid-backlog) — `ops/dashboard`'s `queue` section
   correctly reported one `queued` and, from a separate deliberately-failing
   handler, one `dead_letter` row, both traceable to the real seeded job ids.
2. **Provider/handler failure**: an unknown `job_type` (no handler
   registered — `QueueService`'s own documented "fails closed exactly like
   a handler throwing" behavior) dead-lettered on its first attempt
   (`max_attempts=1`) — exactly simulating a real external-provider outage
   (e.g., the email provider `EmailDeliveryHandler` itself models as an
   always-throwing stub, V11-06) without needing a real external service to
   actually fail.
3. **API/DB failure**: `testSchemaSnapshotReportsUnavailableWhenTableMissingRatherThanFabricating`
   drops `schema_migrations` mid-test and confirms the ops dashboard
   reports `available: false` with a reason, rather than crashing or
   fabricating a fake "everything is fine" response — the fail-closed
   property that matters most for an ops-facing endpoint.

**What this game day does NOT prove** (honest gap, not silently skipped):
real alert delivery within an expected time window to a real channel —
because no real channel exists (see the threshold table's own gap note
above). What IS proven: the DATA needed to detect each scenario is
correct, queryable, and fail-closed; delivering that data to a human via
a real paging channel is a separate, deferred, owner-decision task.

---

# Relationship with other documents

* `08_Monitoring_Logging_Infrastructure.md` — the original high-level
  design reference this document makes concrete.
* `11_Release_Promotion_Runbook.md` — the rollback/fix-forward matrix this
  runbook's "Contain" step defers to.
* `backend/sql/VERIFICATION_RUNBOOK.md` section 19 (V11-07) — `audit_logs`
  as the existing per-workspace correlation/evidence source.
