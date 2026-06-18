import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { getJwtSecret } from "@/lib/jwtSecret";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  try {
    const key = getJwtSecret();
    await jwtVerify(token, key);
    return NextResponse.redirect(new URL("/dashboard", req.url));
  } catch {
    const response = NextResponse.redirect(new URL("/auth/login", req.url));
    response.cookies.delete("token");
    return response;
  }
}
