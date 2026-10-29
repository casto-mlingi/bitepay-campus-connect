// POS stock reservation: items in the current bill and in other open saved bills
// hold stock until the sale completes. Real deductions still happen only at sale time.
type Item = { product_id: string; qty: number };
type Bill = { id: string; items: Item[] };

export function reservedQty(productId: string, current: Item[], openBills: Bill[], currentBillId: string | null): number {
  const here = current.filter((i) => i.product_id === productId).reduce((s, i) => s + i.qty, 0);
  const others = openBills
    .filter((b) => b.id !== currentBillId)
    .reduce((s, b) => s + b.items.filter((i) => i.product_id === productId).reduce((a, i) => a + i.qty, 0), 0);
  return here + others;
}

/** Remaining plates after reservations; null means the product is not stock-tracked. */
export function remainingStock(plates: number | null, productId: string, current: Item[], openBills: Bill[], currentBillId: string | null): number | null {
  if (plates === null) return null;
  return Math.max(0, plates - reservedQty(productId, current, openBills, currentBillId));
}

/** Highest quantity the current bill may hold for this product. */
export function maxLineQty(plates: number | null, productId: string, openBills: Bill[], currentBillId: string | null): number {
  if (plates === null) return Number.POSITIVE_INFINITY;
  return Math.max(0, plates - reservedQty(productId, [], openBills, currentBillId));
}
