import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { phpGetSiHistory } from "@/lib/si/siApi";

export async function POST(req: NextRequest) {
  try {
    const token = (await cookies()).get("token")?.value;
    const user = token ? await verifyToken(token) : null;

    if (!user?.id) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
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

    const data = await phpGetSiHistory({
      module: "geo",
      userId: Number(user.id),
      siteId,
      tab,
      limit: 10,
    });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "GEO history failed",
        },
      },
      { status: 500 }
    );
  }
}
