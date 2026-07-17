# V08-06 Minimum CI gate

Status: IMPLEMENTED_LOCAL_PENDING_FIRST_CI_RUN
Date: 2026-07-17

The GitHub Actions workflow runs on pull requests, every branch push including main, and manual dispatch with read-only repository permission. It cannot deploy because it receives no Cloudflare token or production secret. Both Wrangler commands include `--dry-run` and write output beneath ignored `.wrangler/` directories.

## Gates

- deterministic `npm ci` with Node 22 and the committed lockfile
- tracked-file Release boundary check
- ESLint and TypeScript
- Next.js and OpenNext Cloudflare production builds
- committed Worker binding type consistency
- local Worker startup analysis
- staging and production named-environment dry-runs

The Release boundary script rejects tracked environment files (except approved examples), private/runtime directories, generated builds, private keys, credential/service-account JSON, and the real report configuration. Its self-test proves representative forbidden fixtures fail while approved examples remain allowed.

## Controlled failure coverage

Each command propagates a non-zero exit code; there is no `continue-on-error`. ESLint, TypeScript, OpenNext, Wrangler configuration, and Release boundary failures therefore fail the job. The Release boundary check itself was locally executed successfully; its forbidden-path predicates are deterministic and reviewable in `scripts/verify-release-boundary.mjs`.

## Accepted gaps

PHP syntax lint is intentionally absent because the owner requires URL-only verification against the fixed PHP 7.0 host. Automated application tests remain a V12-02 gap. `npm ci` reported 15 dependency audit findings (1 low, 7 moderate, 7 high); they require a separate dependency review and were not auto-fixed because forced upgrades may be breaking. The first hosted CI run cannot exist until this commit is pushed, and no push is performed in this task.

## Local execution evidence

The full Node/OpenNext gate, Worker binding type check, startup analysis, Release boundary self-test, and both named-environment Wrangler deploy dry-runs passed on 2026-07-17. Both Wrangler commands stopped at the explicit dry-run boundary; no Worker was deployed. V08-06 remains pending only for the first hosted GitHub Actions run and the owner-accepted PHP lint omission.

The first GitHub Desktop publish updated main directly while the initial workflow excluded main pushes, so GitHub correctly reported zero runs. The trigger was corrected to cover all pushes and manual dispatch; permissions and dry-run-only deployment commands remain unchanged.
