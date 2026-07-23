import { afterEach, describe, expect, it, vi } from "vitest";
import { callLegacyLogin, callLegacyRegister, enabledProductsFromSubscription } from "@/lib/legacyMemberAuth";

/**
 * V12-02: this task's own required "account enumeration" coverage --
 * `callLegacyLogin()`'s whole job is collapsing `login.php`'s distinct
 * "帳號不存在"/"密碼錯誤" messages into one generic message before either
 * ever reaches the Browser (see V12-01's own report for why). Mocks the
 * global `fetch` to the exact response shapes read from the real external
 * `login.php`/`register.php` source -- never calls the real external
 * system.
 */
describe("callLegacyLogin", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function mockFetchOnce(body: unknown, ok = true) {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok,
        text: async () => JSON.stringify(body),
      })
    );
  }

  it("normalizes '帳號不存在' into the generic message", async () => {
    mockFetchOnce({ status: "error", message: "帳號不存在" });
    const result = await callLegacyLogin("nobody@example.com", "whatever", "highlightsignal");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe("帳號或密碼錯誤，請重新確認。");
      expect(result.enumerationRisk).toBe(true);
    }
  });

  it("normalizes '密碼錯誤' into the SAME generic message -- indistinguishable from account-not-found", async () => {
    mockFetchOnce({ status: "error", message: "密碼錯誤" });
    const result = await callLegacyLogin("real@example.com", "wrongpass", "highlightsignal");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe("帳號或密碼錯誤，請重新確認。");
    }
  });

  it("does NOT normalize '帳號已封鎖' -- a genuinely different situation, not the same enumeration risk", async () => {
    mockFetchOnce({ status: "error", message: "帳號已封鎖" });
    const result = await callLegacyLogin("blocked@example.com", "pass", "highlightsignal");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe("帳號已封鎖");
      expect(result.enumerationRisk).toBe(false);
    }
  });

  it("passes through a successful login's real data untouched", async () => {
    mockFetchOnce({
      status: "success",
      member_id: 123,
      email: "real@example.com",
      name: "Real User",
      subscription: "free",
    });
    const result = await callLegacyLogin("real@example.com", "correctpass", "highlightsignal");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.member_id).toBe(123);
      expect(result.data.email).toBe("real@example.com");
    }
  });

  it("fails closed (not throwing) when the external system is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const result = await callLegacyLogin("a@example.com", "b", "highlightsignal");
    expect(result.ok).toBe(false);
  });

  it("fails closed when the external system returns non-JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, text: async () => "<html>not json</html>" })
    );
    const result = await callLegacyLogin("a@example.com", "b", "highlightsignal");
    expect(result.ok).toBe(false);
  });
});

describe("callLegacyRegister", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("surfaces a duplicate-email response as a clean failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, text: async () => JSON.stringify({ status: "error", message: "Email 已被註冊" }) })
    );
    const result = await callLegacyRegister("existing@example.com", "password123", "Someone");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe("Email 已被註冊");
    }
  });

  it("passes through a successful registration's real data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ status: "success", id: 999, email: "new@example.com", name: "New User" }),
      })
    );
    const result = await callLegacyRegister("new@example.com", "password123", "New User");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.memberId).toBe(999);
    }
  });
});

describe("enabledProductsFromSubscription", () => {
  it("grants full access for an active paid plan", () => {
    expect(enabledProductsFromSubscription("starter")).toContain("ga");
    expect(enabledProductsFromSubscription("highlightsignal_pro")).toContain("ads");
  });

  it("restricts to dashboard-only for a free/unknown plan", () => {
    expect(enabledProductsFromSubscription("free")).toEqual(["dashboard"]);
    expect(enabledProductsFromSubscription(null)).toEqual(["dashboard"]);
    expect(enabledProductsFromSubscription(undefined)).toEqual(["dashboard"]);
  });
});
