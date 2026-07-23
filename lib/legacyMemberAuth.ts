import "server-only";
import { API } from "@/lib/config";
import { type ProductKey } from "@/lib/products";

/**
 * V12-01: the ONLY place in this repo that calls the external, shared,
 * cross-product legacy member system (register.php/login.php --
 * D:\7.Highlight\1.Project\4.php\api, not part of this repo, shared by
 * ~12 unrelated products, never modified from here). Both
 * `app/api/auth/login/route.ts` and `app/api/auth/register/route.ts` call
 * into this module instead of each hand-rolling their own fetch -- before
 * V12-01, the login call was duplicated inline in the login route with no
 * shared register counterpart at all (registration bypassed any BFF
 * entirely, see the task's own research findings).
 */

export type LegacyLoginData = {
  member_id: string | number;
  email: string;
  name: string;
  app_id?: string;
  role?: string;
  subscription?: string;
  expire_date?: string | null;
  days_left?: number | null;
  user_fortune_id?: string | number | null;
  platform?: string | null;
  ip?: string | null;
  avatar?: string | null;
  login_at?: string | null;
};

export type LegacyLoginResult =
  | { ok: true; data: LegacyLoginData }
  | { ok: false; message: string; enumerationRisk: boolean };

export type LegacyRegisterResult =
  | { ok: true; memberId: string | number; email: string; name: string }
  | { ok: false; message: string };

/**
 * `login.php` returns "帳號不存在" (account doesn't exist) vs "密碼錯誤"
 * (wrong password) as DISTINCT messages -- a classic account-enumeration
 * leak (an attacker can tell which emails are registered by watching which
 * message comes back). This repo cannot fix that at the source (external,
 * shared, not modified here -- see the task's own scope decision); this is
 * the BFF-layer mitigation: collapse both into one generic message before
 * it ever reaches the Browser. "帳號已封鎖" (blocked) is deliberately left
 * distinct -- a different situation a legitimately blocked user needs to
 * be told about, not the same enumeration risk class.
 */
const ENUMERATION_PRONE_MESSAGES = new Set(["帳號不存在", "密碼錯誤"]);
const GENERIC_LOGIN_FAILURE_MESSAGE = "帳號或密碼錯誤，請重新確認。";

export async function callLegacyLogin(
  email: string,
  password: string,
  appId: string
): Promise<LegacyLoginResult> {
  const form = new URLSearchParams();
  form.append("email", email);
  form.append("password", password);
  form.append("app_id", appId);

  let response: Response;
  try {
    response = await fetch(API.LOGIN, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
  } catch {
    return { ok: false, message: "無法連線到登入服務，請稍後再試。", enumerationRisk: false };
  }

  const text = await response.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, message: "登入服務回應格式錯誤。", enumerationRisk: false };
  }

  if (!response.ok || data.status !== "success") {
    const rawMessage = typeof data.message === "string" ? data.message : "Login failed";
    if (ENUMERATION_PRONE_MESSAGES.has(rawMessage)) {
      return { ok: false, message: GENERIC_LOGIN_FAILURE_MESSAGE, enumerationRisk: true };
    }
    return { ok: false, message: rawMessage, enumerationRisk: false };
  }

  return {
    ok: true,
    data: {
      member_id: data.member_id as string | number,
      email: String(data.email ?? email),
      name: String(data.name ?? ""),
      app_id: data.app_id ? String(data.app_id) : undefined,
      role: data.role ? String(data.role) : undefined,
      subscription: data.subscription ? String(data.subscription) : undefined,
      expire_date: (data.expire_date as string | null) ?? null,
      days_left: (data.days_left as number | null) ?? null,
      user_fortune_id: (data.user_fortune_id as string | number | null) ?? null,
      platform: (data.platform as string | null) ?? null,
      ip: (data.ip as string | null) ?? null,
      avatar: (data.avatar as string | null) ?? null,
      login_at: (data.login_at as string | null) ?? null,
    },
  };
}

/**
 * `register.php` itself has no transaction/idempotency guarantee beyond a
 * plain SELECT-then-INSERT duplicate-email check (a real TOCTOU race is
 * possible under true concurrency, but that's the external system's own
 * behavior -- not something this BFF layer can add a guarantee for without
 * modifying code this repo doesn't own).
 */
export async function callLegacyRegister(
  email: string,
  password: string,
  name: string
): Promise<LegacyRegisterResult> {
  const form = new FormData();
  form.append("email", email);
  form.append("password", password);
  form.append("name", name);

  let response: Response;
  try {
    response = await fetch(API.REGISTER, { method: "POST", body: form });
  } catch {
    return { ok: false, message: "無法連線到註冊服務，請稍後再試。" };
  }

  const text = await response.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, message: "註冊服務回應格式錯誤。" };
  }

  if (!response.ok || data.status !== "success") {
    const message = typeof data.message === "string" ? data.message : "註冊失敗";
    return { ok: false, message };
  }

  return {
    ok: true,
    memberId: data.id as string | number,
    email: String(data.email ?? email),
    name: String(data.name ?? name),
  };
}

const fullAccessProducts: ProductKey[] = ["dashboard", "ga", "si", "ads"];
const dashboardOnlyProducts: ProductKey[] = ["dashboard"];
const activeSubscriptionTiers = ["starter", "pro", "business", "demo"];

export function enabledProductsFromSubscription(subscription: unknown): ProductKey[] {
  const plan = (subscription ? String(subscription) : "")
    .trim()
    .toLowerCase()
    .replace(/^highlightsignal[_-]/, "");

  // Real subscription ids carry a billing-cycle suffix (e.g. "starter_month",
  // presumably "*_year" too) that an exact Set match against the bare tier
  // name never matches -- every real paying member on a suffixed plan id was
  // silently classified as dashboardOnlyProducts, which skips the
  // fetchBackendToken() call in the login route and leaves ADS unusable for
  // them. Aligned with the same startsWith() fix already applied in
  // lib/subscription.ts's hasActiveHighlightSignalPlan for this exact bug.
  if (plan && activeSubscriptionTiers.some((tier) => plan.startsWith(tier))) {
    return fullAccessProducts;
  }

  return dashboardOnlyProducts;
}
