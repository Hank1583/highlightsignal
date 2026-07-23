# V12-08 — Final Acceptance Checklist (V1.2 Production Cutover)

Date: 2026-07-22
Executor: codex/v09-roadmap session (owner instruction: "V12-02~V12-08一起製作，之後我再一起驗證")
Milestone: V1.2 Production & Specification Complete
Status of this document: **checklist/tooling only — this is not a go-live approval and does not authorize deployment**

---

## 0. Why this task cannot be closed to DONE in this session

Per this task packet's own explicit text: **"本任務包本身不構成 production
deployment 授權"** and production deployment happens **"取得 owner 明確
go-live 核准後"** — only after the owner's explicit approval. Two of this
checklist's own mandatory items are structurally blocked without owner
action, not something this session can complete on its own:

* **Pilot** (`V12-07`) is `BLOCKED_NEEDS_REAL_PILOT` — no real pilot ran
  (no real deploy exists yet to pilot against, no real participants
  exist). This task's own mandatory verification requires pilot to have
  "全部通過" (fully passed) — it cannot, because it hasn't run.
* **Staging promotion rehearsal** and **production go-live** both require
  a real Cloudflare deploy, which the standing owner policy defers until
  full V1.2 acceptance (`docs/8.infrastructure/02_Cloudflare_Infrastructure.md`)
  — a real chicken-and-egg the owner will need to resolve (e.g. deciding
  whether a scoped pre-acceptance staging deploy is allowed specifically
  to run the pilot and this rehearsal).

What this document IS: a real, complete, immediately-usable consolidated
checklist mapping every V08-V12 task's own already-recorded evidence to
this task's "Required work" items — so that when the owner is ready to
actually cut over, the checklist is the single place to look, not twelve
separate task packets. Per the `v12_cutover_plan` decision already on
record, everything is applied to the real host **in one shot at this
cutover**, not incrementally — this checklist is written with that in
mind: every item below is evaluated against CODE-COMPLETE state, and the
"real host" column is explicitly separate because it's uniformly not yet
applied.

## 1. Consolidated final checklist

