import { describe, expect, it, beforeAll } from "vitest";
import { createPhpServiceHeaders } from "@/lib/phpServiceAuth";
import { createHash, createHmac } from "node:crypto";

/**
 * V12-02: this task's own required "signature" scenario for the Next.js
 * side of the BFF -> PHP trust boundary. `createPhpServiceHeaders()` MUST
 * produce a canonical string and HMAC that PHP's
 * `ServiceRequestAuthenticator::authenticate()` (backend/api/src/Auth/ServiceRequestAuthenticator.php)
 * can independently re-derive and verify -- this test re-implements that
 * SAME canonical-string algorithm in plain Node crypto (not calling PHP) to
 * prove the two sides agree on the wire format, the actual cross-language
 * contract this class exists to satisfy.
 */
describe("createPhpServiceHeaders", () => {
  const SECRET = "test-only-32-char-minimum-secret-value-not-real";

  beforeAll(() => {
    process.env.PHP_SERVICE_AUTH_SECRET = SECRET;
  });

  it("throws if the secret is missing or too short", async () => {
    const original = process.env.PHP_SERVICE_AUTH_SECRET;
    process.env.PHP_SERVICE_AUTH_SECRET = "too-short";
    await expect(createPhpServiceHeaders("GET", "https://api.example.com/api/v1/workspaces", "", { memberId: 1, workspaceId: 1 })).rejects.toThrow();
    process.env.PHP_SERVICE_AUTH_SECRET = original;
  });

  it("produces a signature independently verifiable via PHP's own canonical-string algorithm", async () => {
    const targetUrl = "https://api.example.com/api/v1/workspaces";
    const headers = await createPhpServiceHeaders("GET", targetUrl, "", { memberId: 42, workspaceId: 7 });

    // Re-derive the canonical string exactly the way
    // ServiceRequestAuthenticator::authenticate() does server-side, using
    // plain Node crypto instead of the browser SubtleCrypto API
    // lib/phpServiceAuth.ts itself uses -- an independent re-implementation,
    // not a call into the same code being tested.
    const sha256Hex = (value: string) => createHash("sha256").update(value).digest("hex");

    const canonical = [
      "GET",
      "/api/v1/workspaces",
      sha256Hex(""),
      headers["X-HS-Timestamp"],
      headers["X-HS-Nonce"],
      "42",
      "7",
    ].join("\n");

    const expectedSignature = createHmac("sha256", SECRET).update(canonical).digest("hex");
    expect(headers["X-HS-Signature"]).toBe(expectedSignature);
  });

  it("produces a different signature for a different member id (no cross-member replay)", async () => {
    const targetUrl = "https://api.example.com/api/v1/workspaces";
    const headersA = await createPhpServiceHeaders("GET", targetUrl, "", { memberId: 1, workspaceId: 1 });
    const headersB = await createPhpServiceHeaders("GET", targetUrl, "", { memberId: 2, workspaceId: 1 });
    expect(headersA["X-HS-Signature"]).not.toBe(headersB["X-HS-Signature"]);
  });

  it("produces a different signature for a different path (a signature for one endpoint never validates another)", async () => {
    const headersA = await createPhpServiceHeaders("GET", "https://api.example.com/api/v1/workspaces", "", { memberId: 1, workspaceId: 1 });
    const headersB = await createPhpServiceHeaders("GET", "https://api.example.com/api/v1/signals", "", { memberId: 1, workspaceId: 1 });
    expect(headersA["X-HS-Signature"]).not.toBe(headersB["X-HS-Signature"]);
  });

  it("produces a fresh nonce on every call (never reused)", async () => {
    const targetUrl = "https://api.example.com/api/v1/workspaces";
    const headersA = await createPhpServiceHeaders("GET", targetUrl, "", { memberId: 1, workspaceId: 1 });
    const headersB = await createPhpServiceHeaders("GET", targetUrl, "", { memberId: 1, workspaceId: 1 });
    expect(headersA["X-HS-Nonce"]).not.toBe(headersB["X-HS-Nonce"]);
  });
});
