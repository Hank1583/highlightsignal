import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { highlightPhpApiUrl } from "@/lib/config";
import { createPhpServiceHeaders } from "@/lib/phpServiceAuth";

type RouteContext = {
  params: Promise<{ workspaceId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const token = (await cookies()).get("token")?.value;
  const user = token ? await verifyToken(token) : null;

  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
      { status: 401 }
    );
  }

  const { workspaceId } = await context.params;
  if (!/^\d+$/.test(workspaceId) || Number(workspaceId) <= 0) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "INVALID_WORKSPACE", message: "Invalid workspace" },
      },
      { status: 400 }
    );
  }

  const targetUrl = highlightPhpApiUrl("api/v1/context");
  const headers = await createPhpServiceHeaders("GET", targetUrl, "", {
    memberId: user.id,
    workspaceId,
  });

  try {
    const response = await fetch(targetUrl, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    const payload = await response.json();

    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "PHP_BACKEND_UNAVAILABLE",
          message: "Backend service is unavailable",
        },
      },
      { status: 502 }
    );
  }
}
