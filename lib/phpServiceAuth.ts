import "server-only";

type ServiceIdentity = {
  memberId: string | number;
  workspaceId: string | number;
};

function getServiceSecret() {
  const secret = process.env.PHP_SERVICE_AUTH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("PHP_SERVICE_AUTH_SECRET must contain at least 32 characters");
  }

  return secret;
}

function bytesToHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );
  return bytesToHex(digest);
}

export async function createPhpServiceHeaders(
  method: string,
  targetUrl: string,
  body: string,
  identity: ServiceIdentity
) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomUUID().replaceAll("-", "");
  const path = new URL(targetUrl).pathname;
  const normalizedMethod = method.toUpperCase();
  const memberId = String(identity.memberId);
  const workspaceId = String(identity.workspaceId);
  const bodyHash = await sha256(body);
  const canonical = [
    normalizedMethod,
    path,
    bodyHash,
    timestamp,
    nonce,
    memberId,
    workspaceId,
  ].join("\n");

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getServiceSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(canonical)
  );

  return {
    "Content-Type": "application/json",
    "X-HS-Timestamp": timestamp,
    "X-HS-Nonce": nonce,
    "X-HS-Member-Id": memberId,
    "X-HS-Workspace-Id": workspaceId,
    "X-HS-Signature": bytesToHex(signature),
  };
}
