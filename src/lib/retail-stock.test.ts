import { it } from "node:test";
import assert from "node:assert/strict";
import { retailStock, retailUnitCost } from "./retail-stock";
it("retail purchase adds stock and sale reduces it", () => { const p = { id: "p", opening_stock: 2, cost_price: 1000 }; const receipts = [{ product_id: "p", qty: 5, total_cost: 5000 }]; assert.equal(retailStock(p, receipts, []), 7); assert.equal(retailStock(p, receipts, [{ items: [{ product_id: "p", qty: 3 }] }]), 4); assert.equal(retailUnitCost(p, receipts), 1000); });
it("refund quantities return stock without losing the original sale", () => { const orders = [{ items: [{ product_id: "p", qty: 3 }] }, { items: [{ product_id: "p", qty: -3 }] }]; assert.equal(retailStock({ id: "p", opening_stock: 5 }, [], orders), 5); });
it("two merged sales preserve both deductions", () => { assert.equal(retailStock({ id: "p", opening_stock: 10 }, [], [{ items: [{ product_id: "p", qty: 2 }] }, { items: [{ product_id: "p", qty: 3 }] }]), 5); });
it("empty starter goods have zero stock, not unlimited", () => { assert.equal(retailStock({ id: "p" }, [], []), 0); });