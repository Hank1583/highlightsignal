import type { MetadataRoute } from "next";

const SITE_URL = "https://highlightsignal.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const routes = [
    { path: "", changeFrequency: "weekly", priority: 1 },
    { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
    { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
    { path: "/data-deletion", changeFrequency: "yearly", priority: 0.3 },
  ] as const;

  return routes.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
