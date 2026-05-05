export const runtime = "edge";

import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { phpGetSiSummary } from "@/lib/si/siApi";

export async function POST(req: NextRequest) {
  try {
    const token = (await cookies()).get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);

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
          message: error instanceof Error ? error.message : "GEO summary failed",
        },
      },
      { status: 500 }
    );
  }
}
