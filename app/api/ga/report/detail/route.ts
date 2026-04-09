export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getGaReportDetail } from "@/lib/ga/gaApi";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = Number(body.id);

    const token = (await cookies()).get("token")?.value;
    
      if (!token) {
        return Response.json({ ok: false, message: "Unauthorized" }, { status: 401 });
      }
    
    const user = await verifyToken(token);
    
      if (!user) {
        return Response.json({ ok: false, message: "Unauthorized" }, { status: 401 });
      }

    if (!id) {
      return NextResponse.json(
        { success: false, message: "id 錯誤" },
        { status: 400 }
      );
    }

    const result = await getGaReportDetail(user.id, id);

    return NextResponse.json(result);
  } catch (error) {
    console.error("ga report detail route error:", error);
    return NextResponse.json(
      { success: false, message: "伺服器錯誤" },
      { status: 500 }
    );
  }
}