export type ProductKey = "dashboard" | "ga" | "si" | "ads";

const productAliasMap: Record<string, ProductKey | undefined> = {
  dashboard: "dashboard",
  "highlightsignal-dashboard": "dashboard",
  ga: "ga",
  "highlightsignal-ga": "ga",
  si: "si",
  seo: "si",
  "highlightsignal-si": "si",
  "highlightsignal-seo": "si",
  ads: "ads",
  "highlightsignal-ads": "ads",
};

export function normalizeProductKey(value: unknown): ProductKey | null {
  if (value === undefined || value === null) {
    return null;
  }

  const key = String(value).trim().toLowerCase();
  return productAliasMap[key] || null;
}

export function normalizeEnabledProducts(values: unknown): ProductKey[] {
  const source = Array.isArray(values) ? values : [];
  const products = source
    .map(normalizeProductKey)
    .filter((product): product is ProductKey => Boolean(product));

  return Array.from(new Set<ProductKey>(["dashboard", ...products]));
}

export function hasProductAccess(
  enabledProducts: unknown,
  product: Exclude<ProductKey, "dashboard">
) {
  return normalizeEnabledProducts(enabledProducts).includes(product);
}
