import { NextResponse } from "next/server";
import { isAllowedAuthOrigin, originRejectedResponseBody } from "@/lib/authOrigin";
import { newCorrelationId } from "@/lib/correlationId";
import {
  callLegacyLogin,
  callLegacyRegister,
  enabledProductsFromSubscription,
} from "@/lib/legacyMemberAuth";
import {
  fetchBackendToken,
  nullableNumber,
  nullableString,
  sessionCookieOptions,
  signSessionToken,
} from "@/lib/authSession";
import { provisionDefaultWorkspace } from "@/lib/workspaceProvisioning";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME_LENGTH = 100;
const MIN_PASSWORD_LENGTH = 8;

/**
 * V12-01: the real BFF for registration -- before this task, the Browser
 * called `https://www.highlight.url.tw/api/register.php` DIRECTLY (see the
 * task's own research findings), with no server-side validation, origin
 * check, or orchestration of what happens next. This route is a 3-step saga
 * (register -> auto-login -> provision default Workspace), each step's
 * outcome reported distinctly in the response so the UI can show an
 * accurate partial-failure state instead of a flat success/fail -- e.g.
 * "帳號已建立，但自動登入失敗" is a materially different, recoverable
 * situation from "註冊失敗".
 *
 * Not a database transaction (the member record lives entirely in the
 * external, shared, unmodified legacy system -- see the task's own scope
 * decision) -- if register succeeds but login fails, the account still
 * exists and the user can retry login manually with their new credentials;
 * nothing is silently lost.
 */
export async function POST(req: Request) {
  const correlationId = newCorrelationId();

  if (!isAllowedAuthOrigin(req)) {
    return NextResponse.json(originRejectedResponseBody(correlationId), { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid request body.", correlationId },
      { status: 400 }
    );
  }

  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  const name = String(body?.name || "").trim();

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json(
      { ok: false, message: "Email 格式不正確。", correlationId },
      { status: 400 }
    );
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { ok: false, message: `密碼至少需要 ${MIN_PASSWORD_LENGTH} 個字元。`, correlationId },
      { status: 400 }
    );
  }
  if (name.length === 0 || name.length > MAX_NAME_LENGTH) {
    return NextResponse.json(
      { ok: false, message: "姓名為必填，且不可超過 100 字元。", correlationId },
      { status: 400 }
    );
  }

  // === Step 1: register ===
  const registerResult = await callLegacyRegister(email, password, name);
  if (!registerResult.ok) {
    console.warn(`[auth:register][${correlationId}] legacy register failed:`, registerResult.message);
    return NextResponse.json(
      { ok: false, phase: "register", message: registerResult.message, correlationId },
      { status: 409 }
    );
  }

  // === Step 2: auto-login ===
  const loginResult = await callLegacyLogin(email, password, "highlightsignal");
  if (!loginResult.ok) {
    console.error(`[auth:register][${correlationId}] auto-login after register failed:`, loginResult.message);
    return NextResponse.json(
      {
        ok: true,
        phase: "login",
        registered: true,
        loggedIn: false,
        workspaceProvisioned: false,
        message: "帳號已建立成功，但自動登入失敗，請手動登入。",
        correlationId,
      },
      { status: 200 }
    );
  }

  const { data } = loginResult;
  const enabledProducts = enabledProductsFromSubscription(data.subscription);
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

  // === Step 3: provision the default Workspace ===
  // Proactive, so a brand-new member has a Workspace immediately rather than
  // waiting for WorkspaceProvider's reactive "list empty -> provision"
  // fallback on first dashboard load -- that fallback stays in place as a
  // safety net if this call is ever skipped or fails below.
  const provisionResult = await provisionDefaultWorkspace(String(data.member_id));
  if (!provisionResult.ok) {
    console.error(`[auth:register][${correlationId}] workspace provisioning failed:`, provisionResult.message);
  }

  const res = NextResponse.json({
    ok: true,
    registered: true,
    loggedIn: true,
    workspaceProvisioned: provisionResult.ok,
    message: provisionResult.ok
      ? "註冊成功，已自動登入。"
      : "註冊與登入成功，但工作區建立失敗；重新整理 Dashboard 會自動再試一次。",
    correlationId,
    user: {
      id: data.member_id,
      email: data.email,
      name: data.name,
      role: data.role,
      subscription: data.subscription,
      enabledProducts,
    },
  });
  res.cookies.set("token", token, sessionCookieOptions());
  return res;
}
