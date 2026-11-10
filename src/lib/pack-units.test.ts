import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { toPieces, packSize, productDepartment } from "./pack-units";
describe("pack units", () => {
  it("2 crates of 25 become 50 bottles", () => assert.equal(toPieces(2, { pack_size: 25 }, true), 50));
  it("loose purchase keeps quantity", () => assert.equal(toPieces(3, { pack_size: 25 }, false), 3));
  it("no pack size means pieces", () => { assert.equal(packSize({}), null); assert.equal(toPieces(2, {}, true), 2); });
  it("departments", () => { assert.equal(productDepartment({ category: "Beer" }), "drinks"); assert.equal(productDepartment({ category: "Cigarettes" }), "resale"); assert.equal(productDepartment({ category: "Main" }), "food"); assert.equal(productDepartment({ category: "Beer", department: "resale" }), "resale"); });
});