| Area | Code-complete evidence | Real host / real deploy state |
|---|---|---|
| Security (auth/signature/CORS/CSRF/headers/deps/secrets) | `V12-05` — 2 P1s fixed and re-verified (missing security headers; `dashboard_ai_logs` retention gap); dependency scan (`npm audit fix`, 7 residual accepted low-risk build-tooling-only findings); secret scan clean; CORS/auth negative paths verified. `V08-02` — OAuth secret rotation `BLOCKED_EXTERNAL_ROTATION`, owner accepted risk. | Security headers/CSP only take effect once the real Cloudflare Worker is deployed with this `next.config.ts`. |
| Migration/postflight (010-037) | All 28 migrations code-complete, each with a disposable Docker MySQL 5.6 rehearsal proving forward-apply + postflight invariants (`V09-08` through `V11-08` reports). | **Not applied to the real host.** This is the single largest real-host gap — every VERIFY-not-DONE task packet says so. |
| Domain E2E (Signal→Evidence→Recommendation→Decision→Action→Result→Outcome→Evaluation) | `V10-08` — full chain proven via disposable rehearsal (33/33), one real cross-module defect found and fixed (`RuleBasedAnalysisGenerator` impact_area). | Never run against real GA data / a real logged-in browser session — `V10-06`/`V10-07` both flag this. |
| Queue reliability | `V11-02` — real two-process concurrency proof (synchronized start-signal barrier), no double-claim/lost-claim. | Needs a real scheduler (cron-ping/GitHub Actions/Cloudflare Cron Trigger) configured against `/api/v1/queue/run` — not configured on any real host yet. |
| Notifications | `V11-06` — code+SQL complete, real Queue integration, 2 real domain events wired. | Email provider never selected/configured — in-app notifications only functional once real host + real login exist. |
| Audit log coverage | `V11-07` — complete coverage, disposable rehearsal passed. | Not applied to real host. |
| Retention/cleanup/backup | `V11-08` — 35 functional assertions + a REAL `mysqldump` backup/restore rehearsal (measured RPO/RTO). `V12-05` closed the one gap found since (`dashboard_ai_logs` had no retention policy — now fixed, 2 new tests). | Real recurring backup schedule not yet established on the real host — V11-08's own report says so. |
| Rollback/fix-forward | `V12-03` — real runbook (`11_Release_Promotion_Runbook.md`) with a per-layer matrix (DB=fix-forward-only+restore; Backend=FTP re-upload; Frontend=Worker version rollback). | Never exercised against a real deploy — no real deploy exists to roll back. |
| Observability/incident readiness | `V12-04` — real signed `GET /api/v1/ops/dashboard` endpoint (4 of 6 SLI categories), incident runbook + postmortem template, 3 real game-day scenarios proven via disposable rehearsal. | Real alert delivery channel doesn't exist (honestly flagged, owner decision); API latency/error has no request-log table. |
| Documentation alignment | `V12-06` — 15 stale pre-implementation Draft docs (Database/API/Backend layers) given real-implementation callouts; `docs/4.architecture`/`docs/10.adr` confirmed aligned. 8 `docs/7.backend` files + `docs/9.frontend`/`docs/8.infrastructure` not exhaustively re-checked (named as a remaining gap). | N/A (documentation, not deploy-dependent). |
| Pilot | `V12-07` — **BLOCKED_NEEDS_REAL_PILOT.** Complete protocol ready (`V12-07_PILOT_VALIDATION_PROTOCOL.md`): participant criteria, success metrics, consent/privacy process, journey tracking template, defect triage, report format. No real pilot has run. | Requires real deploy + real consented participants — neither exists. |
| Release CI/CD | `V12-03` — real `release-promote.yml` (workflow_dispatch, `reverify`→`promote` job dependency), real manifest generator (verified against the real 25-migration checksum set), real (but dry-run-only) `wrangler deploy` line. GitHub Environment/required-reviewer setting needs one manual owner step (`gh` CLI unavailable in this environment — confirmed, not assumed). | No real staging/production deploy has ever run through this pipeline. |
| Automated test suite (release gate) | `V12-02` — PHPUnit (43 tests after `V12-05`'s additions) + Vitest (26 tests), CI-wired (`backend-tests` + `verify` jobs), 3 real latent bugs found and fixed during construction. | Runs in CI against ephemeral service containers, not the real host — this is by design (the whole point of a disposable-DB test suite), not a gap. |

## 2. What is NOT yet true (do not mark these done at cutover without re-checking for real)

* No migration has been applied to the real production database.
* No PHP/frontend artifact has been uploaded to the real host via FTP.
* No real Cloudflare staging or production deploy has ever run.
* No real pilot has been conducted.
* No real alert-delivery channel exists.
* The real 2 accidental `main`-push auto-deploys incident
  (`docs/8.infrastructure/02_Cloudflare_Infrastructure.md`'s own recorded
  history) means the owner should double-check GitHub Environment
  protection is actually configured (the one step this session's tooling
  cannot perform — no `gh` CLI/API access) before relying on
  `release-promote.yml`'s gate to be enforced, not just present as YAML.

## 3. What this task prepared for real cutover time

* This consolidated checklist (§1) — one place to review all V08-V12 exit
  evidence instead of twelve task packets.
* `docs/releases/V1.2_RELEASE_NOTES.md` (companion document, this task) —
  a real, ready-to-finalize draft: what's new, known limitations, accepted
  risks, migration set. Needs only: the real deployment date/commit SHA,
  confirmation every checklist item above has actually been re-verified
  against the real host state at that time, and the owner's sign-off.
* The `v12_cutover_plan` memory (from an earlier session) already records
  the two real environment changes this cutover entails: (1) a full
  production replace, not an incremental rollout, because the owner chose
  to let an existing unspecified production bug be superseded by the full
  V1.2 replacement rather than chase it down separately; (2) the PHP
  backend path moves from `.../highlightsignal/v2` to the same domain
  with `v2` dropped (exact final path TBD at this task's own execution
  time) — this touches `NEXT_PUBLIC_HIGHLIGHT_PHP_API_BASE_URL`/
  `NEXT_PUBLIC_BASE_URL` in `backend/private/frontend.env`, an FTP
  directory move on the real host, and the `GOOGLE_OAUTH_REDIRECT_URI`
  registered in Google Cloud Console — changing the path invalidates the
  old redirect URI, so every existing real GA connection will need to go
  through OAuth again after cutover. This is called out here again because
  it is the single highest-blast-radius step in the entire cutover and is
  easy to miss if this checklist is read out of order.

## 4. Explicit non-authorization

Producing this checklist and the companion release-notes draft is
**not** an approval to deploy. Per this task's own "Required work" step
5: production deployment happens only **"取得 owner 明確 go-live 核准
後"**. No such approval has been requested or given in this session.
