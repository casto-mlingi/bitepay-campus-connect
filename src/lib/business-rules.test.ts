import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { canApproveRefund, hasTableService, isBeverage, validScanGrant, newOrderId, waiterCanTakePayment, type ScanGrant } from "./business-rules";
describe("business and waiter payment rules", () => {
  it("a refund credit note gets a different ID than the original order across sessions", () => { const original = newOrderId(); const refund = newOrderId(); assert.notEqual(original, refund); });
  it("bar supports food and beverage categories", () => { assert.equal(isBeverage("Beer"), true); assert.equal(isBeverage("Food"), false); });
  it("bar, hotel and restaurant activate table service without changing canteen defaults", () => {
    assert.equal(hasTableService("bar"), true); assert.equal(hasTableService("hotel"), true); assert.equal(hasTableService("restaurant"), true); assert.equal(hasTableService("canteen"), false);
  });
  it("only managers approve refunds", () => { assert.equal(canApproveRefund("waiter"), false); assert.equal(canApproveRefund("cashier"), false); assert.equal(canApproveRefund("owner"), true); assert.equal(canApproveRefund("supervisor"), true); });
  it("waiters take payments only when the owner enables it; cashiers always can", () => {
    assert.equal(waiterCanTakePayment("waiter", { allow_waiter_payments: false }), false);
    assert.equal(waiterCanTakePayment("waiter", { allow_waiter_payments: true }), true);
    assert.equal(waiterCanTakePayment("waiter", undefined), true);
    assert.equal(waiterCanTakePayment("cashier", { allow_waiter_payments: false }), true);
    assert.equal(waiterCanTakePayment("owner", { allow_waiter_payments: false }), true);
  });
  const grant: ScanGrant = { customerId: "c", staffId: "w", storeId: "s", expiresAt: 200, pinVerified: true };
  it("waiter wallet payments require a scanned customer grant", () => { assert.equal(validScanGrant(undefined, "c", "w", "s", 100), false); assert.equal(validScanGrant(grant, "c", "w", "s", 100), true); });
  it("scans cannot authorize a different customer or staff member or store", () => {
    assert.equal(validScanGrant(grant, "other", "w", "s", 100), false); assert.equal(validScanGrant(grant, "c", "other", "s", 100), false); assert.equal(validScanGrant(grant, "c", "w", "other", 100), false);
  });
  it("expired scans or scans without the customer's PIN approval are denied", () => { assert.equal(validScanGrant(grant, "c", "w", "s", 200), false); assert.equal(validScanGrant({ ...grant, pinVerified: false }, "c", "w", "s", 100), false); });
});