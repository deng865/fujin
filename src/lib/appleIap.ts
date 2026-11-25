export const APPLE_PRODUCT_PREFIX = "life.fujin.app.";

export function appleProductIdForPlan(planKey: string) {
  if (!/^[a-z0-9_]+$/.test(planKey)) throw new Error("Invalid plan key");
  return `${APPLE_PRODUCT_PREFIX}${planKey}`;
}

export function planKeyForAppleProduct(productId: string) {
  if (!productId.startsWith(APPLE_PRODUCT_PREFIX)) return null;
  const planKey = productId.slice(APPLE_PRODUCT_PREFIX.length);
  return /^[a-z0-9_]+$/.test(planKey) ? planKey : null;
}
