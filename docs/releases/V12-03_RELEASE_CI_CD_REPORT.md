# V12-03 — Release CI/CD Report

Date: 2026-07-22
Executor: codex/v09-roadmap session (owner instruction: "V12-02~V12-08一起製作，之後我再一起驗證")
Milestone: V1.2 Production & Specification Complete

---

## 1. Real environment constraints that shaped this task's scope

This session's tooling has **no `gh` CLI and no GitHub API access** —
confirmed by direct attempt (`gh repo view` → command not found). This
means real GitHub repo settings (branch protection rules, Environment
protection rules with required reviewers) **cannot be configured from
here**, at all, regardless of permission. This is stated plainly rather
than worked around: the deliverables below are everything that COULD be
built (workflow YAML, manifest tooling, the runbook), with the one-time
manual repo-settings step the owner must complete documented explicitly
in `docs/8.infrastructure/11_Release_Promotion_Runbook.md`'s environment
mapping table.

Separately, the owner's own standing policy
(`docs/infrastructure/V08-04_CLOUDFLARE_ENVIRONMENTS.md`) is that **no
Cloudflare environment — staging OR production — is deployed until the
full V1.2 roadmap passes acceptance**. This task's own "mandatory
verification" asks for an actual staging promotion to be run; doing so
would violate that standing policy, so it was not done. The pipeline is
built and its non-deploying steps (build, manifest generation, dry-run)
were verified for real; the one commented-out line (`wrangler deploy`)
is a deliberate, visible, one-line action for the owner to re-enable when
that gate lifts.

## 2. What this task built

* `.github/workflows/release-promote.yml` — manual-only (`workflow_dispatch`)
  promotion pipeline, separate from the always-on `release-gate.yml`.
  Requires an explicit `confirm_migrations_applied` checkbox input before
  the `reverify` job (the SAME lint/typecheck/test/build gate as
  `release-gate.yml`) runs; `promote` job `needs: reverify`, so a failing
  gate structurally blocks promotion via GitHub Actions' own job-dependency
  semantics. References `environment: ${{ inputs.target }}` (GitHub
  Environment protection — inert until the owner configures matching
  Environments with required reviewers, documented as the missing
  repo-settings step).
* `scripts/generate-release-manifest.mjs` — parses
  `backend/sql/manual_apply_bookkeeping.sql`'s own checksum rows (the
  existing source of truth, never duplicated) into a JSON manifest per
  promotion attempt: target environment, git commit, actor, timestamp,
  every migration this build expects already applied with its checksum.
  Verified for real: ran locally, correctly extracted all 25 current
  migration rows.
* `docs/8.infrastructure/11_Release_Promotion_Runbook.md` — the actual
  environment/branch mapping, fixed release order (DB → Backend → Worker →
  Frontend → backfill/verify → deferred contract) with stop conditions,
  the PHP/SQL manual promotion procedure (orchestrates around, does not
  duplicate, `manual_apply_bookkeeping.sql`), and the rollback/fix-forward
  matrix per layer.

## 3. Rollback/fix-forward matrix — the honest version

Documented in full in the runbook; summary: this project's "expand, never
destructive" migration discipline (every migration file's own header
comment states this) means the Database layer has **no per-migration
rollback and should not get one** — a bad migration is fixed FORWARD with a
new migration. The only real DB recovery path is the restore-from-backup
procedure V11-08 already proved for real (693ms RTO against a disposable
rehearsal — real production RTO not yet measured, honestly noted).
Backend/Frontend each have real, distinct rollback mechanisms (FTP
re-upload of the previous version; Cloudflare Worker version rollback,
respectively) — never conflated with the DB layer's fix-forward-only
reality.

## 4. Mandatory verification — what was and wasn't actually done

* **Migration failure blocking the gate**: already proven for real in
  V12-02 (`MigrationChecksumTest` — a deliberately-broken checksum check
  was caught). Not re-proven here; same mechanism, same evidence.
* **Frontend/backend failure blocking promotion**: not independently
  re-proven with a live GitHub Actions run (no `gh`/API access to trigger
  one) — relies on GitHub Actions' own well-established `needs:` job
  dependency semantics (a failed `reverify` job means `promote` does not
  run), not a novel mechanism this task invented.
* **Preview/staging promotion actually run**: **not done**, deliberately,
  per the standing no-Cloudflare-deploy-before-V1.2 policy above. The
  non-deploying parts of the same job (build, manifest generation,
  `wrangler deploy --dry-run`) were exercised for real.
* **main branch cannot bypass approval**: this task did not and cannot
  verify the Cloudflare Git integration's auto-deploy-on-push is still
  disconnected (that requires Cloudflare dashboard access this environment
  doesn't have) — flagged as something the owner should re-confirm before
  the next `main` push, not silently assumed fixed.

## 5. Deliberately NOT built (honest gaps)

* Any actual GitHub repo settings change (branch protection, Environment
  reviewers) — outside this environment's capability, not a scope choice.
* A real staging/production deploy — outside this task's authority per
  standing owner policy.
* Two-person approval — this is a single-operator (owner) project; the
  GitHub Environment reviewer gate (once configured) is the closest
  available equivalent, documented as such rather than pretending a
  second-engineer process exists.
