import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import {
  getGAConnections,
  updateGAConnectionStatus,
} from "@/lib/ga/gaApi";
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
    const includeInactive =
      new URL(req.url).searchParams.get("include_inactive") === "1";
    const workspace = await resolveWorkspaceContext(req, user);
    const data = await getGAConnections(workspace.legacyOwnerMemberId, includeInactive);

    return Response.json({
      ok: true,
      data,
    });
  } catch (error: any) {
    return Response.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const token = (await cookies()).get("token")?.value;
  if (!token) {
    return Response.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const user = await verifyToken(token);
  if (!user) {
    return Response.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const connectionId = Number(body?.connection_id);
  const status = Number(body?.status);

  if (
    !Number.isInteger(connectionId) ||
    connectionId <= 0 ||
    (status !== 0 && status !== 1)
  ) {
    return Response.json(
      { ok: false, message: "Invalid connection settings" },
      { status: 400 }
    );
  }

  try {
    const workspace = await resolveWorkspaceContext(req, user);
    const data = await updateGAConnectionStatus(
      workspace.legacyOwnerMemberId,
      connectionId,
      status as 0 | 1
    );
    return Response.json({ ok: true, data });
  } catch (error: any) {
    return Response.json(
      { ok: false, message: error?.message || "Unable to update GA connection" },
      { status: 500 }
    );
  }
}
