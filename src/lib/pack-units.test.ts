import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { toPieces, packSize, productDepartment, normalizePack, packLabel } from "./pack-units";
describe("pack units", () => {
  it("2 crates of 25 become 50 bottles", () => assert.equal(toPieces(2, { pack_size: 25 }, true), 50));
  it("pack fields need a pack unit and at least 2 pieces", () => {
    assert.deepEqual(normalizePack("Crate", 25), { pack_unit: "crate", pack_size: 25 });
    assert.deepEqual(normalizePack("crate", 1), {});
    assert.deepEqual(normalizePack("pcs", 25), {});
    assert.deepEqual(normalizePack("", 25), {});
    assert.deepEqual(normalizePack("crate", 0), {});
    assert.deepEqual(normalizePack(undefined, undefined), {});
  });
  it("pack label reads like a supplier note", () => {
    assert.equal(packLabel({ pack_unit: "crate", pack_size: 25 }), "crate × 25");
    assert.equal(packLabel({}), "—");
  });
  it("loose purchase keeps quantity", () => assert.equal(toPieces(3, { pack_size: 25 }, false), 3));
  it("no pack size means pieces", () => { assert.equal(packSize({}), null); assert.equal(toPieces(2, {}, true), 2); });
  it("departments", () => { assert.equal(productDepartment({ category: "Beer" }), "drinks"); assert.equal(productDepartment({ category: "Cigarettes" }), "resale"); assert.equal(productDepartment({ category: "Main" }), "food"); assert.equal(productDepartment({ category: "Beer", department: "resale" }), "resale"); });
});
