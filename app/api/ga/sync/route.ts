import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/serverSession";
import { resolveWorkspaceContext } from "@/lib/workspaceServer";
import { highlightPhpApiUrl } from "@/lib/config";
import { signedPhpFetch } from "@/lib/signedPhpFetch";

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  if (session.isDemo) return NextResponse.json({ ok: false, message: "Demo is read-only" }, { status: 403 });

  const workspaceId = req.nextUrl.searchParams.get("workspace_id") || session.id;
  const start = req.nextUrl.searchParams.get("start") || "";
  const end = req.nextUrl.searchParams.get("end") || "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start > end) {
    return NextResponse.json({ ok: false, message: "Invalid date range" }, { status: 400 });
  }

  try {
    const contextRequest = new Request(req.url, { headers: { "X-Workspace-Id": workspaceId } });
    const workspace = await resolveWorkspaceContext(contextRequest, session);
    const params = new URLSearchParams({
      member_id: String(workspace.legacyOwnerMemberId),
      start,
      end,
    });
    const targetUrl = highlightPhpApiUrl(`ga/data_sync.php?${params.toString()}`);
    const response = await signedPhpFetch(
      targetUrl,
      { method: "GET", cache: "no-store" },
      { memberId: workspace.legacyOwnerMemberId, workspaceId: workspace.workspaceId }
    );

    return new NextResponse(response.body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") || "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Workspace access denied" }, { status: 403 });
  }
}
