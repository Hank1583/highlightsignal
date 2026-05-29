# Highlight Signal

Highlight Signal is a Next.js app for GA analytics, Search Intelligence, and AI dashboard workflows. The frontend talks to the existing Highlight PHP APIs for authentication, GA data, SEO/SI summaries, and dashboard AI composition.

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Required Environment

Copy `.env.example` to `.env.local` for local development.

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
- Confirm production has `JWT_SECRET`.
- Confirm login sets the `token` cookie with `HttpOnly`, `Secure`, `SameSite=Lax`, and `Path=/`.
- Confirm `/api/auth/logout` clears the `token` cookie.
- Confirm protected routes redirect anonymous users to `/auth/login`.
- Confirm `enabledProducts` gates GA and Search Intelligence routes correctly.
- Confirm `NEXT_PUBLIC_HIGHLIGHT_UPGRADE_URL` points to the current official plan or payment page.

## PHP Backend

The PHP source of truth is maintained outside this Next.js app:

```text
D:\7.Highlight\1.Project\4.php\highlightsignal
```

This web repository should not keep a duplicate `backend/` folder. Frontend API calls are routed through:

```text
NEXT_PUBLIC_HIGHLIGHT_PHP_API_BASE_URL=https://www.highlight.url.tw/highlightsignal
```

Relevant PHP paths in the PHP project:

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

Smoke test the PHP endpoints after deployment because this repository does not include a local PHP runtime.

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
