import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { DEMO_READ_ONLY_MESSAGE, isDemoSession } from "@/lib/demo";
import { createGaReport } from "@/lib/ga/gaApi";
import { resolveWorkspaceContext } from "@/lib/workspaceServer";

export async function POST(req: Request) {
  const token = (await cookies()).get("token")?.value;

  if (!token) {
    return Response.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const user = await verifyToken(token);

  if (!user) {
    return Response.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  if (isDemoSession(user)) {
    return Response.json(
      { ok: false, message: DEMO_READ_ONLY_MESSAGE },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const workspace = await resolveWorkspaceContext(req, user);
    const data = await createGaReport(workspace.legacyOwnerMemberId, body);

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
