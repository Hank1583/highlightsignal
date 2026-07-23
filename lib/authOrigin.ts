import "server-only";

/**
 * V12-01: CSRF/origin protection for the auth BFF routes (register/login).
 * These routes accept a same-site cookie-setting POST with no CSRF token
 * today -- a same-origin `Origin` check is the minimum real defense against
 * a cross-site page silently submitting a login/register form on a victim's
 * behalf. `sameSite: "lax"` on the session cookie already blocks the cookie
 * from being SENT cross-site on a simple form POST, but that protection
 * disappears entirely for a request that doesn't carry a cookie yet
 * (registration, or a fresh login) -- this check is the actual gate for
 * those cases.
 *
 * Deliberately permissive on a MISSING Origin header rather than rejecting
 * outright -- some legitimate same-origin requests (older browsers, certain
 * proxies) omit it; `Referer` is checked as a fallback. Only a header that
 * is PRESENT and does not match is rejected.
 */
export function isAllowedAuthOrigin(request: Request): boolean {
  const requestUrl = new URL(request.url);
  const allowedOrigin = requestUrl.origin;

  const origin = request.headers.get("origin");
  if (origin !== null) {
    return origin === allowedOrigin;
  }

  const referer = request.headers.get("referer");
  if (referer !== null) {
    try {
      return new URL(referer).origin === allowedOrigin;
    } catch {
      return false;
    }
  }

  // Neither header present -- allow (matches same-origin browser fetch
  // behavior in practice; a same-site direct navigation POST also lacks
  // both on some browser/privacy-setting combinations).
  return true;
}

export function originRejectedResponseBody(correlationId: string) {
  return {
    ok: false,
    error: {
      code: "ORIGIN_REJECTED",
      message: "Request origin is not allowed.",
      correlationId,
    },
  };
}
