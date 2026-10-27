export type ShiftMovement = { shift_id?: string; cash_delta?: number; bank_delta?: number; tender?: string; cash_paid?: number };
export function shiftTotals(id: string, opening: number, orders: ShiftMovement[], transactions: { shift_id?: string; order_id?: string; type: string; amount: number; tender?: string; wallet_payout?: boolean }[], outflows: { shift_id?: string; amount: number; method: string }[]) {
  let cash = opening, mobile = 0;
  for (const o of orders.filter((o) => o.shift_id === id)) { cash += o.cash_delta ?? (o.tender === "cash" ? o.cash_paid ?? 0 : 0); mobile += o.bank_delta ?? (o.tender === "mobile" ? o.cash_paid ?? 0 : 0); }
  for (const t of transactions.filter((t) => t.shift_id === id && !t.order_id)) {
    if (t.wallet_payout) cash -= t.amount;
    else if (t.type === "topup") { if (t.tender === "mobile") mobile += t.amount; else if (t.tender === "cash") cash += t.amount; }
  }
  for (const p of outflows.filter((p) => p.shift_id === id)) { if (p.method === "bank") mobile -= p.amount; else cash -= p.amount; }
  return { expected_cash: cash, expected_mobile: mobile };
}
export function validHandover(counted: number, retained: number, drop: number, mobile: number) { return [counted, retained, drop, mobile].every((n) => Number.isSafeInteger(n) && n >= 0) && counted === retained + drop; }
export type FundTransfer = { id: string; store_id: string; shift_id?: string; amount: number; from: "cash" | "bank"; created_at: number; by_name?: string };
export function transferTotals(id: string, rows: FundTransfer[]) {
  const delta = rows.filter((r) => r.shift_id === id).reduce((sum, r) => sum + (r.from === "bank" ? r.amount : -r.amount), 0);
  return { cash: delta, mobile: -delta };
}
export function shiftEvidence(id: string, rows: { id: string; shift_id?: string }[]) { return rows.filter((r) => r.shift_id === id).map((r) => r.id).sort().join("|"); }