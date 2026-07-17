import "server-only";

import { highlightPhpApiUrl } from "@/lib/config";
import { createPhpServiceHeaders } from "@/lib/phpServiceAuth";
type WorkspaceIdentity = { id: string | number };

export type WorkspaceServerContext = {
  workspaceId: number;
  memberId: number;
  legacyOwnerMemberId: number;
  role: string;
  source: "backend" | "legacy";
};

function requestedWorkspaceId(request: Request, session: WorkspaceIdentity) {
  const raw = request.headers.get("x-workspace-id");
  if (!raw) return Number(session.id);

  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error("INVALID_WORKSPACE");
  }
  return value;
}

export async function resolveWorkspaceContext(
  request: Request,
  session: WorkspaceIdentity
): Promise<WorkspaceServerContext> {
  const workspaceId = requestedWorkspaceId(request, session);
  const targetUrl = highlightPhpApiUrl("api/v1/context");

  try {
    const headers = await createPhpServiceHeaders("GET", targetUrl, "", {
      memberId: session.id,
      workspaceId,
    });
    const response = await fetch(targetUrl, { method: "GET", headers, cache: "no-store" });
    const payload = await response.json();

    if (!response.ok || !payload?.ok || !payload?.data) {
      throw new Error(response.status === 403 ? "WORKSPACE_FORBIDDEN" : "WORKSPACE_UNAVAILABLE");
    }

    return {
      workspaceId,
      memberId: Number(session.id),
      legacyOwnerMemberId: Number(payload.data.legacy_owner_member_id || payload.data.member_id),
      role: String(payload.data.role || "member"),
      source: "backend",
    };
  } catch (error) {
    // During the workspace migration, a stale selected workspace can fail the
    // backend context check even though the user's legacy member data is valid.
    // Fall back to the member's synthetic legacy workspace instead of surfacing
    // WORKSPACE_FORBIDDEN in legacy-backed product pages.
    if (
      workspaceId !== Number(session.id) &&
      !(error instanceof Error && error.message === "WORKSPACE_FORBIDDEN")
    ) {
      throw error;
    }

    return {
      workspaceId: Number(session.id),
      memberId: Number(session.id),
      legacyOwnerMemberId: Number(session.id),
      role: "owner",
      source: "legacy",
    };
  }
}
