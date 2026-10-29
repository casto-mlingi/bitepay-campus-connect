export type BusinessType = "canteen" | "restaurant" | "hotel" | "bar";
export const BUSINESS_LABELS: Record<BusinessType, string> = { canteen: "College canteen", restaurant: "Restaurant", hotel: "Hotel", bar: "Bar & food" };
export function hasTableService(type: BusinessType = "canteen") { return type !== "canteen"; }
export function isBeverage(category: string) { return /drink|beverage|beer|wine|spirit|cocktail|juice|soda|water|coffee|tea/i.test(category); }
export function canApproveRefund(role?: string) { return role === "owner" || role === "supervisor"; }
export type WaiterPaymentMode = "none" | "wallet" | "all";
type WaiterPayStore = { allow_waiter_payments?: boolean; waiter_payment_mode?: WaiterPaymentMode } | null | undefined;
/** Store's waiter payment mode; older stores fall back to the on/off switch. */
export function waiterPaymentMode(store: WaiterPayStore): WaiterPaymentMode {
  if (store?.waiter_payment_mode) return store.waiter_payment_mode;
  return store?.allow_waiter_payments === false ? "none" : "all";
}
/** Waiters may take payments only when the store owner allows it; other roles always can. */
export function waiterCanTakePayment(role?: string, store?: WaiterPayStore) {
  return role !== "waiter" || waiterPaymentMode(store) !== "none";
}
/** In wallet-only mode waiters cannot take cash/Lipa or leave customer debt. */
export function waiterWalletOnly(role?: string, store?: WaiterPayStore) {
  return role === "waiter" && waiterPaymentMode(store) === "wallet";
}
export function newOrderId() { return `O-${crypto.randomUUID()}`; }
export type ScanGrant = { customerId: string; staffId: string; storeId: string; expiresAt: number; pinVerified: boolean };
export function validScanGrant(grant: ScanGrant | undefined, customerId: string, staffId: string, storeId: string, now: number) {
  return !!grant && grant.customerId === customerId && grant.staffId === staffId && grant.storeId === storeId && grant.expiresAt > now && grant.pinVerified;
}