import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/serverSession";
import { resolveWorkspaceContext } from "@/lib/workspaceServer";
import { highlightPhpApiUrl } from "@/lib/config";

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.redirect(new URL("/auth/login", req.url));

  const workspaceId = req.nextUrl.searchParams.get("workspace_id") || session.id;
  const contextRequest = new Request(req.url, {
    headers: { "X-Workspace-Id": workspaceId },
  });

  try {
    const workspace = await resolveWorkspaceContext(contextRequest, session);
    return NextResponse.redirect(
      highlightPhpApiUrl(`ga/account_fetch.php?member_id=${workspace.legacyOwnerMemberId}`)
    );
  } catch {
    return NextResponse.json({ ok: false, message: "Workspace access denied" }, { status: 403 });
  }
}
