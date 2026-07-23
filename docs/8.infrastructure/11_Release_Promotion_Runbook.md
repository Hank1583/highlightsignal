# 11_Release_Promotion_Runbook

Version: v1.0

Status: Stable (V12-03)

---

# Purpose

This is the REAL, executable release procedure — not an aspirational design.
It supersedes `10_Deployment_Infrastructure.md`'s "Future Evolution: 未來可
導入 CI/CD" section, which described automation this project did not yet
have. As of V12-03, it does.

# Why this exists

Two real incidents drove this document, both already recorded elsewhere:

1. **2026-07-17**: two pushes to `main` auto-deployed the default
   `highlightsignal` Cloudflare Worker via the Git integration, before
   branch policy was clarified (`docs/infrastructure/V08-04_CLOUDFLARE_ENVIRONMENTS.md`).
2. **Every V09-V11 task**: real code/SQL, verified against a disposable
   Docker rehearsal, correctly held at VERIFY (not DONE) because applying it
   to the real host is a distinct, owner-only, manual step — with no
   standardized procedure connecting "this commit is verified" to "this is
   now running in production."

This runbook is the connective procedure between those two facts.

---

# Environment / branch mapping

| Environment | Trigger | Branch source | Cloudflare env name | Approval |
|---|---|---|---|---|
| CI verify (always-on) | every push/PR | any | none (no deploy) | none — this is the release gate itself |
| Staging | manual `workflow_dispatch` on `release-promote.yml`, target=staging | the commit being promoted | `highlightsignal-staging` | **owner, once the "staging" GitHub Environment is configured with a required reviewer** — a repo-settings step this task's own environment cannot perform (no `gh`/API access here); until configured, dispatching this workflow runs immediately with no gate |
| Production | manual `workflow_dispatch` on `release-promote.yml`, target=production | the commit being promoted | `highlightsignal-production` | same as staging, but MUST be a separate "production" Environment with its own required reviewer — never reuse staging's approval |
| `main` | — | — | — | **never auto-deploys today** (the 2026-07-17 incident's root cause, the Cloudflare Git integration's own auto-deploy-on-push, was disconnected as part of the branch policy already in force — verify this is still true before ever merging to `main` again) |

Roadmap work stays on `codex/*` branches until the V1.2 production gate is
approved (existing policy, `V08-04_CLOUDFLARE_ENVIRONMENTS.md`) — this
runbook does not change that.

---

# Fixed release order

```
1. Database (expand-only migrations)
     ↓  stop if: checksum mismatch, postflight invariant fails
2. Backend / PHP (FTP upload)
     ↓  stop if: php -l fails, smoke test 4xx/5xx on core endpoints
3. Queue Worker (same FTP payload as Backend — no separate deploy step)
     ↓  stop if: `/api/v1/queue/run` signed smoke request fails
4. Frontend (Cloudflare Worker)
     ↓  stop if: build/typecheck/test fails, wrangler dry-run fails
5. Data backfill / verification (real Workspace golden path, per V10-08's own methodology)
     ↓  stop if: golden path assertions fail
6. Deferred contract cleanup (e.g. a later migration that finally makes a
   V-expand-phase column NOT NULL once every writer is confirmed populating it)
```

