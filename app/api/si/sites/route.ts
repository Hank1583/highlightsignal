import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/serverSession";
import { phpListSiSites } from "@/lib/si/siApi";
import { hasSearchIntelligenceAccess } from "@/lib/subscription";
import { resolveWorkspaceContext } from "@/lib/workspaceServer";

export async function GET(req: Request) {
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
    const data = await phpListSiSites(workspace.legacyOwnerMemberId);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "SI sites failed",
        },
      },
      { status: 500 }
    );
  }
}
