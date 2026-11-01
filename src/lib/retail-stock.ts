export const TRADE_UNITS = ["pcs", "packet", "kg", "liters", "bag", "box", "carton", "crate", "bale", "meter", "jerrican"] as const;
export type TradeUnit = typeof TRADE_UNITS[number];
type ProductStock = { id: string; opening_stock?: number; cost_price?: number };
type PurchaseStock = { product_id?: string; qty: number; total_cost: number };
type SaleStock = { items: { product_id: string; qty: number }[] };
/** Immutable purchases and signed sale/refund quantities survive device union merges. */
export function retailStock(product: ProductStock, purchases: PurchaseStock[], orders: SaleStock[]) {
  const received = purchases.filter((p) => p.product_id === product.id).reduce((n, p) => n + p.qty, 0);
  const sold = orders.reduce((n, o) => n + o.items.filter((i) => i.product_id === product.id).reduce((s, i) => s + i.qty, 0), 0);
  return Math.max(0, (product.opening_stock ?? 0) + received - sold);
}
export function retailUnitCost(product: ProductStock, purchases: PurchaseStock[]) {
  const receipts = purchases.filter((p) => p.product_id === product.id);
  const qty = (product.opening_stock ?? 0) + receipts.reduce((n, p) => n + p.qty, 0);
  const value = (product.opening_stock ?? 0) * (product.cost_price ?? 0) + receipts.reduce((n, p) => n + p.total_cost, 0);
  return qty > 0 ? value / qty : product.cost_price ?? 0;
}