import "server-only";
import { highlightPhpApiUrl } from "@/lib/config";
import { createPhpServiceHeaders } from "@/lib/phpServiceAuth";

/**
 * V12-01: extracted from `app/api/workspaces/route.ts`'s `POST` handler so
 * the new registration BFF (`app/api/auth/register/route.ts`) can trigger
 * provisioning directly, server-side, as part of the same request --
 * instead of the Browser having to make a SEPARATE round trip after
 * register+login complete (which is what `WorkspaceProvider`'s reactive
 * "list empty -> POST provision -> re-list" fallback still does, and
 * continues to do as a safety net if this proactive call is ever skipped
 * or fails). Same underlying PHP call either way --
 * `WorkspaceProvisioningService::provisionDefaultForNewMember()`, already
 * transactional and idempotent (a repeat call throws
 * `WORKSPACE_ALREADY_PROVISIONED`, handled below as a non-fatal outcome).
 */
export type ProvisionWorkspaceResult =
  | { ok: true; alreadyProvisioned: false }
  | { ok: true; alreadyProvisioned: true }
  | { ok: false; message: string };

export async function provisionDefaultWorkspace(memberId: string): Promise<ProvisionWorkspaceResult> {
  const targetUrl = highlightPhpApiUrl("api/v1/workspaces");
  const headers = await createPhpServiceHeaders("POST", targetUrl, "", {
    memberId,
    workspaceId: 0,
  });

  let response: Response;
  try {
    response = await fetch(targetUrl, { method: "POST", headers, cache: "no-store" });
  } catch {
    return { ok: false, message: "Workspace provisioning service is unavailable." };
  }

  const text = await response.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, message: "Workspace provisioning returned an invalid response." };
  }

  if (response.status === 409 || (data.error as { code?: string } | undefined)?.code === "WORKSPACE_ALREADY_PROVISIONED") {
    return { ok: true, alreadyProvisioned: true };
  }

  if (!response.ok || data.ok === false) {
    const message =
      (data.error as { message?: string } | undefined)?.message || "Workspace provisioning failed.";
    return { ok: false, message };
  }

  return { ok: true, alreadyProvisioned: false };
}
