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
      // TEMP-DIAG: surface the PHP backend's real error.message instead of
      // only a generic label, to diagnose live WORKSPACE_FORBIDDEN reports.
      // Revert to the plain label once diagnosis is done.
      const detail = payload?.error?.message ? `: ${payload.error.message}` : "";
      throw new Error((response.status === 403 ? "WORKSPACE_FORBIDDEN" : "WORKSPACE_UNAVAILABLE") + detail);
    }

    return {
      workspaceId,
      memberId: Number(session.id),
      legacyOwnerMemberId: Number(payload.data.legacy_owner_member_id || payload.data.member_id),
      role: String(payload.data.role || "member"),
      source: "backend",
    };
  } catch (error) {
    // WORKSPACE_FORBIDDEN is an authoritative authorization decision from the
    // backend (suspended membership, or a workspace the member explicitly
    // requested but doesn't belong to) -- V09-02/05 require that a legacy
    // fallback never bypass a membership check, so this is never swallowed.
    if (error instanceof Error && error.message.startsWith("WORKSPACE_FORBIDDEN")) {
      throw error;
    }

    // Otherwise this is a genuine backend-unavailable condition (network/DB
    // outage, malformed response), and only when no explicit alternate
    // workspace was requested: degrade to the member's own legacy context so
    // legacy per-member pages don't hard-fail during an outage. This still
    // can't bypass authorization -- legacyOwnerMemberId is always the caller's
    // own member id, and the legacy PHP endpoints that consume it independently
    // re-resolve and gate on workspace membership/status server-side
    // (V09-04/V09-05), so a fabricated context here has nothing to bypass.
    if (workspaceId === Number(session.id)) {
      return {
        workspaceId: Number(session.id),
        memberId: Number(session.id),
        legacyOwnerMemberId: Number(session.id),
        role: "owner",
        source: "legacy",
      };
    }

    throw error;
  }
}
