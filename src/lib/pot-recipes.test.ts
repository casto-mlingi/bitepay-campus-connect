import { it } from "node:test";
import { strict as assert } from "node:assert";
import { scalePotRecipe, type CookedPotRecipe, type RecipeRaw } from "./pot-recipes";
export const recipe: CookedPotRecipe = { id: "recipe", store_id: "s", name: "Beans", base_raw_id: "beans", base_unit: "kg", output_unit: "pcs", yield_per_base_unit: 10,
  ingredients: [{ raw_id: "beans", unit: "kg", qty_per_base_unit: 1 }, { raw_id: "oil", unit: "liters", qty_per_base_unit: 0.5 }, { raw_id: "onion", unit: "kg", qty_per_base_unit: 0.1 }], spice_cost_per_base_unit: 100, updated_at: 1 };
export const raw: RecipeRaw[] = [
  { id: "beans", store_id: "s", name: "Beans raw", unit: "kg", stock: 20, avg_cost: 2000 },
  { id: "oil", store_id: "s", name: "Oil", unit: "liters", stock: 10, avg_cost: 3000 },
  { id: "onion", store_id: "s", name: "Onion", unit: "kg", stock: 5, avg_cost: 1000 },
];
it("3 kg scales to 3 kg beans, 1.5 L oil, 0.3 kg onions and 30 portions", () => {
  const p = scalePotRecipe(recipe, 3, raw); assert.ok(p.ok); if (!p.ok) return;
  assert.deepEqual(p.value.ingredients.map((i) => i.qty), [3, 1.5, 0.3]); assert.equal(p.value.output, 30);
  assert.equal(p.value.raw_cost, 10800); assert.equal(p.value.estimated_extra, 300); assert.equal(p.value.unit_cost, 360); assert.equal(p.value.estimated_unit_cost, 370);
});
it("10 kg scales to 10 kg beans, 5 L oil and 1 kg onions", () => {
  const p = scalePotRecipe(recipe, 10, raw); assert.ok(p.ok); if (p.ok) assert.deepEqual(p.value.ingredients.map((i) => i.qty), [10, 5, 1]);
});
it("missing oil rejects the whole production without changing any ingredient", () => {
  const input = raw.map((r) => r.id === "oil" ? { ...r, stock: 1 } : { ...r }); const saved = JSON.stringify(input);
  assert.equal(scalePotRecipe(recipe, 3, input).ok, false); assert.equal(JSON.stringify(input), saved);
});
it("zero, negative and non-finite cooking quantities are rejected", () => {
  for (const q of [0, -1, NaN, Infinity]) assert.equal(scalePotRecipe(recipe, q, raw).ok, false);
});
it("duplicate oil lines aggregate before checking stock", () => {
  const r = { ...recipe, ingredients: [...recipe.ingredients, { raw_id: "oil", unit: "liters" as const, qty_per_base_unit: 0.5 }] };
  const p = scalePotRecipe(r, 3, raw); assert.ok(p.ok); if (p.ok) assert.equal(p.value.ingredients.find((i) => i.raw_id === "oil")?.qty, 3);
  assert.equal(scalePotRecipe(r, 3, raw.map((r) => r.id === "oil" ? { ...r, stock: 2 } : r)).ok, false);
});
it("unknown costs stay unknown and incompatible ingredient units are rejected", () => {
  const p = scalePotRecipe(recipe, 1, raw.map((r) => ({ ...r, avg_cost: 0 }))); assert.ok(p.ok); if (p.ok) assert.equal(p.value.raw_cost, null);
  assert.equal(scalePotRecipe({ ...recipe, base_unit: "liters" }, 1, raw).ok, false);
});