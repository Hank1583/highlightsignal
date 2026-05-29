import { SignJWT } from "jose";
import { getJwtSecret } from "@/lib/jwtSecret";
import { isDemoEmail } from "@/lib/demo";
import { normalizeEnabledProducts } from "@/lib/products";
import { verifyAnyToken } from "@/lib/sessionToken";

const secret = getJwtSecret();

// 建立 JWT
export async function signToken(payload: Record<string, any>) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

// 驗證 JWT

export async function verifyToken(
  token: string
): Promise<JWTPayload | null> {
  try {
    const payload = await verifyAnyToken([token], secret);

    if (!payload) {
      return null;
    }

    return {
      id: Number(payload.id),
      email: String(payload.email),
      name: payload.name ? String(payload.name) : undefined,
      role: payload.role ? String(payload.role) : undefined,
      enabledProducts: normalizeEnabledProducts(payload.enabledProducts),
      isDemo: Boolean(payload.isDemo) || isDemoEmail(payload.email),
    };
  } catch {
    return null;
  }
}

// lib/types/auth.ts
export interface JWTPayload {
  id: number;
  email: string;
  name?: string;
  role?: string;
  enabledProducts?: string[];
  isDemo?: boolean;
}

