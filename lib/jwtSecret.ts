export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is required in production");
  }

  // HS256 requires ≥ 256 bits (32 bytes)，fallback 必須 ≥ 32 字元；
  // 並與 adfusion 子系統的 fallback 一致，本地開發兩 app 才能互驗同一份 cookie。
  return new TextEncoder().encode(secret || "dev-secret-change-me-at-least-32b");
}
