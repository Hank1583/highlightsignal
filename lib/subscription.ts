import { hasProductAccess as hasNormalizedProductAccess } from "@/lib/products";

export const UPGRADE_URL =
  process.env.NEXT_PUBLIC_HIGHLIGHT_UPGRADE_URL ||
  "https://www.highlight.url.tw/shop/product.html?id=3";

export const productNameMap: Record<string, string> = {
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
