export const runtime = "edge";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const token = (await cookies()).get("token")?.value;

  if (!token) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  const user = await verifyToken(token);

  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Invalid token" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    ok: true,
    data: user,
  });
}