# V12-04 — Observability & Incident Readiness Report

Date: 2026-07-22
Executor: codex/v09-roadmap session (owner instruction: "V12-02~V12-08一起製作，之後我再一起驗證")
Milestone: V1.2 Production & Specification Complete

---

## 1. Real constraints that shaped this task's scope

This project has **no monitoring/alerting platform of any kind** today —
`docs/8.infrastructure/08_Monitoring_Logging_Infrastructure.md`'s own
"Alert Strategy" section says "V1 Alert 可採 Manual Monitoring" (manual
monitoring), confirmed, not an oversight to fix silently. It is also a
**single-operator project** — there is no team to build an escalation
matrix across. The host has no SSH, so no persistent
agent/exporter/log-shipper can run on it.

Given these facts, "build real automated alerting" is not achievable
within this task without the owner first choosing and configuring a real
external channel (an uptime-checker service, an email provider, etc.).
What this task DOES do: make every one of the 6 required signals real,
queryable, and correctly fail-closed; define concrete thresholds and an
incident runbook; and prove via a real disposable-DB rehearsal that the
underlying detection logic works for 3 realistic failure scenarios. What
remains a real, explicit, owner-facing gap: actual alert delivery.

## 2. What this task built

* `backend/api/src/Ops/OpsDashboardService.php` — queries 4 of the 6
  required SLI categories directly from tables that ALREADY exist
  (`queue_jobs`, `notification_deliveries`, `dashboard_ai_logs`,
  `schema_migrations`) — no new logging pipeline, no duplicated data.
* `GET /api/v1/ops/dashboard` — wired into `public/index.php`, signed the
  same way as `/api/v1/queue/run`/`/api/v1/retention/run`
  (`WorkerRequestAuthenticator`), since an operational snapshot spans every
  workspace and has no single member/workspace identity to authenticate
  against.
* `docs/8.infrastructure/12_Observability_Runbook.md` — the SLI inventory
  table (with an honest gap noted for API latency/error — no request-log
  table exists), alert thresholds/severity/owner table (with the channel
  gap stated plainly in every row rather than once and forgotten), the
  incident runbook (triage → contain → rollback/fix-forward → communicate
  → evidence → postmortem), a postmortem template, and the game day
  writeup.
* `backend/api/tests/Integration/Ops/OpsDashboardServiceTest.php` — 3 real
  tests, 11 assertions, against a disposable database.

## 3. Game day — real, not narrated

All three required scenarios (task packet's own required work item #5)
were run as real PHPUnit tests against a real disposable `mysql:5.6`
database, not simulated in prose:

1. **Queue backlog**: real jobs seeded, a real batch claim limited to 1 —
   proved the ops snapshot correctly distinguishes a `queued` row that was
   never touched from a `dead_letter` row that failed on its first
   attempt, both traceable back to real seeded job ids.
2. **Provider/handler failure**: an unregistered `job_type` fails closed
   exactly like a thrown exception (QueueService's own already-documented
   behavior) and dead-letters on `max_attempts=1` — this is the SAME
   mechanism a real email-provider outage would hit (`EmailDeliveryHandler`
   is already an always-throwing stub, V11-06), so this scenario is a
   faithful stand-in without needing a real external service to fail on
   command.
3. **API/DB failure**: dropped `schema_migrations` mid-test and confirmed
   `OpsDashboardService` reports `available: false` with a `reason` string
   rather than crashing or fabricating fake data — the fail-closed
   property that matters most for an endpoint whose whole job is telling
   the truth about system state.

One real test bug was found and fixed during this exercise: the first
draft of `testQueueSnapshotReflectsRealQueuedAndDeadLetterJobs` assumed an
unregistered-handler job would remain `queued`, but `QueueService.runBatch()`
claims and fails-closed on ANY claimed job regardless of whether a handler
exists for it — so with `maxJobs=5` and only 2 seeded jobs, both got
claimed and dead-lettered, leaving nothing in `queued` (contradicting the
test's own assertion). Fixed by capping `maxJobs=1` so exactly one job is
claimed (and dead-letters) while the other is genuinely never touched.

## 4. Deliberately NOT built (honest gaps)

* **Real alert delivery** (Slack/email/PagerDuty/SMS) — no channel exists
  in this project; picking one is the owner's decision. Every threshold in
  `12_Observability_Runbook.md`'s table states this gap explicitly rather
  than once at the top and easy to miss.
* **API request-level latency/error tracking** — no table for it exists;
  adding one is a real scope decision (a new table + instrumenting every
  route) not taken here. Frontend gets this for free from Cloudflare's own
  Worker analytics; Backend relies on the shared host's PHP error log
  (reviewed via the hosting control panel, no remote tail possible).
* **A single shared correlation ID across the Next.js ↔ PHP boundary** —
  both sides already have their OWN correlation mechanism
  (`audit_logs.request_id` via the signed-request nonce; the BFF's
  `newCorrelationId()`), but they are not currently the same value.
  Threading one through as an extra header is a real, scoped, deferred
  improvement, named explicitly rather than implied to already work.
* **Two-person/team escalation** — single-operator project; not
  applicable, not faked.
