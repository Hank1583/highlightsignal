# V12-06 — Documentation & Implementation Alignment Report

Date: 2026-07-22
Executor: codex/v09-roadmap session (owner instruction: "V12-02~V12-08一起製作，之後我再一起驗證")
Milestone: V1.2 Production & Specification Complete

---

## 1. What this task found

`docs/00_Technical_Specification_Alignment_v1.2.md` §16 ("Required
Documentation Corrections") already self-admits the exact problem this
task was asked to find: the "Evolvable" doc categories
(`docs/5.database`, `docs/6.api`, `docs/7.backend`, `docs/9.frontend`)
were written as pre-implementation Draft specs (UUID PKs, JSONB payloads,
Postgres-style polymorphic lookup tables) BEFORE the real MySQL/BIGINT
schema and PHP modular-monolith implementation existed, and were never
updated after V09–V12 built the real thing. `migrations/025_evidence_persistence.sql`'s
own comment even names `docs/5.database/05_Evidence_Database.md` directly
as an obsolete draft. This is not new drift discovered from scratch — it
is executing an already-declared, previously-unexecuted punch list, in
the order the spec itself prescribes (Database → API → Backend →
Infrastructure → Frontend → ADR).

A code-to-doc inventory (built by reading every file in `docs/5.database`,
`docs/6.api`, sampled `docs/7.backend`, `docs/4.architecture`,
`docs/10.adr`, and cross-checking each concrete claim against
`backend/sql/migrations/010`+`024`-`037`, the real route table in
`backend/api/public/index.php`, and the actual `backend/api/src/*`
directory tree) confirmed 15 files describing tables/endpoints/module
structures that never existed or no longer match reality. `docs/4.architecture`
and `docs/10.adr` were confirmed ALIGNED — they deliberately stay at a
product-philosophy level ("Domain Model 不是 Database Schema", ADR-009's
whole point is Architecture stays stable while Implementation evolves)
and make no false concrete claims.

## 2. What was fixed

Per this task's own explicit constraint ("優先修改既有 canonical 文件，不
建立重複文件"; "過時文件需提供 replacement link 或清楚 archived/deprecated
標示"), each of the 15 stale files got a callout block (the same pattern
already established this session for `08_Monitoring_Logging_Infrastructure.md`,
`10_Deployment_Infrastructure.md`) rather than a full-prose rewrite —
naming exactly what's wrong, pointing to the real schema/route/module, and
downgrading `Status: Draft` to `Status: Draft (superseded by real
implementation — see note above)` so a reader can't mistake the
aspirational shape for what's actually running. Nothing was deleted —
every file's original content is preserved as historical design intent,
per this task's own "不得誤刪仍有使用者價值的歷史證據" constraint.

**`docs/5.database/`** (8 files):
`02_Workspace_Database.md`, `04_Signal_Database.md`,
`05_Evidence_Database.md`, `06_Recommendation_Database.md`,
`07_Notification_Database.md`, `08_Widget_Database.md` (a special case —
Widget was never meant to be a DB table at all; the spec's own §11
already says so, so this is "superseded by the accepted v1.2 spec," not
just implementation drift), `09_Audit_Log_Database.md`,
`10_Data_Retention_Database.md`.

**`docs/6.api/`** (5 files): `04_Signal_API.md`, `06_Recommendation_API.md`,
`07_Notification_API.md`, `09_Audit_Log_API.md` (documented a
`/system-events` resource and full CRUD on audit logs; the real route is
one read-only `GET .../audit-logs` endpoint — the real router's own
comment already says so), `10_Retention_API.md`.

**`docs/7.backend/`** (2 files, sampled): `04_Signal_Backend.md` (invented
module structure — `SignalSearchController`, `SignalScoringService`, etc. —
none exist; the real `Signal/` module is 3 files plus a `Detector/`
subfolder with a completely different, rule-based pattern),
`06_Recommendation_Backend.md` (describes a `Modules/Recommendation/`
directory that **does not exist at all** — the real logic lives in
`Dashboard/WorkflowService` + `Action/ActionRepository`, an entirely
different module boundary).

Each callout cross-references its sibling doc where relevant (e.g. the API
doc's callout points at the Database doc's callout for the matching real
schema), so a reader who lands on any one of the three layers for a given
domain gets routed to the same real evidence.

## 3. Verification performed

* Every new file-path/code-symbol reference added in these 15 callouts was
  independently confirmed to exist on disk (e.g.
  `backend/api/src/Signal/Detector/GaTrafficAnomalyDetector.php`,
  `backend/api/src/Action/ActionRepository.php`,
  `backend/api/src/Dashboard/WorkflowController.php`) before being cited —
  no reference was written from memory without checking.
* Re-ran a full-repo scan of every relative markdown-to-markdown link
  across all 166 `docs/**/*.md` files (before and after this task's edits):
  **0 broken links**, both times.
* Ran a separate scan for backtick-quoted repo file paths referenced in
  docs; the only "missing path" hits were either (a) files this session's
  own two prior reports (`V12-02`, `V12-05`) had referenced with a wrong
  directory prefix — fixed directly (`tests/Support/DatabaseTestCase.php` →
  `backend/api/tests/Support/DatabaseTestCase.php`; `lib/*.test.ts` →
  `tests/lib/*.test.ts` in the V12-02 report; the same fix in this task's
  own V12-05 report), or (b) references to files that were *deliberately,
  correctly-documented as deleted* (`backend/api/auth.php`,
  `docs/claude-feature-inventory.md` — both explicitly recorded as
  intentional removals in V08-01/V09-05's own history, not doc bugs), or
  (c) forward-references inside not-yet-executed task packets (`V12-07`/
  `V12-08` naming their own future report paths in advance — the
  established, expected template pattern).

## 4. Honest gaps — not exhaustively covered

This audit read every file in `docs/5.database` and `docs/6.api` in full,
and deep-read the 2 most likely `docs/7.backend` files (Signal,
Recommendation — the two domains with the most V09-V12 churn). It did
**not** exhaustively deep-read:

* `docs/7.backend/`'s other 8 files (Workspace/User/Notification/Widget/
  Audit/Retention/Queue/Explanation Backend) — given the identical
  stale-draft pattern confirmed in the 2 files that WERE checked, these are
  likely to have the same problem, but this was not verified line-by-line
  against `backend/api/src/*` for each one individually. Flagged as a
  follow-up, not silently assumed fine.
* `docs/9.frontend/`'s 9 files beyond the one sampled (`05_API_Integration.md`,
  which reads at an abstract/principle level with no hard concrete route
  claims, so it's lower-risk) — not deep-checked against the real
  `app/**`/`components/**` tree.
* `docs/8.infrastructure/` was not deep-checked in this pass — its 3
  newest files (`10_Deployment_Infrastructure.md`,
  `11_Release_Promotion_Runbook.md`, `12_Observability_Runbook.md`) were
  written or amended THIS SESSION (V12-03/V12-04) against the real CI/CD
  and observability code, so they are the highest-confidence category and
  were reasonably deprioritized versus the confirmed-stale Database/API/
  Backend docs.

Per this task's own "Deferred/known limitations 未被洗掉" acceptance
criterion, these are named here explicitly as remaining scope rather than
implied to be already covered.
