import { it } from "node:test";
import { strict as assert } from "node:assert";
import { suggestSellingPrice, marginStatus, costChangePercent, voucherTotal } from "./costing-rules";

it("retail 25% markup on 2,500 cost suggests 3,150 (rounded up to 50)", () => {
  assert.equal(suggestSellingPrice(2500, 25), 3150);
  assert.equal(suggestSellingPrice(2000, 25), 2500);
});
it("food margin at or above 20% target is healthy", () => {
  assert.equal(marginStatus(2500, 2000, 20, 10).status, "healthy");
});
it("food margin between 10% floor and 20% target is squeezed", () => {
  const m = marginStatus(2500, 2150, 20, 10);
  assert.equal(m.status, "squeezed"); assert.equal(m.profit, 350); assert.equal(m.percent, 14);
});
it("food margin below 10% floor is critical", () => {
  assert.equal(marginStatus(2500, 2320, 20, 10).status, "critical");
});
it("cost change from 2,000 to 2,500 is +25%", () => {
  assert.equal(costChangePercent(2000, 2500), 25);
  assert.equal(costChangePercent(0, 2500), null);
});
it("voucher total sums lines and rejects invalid lines", () => {
  assert.equal(voucherTotal([{ item_id: "a", qty: 20, total_cost: 40000 }, { item_id: "b", qty: 12, total_cost: 30000 }]), 70000);
  assert.equal(voucherTotal([{ item_id: "a", qty: 0, total_cost: 100 }]), null);
  assert.equal(voucherTotal([]), null);
});
