import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const key = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-me"
);

export async function GET(req: NextRequest) {
  const token = req.cookies.get("token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  try {
    await jwtVerify(token, key);
    return NextResponse.redirect(new URL("/dashboard", req.url));
  } catch {
    const response = NextResponse.redirect(new URL("/auth/login", req.url));
    response.cookies.delete("token");
    return response;
  }
}
