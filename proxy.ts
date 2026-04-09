import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const key = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret-change-me");

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

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  console.log("middleware pathname =", pathname);

  if (!isProtectedPath(pathname)) {
    console.log("not protected");
    return NextResponse.next();
  }

  const token = req.cookies.get("token")?.value;
  console.log("token exists =", !!token);

  if (!token) {
    console.log("no token, redirect login");
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  try {
    const { payload } = await jwtVerify(token, key);
    console.log("jwt ok payload =", payload);

    if (pathname === "/admin" || pathname.startsWith("/admin/")) {
      if (payload.role !== "admin") {
        console.log("not admin");
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    const requiredProduct = getRequiredProduct(pathname);

    if (requiredProduct) {
      const enabledProducts = Array.isArray(payload.enabledProducts)
        ? payload.enabledProducts
        : [];

      console.log("requiredProduct =", requiredProduct);
      console.log("enabledProducts =", enabledProducts);

      if (!enabledProducts.includes(requiredProduct)) {
        console.log("product not enabled");
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    return NextResponse.next();
  } catch (err) {
    console.log("jwt verify failed =", err);
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