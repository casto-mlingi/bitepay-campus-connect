import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { shiftTotals, validHandover } from "./shift-controls";
import type { Profile, Shift, Order, Transaction, Purchase, Expense, VendorPayment } from "./store";
export const confirmHandover = createServerFn({ method: "POST" }).inputValidator(z.object({ shift_id: z.string(), counted_cash: z.number(), counted_mobile: z.number(), retained_float: z.number(), cash_drop: z.number(), witness_id: z.string(), witness_pin: z.string(), notes: z.string().max(1000).optional() })).handler(async ({ data }) => {
  const { readSessionCookie } = await import("./auth/session.server");
  const session = readSessionCookie();
  if (!session || session.role !== "staff") throw new Error("Sign in to confirm handover");
  if (!validHandover(data.counted_cash, data.retained_float, data.cash_drop, data.counted_mobile)) throw new Error("Cash retained plus cash handed over must equal your count");
  const { getSql } = await import("./db.server");
  return getSql().begin(async (tx) => {
    const [row] = await tx`select payload, revision from app_snapshots where key='global' for update`;
    if (!row) throw new Error("Store data unavailable");
    const snap = JSON.parse(String(row.payload)) as { profiles: Profile[]; shifts: Shift[]; orders: Order[]; transactions: Transaction[]; purchases: Purchase[]; expenses: Expense[]; vendorPayments?: VendorPayment[] };
    const shift = snap.shifts.find((s) => s.id === data.shift_id);
    if (!shift || shift.cashier_id !== session.uid || shift.closed_at) throw new Error("Shift unavailable or already closed");
    const witness = snap.profiles.find((p) => p.id === data.witness_id && !p.disabled && p.role === "staff");
    const role = witness?.memberships?.find((m) => m.store_id === shift.store_id)?.staff_role ?? (witness?.store_id === shift.store_id ? witness.staff_role : undefined);
    if (!witness || witness.id === session.uid || !role || role === "waiter" || !witness.staff_pin || witness.staff_pin !== data.witness_pin) throw new Error("A different cashier or manager must confirm with their own PIN");
    const outflows = [...snap.purchases.filter((p) => !p.on_credit).map((p) => ({ shift_id: p.shift_id, amount: p.total_cost, method: p.payment_method })), ...snap.expenses.map((p) => ({ shift_id: p.shift_id, amount: p.amount, method: p.payment_method })), ...(snap.vendorPayments ?? [])];
    const totals = shiftTotals(shift.id, shift.opening_float, snap.orders, snap.transactions, outflows);
    const now = Date.now();
    const closed: Shift = { ...shift, ...totals, counted_cash: data.counted_cash, counted_mobile: data.counted_mobile, retained_float: data.retained_float, cash_drop: data.cash_drop, witness_id: witness.id, witness_name: witness.full_name, closed_at: now, updated_at: now, cash_variance: data.counted_cash - totals.expected_cash, mobile_variance: data.counted_mobile - totals.expected_mobile, notes: data.notes };
    snap.shifts = snap.shifts.map((s) => s.id === shift.id ? closed : s);
    await tx`update app_snapshots set payload=${JSON.stringify(snap)}, revision=${Number(row.revision) + 1}, updated_at=now() where key='global'`;
    return closed;
  });
});