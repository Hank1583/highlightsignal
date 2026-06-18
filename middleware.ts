import { NextRequest, NextResponse } from "next/server";
import { getJwtSecret } from "@/lib/jwtSecret";
import { hasProductAccess } from "@/lib/products";
import { clearTokenCookie, verifyAnyToken } from "@/lib/sessionToken";

const key = getJwtSecret();

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

const routePermissionMap: Record<string, string> = {
  "/ga": "ga",
  "/si": "si",
  "/seo": "si",
  "/ads": "ads",
};

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function getRequiredProduct(pathname: string) {
  const matched = Object.keys(routePermissionMap)
    .sort((a, b) => b.length - a.length)
    .find((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  return matched ? routePermissionMap[matched] : null;
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

    const requiredProduct = getRequiredProduct(pathname);

    if (requiredProduct) {
      if (!hasProductAccess(payload.enabledProducts, requiredProduct as "ga" | "si" | "ads")) {
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
