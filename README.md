# Highlight Signal

Highlight Signal is a Next.js app for GA analytics, Search Intelligence, and AI dashboard workflows. The frontend talks to the existing Highlight PHP APIs for authentication, GA data, SEO/SI summaries, and dashboard AI composition.

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Required Environment

Copy `.env.example` to `backend/private/frontend.env` for local development.
`npm run dev` loads that ignored file explicitly. Do not use Next.js `.env*`
files for secrets: OpenNext can collect them into the Worker bundle.

- `JWT_SECRET`: Required in production. Use a long random value.
- `NEXT_PUBLIC_BASE_URL`: Public frontend URL.
- `NEXT_PUBLIC_HIGHLIGHT_PHP_API_BASE_URL`: Base URL for PHP APIs, without a trailing slash.
- `NEXT_PUBLIC_HIGHLIGHT_UPGRADE_URL`: Official plan or checkout URL used by upgrade links.
- `API_DOMAIN`: Legacy auth API domain.

## Production Checklist

Before release:

- Run `npm run lint`.
- Run `npx tsc --noEmit --pretty false`.
- Run `npm run build`.
- Run `npm run build:cf` for the Cloudflare Worker bundle.
- Confirm production has `JWT_SECRET`.
- Confirm Cloudflare runtime secrets include `JWT_SECRET` and
  `PHP_SERVICE_AUTH_SECRET`; never provide either as `NEXT_PUBLIC_*` or as a
  build-time `.env.local` value.
- Confirm login sets the `token` cookie with `HttpOnly`, `Secure`, `SameSite=Lax`, and `Path=/`.
- Confirm `/api/auth/logout` clears the `token` cookie.
- Confirm protected routes redirect anonymous users to `/auth/login`.
- Confirm `enabledProducts` gates GA and Search Intelligence routes correctly.
- Confirm `NEXT_PUBLIC_HIGHLIGHT_UPGRADE_URL` points to the current official plan or payment page.

## Cloudflare Deployment

This application uses OpenNext and must be deployed as a Cloudflare Worker. Do not
deploy it as a Pages project and do not use the deprecated
`@cloudflare/next-on-pages` build command.

For a Cloudflare Workers Builds Git integration, use:

```text
Build command: npm run build:cf
Deploy command: npx wrangler deploy
```

The Worker entry point and static assets are configured in `wrangler.jsonc`.
For a local deployment from an authenticated workstation, run:

```bash
npm run deploy:cf
```

## PHP Backend

The version-controlled PHP source of truth is maintained in this repository:

```text
backend/api/   # deployable PHP application payload
backend/sql/   # reviewed MySQL schema and migration sources
```

The older working directory at
`D:\7.Highlight\1.Project\4.php\highlightsignal` is a legacy/deployment mirror. It
may be used to compare an existing host payload, but changes must be reconciled
back into `backend/` before they are considered part of a release.

Frontend API calls are routed through:

```text
NEXT_PUBLIC_HIGHLIGHT_PHP_API_BASE_URL=https://www.highlight.url.tw/highlightsignal/v2
```

Relevant PHP paths in this repository:

- `ga/*`
- `si/*`
- `dashboard/ai_plan.php`
- `dashboard/ai_compose.php`
- `dashboard/ai_usage.php`
- `sql/si/*`
- `sql/dashboard/dashboard_ai_logs.sql`

`dashboard/ai_usage.php` uses `dashboard_ai_logs` to enforce the daily Dashboard AI quota. The current frontend quota policy is:

- Free or unknown subscription: 3 asks per day
- Basic/member: 20 asks per day
- Pro: 100 asks per day
- Admin: 500 asks per day

Follow `backend/api/UPLOAD_README.md` to assemble a deployment payload. Runtime
`.env`, credential JSON, `vendor/`, generated storage, and server-only
`ga/report/config.php` are deliberately excluded from Git. Smoke test the PHP
endpoints in staging after deployment because this repository does not include
a local PHP runtime.

## Release Scope

Current release scope:

- Dashboard
- GA analytics
- Search Intelligence / SEO
- AEO / GEO MVP
- Product subscription status and upgrade entry points

Out of scope for this app:

- Billing checkout and payment management
- CRM
- Salesbot
- Full ADS implementation

## Product Planning

The accepted V1 boundary and phased roadmap are documented in
`docs/00_Technical_Specification_Alignment_v1.2.md` and
`docs/00_V07_TO_V12_PROGRESS_TRACKER.md`.
