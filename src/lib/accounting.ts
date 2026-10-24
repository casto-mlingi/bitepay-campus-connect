/**
 * Double-entry general ledger derived from recorded sales, purchases and expenses.
 * Read-only: it never changes stored records. All amounts are whole shillings.
 */

export type AccountCode =
  | "1000" | "1010" | "1100" | "1200"
  | "2000" | "2100" | "3000" | "3100"
  | "4000" | "5000" | "6000";

export const ACCOUNTS: Record<AccountCode, { name: string; kind: "asset" | "liability" | "equity" | "revenue" | "expense" }> = {
  "1000": { name: "Cash on hand", kind: "asset" },
  "1010": { name: "Bank & mobile money", kind: "asset" },
  "1100": { name: "Customer receivables", kind: "asset" },
  "1200": { name: "Inventory (stock)", kind: "asset" },
  "2000": { name: "Customer wallet deposits", kind: "liability" },
  "2100": { name: "Accounts payable (suppliers)", kind: "liability" },
  "3000": { name: "Opening balance & unrecorded movements", kind: "equity" },
  "3100": { name: "Retained earnings", kind: "equity" },
  "4000": { name: "Sales revenue", kind: "revenue" },
  "5000": { name: "Cost of goods sold", kind: "expense" },
  "6000": { name: "Operating expenses", kind: "expense" },
};

export type LedgerLine = { account: AccountCode; debit: number; credit: number };
export type LedgerEntry = { id: string; date: number; memo: string; source: "sale" | "purchase" | "expense" | "payment" | "adjustment"; lines: LedgerLine[] };

type OrderLike = { id: string; created_at: number; total_amount: number; receipt_no?: string; cash_paid?: number; wallet_paid?: number; cash_delta?: number; bank_delta?: number; change_saved?: number; tender?: "cash" | "mobile"; payment_status: "paid" | "unpaid"; amount_paid?: number; payments?: { amount: number; tender: "cash" | "mobile" }[]; customer_name?: string };
type PurchaseLike = { id: string; date: number; supplier: string; raw_name: string; total_cost: number; payment_method: "cash" | "bank"; on_credit?: boolean };
type VendorPaymentLike = { id: string; created_at: number; amount: number; method: "cash" | "bank"; purchase_id: string; reference?: string };
type ExpenseLike = { id: string; date: number; category: string; description: string; amount: number; payment_method: "cash" | "bank" };

export const tzs = (n: number) => (Number.isFinite(n) ? Math.round(n) : 0);

const line = (account: AccountCode, debit: number, credit: number): LedgerLine => ({ account, debit: tzs(debit), credit: tzs(credit) });

/** Signed amount → debit or credit column so negative (refund) amounts stay on the correct side. */
function dr(account: AccountCode, amount: number): LedgerLine { return amount >= 0 ? line(account, amount, 0) : line(account, 0, -amount); }
function cr(account: AccountCode, amount: number): LedgerLine { return amount >= 0 ? line(account, 0, amount) : line(account, -amount, 0); }

export function saleEntry(o: OrderLike): LedgerEntry {
  const total = tzs(o.total_amount);
  const wallet = tzs(o.wallet_paid ?? 0);
  let cashIn = 0, bankIn = 0;
  if (o.payments?.length) {
    for (const p of o.payments) (p.tender === "mobile" ? (bankIn += tzs(p.amount)) : (cashIn += tzs(p.amount)));
  } else if (o.payment_status === "paid" || o.cash_paid) {
    const paid = o.cash_paid != null ? tzs(o.cash_paid) : o.payment_status === "paid" ? total - wallet : 0;
    if (o.tender === "mobile") bankIn = paid; else cashIn = paid;
  }
  const receivable = total - wallet - cashIn - bankIn;
  cashIn = o.cash_delta == null ? cashIn : tzs(o.cash_delta);
  bankIn = o.bank_delta == null ? bankIn : tzs(o.bank_delta);
  const lines = [dr("1000", cashIn), dr("1010", bankIn), dr("2000", wallet), cr("2000", o.change_saved ?? 0), dr("1100", receivable), cr("4000", total)]
    .filter((l) => l.debit || l.credit);
  return { id: `sale-${o.id}`, date: o.created_at, memo: `Sale ${o.receipt_no ?? o.id.slice(0, 8)}${o.customer_name ? ` · ${o.customer_name}` : ""}`, source: "sale", lines };
}

