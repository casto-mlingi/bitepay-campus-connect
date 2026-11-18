import { it } from "node:test";
import { strict as assert } from "node:assert";
import { potTotals, platesFromPots } from "./cooked-availability";

const pot = (id: string, name: string, q: number) => ({ id, name, unit: "pcs", initial_quantity: q, active: true, store_id: "s" });
const map = (product_id: string, commodity_name: string) => ({ product_id, commodity_name, quantity: 1, unit: "pcs", store_id: "s" });
const pots = [pot("r", "Wali", 100), pot("f", "Samaki", 30), pot("b", "Maharage", 60)];
const portions = [map("ws", "Wali"), map("ws", "Samaki"), map("wm", "Wali"), map("wm", "Maharage")];

it("fish sold out blocks Wali Samaki but Wali Maharage keeps selling", () => {
  const totals = potTotals(pots, [{ batch_id: "f", quantity: 30 }, { batch_id: "r", quantity: 30 }], "s");
  assert.equal(platesFromPots("ws", portions, totals, "s"), 0);
  assert.equal(platesFromPots("wm", portions, totals, "s"), 60);
});
it("a second pot of rice adds to the first", () => {
  const totals = potTotals([...pots, pot("r2", "Wali", 40)], [{ batch_id: "r", quantity: 100 }], "s");
  assert.equal(platesFromPots("wm", portions, totals, "s"), 40);
});
it("dishes without pot links are unlimited by pots", () => {
  assert.equal(platesFromPots("soda", portions, potTotals(pots, [], "s"), "s"), null);
});
