export type BusinessType = "canteen" | "restaurant" | "hotel" | "bar" | "shop" | "hardware" | "supermarket" | "wholesale";
export const BUSINESS_LABELS: Record<BusinessType, string> = { canteen: "College canteen", restaurant: "Restaurant", hotel: "Hotel", bar: "Bar & food", shop: "Retail shop / Duka", hardware: "Hardware store", supermarket: "Supermarket / Mini-mart", wholesale: "Wholesale / Jumla" };
export const BUSINESS_GROUPS: { label: string; types: BusinessType[] }[] = [{ label: "Hospitality & food", types: ["canteen", "restaurant", "hotel", "bar"] }, { label: "Retail & trade", types: ["shop", "hardware", "supermarket", "wholesale"] }];
export function isRetail(type?: BusinessType) { return type === "shop" || type === "hardware" || type === "supermarket" || type === "wholesale"; }
export function hasTableService(type: BusinessType = "canteen") { return type === "restaurant" || type === "hotel" || type === "bar"; }
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
export type Sector = "retail" | "hospitality" | "canteen";
export function sectorOf(type?: BusinessType): Sector {
  if (isRetail(type)) return "retail";
  if (type === "restaurant" || type === "hotel" || type === "bar") return "hospitality";
  return type === "canteen" ? "canteen" : "retail";
}
/** Sector-specific English wording; the page translator turns it into Kiswahili/French. */
export const SECTOR_TERMS: Record<Sector, { place: string; choose: string; none: string; shared: string; catalog: string; noMobile: string }> = {
  retail: { place: "Store", choose: "Choose store", none: "No stores available yet.", shared: "Your wallet balance is shared across every branch in the same business.", catalog: "Products", noMobile: "Mobile money top-up is not available for this store yet." },
  hospitality: { place: "Venue", choose: "Choose venue", none: "No venues available yet.", shared: "Your wallet balance is shared across every venue in the same business.", catalog: "Menu & drinks", noMobile: "Mobile money top-up is not available for this venue yet." },
  canteen: { place: "Canteen", choose: "Choose canteen", none: "No canteens available yet.", shared: "Your wallet balance is shared across every canteen in the same group.", catalog: "Menu", noMobile: "Mobile money top-up is not available for this canteen yet." },
};
export function sectorTerms(type?: BusinessType) { return SECTOR_TERMS[sectorOf(type)]; }
