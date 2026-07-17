import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { getGaReportList } from "@/lib/ga/gaApi";
import { resolveWorkspaceContext } from "@/lib/workspaceServer";

export async function GET(req: Request) {
  const token = (await cookies()).get("token")?.value;

  if (!token) {
    return Response.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const user = await verifyToken(token);

  if (!user) {
    return Response.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const workspace = await resolveWorkspaceContext(req, user);
    const data = await getGaReportList(workspace.legacyOwnerMemberId);
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
