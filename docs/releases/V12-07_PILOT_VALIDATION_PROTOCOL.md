# V12-07 — Pilot Validation Protocol

Date: 2026-07-22
Executor: codex/v09-roadmap session (owner instruction: "V12-02~V12-08一起製作，之後我再一起驗證")
Milestone: V1.2 Production & Specification Complete
Status of this document: **protocol/tooling only — the pilot itself has not run**

---

## 0. Why this task cannot be executed to completion in this session

The task packet's own text is explicit: **"沒有真實 participants 時不得用
mock 宣布完成"** (must not use mocks to declare this done when no real
participants exist). This session has:

* No real Cloudflare staging/production deploy (standing owner policy —
  no deploy before full V1.2 acceptance, `docs/8.infrastructure/02_Cloudflare_Infrastructure.md`).
* No real PHP host applied with the V09-V12 migration chain
  (010-037 remain code-complete/VERIFY, not applied to the real host —
  every task packet from V09-08 onward says so).
* No relationship with any real external user who could be asked to pilot
  a product that isn't live anywhere yet.

Given that, there is no way to produce 3-5 real Workspaces with real
onboarding→Business Outcome journeys — fabricating that data would violate
this task's own explicit instruction. What this document provides instead
is the complete, real, ready-to-execute protocol: participant criteria,
success metrics, consent/privacy/support process, defect-severity triage
rules, and the exact journey-stage tracking template — so that once the
owner has real hosting and real pilot candidates, running the actual pilot
is a matter of following this document, not designing it from scratch
under time pressure.

## 1. Participant criteria

* 3-5 Workspaces, each representing a distinct real business/site (not
  multiple test accounts under one person).
* Each participant must have: an existing website with real traffic (GA
  property access), explicit informed consent to participate in a pre-GA
  pilot (see §3), and a named point of contact reachable during the pilot
  window.
* Exclude: internal/team test accounts (they don't test onboarding
  friction from a genuine external user's perspective), anyone unable to
  connect a real GA property (the core Signal detection pipeline needs
  real traffic data to be a meaningful test, not a validation of synthetic
  fixtures already covered by V10-08's E2E rehearsal).

## 2. Success metrics and exit conditions

| Metric | Definition | Target |
|---|---|---|
| Onboarding completion | Registration → default Workspace provisioned → GA source connected | ≥ 80% of participants (4/5 or 3/3 depending on cohort size) |
| Time-to-first-Signal | Registration timestamp → first `signals` row created for that Workspace | Recorded, no hard target (V1 has no SLA here — this pilot is what ESTABLISHES a baseline) |
| Journey depth | How far each Workspace gets: onboarding → source connect → Signal → Evidence → Recommendation → Decision → Action/Task → Result → Outcome/Feedback | At least 1 of the 3-5 Workspaces must reach Outcome/Feedback (this task's own mandatory verification bar) |
| Drop-off point | The exact stage a Workspace stops progressing, if it doesn't reach Outcome | Recorded per Workspace, classified (see §5) |
| Support load | Number of support contacts/questions per Workspace during the pilot window | Recorded — informs whether V1's manual-support model (single operator, `hank.highlight@gmail.com`) is viable at real pilot scale |
| Qualitative feedback | Free-text feedback per participant at pilot close | Collected via a single structured exit question set (see §6) |

**Exit conditions** (when to end the pilot window regardless of stage
reached): a fixed time-box of **14 calendar days per Workspace** from its
own onboarding start (not a single fixed calendar window for all 5 —
staggered start is expected), OR the participant explicitly withdraws, OR
a P0 defect (see §5) blocks that Workspace's progress and cannot be fixed
within the time-box.

## 3. Consent, privacy, and support

* **Consent**: each participant must receive and acknowledge (in writing,
  e.g. a reply-confirmed email) a pilot-specific notice before onboarding
  that states: (a) this is a pre-general-availability pilot, features may
  change, (b) their data will be used to generate an aggregated,
  anonymized report (this document's own §7 requirement), (c) they can
  withdraw at any time, (d) how to reach support during the pilot.
* **Privacy**: this pilot does NOT change or bypass the standing privacy
  posture — `/privacy` and `/data-deletion` (both real pages, V12-05)
  apply to pilot participants exactly as they would to any other user. No
  pilot-specific data collection beyond what the product already collects
  is permitted (matches this task's own "不使用未經同意的客戶資料" /
  "不因 Pilot 壓力跳過 security/privacy/backup gate" constraints).
* **Support**: the single-operator support channel already documented in
  `/privacy` (`hank.highlight@gmail.com`) is the pilot's support channel —
  no separate pilot-only support process is created, since this pilot is
  explicitly meant to test whether the REAL, already-existing support
  model holds up, not a specially-staffed pilot experience.

## 4. Journey-stage tracking template

For each participating Workspace, record (this is the literal table
structure the eventual `V12-07_PILOT_VALIDATION_REPORT.md` should use —
one row per Workspace, columns are the stages in
`app/dashboard`'s real Decision-first flow):

```
Workspace (anonymized ID) | Onboarding | Source Connect | First Signal | First Evidence | First Recommendation | First Decision | First Action/Task | First Result | First Outcome/Feedback | Drop-off stage (if any) | Support contacts | Notes
```

Each cell is a timestamp (relative to that Workspace's own onboarding
start, e.g. "+2h", "+3d") or "—" if that stage was never reached. Anonymize
Workspace identity as `Pilot-1`..`Pilot-5` in the published report — never
the real business name, contact email, or Workspace public_id.

## 5. Defect severity triage (reused from V12-05's own P0/P1 bar)

* **P0**: blocks a Workspace from progressing at all, or causes data loss
  / a security or privacy exposure. Must be fixed and re-verified before
  that Workspace's time-box expires, or the pilot is paused for a fix.
* **P1**: degrades the experience materially (e.g., a confusing error
  message, a slow but working operation) but doesn't block progress. Must
  be fixed and re-verified within this task's overall window, per this
  task's own acceptance criteria.
* **P2/backlog**: everything else — logged with an owner and no
  fix-before-pilot-ends requirement, matching V12-05's own risk-register
  pattern (owner + rationale, not silently dropped).

## 6. Exit feedback question set (asked identically to every participant)

1. What was the single most confusing moment in getting from signup to
   your first useful insight?
2. Did the AI-generated Recommendation/Decision content feel accurate and
   worth acting on? Why or why not?
3. Would you keep using this if it launched today? What's missing?
4. Any moment you needed support and didn't get it fast enough?

## 7. Report format (for whoever runs the real pilot)

`docs/releases/V12-07_PILOT_VALIDATION_REPORT.md` should contain: the
journey-stage table (§4, anonymized), the aggregated metrics from §2, a
defect list classified per §5 with fix status, the aggregated (not
per-person-attributed) qualitative themes from §6, and a go/no-go
recommendation. Per this task's own explicit boundary, **the go/no-go
recommendation is input to the owner's decision, not a decision this
document or any future execution of it can make unilaterally** — V1.2's
actual release gate is `V12-08`, which remains an owner action regardless
of how positive a pilot's results are.

## 8. What happens next

This protocol is ready to execute. Running it for real requires, in
order: (1) the owner's real production/staging deploy (currently blocked
on the standing no-deploy-before-V1.2-acceptance policy — a chicken/egg
the owner will need to resolve, e.g. by allowing a scoped pre-acceptance
staging deploy specifically for pilot use), (2) the owner identifying and
consenting 3-5 real participants per §1, (3) whoever runs the pilot
following §2-§6 and producing the real
`V12-07_PILOT_VALIDATION_REPORT.md` per §7.
