import { potRemaining, type PotLike, type UsageLike } from "./cooked-availability";

export type DisposalMode = "waste" | "carry_over";
export type ClosureUsage = UsageLike & {
  id: string; kind?: "sale" | "waste" | "carry_over" | "carry_over_release";
  closes_batch?: boolean; created_at: number; reason?: string;
  source_usage_id?: string; carried_quantity?: number;
};

/** A closed pot is completely removed; a smaller physical count records the discrepancy as waste. */
export function planPotClosure(pot: PotLike, usages: ClosureUsage[], quantity: number, mode: DisposalMode, allowCarry = false) {
  if (!pot.active || usages.some((u) => u.batch_id === pot.id && u.closes_batch)) return { ok: false as const, reason: "This pot is already closed" };
  const remaining = potRemaining(pot, usages);
  if (!Number.isFinite(quantity) || quantity < 0 || quantity > remaining + 1e-9) return { ok: false as const, reason: "Check the remaining quantity" };
  if (mode === "carry_over" && !allowCarry) return { ok: false as const, reason: "Safe carry-over is disabled" };
  return { ok: true as const, quantity: Math.min(quantity, remaining), discrepancy: Math.max(0, remaining - quantity), mode };
}

export function pendingCarryOvers(usages: ClosureUsage[]) {
  const released = new Set(usages.filter((u) => u.kind === "carry_over_release").map((u) => u.source_usage_id));
  return usages.filter((u) => u.kind === "carry_over" && u.quantity > 0 && !released.has(u.id));
}

export function isNextKitchenDay(createdAt: number, now = Date.now()) {
  const date = (n: number) => { const d = new Date(n); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
  return date(now) > date(createdAt);
}

/** Never combine kilograms, litres and pieces into a misleading single total. */
export function disposalSummary(pots: (PotLike & { id: string })[], usages: ClosureUsage[], from = 0, until = Infinity) {
  const units = new Map(pots.map((p) => [p.id, p.unit]));
  const totals = new Map<string, { unit: string; waste: number; carry: number }>();
  for (const u of usages) {
    if (u.created_at < from || u.created_at >= until || (u.kind !== "waste" && u.kind !== "carry_over")) continue;
    const unit = units.get(u.batch_id);
    if (!unit) continue;
    const total = totals.get(unit) ?? { unit, waste: 0, carry: 0 };
    if (u.kind === "waste") total.waste += u.quantity;
    else total.carry += u.quantity;
    totals.set(unit, total);
  }
  return [...totals.values()];
}