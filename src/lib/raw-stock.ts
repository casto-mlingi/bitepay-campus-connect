export type RawStockMovement = { id: string; store_id: string; raw_id: string; quantity: number; created_at: number; by_id?: string; operation_id: string };
export type AnchoredRaw = { id: string; store_id: string; stock: number; stock_anchor?: number; updated_at?: number };
export function rawStock(raw: AnchoredRaw, movements: RawStockMovement[]): number {
  if (raw.stock_anchor == null) return raw.stock;
  const unique = new Map(movements.filter((m) => m.raw_id === raw.id && m.store_id === raw.store_id).map((m) => [m.id, m]));
  return Math.round((raw.stock_anchor + [...unique.values()].reduce((n, m) => n + m.quantity, 0)) * 1e9) / 1e9;
}
/** Capture every stock writer behind one boundary; never subtract from a mutable display balance twice. */
export function applyRawChanges<T extends AnchoredRaw>(before: T[], next: T[], movements: RawStockMovement[], operation_id: string, now: number, by_id?: string) {
  const additions: RawStockMovement[] = [];
  const materials = next.map((r) => {
    const old = before.find((x) => x.id === r.id && x.store_id === r.store_id);
    if (!old) return { ...r, stock_anchor: r.stock, updated_at: now };
    const previous = rawStock(old, movements), delta = Math.round((r.stock - previous) * 1e9) / 1e9;
    if (delta && !movements.some((m) => m.id === `${operation_id}:${r.id}`)) additions.push({ id: `${operation_id}:${r.id}`, operation_id, raw_id: r.id, store_id: r.store_id, quantity: delta, created_at: now, ...(by_id ? { by_id } : {}) });
    return { ...r, stock_anchor: old.stock_anchor ?? previous, updated_at: now };
  });
  const all = [...movements, ...additions];
  return { materials: materials.map((r) => ({ ...r, stock: rawStock(r, all) })), movements: all };
}