import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { maxLineQty, remainingStock } from "./pos-stock";

const bills = [{ id: "b1", items: [{ product_id: "p", qty: 2 }] }, { id: "b2", items: [{ product_id: "p", qty: 1 }] }];

describe("POS stock reservation", () => {
  it("remaining subtracts current bill and other open bills", () => {
    assert.equal(remainingStock(10, "p", [{ product_id: "p", qty: 3 }], bills, null), 4);
  });
  it("the reopened bill is not counted twice", () => {
    assert.equal(remainingStock(10, "p", [{ product_id: "p", qty: 2 }], bills, "b1"), 7);
  });
  it("removing items returns stock", () => {
    assert.equal(remainingStock(10, "p", [], bills, null), 7);
  });
  it("cannot exceed available stock", () => {
    assert.equal(maxLineQty(5, "p", bills, null), 2);
    assert.equal(maxLineQty(2, "p", bills, null), 0);
  });
  it("untracked products are unlimited", () => {
    assert.equal(remainingStock(null, "p", [], bills, null), null);
    assert.equal(maxLineQty(null, "p", bills, null), Infinity);
  });
});
