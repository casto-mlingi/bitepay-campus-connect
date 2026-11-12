// Supervisor safe custody: cash dropped from closed shifts minus every recorded way it left the safe.
// Handing cash to the owner moves custody only; it is not an expense or revenue.
export type SafeMovement = {
  id: string; store_id: string; kind: "owner" | "bank"; amount: number;
  reference?: string; note?: string; recorded_by: string; confirmed_by?: string; created_at: number;
};
type ShiftLike = { closed_at?: number; cash_drop?: number };
type ExpenseLike = { shift_id?: string; amount: number; payment_method: string };

export function safeBalance(shifts: ShiftLike[], expenses: ExpenseLike[], movements: SafeMovement[]) {
  const drops = shifts.filter((s) => s.closed_at).reduce((n, s) => n + Math.max(0, s.cash_drop ?? 0), 0);
  const safeExpenses = expenses.filter((e) => !e.shift_id && e.payment_method === "cash").reduce((n, e) => n + e.amount, 0);
  const deposits = movements.filter((m) => m.kind === "bank").reduce((n, m) => n + m.amount, 0);
  const toOwner = movements.filter((m) => m.kind === "owner").reduce((n, m) => n + m.amount, 0);
  return { drops, safeExpenses, deposits, toOwner, expected: drops - safeExpenses - deposits - toOwner };
}

export function validMovement(amount: number, kind: SafeMovement["kind"], reference: string | undefined, available: number): string | null {
  if (!Number.isSafeInteger(amount) || amount <= 0) return "Enter a valid amount";
  if (amount > available) return "Amount is more than the cash expected in the safe";
  if (kind === "bank" && !reference?.trim()) return "Enter the deposit slip or reference number";
  return null;
}
