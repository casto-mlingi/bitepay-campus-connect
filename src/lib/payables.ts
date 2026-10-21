/**
 * Accounts payable: supplier bills (credit purchases) and supplier payments.
 * Pure helpers — balances are derived from append-only payment rows so offline
 * device merges keep every payment. All amounts are whole shillings.
 */

export type Vendor = {
  id: string;
  store_id: string;
  name: string;
  phone?: string;
  terms_days: number; // 0 = cash on delivery
  created_at: number;
  updated_at: number;
};

export type VendorPayment = {
  id: string;
  store_id: string;
  vendor_id: string;
  purchase_id: string;
  amount: number;
  method: "cash" | "bank";
  reference?: string;
  paid_by_name?: string;
  created_at: number;
};

type BillLike = { id: string; total_cost: number; on_credit?: boolean; vendor_id?: string; date: number; due_date?: number };

const DAY = 86_400_000;

export function paidOn(billId: string, payments: VendorPayment[]): number {
  return payments.filter((p) => p.purchase_id === billId).reduce((s, p) => s + Math.round(p.amount), 0);
}

/** Amount still owed on a supplier bill (0 for purchases paid at the time). */
export function billBalance(bill: BillLike, payments: VendorPayment[]): number {
  if (!bill.on_credit) return 0;
  return Math.max(0, Math.round(bill.total_cost) - paidOn(bill.id, payments));
}

export type Aging = "paid" | "current" | "due_soon" | "overdue";

/** QuickBooks-style status: due within 3 days = due soon, past due date = overdue. */
export function agingOf(bill: BillLike, payments: VendorPayment[], now = Date.now()): { status: Aging; daysOverdue: number } {
  if (billBalance(bill, payments) === 0) return { status: "paid", daysOverdue: 0 };
  const due = bill.due_date ?? bill.date;
  if (now > due) return { status: "overdue", daysOverdue: Math.max(1, Math.floor((now - due) / DAY)) };
  if (due - now <= 3 * DAY) return { status: "due_soon", daysOverdue: 0 };
  return { status: "current", daysOverdue: 0 };
}

export function dueDate(date: number, termsDays: number): number {
  return date + Math.max(0, Math.round(termsDays)) * DAY;
}

/** A payment may never exceed what is still owed on the bill. */
export function validPayment(bill: BillLike, payments: VendorPayment[], amount: number): boolean {
  const a = Math.round(amount);
  return a > 0 && a <= billBalance(bill, payments);
}
