import { describe, expect, test } from "bun:test";
import { maxLineQty, remainingStock } from "./pos-stock";

const bills = [{ id: "b1", items: [{ product_id: "p", qty: 2 }] }, { id: "b2", items: [{ product_id: "p", qty: 1 }] }];

describe("POS stock reservation", () => {
  test("remaining subtracts current bill and other open bills", () => {
    expect(remainingStock(10, "p", [{ product_id: "p", qty: 3 }], bills, null)).toBe(4);
  });
  test("the reopened bill is not counted twice", () => {
    expect(remainingStock(10, "p", [{ product_id: "p", qty: 2 }], bills, "b1")).toBe(7);
  });
  test("removing items returns stock", () => {
    expect(remainingStock(10, "p", [], bills, null)).toBe(7);
  });
  test("cannot exceed available stock", () => {
    expect(maxLineQty(5, "p", bills, null)).toBe(2);
    expect(maxLineQty(2, "p", bills, null)).toBe(0);
  });
  test("untracked products are unlimited", () => {
    expect(remainingStock(null, "p", [], bills, null)).toBeNull();
    expect(maxLineQty(null, "p", bills, null)).toBe(Infinity);
  });
});
