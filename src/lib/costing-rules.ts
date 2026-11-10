/** Pure margin and pricing rules. All money is whole shillings. */
export const DEFAULT_RETAIL_MARKUP = 25;
export const DEFAULT_FOOD_MARGIN = 20;
export const DEFAULT_FOOD_FLOOR = 10;

export type MarginStatus = "healthy" | "squeezed" | "critical";

export function validPercent(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 100;
}

/** Cost plus markup, rounded up to the nearest 50 shillings so shelf prices stay clean. */
export function suggestSellingPrice(unitCost: number, markupPercent: number): number {
  if (!(unitCost > 0)) return 0;
  return Math.ceil((unitCost * (1 + markupPercent / 100)) / 50) * 50;
}

/** Margin as a percentage of the selling price. */
export function marginPercent(price: number, cost: number): number {
  if (!(price > 0)) return 0;
  return Math.round(((price - cost) / price) * 1000) / 10;
}

export function marginStatus(price: number, cost: number, target: number, floor: number) {
  const percent = marginPercent(price, cost);
  const profit = Math.round(price - cost);
  const status: MarginStatus = percent < floor ? "critical" : percent < target ? "squeezed" : "healthy";
  return { percent, profit, status };
}

/** Change of a new unit cost versus the previous one, in percent (null without a previous cost). */
export function costChangePercent(previous: number, next: number): number | null {
  if (!(previous > 0) || !(next >= 0)) return null;
  return Math.round(((next - previous) / previous) * 1000) / 10;
}

export type VoucherLine = { item_id: string; qty: number; total_cost: number };
/** Validates voucher lines and returns the grand total, or null when any line is invalid. */
export function voucherTotal(lines: VoucherLine[]): number | null {
  if (lines.length === 0) return null;
  let total = 0;
  for (const l of lines) {
    if (!l.item_id || !Number.isFinite(l.qty) || l.qty <= 0 || !Number.isSafeInteger(l.total_cost) || l.total_cost < 0) return null;
    total += l.total_cost;
  }
  return total;
}
