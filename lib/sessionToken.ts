import { jwtVerify, type JWTPayload } from "jose";

export async function verifyAnyToken(
  tokens: Array<string | undefined>,
  key: Uint8Array
): Promise<JWTPayload | null> {
  for (const token of tokens) {
    if (!token) continue;

    try {
      const { payload } = await jwtVerify(token, key);
      return payload;
    } catch {
      // Keep checking in case the browser sent stale duplicate token cookies.
    }
  }

  return null;
}

export function clearTokenCookie(response: Response & { cookies?: any }) {
  response.cookies?.set("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
