export const runtime = "edge";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { createGaReport } from "@/lib/ga/gaApi";

export async function POST(req: Request) {
  const token = (await cookies()).get("token")?.value;

  if (!token) {
    return Response.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const user = await verifyToken(token);

  if (!user) {
    return Response.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    console.log("body =", body);

    const data = await createGaReport(user.id, body);
    console.log("createGaReport result =", data);

    return Response.json({ ok: true, data });
  } catch (error: any) {
    console.error("save report error =", error);

    return Response.json(
      {
        ok: false,
        message: error?.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}