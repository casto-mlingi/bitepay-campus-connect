import { it } from "node:test";
import { strict as assert } from "node:assert";
import { hospitalityCosting } from "./hospitality-costing";

const batch = { id: "b", product_id: "p", plates: 1000, plates_remaining: 950, unit_cost: 5000, created_at: 1 };
const sale = { id: "s", created_at: 2, items: [{ product_id: "p", qty: 50 }] };
it("50 of 1,000 plates recognize 250,000 cost and retain 4,750,000 stock", () => {
  const result = hospitalityCosting([sale], [batch]);
  assert.equal(result.cogs, 250000);
  assert.equal(result.inventoryValue, 4750000);
});
it("unsold preparation and purchases create no COGS", () => {
  assert.equal(hospitalityCosting([], [{ ...batch, plates_remaining: 1000 }]).cogs, 0);
});
it("stock loss is not silently treated as a sale", () => {
  assert.equal(hospitalityCosting([sale], [{ ...batch, plates_remaining: 900 }]).cogs, 250000);
});
it("a full refund reverses the original 250,000 cost", () => {
  const refund = { ...sale, id: "r", created_at: 3, is_reversal: true, reversal_of: "s", items: [{ product_id: "p", qty: -50 }] };
  const result = hospitalityCosting([refund, sale], [batch]);
  assert.equal(result.cogs, 0);
  assert.equal(result.entries.find((e) => e.id === "r")?.amount, -250000);
});
it("resale FIFO consumes 20 pieces at 2,000 then 5 at 2,500", () => {
  const result = hospitalityCosting([{ ...sale, items: [{ product_id: "p", qty: 25 }], created_at: 4 }], [
    { ...batch, plates: 20, unit_cost: 2000 }, { ...batch, id: "b2", plates: 12, unit_cost: 2500, created_at: 3 },
  ]);
  assert.equal(result.cogs, 52500);
});
it("saved cost takes precedence and missing history is flagged, not fabricated", () => {
  assert.equal(hospitalityCosting([{ ...sale, cost_amount: 12345 }], []).cogs, 12345);
  const missing = hospitalityCosting([sale], []);
  assert.equal(missing.cogs, 0);
  assert.equal(missing.uncostedQuantity, 50);
});
it("future batches cannot supply costs to an older sale", () => {
  assert.equal(hospitalityCosting([sale], [{ ...batch, created_at: 3 }]).uncostedQuantity, 50);
});
const pot = { id: "pot", store_id: "s", name: "Beans", unit: "pcs", active: true, initial_quantity: 30, unit_cost: 360 };
const draw = { id: "u", batch_id: "pot", product_id: "p", order_id: "s", quantity: 5, created_at: 2 };
it("actual pot usage costs 1,800 without adding legacy dish batch cost", () => {
  const result = hospitalityCosting([{ ...sale, items: [{ product_id: "p", qty: 5 }] }], [batch], [pot], [draw]);
  assert.equal(result.cogs, 1800); assert.equal(result.uncostedQuantity, 0);
});
it("waste and carry-over remain separate from sold costs", () => {
  const waste = { ...draw, id: "w", kind: "waste" as const, quantity: 5, closes_batch: true };
  const carry = { ...draw, id: "c", kind: "carry_over" as const, quantity: 20 };
  const result = hospitalityCosting([sale], [], [pot], [draw, waste, carry]);
  assert.equal(result.cogs, 1800); assert.equal(result.wasteCost, 1800); assert.equal(result.inventoryValue, 7200);
});
it("released carry-over retains original cost without counting stored stock twice", () => {
  const carry = { ...draw, id: "c", kind: "carry_over" as const, quantity: 25, closes_batch: true };
  const release = { ...draw, id: "release", kind: "carry_over_release" as const, source_usage_id: "c", quantity: 0 };
  const result = hospitalityCosting([sale], [], [pot, { ...pot, id: "next", initial_quantity: 25 }], [draw, carry, release]);
  assert.equal(result.inventoryValue, 9000); assert.equal(result.cogs, 1800);
});
it("unknown legacy pot costs are flagged and refunds reverse frozen costs", () => {
  const missing = hospitalityCosting([{ ...sale, items: [{ product_id: "p", qty: 5 }] }], [batch], [{ ...pot, unit_cost: undefined }], [draw]);
  assert.equal(missing.cogs, 0); assert.equal(missing.uncostedQuantity, 5);
  const refund = { ...sale, id: "refund", is_reversal: true, reversal_of: "s", created_at: 3, items: [{ product_id: "p", qty: -5 }] };
  assert.equal(hospitalityCosting([sale, refund], [], [pot], [draw]).cogs, 0);
});