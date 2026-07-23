# V12-05 — Performance, Security & Privacy Release Audit Report

Date: 2026-07-22
Executor: codex/v09-roadmap session (owner instruction: "V12-02~V12-08一起製作，之後我再一起驗證")
Milestone: V1.2 Production & Specification Complete

---

## 1. Real constraint: no production-like staging exists

No Cloudflare staging/production deploy exists yet (standing owner policy,
`docs/8.infrastructure/08_Cloudflare... /04_CLOUDFLARE_ENVIRONMENTS.md`; no
deploy before full V1.2 acceptance). This audit therefore could not measure
real Core Web Vitals against a deployed URL. What it DID do instead, all
against real artifacts, not estimates: a real `next build` production
bundle measured directly on disk (gzip sizes of the actual chunks that
would ship), and a real disposable-Docker MySQL 5.6 + PHP 7.4 rehearsal
timing real HTTP requests against the real router (`public/index.php`) for
API-layer latency. Real CWV measurement against a live deployed URL is
deferred to the owner, same class of gap as V12-03's "no real deploy" and
V12-04's "no real alert channel."

## 2. Fixed and re-verified (P0/P1)

### 2.1 Missing security response headers (P1 — fixed)

Neither `next.config.ts` nor `wrangler.jsonc` set ANY security header
before this audit — no CSP, no `X-Frame-Options`, no HSTS, nothing.
Fixed in `next.config.ts` via a real `headers()` function applied to every
route: `Content-Security-Policy`, `X-Content-Type-Options: nosniff`,
`X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`,
`Strict-Transport-Security`. Re-verified for real: `next build` succeeds,
a local `next start` server returns every header on a real HTTP response
(confirmed via `curl -D -`), and the two most CSP-sensitive pages
(the animated `framer-motion` landing page, the `/auth/register` form)
loaded in a real browser with zero console/CSP violations. Full 41→43
PHPUnit suite and 26 Vitest tests re-ran clean after this change (no
regression).

### 2.2 `dashboard_ai_logs` had no retention policy at all (P1 — fixed)

This table (migrations/013, `workspace_id` added by migrations/018) stores
free-text AI questions plus provider context/response payloads (LONGTEXT)
indefinitely. Every OTHER operational data class already had a retention
policy (V11-08); this one, a legacy pre-V1.1 table, was missed. Fixed:

* `backend/api/src/Retention/RetentionRepository.php` —
  `findEligibleDashboardAiLogs()` / `deleteDashboardAiLogsByIds()`.