export function buildLedger(input: {
  orders: OrderLike[]; purchases: PurchaseLike[]; expenses: ExpenseLike[]; vendorPayments?: VendorPaymentLike[];
  cogs: number; cash: number; bank: number; walletLiabilities: number; inventoryValue: number; walletReceivables?: number;
}): LedgerEntry[] {
  const entries: LedgerEntry[] = [];
  for (const o of input.orders) { const e = saleEntry(o); if (e.lines.length) entries.push(e); }
  for (const p of input.purchases) {
    const acct = p.on_credit ? "2100" : p.payment_method === "bank" ? "1010" : "1000";
    entries.push({ id: `pur-${p.id}`, date: p.date, memo: `${p.on_credit ? "Supplier bill" : "Stock purchase"} · ${p.raw_name}${p.supplier ? ` from ${p.supplier}` : ""}`, source: "purchase", lines: [dr("1200", p.total_cost), cr(acct, p.total_cost)] });
  }
  for (const v of input.vendorPayments ?? []) {
    const acct = v.method === "bank" ? "1010" : "1000";
    entries.push({ id: `vpay-${v.id}`, date: v.created_at, memo: `Supplier payment · ${v.purchase_id}${v.reference ? ` · ${v.reference}` : ""}`, source: "payment", lines: [dr("2100", v.amount), cr(acct, v.amount)] });
  }
  for (const x of input.expenses) {
    const acct = x.payment_method === "bank" ? "1010" : "1000";
    entries.push({ id: `exp-${x.id}`, date: x.date, memo: `${x.category}${x.description ? ` · ${x.description}` : ""}`, source: "expense", lines: [dr("6000", x.amount), cr(acct, x.amount)] });
  }
  if (tzs(input.cogs)) entries.push({ id: "cogs", date: Date.now(), memo: "Cost of food cooked / sold", source: "adjustment", lines: [dr("5000", input.cogs), cr("1200", input.cogs)] });

  // Reconcile the ledger to the real balances the app holds, so it ties out exactly.
  const bal = balances(entries);
  const deliveryReceivables = input.orders.filter((o) => o.payment_status === "unpaid").reduce((s, o) => s + o.total_amount - (o.amount_paid ?? 0), 0);
  const targets: [AccountCode, number][] = [["1000", input.cash], ["1010", input.bank], ["1200", input.inventoryValue], ["2000", -input.walletLiabilities]];
  if (input.walletReceivables != null) targets.push(["1100", deliveryReceivables + input.walletReceivables]);
  const adj: LedgerLine[] = [];
  let equity = 0;
  for (const [acct, target] of targets) {
    const diff = tzs(target) - (bal[acct] ?? 0); // debit-positive
    if (!diff) continue;
    adj.push(dr(acct, diff));
    equity += diff;
  }
  if (adj.length) {
    adj.push(cr("3000", equity));
    entries.push({ id: "opening", date: 0, memo: "Opening balances & movements recorded outside this ledger (top-ups, transfers, older history)", source: "adjustment", lines: adj });
  }
  return entries.sort((a, b) => a.date - b.date);
}

/** Debit-positive balance per account. */
export function balances(entries: LedgerEntry[]): Partial<Record<AccountCode, number>> {
  const out: Partial<Record<AccountCode, number>> = {};
  for (const e of entries) for (const l of e.lines) out[l.account] = (out[l.account] ?? 0) + l.debit - l.credit;
  return out;
}

export function trialBalance(entries: LedgerEntry[]) {
  const bal = balances(entries);
  const rows = (Object.keys(ACCOUNTS) as AccountCode[]).map((code) => {
    const b = bal[code] ?? 0;
    return { code, name: ACCOUNTS[code].name, kind: ACCOUNTS[code].kind, debit: b > 0 ? b : 0, credit: b < 0 ? -b : 0 };
  }).filter((r) => r.debit || r.credit);
  const debit = rows.reduce((s, r) => s + r.debit, 0);
  const credit = rows.reduce((s, r) => s + r.credit, 0);
  return { rows, debit, credit, balanced: debit === credit };
}

export function isBalanced(e: LedgerEntry): boolean {
  return e.lines.reduce((s, l) => s + l.debit - l.credit, 0) === 0;
}
