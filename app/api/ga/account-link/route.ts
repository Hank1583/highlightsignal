import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/serverSession";
import { resolveWorkspaceContext } from "@/lib/workspaceServer";
import { highlightPhpApiUrl } from "@/lib/config";
import { signedPhpFetch } from "@/lib/signedPhpFetch";

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.redirect(new URL("/auth/login", req.url));

  const workspaceId = req.nextUrl.searchParams.get("workspace_id") || session.id;
  const contextRequest = new Request(req.url, {
    headers: { "X-Workspace-Id": workspaceId },
  });

  try {
    const workspace = await resolveWorkspaceContext(contextRequest, session);
    const targetUrl = highlightPhpApiUrl(
      `ga/account_fetch.php?member_id=${workspace.legacyOwnerMemberId}`
    );
    const response = await signedPhpFetch(
      targetUrl,
      { method: "GET", redirect: "manual", cache: "no-store" },
      { memberId: workspace.legacyOwnerMemberId, workspaceId: workspace.workspaceId }
    );
    const location = response.headers.get("location");

    if (!location || response.status < 300 || response.status >= 400) {
      return NextResponse.json(
        { ok: false, message: "Unable to start Google authorization" },
        { status: 502 }
      );
    }

    return NextResponse.redirect(location);
  } catch {
    return NextResponse.json({ ok: false, message: "Workspace access denied" }, { status: 403 });
  }
}
