/**
 * Accounts receivable: one aging view over every source of money customers owe —
 * pay-on-delivery orders, approved pay-later (negative wallet) debts, and open bar tabs.
 * Pure and read-only: balances come from the existing records. Whole shillings only.
 */

export type ArSource = "delivery" | "pay_later" | "tab";
export type ArBucket = "current" | "d1_30" | "d31_60" | "d61_90" | "d90_plus";

export const BUCKETS: { key: ArBucket; label: string }[] = [
  { key: "current", label: "Not yet due" },
  { key: "d1_30", label: "1–30 days late" },
  { key: "d31_60", label: "31–60 days late" },
  { key: "d61_90", label: "61–90 days late" },
  { key: "d90_plus", label: "Over 90 days late" },
];

export type ArItem = {
  id: string;
  source: ArSource;
  party: string; // customer, client or tab label
  phone?: string;
  ref: string;
  amount: number;
  since: number;
  due: number;
  daysLate: number;
  bucket: ArBucket;
  order_id?: string;
  customer_id?: string;
};

const DAY = 86_400_000;

export function bucketOf(due: number, now: number): { bucket: ArBucket; daysLate: number } {
  if (now <= due) return { bucket: "current", daysLate: 0 };
  const d = Math.max(1, Math.floor((now - due) / DAY));
  return { bucket: d <= 30 ? "d1_30" : d <= 60 ? "d31_60" : d <= 90 ? "d61_90" : "d90_plus", daysLate: d };
}

type OrderLike = { id: string; customer_name: string; created_at: number; total_amount: number; amount_paid?: number; payment_status: string; closed_out?: boolean; is_reversal?: boolean; receipt_no?: string };
type TabLike = { id: string; label: string; table_no?: string; items: { price: number; qty: number }[]; status: string; created_at: number };
type DebtorLike = { customer_id: string; name: string; phone?: string; balance: number; since: number; due?: number };

export function buildReceivables(input: {
  orders: OrderLike[]; tabs: TabLike[]; debtors: DebtorLike[]; termsDays: number; now?: number;
}): ArItem[] {
  const now = input.now ?? Date.now();
  const terms = Math.max(0, Math.round(input.termsDays)) * DAY;
  const out: ArItem[] = [];
  for (const o of input.orders) {
    if (o.payment_status !== "unpaid" || o.closed_out || o.is_reversal) continue;
    const amount = Math.max(0, Math.round(o.total_amount - (o.amount_paid ?? 0)));
    if (!amount) continue;
    const due = o.created_at + terms;
    out.push({ id: `o-${o.id}`, source: "delivery", party: o.customer_name || "Walk-in", ref: o.receipt_no ?? o.id.slice(0, 8), amount, since: o.created_at, due, order_id: o.id, ...bucketOf(due, now) });
  }
  for (const d of input.debtors) {
    const amount = Math.round(d.balance);
    if (amount <= 0) continue;
    const due = d.due ?? d.since + terms;
    out.push({ id: `p-${d.customer_id}`, source: "pay_later", party: d.name, phone: d.phone, ref: "Wallet", amount, since: d.since, due, customer_id: d.customer_id, ...bucketOf(due, now) });
  }
  for (const t of input.tabs) {
    if (t.status !== "open") continue;
    const amount = Math.round(t.items.reduce((s, i) => s + i.price * i.qty, 0));
    if (!amount) continue;
    // A tab is due the same day it is opened; it ages from the next day.
    const due = t.created_at + DAY;
    out.push({ id: `t-${t.id}`, source: "tab", party: t.label || (t.table_no ? `Table ${t.table_no}` : "Open tab"), ref: t.table_no ? `Table ${t.table_no}` : "Tab", amount, since: t.created_at, due, ...bucketOf(due, now) });
  }
  return out.sort((a, b) => b.daysLate - a.daysLate || b.amount - a.amount);
}

export function agingTotals(items: ArItem[]): Record<ArBucket, number> & { total: number } {
  const t = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0, total: 0 };
  for (const i of items) { t[i.bucket] += i.amount; t.total += i.amount; }
  return t;
}

/** One line per customer: total owed, oldest lateness, and how many open items. */
export function customerBalances(items: ArItem[]) {
  const map = new Map<string, { party: string; phone?: string; total: number; items: number; maxLate: number }>();
  for (const i of items) {
    const k = i.party.trim().toLowerCase();
    const r = map.get(k) ?? { party: i.party, phone: i.phone, total: 0, items: 0, maxLate: 0 };
    r.total += i.amount; r.items += 1; r.maxLate = Math.max(r.maxLate, i.daysLate); r.phone ??= i.phone;
    map.set(k, r);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}
