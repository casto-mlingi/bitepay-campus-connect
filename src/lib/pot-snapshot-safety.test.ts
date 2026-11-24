import { it } from "node:test";
import { strict as assert } from "node:assert";
import { validatePotSnapshot } from "./pot-snapshot-safety";
import { scalePotRecipe } from "./pot-recipes";
import { recipe, raw } from "./pot-recipes.test";
import { applyRawChanges } from "./raw-stock";
const profiles = [{ id: "owner", store_id: "s", staff_role: "owner" }, { id: "cook", store_id: "s", staff_role: "kitchen" }];
const previous = { profiles, cookedPotRecipes: [recipe], rawMaterials: raw, rawStockMovements: [], cookedCommodityBatches: [] };
function produced() {
  const plan = scalePotRecipe(recipe, 3, raw); if (!plan.ok) throw Error(plan.reason);
  const v = plan.value;
  const inventory = applyRawChanges(raw, raw.map((r) => ({ ...r, stock: r.stock - (v.ingredients.find((i) => i.raw_id === r.id)?.qty ?? 0) })), [], "op", 2, "cook");
  return { ...previous, rawMaterials: inventory.materials, rawStockMovements: inventory.movements, cookedCommodityBatches: [{ id: "op", store_id: "s", recipe_id: recipe.id, produced_by: "cook", created_at: 2, base_quantity: 3,
    name: recipe.name, unit: recipe.output_unit, initial_quantity: v.output, ingredients_snapshot: v.ingredients, raw_cost: v.raw_cost, unit_cost: v.unit_cost, estimated_extra: v.estimated_extra, estimated_unit_cost: v.estimated_unit_cost }] };
}
it("kitchen can submit an evidenced scaled pot with all ingredient deductions", () => {
  assert.doesNotThrow(() => validatePotSnapshot(previous, produced(), "cook", new Set(["s"]), "staff"));
});
it("kitchen cannot edit a recipe", () => {
  assert.throws(() => validatePotSnapshot(previous, { ...previous, cookedPotRecipes: [{ ...recipe, yield_per_base_unit: 20 }] }, "cook", new Set(["s"]), "staff"));
});
it("missing deduction rejects production", () => {
  const next = produced(); next.rawStockMovements = next.rawStockMovements.filter((m) => m.raw_id !== "oil");
  assert.throws(() => validatePotSnapshot(previous, next, "cook", new Set(["s"]), "staff"));
});
it("manager revisions preserve the original recipe instead of rewriting it", () => {
  assert.doesNotThrow(() => validatePotSnapshot(previous, { ...previous, cookedPotRecipes: [{ ...recipe, archived_at: 3, updated_at: 3 }, { ...recipe, id: "v2", yield_per_base_unit: 12, updated_at: 3 }] }, "owner", new Set(["s"]), "staff"));
  assert.throws(() => validatePotSnapshot(previous, { ...previous, cookedPotRecipes: [{ ...recipe, yield_per_base_unit: 12, updated_at: 3 }] }, "owner", new Set(["s"]), "staff"));
});
it("historical production costs and movement rows cannot be overwritten", () => {
  const next = produced(); const first = next.cookedCommodityBatches[0]; assert.ok(first); if (!first) return;
  assert.throws(() => validatePotSnapshot(next, { ...next, cookedCommodityBatches: [{ ...first, unit_cost: 0 }] }, "owner", new Set(["s"]), "staff"));
  assert.throws(() => validatePotSnapshot(next, { ...next, rawStockMovements: next.rawStockMovements.map((m) => ({ ...m, quantity: 0 })) }, "owner", new Set(["s"]), "staff"));
});