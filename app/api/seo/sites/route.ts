export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { phpAddSeoSite, phpListSeoSites } from "@/lib/seo/seoApi";

export async function GET(req: NextRequest) {
  try {
    const userId = Number(req.headers.get("x-user-id"));

    if (!userId) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "MISSING_USER_ID",
            message: "缺少 x-user-id",
          },
        },
        { status: 400 }
      );
    }

    const data = await phpListSeoSites(userId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/seo/sites error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message:
            error instanceof Error ? error.message : "取得站點列表失敗",
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await phpAddSeoSite(body);

    return NextResponse.json(data);
  } catch (error) {
    console.error("POST /api/seo/sites error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "新增站點失敗",
        },
      },
      { status: 500 }
    );
  }
}