import { it } from "node:test";
import { strict as assert } from "node:assert";
import { planPotClosure, pendingCarryOvers, isNextKitchenDay, disposalSummary, type ClosureUsage } from "./pot-closure";
import { potRemaining, potTotals, platesFromPots } from "./cooked-availability";
import { mergeSnapshots } from "./snapshot-merge";

const pot = { id: "beans", name: "Beans", unit: "pcs", initial_quantity: 50, store_id: "s", active: true };
const sale: ClosureUsage = { id: "sale", batch_id: "beans", quantity: 30, created_at: 1 };
const close: ClosureUsage = { id: "close:beans", batch_id: "beans", quantity: 20, kind: "carry_over", closes_batch: true, created_at: 2 };
it("carry-over defaults off", () => { assert.equal(planPotClosure(pot, [sale], 20, "carry_over").ok, false); });
it("enabled carry-over records 20 unsold portions without editing 30 sold portions", () => {
  const before = JSON.stringify(sale);
  assert.deepEqual(planPotClosure(pot, [sale], 20, "carry_over", true), { ok: true, quantity: 20, discrepancy: 0, mode: "carry_over" });
  assert.equal(JSON.stringify(sale), before);
});
it("closing removes sellable stock even after a stale-device merge and refund", () => {
  const merged = mergeSnapshots({ rows: [sale, close] }, { rows: [sale] });
  assert.equal(potRemaining(pot, [...merged.rows, { batch_id: "beans", quantity: -5 }]), 0);
  assert.equal(platesFromPots("dish", [{ product_id: "dish", commodity_name: "Beans", quantity: 1, unit: "pcs", store_id: "s" }], potTotals([pot], merged.rows, "s"), "s"), 0);
});
it("a smaller physical count accounts for the missing remainder as waste", () => {
  assert.deepEqual(planPotClosure(pot, [sale], 15, "carry_over", true), { ok: true, quantity: 15, discrepancy: 5, mode: "carry_over" });
});
it("invalid counts and repeated closure are rejected", () => {
  for (const q of [NaN, Infinity, -1, 21]) assert.equal(planPotClosure(pot, [sale], q, "waste").ok, false);
  assert.equal(planPotClosure(pot, [sale, close], 0, "waste").ok, false);
});
it("carry-over release is one-use and keeps the original record", () => {
  const release: ClosureUsage = { id: "release:close:beans", batch_id: "beans", quantity: 0, kind: "carry_over_release", source_usage_id: close.id, created_at: 3 };
  assert.equal(pendingCarryOvers([sale, close]).length, 1);
  assert.equal(pendingCarryOvers([sale, close, release]).length, 0);
  assert.equal(close.quantity, 20);
});
it("carry-over can be returned only on a later calendar day", () => {
  const day = new Date(2026, 10, 20, 18).getTime();
  assert.equal(isNextKitchenDay(day, new Date(2026, 10, 20, 23).getTime()), false);
  assert.equal(isNextKitchenDay(day, new Date(2026, 10, 21, 6).getTime()), true);
});
it("reports separate waste from carry-over and keep units separate within the shift", () => {
  assert.deepEqual(disposalSummary([pot, { ...pot, id: "soup", unit: "liters" }], [sale, close, { id: "w", batch_id: "soup", quantity: 3, kind: "waste", created_at: 3 }], 2, 4), [{ unit: "pcs", waste: 0, carry: 20 }, { unit: "liters", waste: 3, carry: 0 }]);
});