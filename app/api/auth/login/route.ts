export const runtime = "edge";

import { NextResponse } from "next/server";
import { SignJWT } from "jose";

type SubscribedApp = {
  app_id: string;
  expire_at: string;
};

type ProductKey =
  | "dashboard"
  | "ga"
  | "si"
  | "support"
  | "crm"
  | "ads"
  | "salesbot";

const appIdMap: Record<string, ProductKey | undefined> = {
  "highlightsignal-dashboard": "dashboard",
  "highlightsignal-ga": "ga",
  "highlightsignal-si": "si",
  "highlightsignal-seo": "si",
  "highlightsignal-ads": "ads",
  "highlightsignal-support": "support"
};

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
}) {
  const secret = process.env.JWT_SECRET || "dev-secret-change-me";
  const key = new TextEncoder().encode(secret);
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

    const enabledProducts = Array.from(
      new Set<ProductKey>([
        "dashboard",
        ...subscribedApps
          .map((item) => appIdMap[item.app_id])
          .filter(Boolean) as ProductKey[],
      ])
    );
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
      role: data.subscription ? String(data.subscription) : undefined,
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
    });

    const res = NextResponse.json({
      ok: true,
      user: {
        id: data.member_id,
        email: data.email,
        name: data.name,
        app_id: data.app_id,
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
