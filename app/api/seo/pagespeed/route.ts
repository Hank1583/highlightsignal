import { NextRequest, NextResponse } from "next/server";
import { highlightPhpApiUrl } from "@/lib/config";
import { DEMO_READ_ONLY_MESSAGE, isDemoSession } from "@/lib/demo";
import { hasProductAccess } from "@/lib/products";
import { getServerSession } from "@/lib/serverSession";

type Strategy = "mobile" | "desktop";

async function parsePhpJson(res: Response) {
  const text = await res.text();

  if (!text) {
    throw new Error(`PHP API returned empty response. status=${res.status}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`PHP API did not return JSON. body=${text}`);
  }
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

    if (!hasProductAccess(session.enabledProducts, "si")) {
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
    const siteId = Number(body?.site_id || 0);
    const strategy: Strategy = body?.strategy === "desktop" ? "desktop" : "mobile";
    const action = body?.cacheOnly ? "latest" : "run";

    if (action === "run" && isDemoSession(session)) {
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
          error: { code: "MISSING_SITE_ID", message: "site_id is required." },
        },
        { status: 400 }
      );
    }

    const phpRes = await fetch(highlightPhpApiUrl("si/seo/pagespeed.php"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action,
        user_id: Number(session.id),
        site_id: siteId,
        strategy,
        url: body?.url,
      }),
    });

    const json = await parsePhpJson(phpRes);

    if (
      !json?.ok &&
      String(json?.error?.message || json?.message || "").includes(
        "Unsupported action"
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "PHP_PAGESPEED_OUTDATED",
            message:
              "PHP 端的 si/seo/pagespeed.php 尚未更新到支援重新跑分，請先同步最新版 PHP 檔案。",
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json(json, { status: phpRes.status });
  } catch (error) {
    console.error("POST /api/seo/pagespeed error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to load PageSpeed data.",
        },
      },
      { status: 500 }
    );
  }
}
