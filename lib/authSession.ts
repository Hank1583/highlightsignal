import "server-only";
import { SignJWT } from "jose";
import { getJwtSecret } from "@/lib/jwtSecret";
import { type ProductKey } from "@/lib/products";

/**
 * V12-01: extracted from `app/api/auth/login/route.ts` so
 * `app/api/auth/register/route.ts` can sign the SAME shape of session
 * token after an auto-login, instead of duplicating this payload/JWT logic
 * a second time.
 */

type SubscribedApp = {
  app_id: string;
  expire_at: string;
};

export type SessionTokenPayload = {
  id: string;
  email: string;
  name: string;
  appId?: string;
  role?: string;
  subscription?: string;
  enabledProducts: ProductKey[];
  subscribedApps: SubscribedApp[];
  expireDate?: string | null;
  daysLeft?: number | null;
  userFortuneId?: number | string | null;
  platform?: string | null;
  ip?: string | null;
  avatar?: string | null;
  loginAt?: string | null;
  isDemo?: boolean;
  /** Java 後端發的 JWT，供 /ads 子系統呼叫受保護路由 */
  backendToken?: string;
};

// Java 後端位址（AdFusion 受保護路由用）。與 adfusion 專案一致。
const BACKEND =
  process.env.API_HOST || process.env.NEXT_PUBLIC_API_HOST || "http://localhost:8080";

/**
 * 向 Java 後端換取 AdFusion 用的 JWT，包進平台 session JWT，
 * 供 /ads 子系統（adfusion）呼叫受保護路由時帶 Authorization: Bearer。
 * best-effort：取不到 token 不擋登入；ADS 受保護 API 屆時會回 401 → 前端重登。
 */
export async function fetchBackendToken(
  email: string,
  password: string
): Promise<string | undefined> {
  try {
    const r = await fetch(`${BACKEND}/adfusion/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await r.json();
    if (r.ok && data?.isSuccess && data?.result?.token) {
      return String(data.result.token);
    }
    console.warn("[auth] backend /adfusion/auth/login no token:", data?.message ?? r.status);
  } catch (e) {
    console.warn("[auth] backend /adfusion/auth/login request failed:", e);
  }
  return undefined;
}

export async function signSessionToken(payload: SessionTokenPayload) {
  const key = getJwtSecret();
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    // 12h：與 AdFusion 後端 backendToken 的壽命對齊，避免兩者不同步
    // （平台 session 滿 12h 統一重登；ADS 受保護路由才不會中途 401）
    .setExpirationTime("12h")
    .sign(key);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 12, // 12h，與 JWT / backendToken 對齊
  };
}

export function nullableString(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return String(value);
}

export function nullableNumber(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}
