import { describe, expect, it, beforeAll } from "vitest";
import { signSessionToken } from "@/lib/authSession";
import { verifyAnyToken } from "@/lib/sessionToken";
import { getJwtSecret } from "@/lib/jwtSecret";
import { SignJWT } from "jose";

/**
 * V12-02: this task's own required "JWT" scenario -- sign/verify round
 * trip, tamper rejection, and expiry, for the platform session token every
 * protected page/API route depends on (`middleware.ts`, `getServerSession()`).
 */
describe("session JWT sign/verify", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = "test-only-jwt-secret-at-least-32-characters-long";
  });

  const basePayload = {
    id: "123",
    email: "test@example.com",
    name: "Test User",
    role: "member",
    enabledProducts: ["dashboard"] as const,
    subscribedApps: [],
  };

  it("a freshly signed token verifies successfully", async () => {
    const token = await signSessionToken(basePayload as any);
    const payload = await verifyAnyToken([token], getJwtSecret());
    expect(payload).not.toBeNull();
    expect(payload?.email).toBe("test@example.com");
  });

  it("a tampered token (payload altered after signing) is rejected", async () => {
    const token = await signSessionToken(basePayload as any);
    const parts = token.split(".");
    // Flip one character in the payload segment -- this must invalidate
    // the signature, not just silently decode different claims.
    const tamperedPayloadSegment = parts[1].slice(0, -1) + (parts[1].slice(-1) === "A" ? "B" : "A");
    const tamperedToken = [parts[0], tamperedPayloadSegment, parts[2]].join(".");

    const payload = await verifyAnyToken([tamperedToken], getJwtSecret());
    expect(payload).toBeNull();
  });

  it("a token signed with a DIFFERENT secret is rejected", async () => {
    const wrongKey = new TextEncoder().encode("a-completely-different-32-char-secret-value");
    const token = await new SignJWT(basePayload as any)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("12h")
      .sign(wrongKey);

    const payload = await verifyAnyToken([token], getJwtSecret());
    expect(payload).toBeNull();
  });

  it("an expired token is rejected", async () => {
    const key = getJwtSecret();
    const expiredToken = await new SignJWT(basePayload as any)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 60 * 60 * 24)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60 * 60) // expired 1h ago
      .sign(key);

    const payload = await verifyAnyToken([expiredToken], key);
    expect(payload).toBeNull();
  });

  it("verifyAnyToken tries multiple candidate tokens and returns the first valid one (stale duplicate cookie tolerance)", async () => {
    const validToken = await signSessionToken(basePayload as any);
    const payload = await verifyAnyToken(["not-a-real-token", validToken], getJwtSecret());
    expect(payload).not.toBeNull();
    expect(payload?.email).toBe("test@example.com");
  });
});
