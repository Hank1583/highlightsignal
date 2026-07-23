import { NextRequest, NextResponse } from "next/server";
import { DEMO_READ_ONLY_MESSAGE, isDemoSession } from "@/lib/demo";
import { getServerSession } from "@/lib/serverSession";
import { phpGenerateSiSummary } from "@/lib/si/siApi";
import { hasSearchIntelligenceAccess } from "@/lib/subscription";

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

    if (isDemoSession(user)) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: "DEMO_READ_ONLY", message: DEMO_READ_ONLY_MESSAGE },
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const siteId = Number(body.site_id);
    const tab = typeof body.tab === "string" ? body.tab : "overview";

    if (!siteId) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: "MISSING_PARAMS", message: "site_id is required" },
        },
        { status: 400 }
      );
    }

    // See aeo/summary/route.ts for why this no longer calls
    // resolveWorkspaceContext().
    const data = await phpGenerateSiSummary({
      module: "aeo",
      userId: Number(user.id),
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
          message: error instanceof Error ? error.message : "AEO generate failed",
        },
      },
      { status: 500 }
    );
  }
}
