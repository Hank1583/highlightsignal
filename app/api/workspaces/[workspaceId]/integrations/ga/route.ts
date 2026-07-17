import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { highlightPhpApiUrl } from "@/lib/config";
import { createPhpServiceHeaders } from "@/lib/phpServiceAuth";

type RouteContext = {
  params: Promise<{ workspaceId: string }>;
};

function validWorkspaceId(value: string) {
  return /^\d+$/.test(value) && Number(value) > 0;
}

async function currentUser() {
  const token = (await cookies()).get("token")?.value;
  return token ? verifyToken(token) : null;
}

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json(
    { ok: false, error: { code, message } },
    { status }
  );
}

async function forward(
  method: "GET" | "PATCH",
  targetUrl: string,
  body: string,
  memberId: number,
  workspaceId: string
) {
  const headers = await createPhpServiceHeaders(method, targetUrl, body, {
    memberId,
    workspaceId,
  });

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
      return errorResponse(
        "INVALID_PHP_RESPONSE",
        "Backend returned an invalid response",
        502
      );
    }
  } catch {
    return errorResponse(
      "PHP_BACKEND_UNAVAILABLE",
      "Backend service is unavailable",
      502
    );
  }
}

export async function GET(request: Request, context: RouteContext) {
  const user = await currentUser();
  if (!user) {
    return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
  }

  const { workspaceId } = await context.params;
  if (!validWorkspaceId(workspaceId)) {
    return errorResponse("INVALID_WORKSPACE", "Invalid workspace", 400);
  }

  const includeInactive =
    new URL(request.url).searchParams.get("include_inactive") === "1";
  const path = `api/v1/workspaces/${workspaceId}/integrations/ga${
    includeInactive ? "?include_inactive=1" : ""
  }`;

  return forward(
    "GET",
    highlightPhpApiUrl(path),
    "",
    user.id,
    workspaceId
  );
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await currentUser();
  if (!user) {
    return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
  }

  const { workspaceId } = await context.params;
  if (!validWorkspaceId(workspaceId)) {
    return errorResponse("INVALID_WORKSPACE", "Invalid workspace", 400);
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return errorResponse("INVALID_JSON", "Invalid JSON body", 400);
  }

  const payload = input as { connection_id?: unknown; status?: unknown };
  const connectionId = Number(payload.connection_id);
  const status = Number(payload.status);
  if (
    !Number.isInteger(connectionId) ||
    connectionId <= 0 ||
    (status !== 0 && status !== 1)
  ) {
    return errorResponse(
      "VALIDATION_ERROR",
      "Invalid GA connection settings",
      400
    );
  }

  const body = JSON.stringify({ connection_id: connectionId, status });
  const targetUrl = highlightPhpApiUrl(
    `api/v1/workspaces/${workspaceId}/integrations/ga`
  );

  return forward("PATCH", targetUrl, body, user.id, workspaceId);
}
