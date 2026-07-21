import { hasProductAccess as hasNormalizedProductAccess } from "@/lib/products";

export const UPGRADE_URL =
  process.env.NEXT_PUBLIC_HIGHLIGHT_UPGRADE_URL ||
  "https://www.highlight.url.tw/shop/product.html?id=3";

export const productNameMap: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  business: "Business",
  demo: "Demo",
  "highlightsignal_starter": "Starter",
  "highlightsignal_pro": "Pro",
  "highlightsignal_business": "Business",
  "highlightsignal-dashboard": "Dashboard",
  "highlightsignal-ga": "GA 數據分析",
  "highlightsignal-si": "Search Intelligence",
  "highlightsignal-seo": "Search Intelligence",
  "highlightsignal-ads": "ADS 廣告成效",
  dashboard: "Dashboard",
  ga: "GA 數據分析",
  si: "Search Intelligence",
  seo: "Search Intelligence",
  ads: "ADS 廣告成效",
};

export function productName(productId: string) {
  return productNameMap[productId] || productId;
}

export function hasProductAccess(enabledProducts: string[], product: "ga" | "si" | "ads") {
  return hasNormalizedProductAccess(enabledProducts, product);
}

export function normalizeSubscriptionId(subscription: unknown) {
  return String(subscription || "")
    .trim()
    .toLowerCase()
    .replace(/^highlightsignal[_-]/, "");
}

export function hasActiveHighlightSignalPlan(subscription: unknown, role?: unknown) {
  const roleId = normalizeSubscriptionId(role);
  const planId = normalizeSubscriptionId(subscription);

  if (roleId === "admin" || planId === "admin") return true;

  // Real subscription ids carry a billing-cycle suffix (e.g. "starter_month",
  // presumably "*_year" too) that an exact-match .includes() against the bare
  // tier name never matches -- every real paying member on a suffixed plan id
  // was silently denied SI/GA/ADS access. Aligned with the substring check
  // dashboardAiQuota.ts already uses correctly for the same subscription
  // field.
  return ["starter", "pro", "business", "demo"].some((tier) => planId.startsWith(tier));
}

export function hasSearchIntelligenceAccess(session: {
  subscription?: unknown;
  role?: unknown;
  enabledProducts?: unknown;
}) {
  return (
    hasActiveHighlightSignalPlan(session.subscription, session.role) ||
    hasNormalizedProductAccess(session.enabledProducts, "si")
  );
}

export function hasGaAccess(session: {
  subscription?: unknown;
  role?: unknown;
  enabledProducts?: unknown;
}) {
  return (
    hasActiveHighlightSignalPlan(session.subscription, session.role) ||
    hasNormalizedProductAccess(session.enabledProducts, "ga")
  );
}

export function hasAdsAccess(session: {
  subscription?: unknown;
  role?: unknown;
  enabledProducts?: unknown;
}) {
  return (
    hasActiveHighlightSignalPlan(session.subscription, session.role) ||
    hasNormalizedProductAccess(session.enabledProducts, "ads")
  );
}