**Why this order**: DB first because every expand-phase migration in this
project is additive (new nullable column, new table) — old Backend code
that isn't YET aware of it keeps working unmodified against the new
schema. This means Database can ship independently, hours or days
before Backend catches up, without an outage window — the same "expand,
never destructive" discipline used throughout every V09-V11 migration
(see any `backend/sql/migrations/*.sql` file's own header comment).
Backend before Frontend because the Next.js BFF routes
(`app/api/*/route.ts`) call the PHP endpoints they expect to already exist;
shipping Frontend first would 404/502 against not-yet-updated PHP.

**Stop condition, concretely**: if step N fails, do not proceed to step
N+1. Steps already completed stay as-is (they are additive/backward
compatible by construction) — this is "fix forward," not "automatic
rollback," for the DB/Backend layers; see the rollback/fix-forward matrix
below for why.

---

# PHP/SQL manual promotion procedure (no-SSH host)

This IS `backend/sql/manual_apply_bookkeeping.sql` — that file already
tracks 25 migrations (010-037, minus gaps) with per-migration SHA-256
checksums, in `Step N (V-task)` blocks, each naming its own preflight/
migration/postflight trio. This runbook adds the missing piece: the
around-it procedure.

1. **Freeze**: confirm no other promotion is in flight (single-operator
   discipline — this host has no distributed lock the way
   `MigrationRunner`'s `GET_LOCK` protects concurrent CLI runs, because the
   CLI runner itself cannot run on this host at all, see `bin/migrate.php`'s
   own "no SSH" note).
2. **Backup** (V11-08's own documented procedure): owner-triggered
   phpMyAdmin full export, before touching anything. This is the ACTUAL
   rollback mechanism for the DB layer — see the matrix below.
3. For each not-yet-applied `Step N` block in `manual_apply_bookkeeping.sql`,
   **in order**:
   a. Run that step's `preflight_*.sql` via phpMyAdmin — confirm the
      expected pre-state (tables that should/shouldn't exist yet).
   b. Paste and run the migration file itself.
   c. Run the matching `INSERT INTO schema_migrations (...)` bookkeeping
      row from `manual_apply_bookkeeping.sql` — this is what makes
      `bin/migrate.php status` (if ever run against this host) agree with
      reality, and what a FUTURE automated checksum check (V12-02's
      `MigrationRunner`) would compare against.
   d. Run that step's `postflight_*.sql` — confirm the invariants hold.
   e. **Stop and do not proceed** if either flight check fails or looks
      wrong — this is a human judgment call by design (no automated
      CLI runner exists on this host to make it mechanical).
4. After all pending steps: run
   `SELECT * FROM schema_migrations ORDER BY version;` and confirm the row
   count and checksums match `manual_apply_bookkeeping.sql`'s own closing
   comment exactly.
5. **Record**: who ran it (`executor` column), when, and reference the
   release manifest (see below) this promotion corresponds to.

**Two-person/owner approval**: today this is a single-operator (owner)
procedure — there is no second engineer on this project to require a
formal two-person rule for. The GitHub Environment approval gate on
`release-promote.yml` (once configured) is the closest equivalent: the
owner approving their own promotion is still a distinct, logged,
deliberate act separate from the commit itself existing.

---

# Backend/Worker FTP promotion

1. Confirm the DB step above is complete FIRST (backend code that assumes
   a new column/table exists must never ship before that column/table
   does).
2. Upload the changed `backend/api/**` files via FTP to the shared host,
   mirroring the existing procedure in `backend/api/UPLOAD_README.md`.
3. Smoke test: reuse the pattern in `scripts/verify-php-hotfix.ps1` (built
   for a V08 hotfix, but its signed-request + response-assertion shape is
   the right template for any post-deploy PHP smoke check) — at minimum,
   a signed `GET /api/v1/workspaces` and, if queue-touching code shipped, a
   signed `POST /api/v1/queue/run`.

---

# Frontend (Cloudflare) promotion

Handled by `.github/workflows/release-promote.yml`'s `promote` job:
build via `opennextjs-cloudflare build`, write a release manifest
(`scripts/generate-release-manifest.mjs`), then — **today** — only a
`wrangler deploy --dry-run`, never a real deploy. The real
`wrangler deploy --env <target>` line is present in the workflow file,
commented out, with a comment explaining why: the owner's standing policy
(`V08-04_CLOUDFLARE_ENVIRONMENTS.md`) is that no Cloudflare environment —
staging OR production — deploys until the full V1.2 roadmap passes
acceptance. Re-enabling that line is a deliberate one-line owner action
when that gate lifts, not something this task does preemptively.

---

# Rollback / fix-forward matrix

| Layer | "Rollback" reality | Mechanism |
|---|---|---|
| Database | **No automated rollback exists or should exist.** Every migration in this project is expand-only (new nullable column/table, never a destructive `DROP`/`MODIFY ... NOT NULL` against live data) — see any migration file's own header. A bad migration is fixed FORWARD with a new migration, never undone in place. If data is somehow corrupted, the ONLY real recovery is the V11-08-proven restore-from-backup procedure (real RTO measured: 693ms against a disposable rehearsal database; real production RTO depends on real data volume and is NOT yet measured against the real host). |
| Backend (PHP/FTP) | Real rollback: re-upload the previous version's files via FTP. Requires the previous version to still be available (git history + whatever the last-deployed FTP snapshot was) — there is no automated "previous deploy" pointer on this host today; this is a manual, git-checkout-then-reupload procedure. |
| Frontend (Cloudflare Worker) | Real, fast rollback: `wrangler deploy` targeting a previously recorded Worker version (Cloudflare retains version history per Worker) — see `V08-04_CLOUDFLARE_ENVIRONMENTS.md`'s own rollback runbook item #6: "redeploy the previously recorded Worker version for the same named environment. Never redirect staging bindings to production as a rollback shortcut." |
| Queue Worker | Same artifact as Backend — no separate rollback mechanism. |
| Scheduler (Google Apps Script) | Out of this task's scope — no change made here; existing manual GAS editor procedure unchanged. |

**The one honest principle underlying this whole matrix**: this project's
"expand, never destructive" migration discipline means a bad DEPLOY is
almost always safe to leave in place at the DB layer while the
CODE layer (Backend/Frontend) is rolled back independently — the schema
change itself rarely needs undoing, because it was additive to begin with.
A genuine destructive-migration mistake (should never happen given the
established discipline, but if it did) has exactly one real recovery path:
restore from the pre-migration backup, accepting the RPO/RTO cost documented
in V11-08.

---

# Deployment verification (post-promotion)

Minimum smoke checks, every promotion, every layer that changed:

* Database: the postflight script for every step just applied (see above).
* Backend: signed `GET /api/v1/workspaces` returns 200; if Queue-touching
  code shipped, a signed `POST /api/v1/queue/run` returns 200 with a
  real stats object.
* Frontend: `/` and `/auth/login` return 200; a protected route
  (`/dashboard`) redirects to `/auth/login` when unauthenticated (the exact
  smoke checks already informally run during the 2026-07-17 incident
  aftermath, per `V08-04_CLOUDFLARE_ENVIRONMENTS.md`'s own incident note).

---

# Relationship with other documents

* `backend/sql/manual_apply_bookkeeping.sql` / `VERIFICATION_RUNBOOK.md` —
  the actual per-migration checksums and preflight/postflight scripts this
  runbook orchestrates around, not duplicates.
* `docs/infrastructure/V08-04_CLOUDFLARE_ENVIRONMENTS.md` — the Cloudflare
  environment matrix and the standing no-deploy-before-V1.2-acceptance
  policy this runbook's Frontend section defers to.
* `backend/sql/VERIFICATION_RUNBOOK.md` section 20 (V11-08) — the real,
  measured backup/restore evidence this runbook's Database rollback row
  cites.
* `docs/releases/V12-02_AUTOMATED_TEST_SUITE_REPORT.md` — the
  `reverify` job in `release-promote.yml` runs exactly that suite.
* `10_Deployment_Infrastructure.md` — superseded by this document for
  anything concrete; kept as the original high-level design reference.
