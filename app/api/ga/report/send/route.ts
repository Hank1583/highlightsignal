import { NextRequest, NextResponse } from "next/server";
import { highlightPhpApiUrl } from "@/lib/config";
import { isDemoSession } from "@/lib/demo";
import { getServerSession } from "@/lib/serverSession";
import { signedPhpFetch } from "@/lib/signedPhpFetch";
import { resolveWorkspaceContext } from "@/lib/workspaceServer";

export async function GET(req: NextRequest) {
  const session = await getServerSession(req);
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }
  if (isDemoSession(session)) {
    return NextResponse.json({ ok: false, message: "Demo is read-only" }, { status: 403 });
  }

  const id = req.nextUrl.searchParams.get("id") || "";
  const start = req.nextUrl.searchParams.get("start") || "";
  const end = req.nextUrl.searchParams.get("end") || "";
  const type = req.nextUrl.searchParams.get("type") || "";

  if (!/^\d+$/.test(id) || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    return NextResponse.json({ ok: false, message: "Invalid report request" }, { status: 400 });
  }
  if (type !== "weekly" && type !== "monthly" && type !== "custom") {
    return NextResponse.json({ ok: false, message: "Invalid report type" }, { status: 400 });
  }

  const workspace = await resolveWorkspaceContext(req, session);
  const params = new URLSearchParams({ id, start, end, type });
  const targetUrl = highlightPhpApiUrl(`ga/report/report_mailer.php?${params.toString()}`);
  const response = await signedPhpFetch(
    targetUrl,
    { method: "GET", cache: "no-store" },
    { memberId: workspace.legacyOwnerMemberId, workspaceId: workspace.workspaceId }
  );
  const text = await response.text();

  try {
    return NextResponse.json(JSON.parse(text), { status: response.status });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Report backend returned an invalid response" },
      { status: 502 }
    );
  }
}
