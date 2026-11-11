import { it } from "node:test";
import assert from "node:assert/strict";
import { lossCharges, staffDebtBalances, unresolvedLosses } from "./staff-debts";

const A = { id: "a", name: "David" }, B = { id: "b", name: "Peter" }, C = { id: "c", name: "Asha" };
it("2 missing beers charged to the cashier at retail cost 10,000", () => assert.deepEqual(lossCharges(2, 2500, 5000, "cashier", "retail", [A]), { total: 10000, charges: [{ staff_id: "a", name: "David", amount: 10000 }] }));
it("cost basis charges 5,000", () => assert.equal(lossCharges(2, 2500, 5000, "waiter", "cost", [B]).total, 5000));
it("spoilage writes off at cost and charges nobody", () => assert.deepEqual(lossCharges(1, 2500, 5000, "spoilage", "retail", [A]), { total: 2500, charges: [] }));
it("10,000 split across 3 staff totals exactly 10,000", () => { const r = lossCharges(2, 2500, 5000, "team", "retail", [A, B, C]); assert.deepEqual(r.charges.map((c) => c.amount), [3334, 3333, 3333]); });
it("short lines without a decision block closing", () => assert.equal(unresolvedLosses([{ product_id: "x", name: "x", expected: 5, counted: 3 }, { product_id: "y", name: "y", expected: 5, counted: 5 }]).length, 1));
it("10,000 debt minus 4,000 settled leaves 6,000; open shifts don't count", () => {
  const shifts = [{ id: "s1", store_id: "st", closed_at: 1, stock_counts: [{ product_id: "x", name: "Beer", expected: 5, counted: 3, disposition: "waiter" as const, charges: [{ staff_id: "b", name: "Peter", amount: 10000 }] }] }, { id: "s2", store_id: "st", stock_counts: [{ product_id: "x", name: "Beer", expected: 5, counted: 3, charges: [{ staff_id: "b", name: "Peter", amount: 999 }] }] }];
  const pay = { id: "p", store_id: "st", staff_id: "b", amount: 4000, method: "cash" as const, created_at: 2 };
  assert.equal(staffDebtBalances(shifts, [pay, pay]).get("b")?.balance, 6000);
});
