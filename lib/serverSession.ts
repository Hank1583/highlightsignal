import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export type ServerSession = {
  id: string;
  email: string;
  name: string;
  appId?: string;
  role: string;
  subscription?: string;
  enabledProducts: string[];
  subscribedApps: {
    app_id: string;
    expire_at: string;
  }[];
  expireDate?: string;
  daysLeft?: number;
  userFortuneId?: string;
  platform?: string;
  ip?: string;
  avatar?: string;
  loginAt?: string;
  tokenExpiresAt?: number;
};

const jwtKey = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-me"
);

export async function getServerSession(): Promise<ServerSession | null> {
  const token = (await cookies()).get("token")?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, jwtKey);

    return {
      id: String(payload.id || ""),
      email: String(payload.email || ""),
      name: String(payload.name || "User"),
      appId: payload.appId ? String(payload.appId) : undefined,
      role: String(payload.role || "member"),
      subscription: payload.subscription
        ? String(payload.subscription)
        : payload.role
          ? String(payload.role)
          : undefined,
      enabledProducts: Array.isArray(payload.enabledProducts)
        ? payload.enabledProducts.map(String)
        : ["dashboard"],
      subscribedApps: Array.isArray(payload.subscribedApps)
        ? payload.subscribedApps
            .map((item) => ({
              app_id: String((item as { app_id?: unknown }).app_id || ""),
              expire_at: String((item as { expire_at?: unknown }).expire_at || ""),
            }))
            .filter((item) => item.app_id)
        : [],
      expireDate: payload.expireDate ? String(payload.expireDate) : undefined,
      daysLeft:
        typeof payload.daysLeft === "number" ? payload.daysLeft : undefined,
      userFortuneId:
        payload.userFortuneId !== undefined && payload.userFortuneId !== null
          ? String(payload.userFortuneId)
          : undefined,
      platform: payload.platform ? String(payload.platform) : undefined,
      ip: payload.ip ? String(payload.ip) : undefined,
      avatar: payload.avatar ? String(payload.avatar) : undefined,
      loginAt: payload.loginAt ? String(payload.loginAt) : undefined,
      tokenExpiresAt: typeof payload.exp === "number" ? payload.exp : undefined,
    };
  } catch {
    return null;
  }
}

export function phpAuthHeaders(session: ServerSession) {
  return {
    "Content-Type": "application/json",
    "X-Member-Id": session.id,
    "X-Member-Email": session.email,
    "X-Member-Name": session.name,
    "X-Member-Role": session.role,
    "X-Enabled-Products": session.enabledProducts.join(","),
  };
}
