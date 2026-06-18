import { NextRequest, NextResponse } from "next/server";
import { DEMO_READ_ONLY_MESSAGE, isDemoSession } from "@/lib/demo";
import { getServerSession } from "@/lib/serverSession";
import { phpAddSeoSite, phpListSeoSites } from "@/lib/seo/seoApi";

function hasSiAccess(enabledProducts: string[]) {
  return enabledProducts.includes("si") || enabledProducts.includes("seo");
}

async function requireSeoSession() {
  const session = await getServerSession();

  if (!session?.id) {
    return {
      session: null,
      response: NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      ),
    };
  }

  if (!hasSiAccess(session.enabledProducts)) {
    return {
      session: null,
      response: NextResponse.json(
        {
          ok: false,
          error: {
            code: "FORBIDDEN",
            message: "Search Intelligence is not enabled for this account.",
          },
        },
        { status: 403 }
      ),
    };
  }

  return { session, response: null };
}

export async function GET() {
  try {
    const { session, response } = await requireSeoSession();

    if (response) return response;

    const data = await phpListSeoSites(Number(session.id));
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/seo/sites error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to list SEO sites",
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, response } = await requireSeoSession();

    if (response) return response;

    if (isDemoSession(session)) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: "DEMO_READ_ONLY", message: DEMO_READ_ONLY_MESSAGE },
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const data = await phpAddSeoSite({
      ...body,
      user_id: Number(session.id),
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("POST /api/seo/sites error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to add SEO site",
        },
      },
      { status: 500 }
    );
  }
}
