export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { phpGetSeoSummary } from "@/lib/seo/seoApi";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const userId = Number(body.user_id);
    const siteId = Number(body.site_id);

    if (!userId || !siteId) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "MISSING_PARAMS",
            message: "缺少 user_id 或 site_id",
          },
        },
        { status: 400 }
      );
    }

    const data = await phpGetSeoSummary(userId, siteId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("POST /api/seo/summary error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message:
            error instanceof Error ? error.message : "取得 SEO Summary 失敗",
        },
      },
      { status: 500 }
    );
  }
}