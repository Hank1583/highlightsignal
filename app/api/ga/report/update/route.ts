export const runtime = "edge";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { updateGaReport } from "@/lib/ga/gaApi";

export async function POST(req: Request) {
  const token = (await cookies()).get("token")?.value;

  if (!token) {
    return Response.json(
      { ok: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  const user = await verifyToken(token);

  if (!user) {
    return Response.json(
      { ok: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const id = Number(body.id);

    if (!id) {
      return Response.json(
        { ok: false, message: "無效的報表 ID" },
        { status: 400 }
      );
    }

    const data = await updateGaReport(user.id, id, body);

    return Response.json({ ok: true, data });
  } catch (error: any) {
    console.error("update report error =", error);

    return Response.json(
      {
        ok: false,
        message: error?.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}