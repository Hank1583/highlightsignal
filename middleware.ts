import { NextRequest, NextResponse } from "next/server";
import { getJwtSecret } from "@/lib/jwtSecret";
import { clearTokenCookie, verifyAnyToken } from "@/lib/sessionToken";

const protectedPrefixes = [
  "/dashboard",
  "/ga",
  "/si",
  "/seo",
  "/ads",
  "/account",
  "/team",
  "/admin",
];

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

// Third-party script hosts that need to load/execute under our CSP:
// Google tag (gtag.js/GA4) and Cloudflare's Web Analytics/RUM beacon
// (the latter is injected by the Cloudflare edge itself, so it can't
// carry our nonce -- it must be host-allowlisted instead).
const CSP_SCRIPT_HOSTS =
  "https://www.googletagmanager.com https://static.cloudflareinsights.com";
const CSP_CONNECT_HOSTS =
  "https://www.google-analytics.com https://analytics.google.com https://static.cloudflareinsights.com https://cloudflareinsights.com";

function buildCsp(nonce: string) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' ${CSP_SCRIPT_HOSTS}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    `connect-src 'self' ${CSP_CONNECT_HOSTS}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

function withCsp<T extends Response>(res: T, nonce: string): T {
  res.headers.set("Content-Security-Policy", buildCsp(nonce));
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const nonce = crypto.randomUUID().replace(/-/g, "");

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  const nextOptions = { request: { headers: requestHeaders } };

  if (!isProtectedPath(pathname)) {
    return withCsp(NextResponse.next(nextOptions), nonce);
  }

  const tokens = req.cookies.getAll("token").map((cookie) => cookie.value);

  if (tokens.length === 0) {
    return withCsp(NextResponse.redirect(new URL("/auth/login", req.url)), nonce);
  }

  try {
    const key = getJwtSecret();
    const payload = await verifyAnyToken(tokens, key);

    if (!payload) {
      return withCsp(
        clearTokenCookie(NextResponse.redirect(new URL("/auth/login", req.url))),
        nonce
      );
    }

    if (pathname === "/admin" || pathname.startsWith("/admin/")) {
      if (payload.role !== "admin") {
        return withCsp(NextResponse.redirect(new URL("/dashboard", req.url)), nonce);
      }
    }

    return withCsp(NextResponse.next(nextOptions), nonce);
  } catch {
    return withCsp(
      clearTokenCookie(NextResponse.redirect(new URL("/auth/login", req.url))),
      nonce
    );
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
