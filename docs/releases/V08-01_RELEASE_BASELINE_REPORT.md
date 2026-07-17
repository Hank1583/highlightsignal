# V08-01 Release Baseline Report

Date: 2026-07-17  
Task: `V08-01`  
Status: `DONE` with two explicitly withheld legacy PHP files  
Starting commit: `399fd51a27cf0d6a579020f4b5daddf1a6ae5d25`

## Inventory snapshot

The pre-baseline worktree contained 55 tracked changes (54 modified and one
deleted) and 227 untracked files. No staged changes existed.

| Classification | Complete path coverage | Disposition |
|---|---|---|
| V1 implementation | All changed `app/**`, `components/**`, `lib/**`, `types/**`, and `middleware.ts`; safe files under `backend/api/**`; all `backend/sql/**` | Committed in the frontend and backend groups below. `middleware.ts` remains active but is also a deprecation candidate. |
| Deployment/configuration | `.env.example`, `.gitignore`, `backend/api/.env.example`, PHP `.htaccess` files, `backend/api/config/**`, `backend/api/public/**`, `backend/api/composer.json`, `backend/api/UPLOAD_README.md`, and `backend/api/workers/README.md` | Safe examples/configuration committed. Runtime secrets and generated directories remain ignored. |
| Documentation | `README.md`, every new or changed file under `docs/**`, and the deletion of `docs/claude-feature-inventory.md` | Committed. README now defines the in-repo PHP source of truth. |
| Generated artifact | `.next/**`, `.open-next/**`, and `.wrangler/**` created or refreshed by verification | Ignored and not tracked. No build-output path is present in `git ls-files`. |
| Deprecated candidate | Deleted `docs/claude-feature-inventory.md`; retained `middleware.ts` | The Claude inventory was a one-off V1.5/AdFusion analysis, had no remaining references, and was superseded by the accepted v1.2 alignment, index, gap analysis, and tracker. Its deletion is reasonable. Middleware migration to `proxy` is deferred because the current OpenNext build passes with a deprecation warning and environment separation belongs to V08-04. |
| Ownership uncertain / security withheld | `backend/api/ga/data_sync.php`, `backend/api/ga/oauth_callback.php` | Preserved unmodified and untracked. Each contains the same non-empty legacy OAuth client-secret literal, so neither is part of this Release. V08-02 must move the credential to runtime configuration and determine rotation requirements before either file can be committed. |

The path groups above exhaust the initial tracked and untracked inventory. The
only remaining visible worktree entries after grouping are the two explicitly
withheld PHP files.

## Secret and artifact boundary

- `.env.local` and `backend/api/.env` exist only as ignored runtime files and
  are not tracked.
- `backend/api/si/seo/business-agent-*.json` is ignored and not tracked.
- Actual `ga/report/config.php`, PEM/key files, runtime storage, PHP `vendor/`,
  `.next/`, `.open-next/`, and `.wrangler/` are excluded.
- The tracked tree contains only `.env.example` files for environment setup.
- A committed-tree literal scan found no private-key block, non-empty
  `client_secret` assignment, or quoted password literal in release code.
- No secret value was printed or written to Git during this task.

## PHP source of truth

`backend/api/` and `backend/sql/` in this repository are the version-controlled
source of truth. The former contains the legacy endpoint payload plus the new
front controller, environment loading, and modular `src/` implementation; the
latter contains the reviewed MySQL migration sources.

`D:\7.Highlight\1.Project\4.php\highlightsignal` is a legacy/deployment mirror.
Most endpoint files were byte-identical during comparison, while the repo adds
the V1 modular application and the external tree retains host-only files. A
change made in the external tree is not releasable until reconciled into
`backend/`. `README.md` now records this rule.

The two withheld OAuth files are not in the baseline payload even though their
legacy copies exist in the external mirror.

## Commit grouping

1. `735dad51f281c3e753b6c71248a95f9d622fc1b3` — documentation and accepted V1 architecture baseline, including the reasonable deletion of the obsolete Claude inventory.
2. `9391dcc2acfef6bf815eeb12cbc1d9ce6d19f6f5` — PHP modular-monolith and MySQL migration baseline, excluding the two credential-bearing files.
3. `38c7acdeb10c7cda9a154deb06ace01747429590` — Next.js workspace, dashboard, GA, SEO/SI, BFF, and shared-library implementation.
4. `d5a2a1a5415f43c41edf3cb87d1976235400251b` — release environment examples and runtime/credential/build exclusions.

Each group can be reviewed or reverted independently in reverse order. No
production deployment was performed.

## Verification

| Command | Result |
|---|---|
| `npm run lint` | PASS |
| `npx tsc --noEmit --pretty false` | PASS |
| `npm run build` | PASS; Next.js 16.2.7, 36 static pages generated; middleware deprecation warning retained |
| `npm run build:cf` | PASS; OpenNext 1.19.11 generated `.open-next/worker.js`; Windows compatibility and middleware deprecation warnings retained |
| `npx wrangler deploy --dry-run` | PASS with Wrangler 4.98.0; 198 asset files read; dry-run exited without deployment |

Local PHP was unavailable, so `php -l` was not run. PHP runtime compatibility
and staging smoke tests remain V08-05 work. SQL files were statically reviewed
and committed but were not executed against a local, staging, or production
database.

## Rollback and deployment impact

The baseline is represented by the ordered commits above plus the evidence
commit containing this report. Rollback is Git-based by reverting groups in
reverse dependency order. No tag, remote push, migration execution, Cloudflare
deployment, PHP upload, or production change occurred.

Before a deploy, complete V08-02 credential containment, V08-03 service-auth
coverage, V08-04 environment separation, and V08-05 target-runtime PHP checks.

