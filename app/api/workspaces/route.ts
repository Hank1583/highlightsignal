import { NextResponse } from "next/server";
import { highlightPhpApiUrl } from "@/lib/config";
import { createPhpServiceHeaders } from "@/lib/phpServiceAuth";
import { getServerSession } from "@/lib/serverSession";

export async function GET(request: Request) {
  const user = await getServerSession(request);

  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
      { status: 401 }
    );
  }

  const targetUrl = highlightPhpApiUrl("api/v1/workspaces");
  const headers = await createPhpServiceHeaders("GET", targetUrl, "", {
    memberId: user.id,
    workspaceId: 0,
  });

  try {
    const response = await fetch(targetUrl, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    const text = await response.text();

    try {
      return NextResponse.json(JSON.parse(text), { status: response.status });
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "INVALID_PHP_RESPONSE",
            message: "Backend returned an invalid response",
          },
        },
        { status: 502 }
      );
    }
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
