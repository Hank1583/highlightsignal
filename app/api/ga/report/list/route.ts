export const runtime = "edge";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { getGaReportList } from "@/lib/ga/gaApi";

export async function GET() {
  const token = (await cookies()).get("token")?.value;

  if (!token) {
    return Response.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const user = await verifyToken(token);

  if (!user) {
    return Response.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await getGaReportList(user.id);
    return Response.json({ ok: true, data });
  } catch (error: any) {
    return Response.json(
      {
        ok: false,
        message: error?.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}