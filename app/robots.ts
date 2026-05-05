import type { MetadataRoute } from "next";

const SITE_URL = "https://highlightsignal.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/account",
          "/ads",
          "/api",
          "/auth",
          "/billing",
          "/dashboard",
          "/ga",
          "/seo",
          "/si",
          "/support",
          "/team",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
