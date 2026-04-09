import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode( process.env.JWT_SECRET || "dev-secret-change-me" );

const protectedPrefixes = [
  "/dashboard",
  "/ga",
  "/seo",
  "/member",
  "/admin",
];

const routePermissionMap: Record<string, string> = {
  "/ga": "ga",
  "/seo": "seo",
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

  const token = req.cookies.get("token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/auth/login/", req.url));
  }

  try {
    const { payload } = await jwtVerify(token, secret);

    // admin 獨立判斷
    if (pathname === "/admin" || pathname.startsWith("/admin/")) {
      if (payload.role !== "admin") {
        return NextResponse.redirect(new URL("/dashboard/", req.url));
      }
    }

    // 只有產品頁檢查產品權限，dashboard 不檢查
    const requiredProduct = getRequiredProduct(pathname);

    if (requiredProduct) {
      const enabledProducts = Array.isArray(payload.enabledProducts)
        ? payload.enabledProducts
        : [];

      if (!enabledProducts.includes(requiredProduct)) {
        return NextResponse.redirect(new URL("/dashboard/", req.url));
      }
    }

    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(new URL("/auth/login", req.url));
    response.cookies.delete("token");
    return response;
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/dashboard",
    "/ga/:path*",
    "/ga",
    "/seo/:path*",
    "/seo",
    "/member/:path*",
    "/member",
    "/admin/:path*",
    "/admin",
  ],
};