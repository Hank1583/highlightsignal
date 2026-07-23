import { NextResponse } from "next/server";
import { DEMO_EMAIL, getDemoMemberId, isDemoEmail } from "@/lib/demo";
import { isAllowedAuthOrigin, originRejectedResponseBody } from "@/lib/authOrigin";
import { newCorrelationId } from "@/lib/correlationId";
import {
  callLegacyLogin,
  enabledProductsFromSubscription,
} from "@/lib/legacyMemberAuth";
import {
  fetchBackendToken,
  nullableNumber,
  nullableString,
  sessionCookieOptions,
  signSessionToken,
} from "@/lib/authSession";

export async function POST(req: Request) {
  const correlationId = newCorrelationId();

  if (!isAllowedAuthOrigin(req)) {
    return NextResponse.json(originRejectedResponseBody(correlationId), { status: 403 });
  }

  try {
    const body = await req.json();
    const email = String(body?.email || "").trim().toLowerCase();

    if (isDemoEmail(email)) {
      const demoToken = await signSessionToken({
        id: getDemoMemberId(),
        email: DEMO_EMAIL,
        name: "Highlight Demo",
        role: "viewer",
        subscription: "demo",
        enabledProducts: ["dashboard", "ga", "si", "ads"],
        subscribedApps: [],
        expireDate: "2099-12-31",
        daysLeft: null,
        loginAt: new Date().toISOString().slice(0, 19).replace("T", " "),
        isDemo: true,
      });

      const res = NextResponse.json({
        ok: true,
        correlationId,
        user: {
          id: getDemoMemberId(),
          email: DEMO_EMAIL,
          name: "Highlight Demo",
          role: "viewer",
          subscription: "demo",
          expire_date: "2099-12-31",
          days_left: null,
          subscribed_apps: [],
          enabledProducts: ["dashboard", "ga", "si", "ads"],
          isDemo: true,
        },
      });
      res.cookies.set("token", demoToken, sessionCookieOptions());
      return res;
    }

    const password = String(body?.password || "");
    const appId = String(body?.app_id || "highlightsignal");

    const loginResult = await callLegacyLogin(email, password, appId);
    if (!loginResult.ok) {
      console.warn(`[auth:login][${correlationId}] legacy login failed:`, loginResult.message);
      return NextResponse.json(
        { ok: false, message: loginResult.message, correlationId },
        { status: 401 }
      );
    }

    const { data } = loginResult;
    const enabledProducts = enabledProductsFromSubscription(data.subscription);

    // 若帳號有 ads 權限，順便跟 Java 後端換 AdFusion token 包進 JWT。
    // 沒 ads 權限就不打，省一次外部請求。
    const backendToken = enabledProducts.includes("ads")
      ? await fetchBackendToken(email, password)
      : undefined;

    const token = await signSessionToken({
      id: String(data.member_id || ""),
      email: String(data.email || ""),
      name: String(data.name || ""),
      appId: data.app_id ? String(data.app_id) : undefined,
      role: data.role ? String(data.role) : undefined,
      subscription: data.subscription ? String(data.subscription) : undefined,
      enabledProducts,
      subscribedApps: [],
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
      correlationId,
      user: {
        id: data.member_id,
        email: data.email,
        name: data.name,
        app_id: data.app_id,
        role: data.role,
        subscription: data.subscription,
        expire_date: data.expire_date,
        days_left: data.days_left,
        subscribed_apps: [],
        enabledProducts,
        platform: data.platform,
        ip: data.ip,
        avatar: data.avatar,
        login_at: data.login_at,
      },
    });
    res.cookies.set("token", token, sessionCookieOptions());
    return res;
  } catch (error) {
    console.error(`[auth:login][${correlationId}] route error:`, error);
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error && error.message ? error.message : "Server error",
        correlationId,
      },
      { status: 500 }
    );
  }
}
