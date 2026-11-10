/** Read-only FIFO reconstruction for legacy hospitality sales; never edits stock. */
type Batch = { id: string; product_id: string; plates: number; plates_remaining: number; unit_cost: number; created_at: number };
type Sale = { id: string; created_at: number; items: { product_id: string; qty: number }[]; cost_amount?: number; is_reversal?: boolean; reversal_of?: string };
export type SaleCost = { id: string; date: number; amount: number };

export function hospitalityCosting(orders: Sale[], batches: Batch[]) {
  const stock = batches.slice().sort((a, b) => a.created_at - b.created_at || a.id.localeCompare(b.id))
    .map((b) => ({ ...b, available: Math.max(0, b.plates) }));
  const allocations = new Map<string, { batch: typeof stock[number]; qty: number }[]>();
  const costs = new Map<string, number>();
  const entries: SaleCost[] = [];
  let uncostedQuantity = 0;
  for (const order of orders.slice().sort((a, b) => a.created_at - b.created_at || Number(Boolean(a.is_reversal)) - Number(Boolean(b.is_reversal)) || a.id.localeCompare(b.id))) {
    let amount = 0;
    if (order.is_reversal || order.items.some((i) => i.qty < 0)) {
      const original = order.reversal_of;
      const prior = original ? allocations.get(original) : undefined;
      if (prior) for (const draw of prior) draw.batch.available += draw.qty;
      amount = order.cost_amount ?? (original ? -(costs.get(original) ?? 0) : 0);
      if (order.cost_amount == null && (!original || !costs.has(original))) uncostedQuantity += order.items.reduce((s, i) => s + Math.abs(i.qty), 0);
    } else {
      const draws: { batch: typeof stock[number]; qty: number }[] = [];
      for (const item of order.items) {
        let remaining = Math.max(0, item.qty);
        for (const batch of stock) {
          if (batch.product_id !== item.product_id || batch.created_at > order.created_at || batch.available <= 0) continue;
          const qty = Math.min(remaining, batch.available);
          batch.available -= qty;
          remaining -= qty;
          amount += qty * batch.unit_cost;
          if (qty) draws.push({ batch, qty });
          if (!remaining) break;
        }
        if (order.cost_amount == null) uncostedQuantity += remaining;
      }
      allocations.set(order.id, draws);
      amount = order.cost_amount ?? amount;
    }
    amount = Math.round(amount);
    costs.set(order.id, amount);
    entries.push({ id: order.id, date: order.created_at, amount });
  }
  return {
    cogs: entries.reduce((sum, e) => sum + e.amount, 0), entries, uncostedQuantity,
    inventoryValue: Math.round(batches.reduce((sum, b) => sum + Math.max(0, b.plates_remaining) * b.unit_cost, 0)),
  };
}