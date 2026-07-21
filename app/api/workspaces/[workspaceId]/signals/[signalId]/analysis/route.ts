import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/serverSession";
import { highlightPhpApiUrl } from "@/lib/config";
import { createPhpServiceHeaders } from "@/lib/phpServiceAuth";

type RouteContext = { params: Promise<{ workspaceId: string; signalId: string }> };

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

function validId(value: string) {
  return /^\d+$/.test(value) && Number(value) > 0;
}

// V10-03: read-or-generate, no PATCH -- Explanation/Business Impact are only
// ever produced by system generation (see backend ExplanationService), never
// a human mutation.
export async function GET(request: Request, context: RouteContext) {
  const session = await getServerSession(request);
  if (!session) return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
  const { workspaceId, signalId } = await context.params;
  if (!validId(workspaceId) || !validId(signalId)) {
    return errorResponse("INVALID_REQUEST", "Invalid workspace or signal id", 400);
  }

  const targetUrl = highlightPhpApiUrl(`api/v1/workspaces/${workspaceId}/signals/${signalId}/analysis`);
  const headers = await createPhpServiceHeaders("GET", targetUrl, "", { memberId: session.id, workspaceId });

  try {
    const response = await fetch(targetUrl, { method: "GET", headers, cache: "no-store" });
    const text = await response.text();
    try {
      return NextResponse.json(JSON.parse(text), { status: response.status });
    } catch {
      return errorResponse("INVALID_PHP_RESPONSE", "Backend returned an invalid response", 502);
    }
  } catch {
    return errorResponse("PHP_BACKEND_UNAVAILABLE", "Backend service is unavailable", 502);
  }
}
