import { describe, expect, it } from "vitest";
import { isAllowedAuthOrigin } from "@/lib/authOrigin";

/**
 * V12-02: this task's own required "CSRF" coverage for the auth BFF routes
 * added in V12-01. `isAllowedAuthOrigin()` is the entire defense -- these
 * registration/login routes accept a cookie-setting POST with no CSRF
 * token, so this same-origin check is the real gate.
 */
describe("isAllowedAuthOrigin", () => {
  it("allows a same-origin request (matching Origin header)", () => {
    const request = new Request("https://app.example.com/api/auth/login", {
      method: "POST",
      headers: { origin: "https://app.example.com" },
    });
    expect(isAllowedAuthOrigin(request)).toBe(true);
  });

  it("rejects a cross-origin request", () => {
    const request = new Request("https://app.example.com/api/auth/login", {
      method: "POST",
      headers: { origin: "https://evil.example.com" },
    });
    expect(isAllowedAuthOrigin(request)).toBe(false);
  });

  it("falls back to Referer when Origin is absent", () => {
    const request = new Request("https://app.example.com/api/auth/login", {
      method: "POST",
      headers: { referer: "https://app.example.com/auth/register" },
    });
    expect(isAllowedAuthOrigin(request)).toBe(true);
  });

  it("rejects a cross-origin Referer when Origin is absent", () => {
    const request = new Request("https://app.example.com/api/auth/login", {
      method: "POST",
      headers: { referer: "https://evil.example.com/phishing" },
    });
    expect(isAllowedAuthOrigin(request)).toBe(false);
  });

  it("allows a request with neither header present (some legitimate browser/privacy configurations omit both)", () => {
    const request = new Request("https://app.example.com/api/auth/login", { method: "POST" });
    expect(isAllowedAuthOrigin(request)).toBe(true);
  });

  it("rejects a malformed Referer header rather than throwing", () => {
    const request = new Request("https://app.example.com/api/auth/login", {
      method: "POST",
      headers: { referer: "not-a-url" },
    });
    expect(isAllowedAuthOrigin(request)).toBe(false);
  });
});
