import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

// V12-05: no security response headers existed anywhere (neither here nor
// in wrangler.jsonc) -- a real gap this audit found and fixed, not a
// hypothetical hardening item.
// Content-Security-Policy is set per-request in middleware.ts instead of
// here, since it needs a fresh nonce on every response (to allow our own
// inline/streaming scripts without falling back to 'unsafe-inline').
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  trailingSlash: false,
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;

initOpenNextCloudflareForDev();
