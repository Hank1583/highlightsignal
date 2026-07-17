import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/serverSession";
import { isDemoSession } from "@/lib/demo";
import { highlightPhpApiUrl } from "@/lib/config";
import { createPhpServiceHeaders } from "@/lib/phpServiceAuth";

type RouteContext = { params: Promise<{ workspaceId: string }> };

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

function validWorkspaceId(value: string) {
  return /^\d+$/.test(value) && Number(value) > 0;
}

async function forward(method: "GET" | "PATCH", targetUrl: string, body: string, memberId: string, workspaceId: string) {
  const headers = await createPhpServiceHeaders(method, targetUrl, body, { memberId, workspaceId });
  try {
    const response = await fetch(targetUrl, {
      method,
      headers,
      body: method === "PATCH" ? body : undefined,
      cache: "no-store",
    });
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

export async function GET(request: Request, context: RouteContext) {
  const session = await getServerSession(request);
  if (!session) return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
  const { workspaceId } = await context.params;
  if (!validWorkspaceId(workspaceId)) return errorResponse("INVALID_WORKSPACE", "Invalid workspace", 400);

  const contextKey = new URL(request.url).searchParams.get("context_key") || "";
  if (!/^[a-zA-Z0-9:_-]{1,191}$/.test(contextKey)) {
    return errorResponse("VALIDATION_ERROR", "Invalid workflow context", 400);
  }
  const targetUrl = highlightPhpApiUrl(
    `api/v1/workspaces/${workspaceId}/dashboard/workflow?context_key=${encodeURIComponent(contextKey)}`
  );
  return forward("GET", targetUrl, "", session.id, workspaceId);
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getServerSession(request);
  if (!session) return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
  if (isDemoSession(session)) return errorResponse("DEMO_READ_ONLY", "Demo account is read-only", 403);
  const { workspaceId } = await context.params;
  if (!validWorkspaceId(workspaceId)) return errorResponse("INVALID_WORKSPACE", "Invalid workspace", 400);

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return errorResponse("INVALID_JSON", "Invalid JSON body", 400);
  }
  const body = JSON.stringify(input);
  const targetUrl = highlightPhpApiUrl(`api/v1/workspaces/${workspaceId}/dashboard/workflow`);
  return forward("PATCH", targetUrl, body, session.id, workspaceId);
}
