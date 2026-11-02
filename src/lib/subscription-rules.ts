import { isRetail, type BusinessType } from "./business-rules";

export type SubscriptionPlan = "trial" | "starter" | "growth" | "pro" | "enterprise";
export const PAID_PLANS: SubscriptionPlan[] = ["starter", "growth", "pro", "enterprise"];
export const PLAN_PRICE: Record<SubscriptionPlan, number> = { trial: 0, starter: 10000, growth: 30000, pro: 50000, enterprise: 100000 };
export const PLAN_LABEL: Record<SubscriptionPlan, string> = { trial: "Free Trial", starter: "Starter", growth: "Growth", pro: "Business Pro", enterprise: "Enterprise" };
export const STORE_LIMIT: Record<SubscriptionPlan, number> = { trial: 1, starter: 1, growth: 5, pro: 10, enterprise: Infinity };
export const PLAN_FEATURES: Record<SubscriptionPlan, string[]> = {
  trial: ["1 store · 14 days", "All business-appropriate tools"],
  starter: ["1 store", "POS & inventory", "Customer credit, debt & saved change", "Supplier balances", "Daily sales & shift reports"],
  growth: ["Up to 5 stores", "Everything in Starter", "Prepaid wallets & QR", "Staff permissions", "Hospitality recipes & costing"],
  pro: ["Up to 10 stores", "Everything in Growth", "Hospitality tables, waiters & kitchen", "Open bills & full accounting", "Witnessed handovers"],
  enterprise: ["Unlimited stores", "Complete business-appropriate system"],
};
export type PlanStore = { id: string; owner_user_id?: string; created_at: number; subscription: { plan: SubscriptionPlan; status: string; expires_at: number; monthly_price?: number } };
export function ownerPackage<T extends PlanStore>(stores: T[], ownerId: string, now = Date.now()) {
  const owned = stores.filter((s) => (s.owner_user_id ?? s.id) === ownerId).sort((a, b) => a.created_at - b.created_at);
  const active = owned.filter((s) => s.subscription.status === "active" && s.subscription.expires_at > now);
  const rank: Record<SubscriptionPlan, number> = { trial: 4, starter: 0, growth: 1, pro: 2, enterprise: 3 };
  const billing = [...active].sort((a, b) => STORE_LIMIT[b.subscription.plan] - STORE_LIMIT[a.subscription.plan] || rank[b.subscription.plan] - rank[a.subscription.plan])[0] ?? owned[0];
  return { owned, billing, plan: billing?.subscription.plan ?? "starter", limit: billing ? STORE_LIMIT[billing.subscription.plan] : 1, active: active.length > 0 };
}
export function storeCreationReason(stores: PlanStore[], ownerId: string, now = Date.now()): string | null {
  const p = ownerPackage(stores, ownerId, now);
  if (!p.active) return "Renew your account package before adding a store.";
  if (p.owned.length >= p.limit) return `${PLAN_LABEL[p.plan]} allows ${p.limit} store${p.limit === 1 ? "" : "s"}. Upgrade in Settings to add another; existing stores stay saved.`;
  return null;
}
/** Existing hospitality workflows are grandfathered; retail credit is never prepaid-only. */
export function businessFeatures(type: BusinessType | undefined, plan: SubscriptionPlan = "starter") {
  const retail = isRetail(type);
  return { retail, kitchen: !retail, tables: !retail, recipes: !retail, openBills: !retail,
    customerCredit: true, supplierBalances: true, financialHistory: true,
    prepaidWallet: !retail || plan !== "starter", staffPermissions: !retail || plan !== "starter", fullAccounting: !retail || ["trial", "pro", "enterprise"].includes(plan) };
}