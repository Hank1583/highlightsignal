import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/serverSession";
import { phpGetSiSummary } from "@/lib/si/siApi";
import { hasSearchIntelligenceAccess } from "@/lib/subscription";
import { resolveWorkspaceContext } from "@/lib/workspaceServer";

export async function POST(req: NextRequest) {
  try {
    const user = await getServerSession(req);

    if (!user?.id) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    if (!hasSearchIntelligenceAccess(user)) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "FORBIDDEN",
            message: "Search Intelligence is not enabled for this account.",
          },
        },
        { status: 403 }
      );
    }

    const workspace = await resolveWorkspaceContext(req, user);
    const body = await req.json();
    const siteId = Number(body.site_id);
    const tab = typeof body.tab === "string" ? body.tab : "overview";

    if (!siteId) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "MISSING_PARAMS",
            message: "site_id is required",
          },
        },
        { status: 400 }
      );
    }

    const data = await phpGetSiSummary({
      module: "geo",
      userId: workspace.legacyOwnerMemberId,
      siteId,
      tab,
    });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "GEO summary failed",
        },
      },
      { status: 500 }
    );
  }
}
