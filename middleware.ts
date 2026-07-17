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

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const tokens = req.cookies.getAll("token").map((cookie) => cookie.value);

  if (tokens.length === 0) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  try {
    const key = getJwtSecret();
    const payload = await verifyAnyToken(tokens, key);

    if (!payload) {
      return clearTokenCookie(
        NextResponse.redirect(new URL("/auth/login", req.url))
      );
    }

    if (pathname === "/admin" || pathname.startsWith("/admin/")) {
      if (payload.role !== "admin") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    return NextResponse.next();
  } catch {
    return clearTokenCookie(
      NextResponse.redirect(new URL("/auth/login", req.url))
    );
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/dashboard",
    "/ga/:path*",
    "/ga",
    "/si/:path*",
    "/si",
    "/seo/:path*",
    "/seo",
    "/ads/:path*",
    "/ads",
    "/account/:path*",
    "/account",
    "/team/:path*",
    "/team",
    "/admin/:path*",
    "/admin",
  ],
};
