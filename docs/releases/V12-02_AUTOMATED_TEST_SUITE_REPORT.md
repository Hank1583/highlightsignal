# V12-02 — Automated Test Suite Report

Date: 2026-07-22
Executor: codex/v09-roadmap session (owner instruction: "V12-02~V12-08一起製作，之後我再一起驗證" — build V12-02 through V12-08, verify together afterward)
Milestone: V1.2 Production & Specification Complete

---

## 1. What existed before this task

**Nothing.** No PHPUnit, no Jest/Vitest, `composer.json`'s own `scripts.lint` referenced a `bin/lint.php` file that was never actually created (silently broken since the file was first written). Every V10/V11 task's verification was a real, rigorous, but ONE-OFF disposable Docker rehearsal — hand-written each time, deleted after use. That proved each task's own claims at the time, but none of it survived as regression coverage, and the CI gate (`.github/workflows/release-gate.yml`) had zero test execution — lint/typecheck/build only.

## 2. What this task built

### Backend (PHP) — `backend/api/tests/`, PHPUnit 9.6

* `bin/apply_test_schema.php` — applies every real `backend/sql/migrations/*.sql` file (010-037, excluding 013-023's legacy-table retrofits — see the script's own comment for why) to a disposable database. Converts the "hand-assemble a schema_chain.sql" step repeated by hand in every prior task's rehearsal into one reusable, env-configured command.
* `bin/lint.php` — actually created (fixing the dead `composer lint` script), sweeps `php -l` across every real source file.
* `backend/api/tests/Support/DatabaseTestCase.php` / `ServiceFactory.php` — shared harness (a real disposable-DB connection per test class, and the exact `WorkflowService` wiring `public/index.php` itself uses).
* Test matrix (risk → test, per this task's own required work item #1):

| Risk | Test class | Kind |
|---|---|---|
| Authorization / role | `WorkspacePermissionsTest` | Unit |
| Signal detector logic | `SeoTechnicalIssueDetectorTest` | Unit |
| Audit redaction/PII | `AuditLoggerRedactionTest` | Unit |
| Signature/nonce/replay | `ServiceRequestAuthenticatorTest` | Integration |
| Cross-workspace isolation | `CrossWorkspaceIsolationTest` | Integration |
| Decision/idempotency | `DecisionIdempotencyTest` | Integration |
| Queue concurrency/retry | `QueueConcurrencyTest` | Integration (real 2-process) |
| Migration/checksum | `MigrationChecksumTest` | Integration |
| Onboarding E2E | `OnboardingE2ETest` | Integration |

38 tests, 96 assertions, all passing against a disposable `mysql:5.6` container.

### Frontend (Next.js) — `tests/`, Vitest 4

* `tests/lib/authOrigin.test.ts` — CSRF/origin gate for the V12-01 auth BFF routes.
* `tests/lib/phpServiceAuth.test.ts` — signature scenario: independently re-derives the SAME canonical-string HMAC algorithm PHP's `ServiceRequestAuthenticator` uses, in plain Node crypto, proving the two sides of the trust boundary actually agree.
* `tests/lib/sessionToken.test.ts` — JWT scenario: sign/verify round-trip, tamper rejection, wrong-secret rejection, expiry.
* `tests/lib/legacyMemberAuth.test.ts` — account-enumeration scenario: proves "帳號不存在" and "密碼錯誤" collapse to the identical generic message (and that "帳號已封鎖" deliberately does not).

26 tests, all passing, mocking `fetch` — never touching the real external member system.

### CI integration

`.github/workflows/release-gate.yml`: a new `backend-tests` job (real `mysql:5.6` service container, composer install, `composer lint`, schema apply, `composer test`, JUnit artifact upload) running independently alongside the existing `verify` job, which now also runs `npm run test` (Vitest) with its own JUnit artifact upload, before the build steps.

## 3. Real bugs found and fixed via this task's own tests

Writing real, executable tests — not just reasoning about the code — found and fixed **three latent production bugs**, none related to the test suite's own scaffolding:

1. **`ServiceRequestAuthenticator::claimNonce()` / `WorkerRequestAuthenticator::claimNonce()`** (both had the identical bug): the connection always runs with `MYSQLI_REPORT_STRICT` (`ConnectionFactory::create()`), under which `mysqli_stmt::execute()` THROWS a `mysqli_sql_exception` on a duplicate key rather than returning `false` — so the `if (!$statement->execute()) { if errno===1062 ... }` dead-letter check in both classes was **unreachable dead code**. A real replay was only ever actually caught by `public/index.php`'s own top-level `mysqli_sql_exception` handler, one layer above where each class claimed to handle it. Fixed by wrapping `execute()` in a real try/catch for `mysqli_sql_exception` in both classes.
2. **`MigrationRunner`'s version-as-array-key bug**: PHP auto-casts an array key that looks like a clean decimal integer (no leading zero) to a real `int`. Every REAL migration version has a leading zero ("010".."037") and is immune — but this class's own contract calls it a "version" (a string identifier), and `applyOne(string $version, ...)` is strictly typed. The bug was completely dormant and would have stayed dormant until a real migration ever reached version 100+ (three digits, no leading zero) on a live host. Found immediately because the test suite's own synthetic fixture versions ("900"/"901") ARE unsafe. Fixed by casting `(string) $version` at each of the three `foreach ($files as $version => $file)` sites.

These are exactly the kind of thing an automated, executable test suite is supposed to catch before they reach a real host — none of them were hit by any prior V10/V11 rehearsal, because none of those rehearsals happened to use an un-zero-padded version number or call `authenticate()` directly outside the one HTTP entrypoint that happened to paper over the dead nonce-handling code.

## 4. Mandatory verification: 4 deliberate defects, proven caught

Each defect was introduced, confirmed to fail the suite, then reverted and confirmed green again:

1. **Authorization** — widened `WorkspacePermissions::MATRIX['workflow.mutate']` to include `viewer`. Result: 3 real test failures (`WorkspacePermissionsTest`).
2. **Migration checksum** — hardcoded `MigrationRunner::status()`'s drift check to always report `'applied'`. Result: 1 real test failure (`MigrationChecksumTest::testDriftedAppliedMigrationIsDetectedAsChecksumMismatch`).
3. **Queue duplicate/lost claim** — replaced the atomic `UPDATE ... WHERE status='queued' ... LIMIT 1` with a non-atomic SELECT-then-UPDATE (no status guard on the UPDATE). The REAL failure mode this produces is subtler than a same-id double-claim: the losing racer's `claimNext()` returns `null` (its claim was silently overwritten), which its worker loop reads as "queue is empty" and exits for good — so the WINNER alone ends up claiming everything. A direct repro (`race_debug2.php`, ad hoc, not committed) confirmed this exact mechanism. The original two assertions (no overlap; union covers every seeded id) do NOT catch this failure mode — both stay green by luck, since every job still gets claimed by someone. Added a THIRD assertion (both workers must claim a meaningful share, not near-zero) that does catch it. Result: 1 real test failure once the correct assertion existed.
4. **Decision replay** — disabled the `idempotency_key` lookup in `WorkflowRepository::recordDecision()`. Result: a real `mysqli_sql_exception` (the database's OWN `UNIQUE(workspace_id, idempotency_key)` constraint still fired as defense-in-depth) — the test suite still correctly reports this as a failure, though the user-facing failure mode degrades from "return the original decision" to "500 error," itself a real, worse-but-still-caught regression.

## 5. Flaky test policy, timeouts, release blockers (task's own required work item #5)

* **No automatic retries anywhere** — neither PHPUnit nor Vitest config retries a failing test. A flaky test is a correctness bug in the test (or the code it tests) to be fixed at the root, not papered over — `QueueConcurrencyTest` itself is the concrete example: its first version genuinely WAS timing-dependent (proc_open scheduling skew could make two workers miss each other's race window), found during this task's own defect-proof exercise; fixed with a real start-signal barrier (both workers busy-poll for a shared signal file, released simultaneously) rather than a longer sleep or a retry wrapper.
* **Timeouts**: `backend-tests` job capped at 15 minutes, `verify` job at 30 minutes (unchanged, already generous for the added steps — the whole suite runs in ~1-2 seconds locally).
* **Release blockers**: both CI jobs are required checks; either failing blocks the gate. No test is marked "informational only" or allowed to fail without blocking.

## 6. Deliberately NOT built (honest gaps)

* **Coverage percentage targets** — the task's own out-of-scope line rules this out ("不追求無意義的 100% coverage"). No coverage threshold is enforced; `phpunit.xml`'s `<coverage>` block exists for local `--coverage-html` use, not as a gate.
* **A full HTTP-level integration test of the Next.js API routes** (hitting `app/api/auth/register/route.ts` through a real HTTP server) — V12-01's own manual mock-server rehearsal already covered this once; this task's Vitest suite tests the underlying `lib/` logic directly rather than duplicating that HTTP-level exercise as a permanent automated test. A genuine gap, not silently glossed over — a future task could add this via Next's own route-handler testing utilities if the coverage is judged worth the added complexity.
* **A working `act`-based or real GitHub Actions run of the new workflow YAML** — this environment has no local GitHub Actions runner; the YAML was authored carefully and its constituent commands (`composer test`, `npm run test`, etc.) were each verified to work standalone, but the workflow file itself is unexecuted until it actually runs on GitHub Actions (or main is pushed to, which this session does not do without explicit permission).