* `backend/api/src/Retention/RetentionCleanupService.php` —
  `cleanupDashboardAiLogs()`, wired into `runAll()`, 90-day retention
  window (matches `NOTIFICATION_RETENTION_DAYS`, the shortest existing
  precedent for user-content-bearing data). `workspace_id` is nullable
  (018 didn't backfill every historical row) — age is the only real
  eligibility criterion; NULL-workspace rows are still deleted, just
  excluded from the per-workspace `audit_logs` grouping (`audit_logs.
  workspace_id` is `NOT NULL` by design, V11-07).
* `backend/api/tests/Integration/Retention/RetentionCleanupServiceTest.php`
  (new, 2 tests, 9 assertions) — proves a row past the window is deleted,
  a recent row survives, a NULL-workspace old row is still deleted without
  crashing, and a dry run deletes nothing. Needed its own fixture
  (`backend/api/tests/fixtures/dashboard_ai_logs_schema.sql`) because `dashboard_ai_logs`
  is on `bin/apply_test_schema.php`'s own documented exclusion list
  (migrations/013 and /018 are bundled with other legacy-table ALTERs that
  reference tables with no CREATE TABLE anywhere in this repo, e.g.
  `seo_sites`) — exactly the situation that script's own comment says to
  add a fixture for rather than widen the exclusion list.
* Full suite re-ran clean: 43/43 PHPUnit tests, 116 assertions.

### 2.3 Registration form had no consent/notice link (P2, fixed while here)

`app/auth/register/page.tsx` collected name/email/password with no link to
either `/privacy` or `/terms` (both pages already existed, just never
linked from the form that actually collects the data). Added a one-line
consent notice above the submit button; verified in a real browser
(`get_page_text` confirms the rendered text, zero console errors).

## 3. Security review (not already covered by V12-02's own negative-path tests)

* **Auth/signature/nonce**: `ServiceRequestAuthenticatorTest` (6 tests) and
  this task's own real curl probes against a disposable rehearsal server —
  missing signature → `401 UNAUTHORIZED` with a generic message (no stack
  trace, no internal path); expired timestamp → same. `APP_DEBUG=false`
  path confirmed for real, not just read in code.
* **Cross-workspace isolation**: `CrossWorkspaceIsolationTest` (2 tests,
  V12-02) — reused as evidence, not re-derived.
* **CORS**: `public/index.php`'s explicit allow-list (`APP_ALLOWED_ORIGINS`)
  — a disallowed `Origin` on a real `OPTIONS` preflight was confirmed to
  return `403` against the disposable rehearsal server.
* **CSRF**: `lib/authOrigin.ts`'s `Origin`/`Referer` check on the two BFF
  routes that accept unauthenticated POSTs (register/login) — V12-01's own
  work, unchanged here.
* **Rate limiting**: still deliberately NOT implemented in application code
  — owner's own explicit choice (V12-01) to use Cloudflare's platform
  Rate Limiting Rules instead, since the actual deploy target is Cloudflare
  Workers (no reliable in-process counter across edge invocations). Real
  configuration of those rules requires Cloudflare dashboard access this
  session doesn't have and is deferred to the owner, same as the real
  deploy itself.
* **Dependency scan**: `npm audit` found 17 findings (0 critical, 11 high,
  4 moderate, 2 low). Ran `npm audit fix` (no `--force`, no breaking
  changes) — resolved 10, leaving 7 (see risk-acceptance register below).
  `composer.json` has **zero runtime third-party PHP packages** (only
  `ext-json`/`ext-mysqli` and dev-only PHPUnit) — no PHP dependency-CVE
  surface exists by construction, so no PHP scanner was run against
  nothing.
* **Secret scan**: grepped the full tracked tree for hardcoded credential
  patterns (AWS keys, PEM private keys, inline `password=`/`secret=`/
  `api_key=` literals) — every match was a clearly-labeled test-only fixture
  value (`tests/lib/sessionToken.test.ts`, `tests/lib/phpServiceAuth.test.ts`,
  `ServiceRequestAuthenticatorTest.php`), nothing real. Confirmed only
  `.env.example` files are tracked by git; real `.env` files are gitignored.
* **File/report endpoints**: spot-checked `backend/api/ga/report/delete_csv.php`
  (glob over a fixed directory, no user-controlled path — already
  auth-gated by V09-05) and `report_excel.php` (`$type`/`$startDate`/
  `$endDate` from `$_GET` are only ever used as bound SQL parameters or CSV
  cell text, never in a file path/include/shell command) — no path
  traversal found in either.
* **Error exposure**: confirmed for real (not just read in code) that an
  unauthenticated/invalid-signature request to a real endpoint returns a
  safe generic JSON error body, never a stack trace or internal path.

## 4. Performance — real local measurements (no staging deploy exists)

* **Frontend bundle**: real `next build` output. Largest single JS chunk
  `354,619 B raw / 106,931 B gzip`; framework chunk `189,700 B raw /
  59,835 B gzip`; the `/dashboard` route's own page chunk `52,204 B raw /
  14,828 B gzip`. No route exceeds a few hundred KB gzipped — reasonable
  for a dashboard SPA-style app, nothing alarming found.
* **API latency**: real disposable Docker rehearsal (`mysql:5.6` + PHP 7.4
  `php -S` serving the real router) — `GET /api/v1/health` averaged
  ~34ms/request over 10 requests; the signed `GET /api/v1/ops/dashboard`
  (4 real table queries) averaged ~48ms/request over 8 requests. Honest
  caveat: PHP's built-in dev server is single-threaded (serializes
  requests) — this measures per-request latency correctly but is NOT a
  concurrency/throughput proxy for the real host's Apache/PHP-FPM
  (concurrent workers); real production PHP-FPM concurrency is untested
  because no such environment is deployed yet.
* **Queue throughput/concurrency**: not re-measured here — reused as
  existing evidence from `QueueConcurrencyTest` (V11-02/V12-02, real
  synchronized two-process concurrency proof, no double-claim/lost-claim).
* **DB query/index review**: the new `dashboard_ai_logs` retention query
  uses the existing `idx_dashboard_ai_logs_workspace`-adjacent
  `created_at`-ordered scan; migrations/018 already added
  `idx_dashboard_ai_logs_workspace (workspace_id, created_at)`, sufficient
  for this cleanup's access pattern.

## 5. Privacy

* **Data inventory (real, not assumed)**: highlightsignal's own database
  stores almost no raw PII directly — recipient identity in
  `notifications`/`notification_deliveries` is `recipient_member_id`
  (BIGINT), not a stored email address (the actual email address lives
  only in the separate legacy 4.php member system, looked up at delivery
  time). The one real privacy-sensitive content store is
  `dashboard_ai_logs.question`/`context_json`/`response_json` (free text,
  potentially containing a user's own site/analytics data as AI context) —
  addressed in §2.2 above.
* **Consent/notice**: fixed in §2.3.
* **Access/delete/export**: `/data-deletion` (already existed) documents a
  manual, email-based deletion request process — appropriate for a
  single-operator project with no self-service deletion UI; reviewed for
  accuracy, no changes needed.
* **Retention**: `dashboard_ai_logs` gap closed (§2.2); every other class
  already covered by V11-08.
* **Backup/restore vs. deletion — a real interaction, documented not
  automated**: restoring a `mysqldump` backup (V11-08's own proven
  mechanism) can reintroduce rows that were deleted (by retention cleanup
  OR a manual deletion request) after that backup's timestamp. This is
  inherent to any point-in-time backup, not a bug to fix in code — the
  correct mitigation is procedural: after any real restore, re-check
  `retention_cleanup_runs` and any manual deletion request log dated after
  the backup's timestamp and re-apply them. Documented here rather than
  silently assumed compatible.
* **AI provider data exposure**: `dashboard_ai_logs.context_json` is
  whatever the AI-compose/AI-usage endpoints construct as prompt context —
  reviewing exactly what fields go into that context is a real, separate,
  larger review (touches `dashboard/ai_compose.php`/`ai_usage.php`
  business logic, not just retention) and is flagged here as a follow-up
  rather than silently expanded into this task's own scope.

## 6. Risk acceptance register (residual, not P0/P1)

| Risk | Severity | Owner | Review by | Rationale |
|---|---|---|---|---|
| 7 remaining `npm audit` findings (`wrangler`, `miniflare`, `@opennextjs/aws`, `@opennextjs/cloudflare`, `next` via `postcss`/`sharp`) | Low (accepted) | Project owner | Next `npm audit` re-check at V1.3 planning, or whenever `@opennextjs/cloudflare` ships a release compatible with a newer `next` | All 7 are build/dev-toolchain transitive deps (`wrangler`/`miniflare` are Cloudflare **local dev tooling**, never part of the deployed Worker bundle; `sharp`/`postcss` are **build-time only** — `next.config.ts` already sets `images.unoptimized: true`, so `sharp` is never invoked at request time). The only "fix" npm offers is downgrading `next` to `9.3.3`, a multi-major regression — clearly worse than the risk itself. |
| Real Cloudflare Rate Limiting Rules not configured | Medium | Project owner | Before production cutover (V12-08) | Requires Cloudflare dashboard access this session doesn't have; owner's own explicit architectural choice (V12-01) to use the platform feature instead of app-code rate limiting. |
| Real CWV / load measurement against a live deployed URL | Medium | Project owner | First real staging deploy | No staging exists yet (standing no-deploy-before-V1.2-acceptance policy); this audit substituted real local build/API measurements (§4) as the closest available proxy. |
| `dashboard_ai_logs.context_json` field-level content review | Low | Project owner | Next AI-feature iteration | Confirming exactly what data the AI-compose context payload includes is a business-logic review, not a retention/security fix — out of this task's scope, flagged as a follow-up. |

## 7. Verification summary

* PHPUnit: 43/43 tests, 116 assertions (41 pre-existing + 2 new retention
  tests), against a fresh disposable `mysql:5.6` + PHP 7.4 rehearsal —
  applied, verified, fully torn down (network/containers/image/volumes
  deleted).
* Vitest: 26/26 tests.
* `npm run lint`, `npx tsc --noEmit`, `npm run build`: all clean after
  every change in this task.
* Real browser check (Browser pane): landing page and `/auth/register`
  loaded with the new CSP/security headers active and zero console errors.
