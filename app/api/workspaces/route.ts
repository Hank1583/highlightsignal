import { NextResponse } from "next/server";
import { highlightPhpApiUrl } from "@/lib/config";
import { createPhpServiceHeaders } from "@/lib/phpServiceAuth";
import { getServerSession } from "@/lib/serverSession";
import { DEMO_READ_ONLY_MESSAGE, isDemoSession } from "@/lib/demo";
import { provisionDefaultWorkspace } from "@/lib/workspaceProvisioning";

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

/**
 * Explicit provisioning trigger for V09-02 known gap #2: a brand-new member has
 * no Workspace until something calls this. WorkspaceProvider calls it the first
 * time GET returns an empty list, instead of relying on the removed lazy-GET
 * side effect.
 */
export async function POST(request: Request) {
  const user = await getServerSession(request);

  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
      { status: 401 }
    );
  }

  if (isDemoSession(user)) {
    return NextResponse.json(
      { ok: false, error: { code: "DEMO_READ_ONLY", message: DEMO_READ_ONLY_MESSAGE } },
      { status: 403 }
    );
  }

  // V12-01: shared with the registration BFF
  // (`app/api/auth/register/route.ts`), which calls the same underlying
  // PHP provisioning proactively right after auto-login, rather than
  // waiting for this route to be hit reactively.
  const result = await provisionDefaultWorkspace(user.id);

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: { code: "PHP_BACKEND_UNAVAILABLE", message: result.message } },
      { status: 502 }
    );
  }

  if (result.alreadyProvisioned) {
    return NextResponse.json(
      { ok: false, error: { code: "WORKSPACE_ALREADY_PROVISIONED", message: "Workspace already provisioned." } },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true });
}
