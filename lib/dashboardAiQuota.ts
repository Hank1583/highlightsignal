import { highlightPhpApiUrl } from "@/lib/config";
import type { ServerSession } from "@/lib/serverSession";

export type DashboardAiQuota = {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
};

function quotaLimit(session: ServerSession) {
  const role = session.role.toLowerCase();
  const subscription = (session.subscription || "").toLowerCase();

  if (role === "admin" || subscription.includes("admin")) return 500;
  if (subscription.includes("pro")) return 100;
  if (subscription.includes("basic") || subscription.includes("member")) return 20;
  return 3;
}

async function requestUsage(
  session: ServerSession,
  payload: Record<string, unknown>
) {
  const response = await fetch(highlightPhpApiUrl("dashboard/ai_usage.php"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Member-Id": session.id,
      "X-Member-Email": session.email,
      "X-Member-Name": session.name,
      "X-Member-Role": session.role,
      "X-Enabled-Products": session.enabledProducts.join(","),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Dashboard AI usage API failed");
  }

  return response.json() as Promise<Partial<DashboardAiQuota>>;
}

export async function checkDashboardAiQuota(
  session: ServerSession
): Promise<DashboardAiQuota> {
  const limit = quotaLimit(session);

  try {
    const quota = await requestUsage(session, {
      action: "check",
      limit,
    });

    const used = Number(quota.used || 0);
    const resolvedLimit = Number(quota.limit || limit);
    const remaining = Math.max(0, resolvedLimit - used);

    return {
      allowed: quota.allowed !== false && remaining > 0,
      used,
      limit: resolvedLimit,
      remaining,
    };
  } catch {
    return {
      allowed: true,
      used: 0,
      limit,
      remaining: limit,
    };
  }
}

export async function recordDashboardAiUsage(
  session: ServerSession,
  payload: {
    question: string;
    lens: string;
    source: string;
    context: unknown;
    response: unknown;
  }
) {
  const limit = quotaLimit(session);

  try {
    await requestUsage(session, {
      action: "record",
      limit,
      ...payload,
    });
  } catch {
    // Quota logging should never break the user-facing dashboard response.
  }
}
