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
  | "seo"
  | "support"
  | "crm"
  | "ads"
  | "salesbot";

const appIdMap: Record<string, ProductKey | undefined> = {
  "business-cloud-dashboard": "dashboard",
  "business-cloud-ga": "ga",
  "business-cloud-seo": "seo",
  "business-cloud-support": "support",
  "business-cloud-crm": "crm",
  "business-cloud-ads": "ads",
  "business-cloud-salesbot": "salesbot",
};

async function signToken(payload: {
  id: string;
  email: string;
  name: string;
  role?: string;
  enabledProducts: ProductKey[];
}) {
  const secret = process.env.JWT_SECRET;
  const key = new TextEncoder().encode(secret);
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
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

    const subscribedApps: SubscribedApp[] = Array.isArray(data.subscribed_apps)
      ? data.subscribed_apps
      : [];

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
      role: data.subscription ? String(data.subscription) : undefined,
      enabledProducts,
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
        avatar: data.avatar,
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
      { ok: false, message: "Server error" },
      { status: 500 }
    );
  }
}