import { describe, it, expect } from "vitest";
import { toPieces, packSize, productDepartment } from "./pack-units";
describe("pack units", () => {
  it("2 crates of 25 become 50 bottles", () => expect(toPieces(2, { pack_size: 25 }, true)).toBe(50));
  it("loose purchase keeps quantity", () => expect(toPieces(3, { pack_size: 25 }, false)).toBe(3));
  it("no pack size means pieces", () => { expect(packSize({})).toBeNull(); expect(toPieces(2, {}, true)).toBe(2); });
  it("departments", () => { expect(productDepartment({ category: "Beer" })).toBe("drinks"); expect(productDepartment({ category: "Cigarettes" })).toBe("resale"); expect(productDepartment({ category: "Main" })).toBe("food"); expect(productDepartment({ category: "Beer", department: "resale" })).toBe("resale"); });
});
