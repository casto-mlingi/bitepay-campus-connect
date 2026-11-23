export type PotUnit = "kg" | "liters" | "pcs";
export type CookedPotRecipe = {
  id: string; store_id: string; name: string; base_raw_id: string; base_unit: PotUnit;
  output_unit: PotUnit; yield_per_base_unit: number;
  ingredients: { raw_id: string; unit: PotUnit; qty_per_base_unit: number }[];
  spice_cost_per_base_unit: number; updated_at: number; archived_at?: number;
};
export type RecipeRaw = { id: string; store_id: string; name: string; unit: PotUnit; stock: number; avg_cost: number; converted_product_id?: string };
export type FrozenIngredient = { raw_id: string; name: string; unit: PotUnit; qty: number; unit_cost: number | null };
export type ProductionPlan = { ingredients: FrozenIngredient[]; output: number; raw_cost: number | null; estimated_extra: number; unit_cost: number | null; estimated_unit_cost: number | null };
const round = (n: number) => Math.round(n * 1e9) / 1e9;
export function scalePotRecipe(recipe: CookedPotRecipe, units: number, raw: RecipeRaw[], checkStock = true): { ok: true; value: ProductionPlan } | { ok: false; reason: string } {
  if (!recipe.name.trim() || recipe.archived_at || !Number.isFinite(units) || units <= 0 || !Number.isFinite(recipe.yield_per_base_unit) || recipe.yield_per_base_unit <= 0 || !Number.isFinite(recipe.spice_cost_per_base_unit) || recipe.spice_cost_per_base_unit < 0) return { ok: false, reason: "Enter a valid recipe and cooking quantity" };
  const base = raw.find((r) => r.id === recipe.base_raw_id && r.store_id === recipe.store_id && !r.converted_product_id);
  if (!base || base.unit !== recipe.base_unit || !["kg", "liters", "pcs"].includes(recipe.output_unit)) return { ok: false, reason: "Recipe units do not match raw stock" };
  const totals = new Map<string, { unit: PotUnit; qty: number }>();
  for (const ing of recipe.ingredients) {
    if (!Number.isFinite(ing.qty_per_base_unit) || ing.qty_per_base_unit <= 0) return { ok: false, reason: "Enter a positive ingredient quantity" };
    const prior = totals.get(ing.raw_id);
    if (prior && prior.unit !== ing.unit) return { ok: false, reason: "Recipe units do not match raw stock" };
    totals.set(ing.raw_id, { unit: ing.unit, qty: round((prior?.qty ?? 0) + ing.qty_per_base_unit * units) });
  }
  if (!totals.size || Math.abs((totals.get(recipe.base_raw_id)?.qty ?? 0) - units) > 1e-7) return { ok: false, reason: "Main ingredient must equal one base unit" };
  const ingredients: FrozenIngredient[] = [];
  let known = true, cost = 0;
  for (const [id, ing] of totals) {
    const r = raw.find((x) => x.id === id && x.store_id === recipe.store_id && !x.converted_product_id);
    if (!r || r.unit !== ing.unit) return { ok: false, reason: "Recipe units do not match raw stock" };
    if (!Number.isFinite(ing.qty) || ing.qty <= 0) return { ok: false, reason: "Enter a positive ingredient quantity" };
    if (checkStock && (!Number.isFinite(r.stock) || r.stock + 1e-9 < ing.qty)) return { ok: false, reason: `Not enough raw stock: ${r.name} (${round(ing.qty - r.stock)} ${r.unit})` };
    const unit_cost = Number.isFinite(r.avg_cost) && r.avg_cost > 0 ? r.avg_cost : null;
    known = known && unit_cost !== null;
    cost += ing.qty * (unit_cost ?? 0);
    ingredients.push({ raw_id: id, name: r.name, unit: r.unit, qty: ing.qty, unit_cost });
  }
  const output = round(units * recipe.yield_per_base_unit), extra = round(units * recipe.spice_cost_per_base_unit);
  if (!Number.isFinite(output) || output <= 0 || !Number.isFinite(cost + extra)) return { ok: false, reason: "Enter a valid recipe and cooking quantity" };
  return { ok: true, value: { ingredients, output, raw_cost: known ? cost : null, estimated_extra: extra, unit_cost: known ? cost / output : null, estimated_unit_cost: known ? (cost + extra) / output : null } };
}