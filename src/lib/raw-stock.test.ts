import { it } from "node:test";
import { strict as assert } from "node:assert";
import { applyRawChanges, rawStock } from "./raw-stock";
import { mergeSnapshots } from "./snapshot-merge";
const material = { id: "beans", store_id: "s", stock: 20 };
it("migration anchors 20 then deducts 3 only once, even on operation retry", () => {
  const result = applyRawChanges([material], [{ ...material, stock: 17 }], [], "cook1", 1, "cook");
  const r = result.materials[0]; assert.ok(r); if (!r) return;
  assert.equal(r.stock_anchor, 20); assert.equal(rawStock(r, result.movements), 17);
  const retry = applyRawChanges(result.materials, [{ ...r, stock: 14 }], result.movements, "cook1", 2, "cook");
  assert.equal(retry.movements.length, 1); assert.equal(retry.materials[0]?.stock, 17);
});
it("purchase and stock adjustment use the same anchored balance", () => {
  const cooked = applyRawChanges([material], [{ ...material, stock: 17 }], [], "cook", 1);
  const bought = applyRawChanges(cooked.materials, cooked.materials.map((r) => ({ ...r, stock: 22 })), cooked.movements, "purchase", 2);
  assert.equal(bought.materials[0]?.stock, 22); assert.equal(bought.movements.length, 2);
});
it("two offline devices retain both 3 kg and 5 kg deductions across reload/merge", () => {
  const a = applyRawChanges([material], [{ ...material, stock: 17 }], [], "a", 1);
  const b = applyRawChanges([material], [{ ...material, stock: 15 }], [], "b", 2);
  const merged = mergeSnapshots({ rawMaterials: a.materials, rawStockMovements: a.movements }, { rawMaterials: b.materials, rawStockMovements: b.movements });
  assert.equal(merged.rawStockMovements.length, 2); assert.equal(merged.rawMaterials[0]?.stock, 12);
  const reloaded = JSON.parse(JSON.stringify(merged)) as typeof merged; const r = reloaded.rawMaterials[0]; assert.ok(r); if (r) assert.equal(rawStock(r, reloaded.rawStockMovements), 12);
});