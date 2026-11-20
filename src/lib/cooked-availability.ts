/** How many plates of a dish the shared cooked pots can still serve (null = dish is not linked to any pot). */
export type PotLike = { name: string; unit: string; initial_quantity: number; active: boolean; id: string; store_id: string };
export type UsageLike = { batch_id: string; quantity: number; closes_batch?: boolean };
export type PortionLike = { product_id: string; commodity_name: string; quantity: number; unit: string; store_id: string };

export function potRemaining(pot: PotLike, usages: UsageLike[]) {
  // Immutable closure beats a stale device's active flag, including later refunds.
  if (usages.some((u) => u.batch_id === pot.id && u.closes_batch)) return 0;
  const used = usages.reduce((s, u) => (u.batch_id === pot.id ? s + u.quantity : s), 0);
  return Math.max(0, pot.initial_quantity - used);
}

/** Remaining quantity per pot name+unit across all active pots (several pots of rice add up). */
export function potTotals(pots: PotLike[], usages: UsageLike[], storeId: string) {
  const totals = new Map<string, number>();
  for (const p of pots) {
    if (!p.active || p.store_id !== storeId) continue;
    const key = `${p.name.trim().toLowerCase()}|${p.unit}`;
    totals.set(key, (totals.get(key) ?? 0) + potRemaining(p, usages));
  }
  return totals;
}

export function platesFromPots(productId: string, portions: PortionLike[], totals: Map<string, number>, storeId: string): number | null {
  const mine = portions.filter((m) => m.store_id === storeId && m.product_id === productId && m.quantity > 0);
  if (mine.length === 0) return null;
  let min = Infinity;
  for (const m of mine) {
    const left = totals.get(`${m.commodity_name.trim().toLowerCase()}|${m.unit}`) ?? 0;
    min = Math.min(min, Math.floor(left / m.quantity + 1e-9));
  }
  return Number.isFinite(min) ? min : 0;
}
