import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/serverSession";
import { phpGetSiSummary } from "@/lib/si/siApi";
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

    // V09-04's legacy_auth.php resolves the Workspace scope server-side from
    // the verified member id (never a client-supplied header) -- see
    // hs_resolve_member_workspace_id()'s doc comment. resolveWorkspaceContext()
    // was only ever used here to derive legacyOwnerMemberId, which equals
    // user.id for every member today (one owned Workspace each, V09-02
    // postflight); calling it added an unrelated v1 membership gate that could
    // reject this legacy-only feature for reasons that have nothing to do with
    // SI access (already checked above via hasSearchIntelligenceAccess).
    const data = await phpGetSiSummary({
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
          message: error instanceof Error ? error.message : "AEO summary failed",
        },
      },
      { status: 500 }
    );
  }
}
