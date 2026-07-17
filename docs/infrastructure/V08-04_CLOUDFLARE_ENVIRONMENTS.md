# V08-04 Cloudflare environment baseline

Status: DONE
Date: 2026-07-17

## Environment matrix

| Environment | Worker name | Public route | API host | Self binding | Logs |
|---|---|---|---|---|---|
| top-level safety default | `highlightsignal` | none; `workers_dev=false` | none | none | off |
| staging | `highlightsignal-staging` | none; `workers_dev=false` | `https://staging.invalid` | `highlightsignal-staging` | enabled, sample 1.0 |
| production | `highlightsignal-production` | none; `workers_dev=false` | current AdFusion backend | `highlightsignal-production` | enabled, sample 0.1 |

The owner explicitly declined a separate PHP staging directory, subdomain, and database. The Cloudflare staging environment therefore fails closed with an intentionally non-routable API host and cannot call the current PHP/MySQL integration target.

Each named environment independently declares assets, variables, the self service binding, observability, and the required secret names. No secret value is stored in Git. Required names are `INTERNAL_KEY`, `JWT_SECRET`, `PAGESPEED_API_KEY`, and `PHP_SERVICE_AUTH_SECRET`.

## Build-time and runtime boundary

`API_HOST` is a Worker runtime variable. Sensitive values are Wrangler secrets. No `NEXT_PUBLIC_*` value is used for a server credential or backend service origin. The committed `worker-configuration.d.ts` contains names and public configuration only; runtime library types are excluded so they do not override the browser `fetch().json()` types used by Next.js.

## Middleware decision

Next.js 16.2.7 deprecates `middleware.ts` in favor of `proxy.ts`, but Proxy always uses the Node.js runtime. OpenNext Cloudflare 1.19.11 rejects Node.js middleware. The attempted migration therefore failed `npm run build:cf` and was reversed without `git restore` or loss of user changes. Edge middleware remains the deployable source until OpenNext supports Node Proxy or publishes a supported migration path.

## Promotion and rollback

1. Build and pass the release gate without production credentials.
2. Provision the four secret names separately for the target named environment.
3. Run the named environment dry-run and inspect the Worker name, service binding, and asset manifest.
4. Deployment requires a separate owner-approved action; these scripts never select an environment implicitly.
5. Verify login, logout, protected-route redirect, and a signed BFF request.
6. Roll back by redeploying the previously recorded Worker version for the same named environment. Never redirect staging bindings to production as a rollback shortcut.

No Cloudflare environment was deployed by V08-04. Local startup analysis passed.

## Dry-run evidence

On 2026-07-17, after explicit owner approval, both named environment commands passed:

- `npx wrangler deploy --env staging --dry-run`: PASS; 200 assets; self binding `highlightsignal-staging`; environment `staging`; API host `https://staging.invalid`; exited at the dry-run boundary.
- `npx wrangler deploy --env production --dry-run`: PASS; 200 assets; self binding `highlightsignal-production`; environment `production`; production API host selected; exited at the dry-run boundary.

The bundle size reported by each environment was 8057.28 KiB raw and 1649.63 KiB gzip. No route, Worker version, secret, or production service was changed.
