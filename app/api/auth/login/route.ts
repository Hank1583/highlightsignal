import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { getJwtSecret } from "@/lib/jwtSecret";
import { DEMO_EMAIL, getDemoMemberId, isDemoEmail } from "@/lib/demo";
import {
  normalizeEnabledProducts,
  type ProductKey,
} from "@/lib/products";

type SubscribedApp = {
  app_id: string;
  expire_at: string;
};

// Java 後端位址（AdFusion 受保護路由用）。與 adfusion 專案一致。
const BACKEND =
  process.env.API_HOST ||
  process.env.NEXT_PUBLIC_API_HOST ||
  "http://localhost:8080";

/**
 * 向 Java 後端換取 AdFusion 用的 JWT，包進平台 session JWT，
 * 供 /ads 子系統（adfusion）呼叫受保護路由時帶 Authorization: Bearer。
 * best-effort：取不到 token 不擋登入；ADS 受保護 API 屆時會回 401 → 前端重登。
 */
async function fetchBackendToken(
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
    console.warn(
      "[login] backend /adfusion/auth/login no token:",
      data?.message ?? r.status
    );
  } catch (e) {
    console.warn("[login] backend /adfusion/auth/login request failed:", e);
  }
  return undefined;
}

async function signToken(payload: {
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
}) {
  const key = getJwtSecret();
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

function nullableString(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return String(value);
}

function nullableNumber(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body?.email || "").trim().toLowerCase();

    if (isDemoEmail(email)) {
      const demoToken = await signToken({
        id: getDemoMemberId(),
        email: DEMO_EMAIL,
        name: "Highlight Demo",
        role: "viewer",
        subscription: "demo",
        enabledProducts: ["dashboard", "ga", "si"],
        subscribedApps: [
          { app_id: "highlightsignal-ga", expire_at: "2099-12-31" },
          { app_id: "highlightsignal-si", expire_at: "2099-12-31" },
        ],
        expireDate: "2099-12-31",
        daysLeft: null,
        loginAt: new Date().toISOString().slice(0, 19).replace("T", " "),
        isDemo: true,
      });

      const res = NextResponse.json({
        ok: true,
        user: {
          id: getDemoMemberId(),
          email: DEMO_EMAIL,
          name: "Highlight Demo",
          role: "viewer",
          subscription: "demo",
          expire_date: "2099-12-31",
          days_left: null,
          subscribed_apps: [
            { app_id: "highlightsignal-ga", expire_at: "2099-12-31" },
            { app_id: "highlightsignal-si", expire_at: "2099-12-31" },
          ],
          enabledProducts: ["dashboard", "ga", "si"],
          isDemo: true,
        },
      });

      res.cookies.set("token", demoToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });

      return res;
    }

    const form = new URLSearchParams();
    for (const [k, v] of Object.entries(body)) {
      form.append(k, String(v));
    }

    const r = await fetch("https://www.highlight.url.tw/api/login.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });

    const text = await r.text();

    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { ok: false, message: "Invalid response from auth server" },
        { status: 502 }
      );
    }

    if (!r.ok || data.status !== "success") {
      return NextResponse.json(
        { ok: false, message: data.message || "Login failed" },
        { status: 401 }
      );
    }

    const rawSubscribedApps = Array.isArray(data.subscribed_apps)
      ? data.subscribed_apps
      : [];
    const subscribedApps: SubscribedApp[] = rawSubscribedApps
      .map((item: unknown) => {
        const subscribedApp = item as Partial<
          Record<keyof SubscribedApp, unknown>
        >;

        return {
          app_id: nullableString(subscribedApp.app_id) || "",
          expire_at: nullableString(subscribedApp.expire_at) || "",
        };
      })
      .filter((item: SubscribedApp) => item.app_id);

    const rawEnabledProducts = [
      ...subscribedApps.map((item) => item.app_id),
      data.app_id,
      data.subscription,
      ...(Array.isArray(data.enabled_products) ? data.enabled_products : []),
    ];

    const enabledProducts = normalizeEnabledProducts(rawEnabledProducts);

    // 若帳號有 ads 權限，順便跟 Java 後端換 AdFusion token 包進 JWT。
    // 沒 ads 權限就不打，省一次外部請求。
    const backendToken = enabledProducts.includes("ads")
      ? await fetchBackendToken(
          String(body?.email || "").trim(),
          String(body?.password || "")
        )
      : undefined;
    // console.log("subscribedApps =", subscribedApps);
    // console.log("enabledProducts =", enabledProducts);
    // console.log("token payload =", {
    //   id: String(data.member_id || ""),
    //   email: String(data.email || ""),
    //   name: String(data.name || ""),
    //   role: data.subscription ? String(data.subscription) : undefined,
    //   enabledProducts,
    // });
    const token = await signToken({
      id: String(data.member_id || ""),
      email: String(data.email || ""),
      name: String(data.name || ""),
      appId: data.app_id ? String(data.app_id) : undefined,
      role: data.role ? String(data.role) : undefined,
      subscription: data.subscription ? String(data.subscription) : undefined,
      enabledProducts,
      subscribedApps,
      expireDate: nullableString(data.expire_date),
      daysLeft: nullableNumber(data.days_left),
      userFortuneId: nullableString(data.user_fortune_id),
      platform: nullableString(data.platform),
      ip: nullableString(data.ip),
      avatar: nullableString(data.avatar),
      loginAt: nullableString(data.login_at),
      backendToken,
    });

    const res = NextResponse.json({
      ok: true,
      user: {
        id: data.member_id,
        email: data.email,
        name: data.name,
        app_id: data.app_id,
        role: data.role,
        subscription: data.subscription,
        expire_date: data.expire_date,
        days_left: data.days_left,
        subscribed_apps: subscribedApps,
        enabledProducts,
        platform: data.platform,
        ip: data.ip,
        avatar: data.avatar,
        login_at: data.login_at,
      },
    });

    res.cookies.set("token", token, {
      httpOnly: true, // 為了只靠這 4 檔就能登出；之後可改回 true + 補 logout API
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (error) {
    console.error("login route error:", error);

    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error && error.message
            ? error.message
            : "Server error",
      },
      { status: 500 }
    );
  }
}
