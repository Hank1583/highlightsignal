export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { DEMO_READ_ONLY_MESSAGE, isDemoSession } from "@/lib/demo";
import { getServerSession } from "@/lib/serverSession";
import { phpGetSeoSummary } from "@/lib/seo/seoApi";

function hasSiAccess(enabledProducts: string[]) {
  return enabledProducts.includes("si") || enabledProducts.includes("seo");
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.id) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    if (!hasSiAccess(session.enabledProducts)) {
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
    const force = Boolean(body.force);

    if (force && isDemoSession(session)) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: "DEMO_READ_ONLY", message: DEMO_READ_ONLY_MESSAGE },
        },
        { status: 403 }
      );
    }

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

    const data = await phpGetSeoSummary(Number(session.id), siteId, { force });
    return NextResponse.json(data);
  } catch (error) {
    console.error("POST /api/seo/summary error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to load SEO summary",
        },
      },
      { status: 500 }
    );
  }
}
