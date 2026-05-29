export const DEMO_EMAIL = "demo@highlight.url.tw";

export function isDemoEmail(email: unknown) {
  return String(email || "").trim().toLowerCase() === DEMO_EMAIL;
}

export function getDemoMemberId() {
  const raw =
    process.env.HIGHLIGHT_DEMO_MEMBER_ID ||
    process.env.NEXT_PUBLIC_HIGHLIGHT_DEMO_MEMBER_ID ||
    "1";
  const id = Number(raw);

  return Number.isFinite(id) && id > 0 ? String(Math.round(id)) : "1";
}

export function isDemoSession(session: { email?: unknown; isDemo?: unknown } | null | undefined) {
  return Boolean(session?.isDemo) || isDemoEmail(session?.email);
}

export const DEMO_READ_ONLY_MESSAGE = "Demo 帳號僅供檢視，無法新增、修改或重新產生資料。";
