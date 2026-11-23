import { scalePotRecipe, type CookedPotRecipe, type RecipeRaw } from "./pot-recipes";
import { rawStock, type AnchoredRaw, type RawStockMovement } from "./raw-stock";
type Data = Record<string, unknown>;
type Row = Record<string, unknown>;
const rows = (d: Data, field: string): Row[] => Array.isArray(d[field]) ? d[field] as Row[] : [];
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
/** Called only with the server's verified actor and locked previous snapshot. */
export function validatePotSnapshot(previous: Data, incoming: Data, userId: string, storeIds: Set<string>, role: string) {
  const actor = rows(previous, "profiles").find((r) => r['id'] === userId);
  const staffRole = (sid: string) => (actor?.['memberships'] as { store_id: string; staff_role: string }[] | undefined)?.find((m) => m.store_id === sid)?.staff_role ?? (actor?.['store_id'] === sid ? actor?.['staff_role'] : undefined);
  const manager = (sid: string) => role === "staff" && ["owner", "supervisor"].includes(String(staffRole(sid)));
  const producer = (sid: string) => manager(sid) || role === "staff" && staffRole(sid) === "kitchen";
  const scoped = (field: string) => rows(incoming, field).filter((r) => storeIds.has(String(r['store_id'])));
  for (const r of scoped("cookedPotRecipes")) {
    const old = rows(previous, "cookedPotRecipes").find((x) => x['id'] === r['id']);
    if (old && equal(old, r)) continue;
    if (!manager(String(r['store_id']))) throw new Error("Only a supervisor or owner can edit recipes");
    const recipe = r as unknown as CookedPotRecipe;
    const check = scalePotRecipe({ ...recipe, archived_at: undefined }, 1, rows(incoming, "rawMaterials") as unknown as RecipeRaw[], false);
    if (!check.ok || !Number.isFinite(recipe.updated_at)) throw new Error("Invalid pot recipe");
    if (old) {
      const { archived_at: a, updated_at: t, ...oldRecipe } = old;
      const { archived_at: b, updated_at: u, ...newRecipe } = r;
      if (!equal(oldRecipe, newRecipe)) throw new Error("Recipe revisions must retain the original recipe");
    }
  }
  const allRecipes = [...rows(incoming, "cookedPotRecipes"), ...rows(previous, "cookedPotRecipes")];
  for (const r of scoped("cookedCommodityBatches")) {
    const old = rows(previous, "cookedCommodityBatches").find((x) => x['id'] === r['id']);
    const frozen = ["recipe_id", "ingredients_snapshot", "raw_cost", "unit_cost", "base_quantity", "estimated_extra", "estimated_unit_cost", "initial_quantity", "name", "unit", "produced_by", "carried_from"];
    if (old) {
      if ((old['recipe_id'] || r['recipe_id']) && frozen.some((k) => !equal(old[k], r[k]))) throw new Error("Historical production costs cannot change");
      continue;
    }
    if (!r['recipe_id']) continue; // legacy pots retain unknown costs
    if (!producer(String(r['store_id']))) throw new Error("Only kitchen staff or managers can produce pots");
    if (r['carried_from']) {
      const source = [...rows(previous, "cookedCommodityUsages"), ...rows(incoming, "cookedCommodityUsages")].find((x) => x['id'] === r['carried_from'] && x['kind'] === "carry_over" && x['store_id'] === r['store_id']);
      const parent = source && [...rows(previous, "cookedCommodityBatches"), ...rows(incoming, "cookedCommodityBatches")].find((x) => x['id'] === source['batch_id']);
      if (!source || !parent || r['initial_quantity'] !== source['quantity'] || ["recipe_id", "unit_cost", "ingredients_snapshot", "estimated_unit_cost"].some((k) => !equal(parent[k], r[k]))) throw new Error("Invalid carry-over cost transfer");
      continue;
    }
    const recipe = allRecipes.find((x) => x['id'] === r['recipe_id'] && x['store_id'] === r['store_id']) as unknown as CookedPotRecipe | undefined;
    if (!recipe || r['produced_by'] !== userId || !Number.isFinite(r['created_at'])) throw new Error("Invalid production evidence");
    const ingredientRows = r['ingredients_snapshot'] as { raw_id: string; unit_cost: number | null }[] | undefined;
    const raw = rows(incoming, "rawMaterials").map((x) => ({ ...x, avg_cost: ingredientRows?.find((i) => i.raw_id === x['id'])?.unit_cost ?? 0 })) as unknown as RecipeRaw[];
    const check = scalePotRecipe({ ...recipe, archived_at: undefined }, Number(r['base_quantity']), raw, false);
    if (!check.ok || !equal(check.value.ingredients, ingredientRows) || r['initial_quantity'] !== check.value.output || r['unit'] !== recipe.output_unit || r['name'] !== recipe.name || r['raw_cost'] !== check.value.raw_cost || r['unit_cost'] !== check.value.unit_cost || r['estimated_extra'] !== check.value.estimated_extra || r['estimated_unit_cost'] !== check.value.estimated_unit_cost) throw new Error("Invalid scaled production evidence");
    for (const i of check.value.ingredients) {
      const movement = rows(incoming, "rawStockMovements").find((m) => m['id'] === `${r['id']}:${i.raw_id}` && m['store_id'] === r['store_id']);
      if (!movement || movement['quantity'] !== -i.qty || movement['operation_id'] !== r['id']) throw new Error("Production ingredient deduction is missing");
    }
  }
  for (const r of scoped("rawStockMovements")) {
    const old = rows(previous, "rawStockMovements").find((x) => x['id'] === r['id']);
    if (old) { if (!equal(old, r)) throw new Error("Raw stock movements are immutable"); continue; }
    const sid = String(r['store_id']);
    if (!producer(sid) || r['by_id'] !== userId || !Number.isFinite(r['quantity']) || !Number.isFinite(r['created_at']) || typeof r['operation_id'] !== "string" || r['id'] !== `${r['operation_id']}:${r['raw_id']}`) throw new Error("Invalid raw stock movement");
    if (!manager(sid)) {
      const batch = scoped("cookedCommodityBatches").find((b) => b['id'] === r['operation_id'] && b['produced_by'] === userId && !b['carried_from']);
      const ingredient = (batch?.['ingredients_snapshot'] as { raw_id: string; qty: number }[] | undefined)?.find((i) => i.raw_id === r['raw_id']);
      if (!ingredient || r['quantity'] !== -ingredient.qty) throw new Error("Kitchen stock changes require recipe production");
    }
  }
  const movements = [...rows(previous, "rawStockMovements"), ...rows(incoming, "rawStockMovements")] as unknown as RawStockMovement[];
  for (const r of scoped("rawMaterials")) {
    const old = rows(previous, "rawMaterials").find((x) => x['id'] === r['id']);
    if (r['stock_anchor'] == null && old?.['stock_anchor'] == null) continue;
    if (!Number.isFinite(r['stock_anchor'])) throw new Error("Invalid raw stock anchor");
    if (old?.['stock_anchor'] != null && old['stock_anchor'] !== r['stock_anchor']) throw new Error("Raw stock anchor cannot change");
    if (old && old['stock_anchor'] == null && old['stock'] !== r['stock_anchor']) throw new Error("Raw stock opening must match verified stock");
    if (!old && !manager(String(r['store_id']))) throw new Error("Only managers can create raw materials");
    if (r['stock'] !== rawStock(r as unknown as AnchoredRaw, movements)) throw new Error("Raw stock balance does not match movements");
  }
}