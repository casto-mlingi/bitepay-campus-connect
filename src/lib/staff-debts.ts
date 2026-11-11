/**
 * Shift stock losses and staff debts. Debts are derived from the frozen
 * dispositions on closed shifts plus append-only settlement rows, so offline
 * merges never lose a charge or a payment.
 */
export type LossDisposition = "spoilage" | "cashier" | "waiter" | "team";
export type LossBasis = "cost" | "retail";
export type LossCharge = { staff_id: string; name: string; amount: number };
export type StaffDebtPayment = { id: string; store_id: string; staff_id: string; amount: number; method: "cash" | "salary"; note?: string; recorded_by?: string; created_at: number };

type Line = { product_id: string; name: string; expected: number; counted: number; disposition?: LossDisposition; charges?: LossCharge[]; loss_amount?: number };
type ShiftLike = { id: string; store_id: string; closed_at?: number; stock_counts?: Line[] };

export const shortage = (l: { expected: number; counted: number }) => Math.max(0, Math.round(l.expected) - l.counted);

/** Loss value and per-staff charges for one short line; split remainders go to the first person so totals are exact. */
export function lossCharges(qty: number, unitCost: number, unitPrice: number, disposition: LossDisposition, basis: LossBasis, staff: { id: string; name: string }[]) {
  const unit = disposition === "spoilage" || basis === "cost" ? unitCost : unitPrice;
  const total = Math.max(0, Math.round(qty * unit));
  if (disposition === "spoilage" || staff.length === 0) return { total, charges: [] as LossCharge[] };
  const people = disposition === "team" ? staff : staff.slice(0, 1);
  const each = Math.floor(total / people.length);
  const charges = people.map((p, i) => ({ staff_id: p.id, name: p.name, amount: each + (i === 0 ? total - each * people.length : 0) }));
  return { total, charges };
}

/** Lines that are short and still need a decision. */
export const unresolvedLosses = (lines: Line[]) => lines.filter((l) => shortage(l) > 0 && !l.disposition);

/** Outstanding stock debt per staff member: closed-shift charges minus settlements. */
export function staffDebtBalances(shifts: ShiftLike[], payments: StaffDebtPayment[]) {
  const out = new Map<string, { charged: number; paid: number; balance: number; incidents: { shift_id: string; date: number; item: string; amount: number }[] }>();
  const get = (id: string) => { let r = out.get(id); if (!r) { r = { charged: 0, paid: 0, balance: 0, incidents: [] }; out.set(id, r); } return r; };
  for (const s of shifts) {
    if (!s.closed_at) continue;
    for (const l of s.stock_counts ?? []) for (const c of l.charges ?? []) { const r = get(c.staff_id); r.charged += c.amount; r.incidents.push({ shift_id: s.id, date: s.closed_at, item: `${shortage(l)}× ${l.name}`, amount: c.amount }); }
  }
  const seen = new Set<string>();
  for (const p of payments) { if (seen.has(p.id)) continue; seen.add(p.id); get(p.staff_id).paid += p.amount; }
  for (const r of out.values()) r.balance = r.charged - r.paid;
  return out;
}
