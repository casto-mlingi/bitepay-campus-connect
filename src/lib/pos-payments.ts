/** Whole-shilling settlement rules shared by forms and store actions. */
export function wholeAmount(value: number) {
  return Number.isFinite(value) ? Math.round(value) : NaN;
}

export function walletSettlement(balance: number, total: number, received: number, limit: number, allowDebt: boolean) {
  const values = [balance, total, received, limit].map(wholeAmount);
  const [b, t, r, l] = values;
  if (values.some((v) => !Number.isFinite(v)) || t <= 0 || r < 0 || l < 0 || r > t) return { ok: false as const, reason: "Enter a valid payment amount (not more than the bill)" };
  const charge = t - r;
  const after = b - charge;
  if (after < 0 && (!allowDebt || -after > l)) return { ok: false as const, reason: allowDebt ? "Customer debt exceeds the allowed limit" : "Collect the remaining amount or choose Pay later" };
  return { ok: true as const, walletCharge: charge, walletPaid: Math.min(Math.max(0, b), charge), debtAdded: Math.max(0, -after) - Math.max(0, -b), balanceAfter: after, received: r };
}

export function cashSettlement(total: number, received: number, tender: "cash" | "mobile", saveChange: boolean, drawerCash: number) {
  const t = wholeAmount(total), r = wholeAmount(received);
  if (!Number.isFinite(t) || !Number.isFinite(r) || t <= 0 || r < t) return { ok: false as const, reason: "Amount received is less than the bill or invalid" };
  const change = r - t;
  const returned = saveChange ? 0 : change;
  if (tender === "mobile" && returned > drawerCash) return { ok: false as const, reason: "Not enough drawer cash for change; save it to the customer wallet instead" };
  return { ok: true as const, received: r, change, changeSaved: saveChange ? change : 0, changeReturned: returned, cashDelta: tender === "cash" ? r - returned : -returned, bankDelta: tender === "mobile" ? r : 0 };
}

export function validWalletPayout(balance: number, amount: number, available: number) {
  return Number.isSafeInteger(amount) && amount > 0 && amount <= Math.max(0, balance) && amount <= available;
}