import "server-only";

import { createPhpServiceHeaders } from "@/lib/phpServiceAuth";

type SignedIdentity = {
  memberId: string | number;
  workspaceId?: string | number;
};

function serializedBody(body: BodyInit | null | undefined) {
  if (body == null) return "";
  if (typeof body !== "string") {
    throw new Error("Signed PHP requests require a pre-serialized string body");
  }
  return body;
}

export async function signedPhpFetch(
  targetUrl: string,
  init: RequestInit,
  identity: SignedIdentity
) {
  const method = (init.method || "GET").toUpperCase();
  const body = serializedBody(init.body);
  const signed = await createPhpServiceHeaders(method, targetUrl, body, {
    memberId: identity.memberId,
    workspaceId: identity.workspaceId ?? identity.memberId,
  });
  const headers = new Headers(init.headers);

  Object.entries(signed).forEach(([name, value]) => headers.set(name, value));

  return fetch(targetUrl, {
    ...init,
    method,
    body: body || undefined,
    headers,
  });
}
