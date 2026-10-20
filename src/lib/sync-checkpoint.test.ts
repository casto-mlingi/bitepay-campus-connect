import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { canAcknowledgeSnapshot, retainDeviceState } from "./sync-checkpoint";

describe("phone-first automatic saving", () => {
  it("does not clear an offline sale entered while an earlier upload is in flight", () => {
    const sent = JSON.stringify({ orders: [{ id: "sale-one", total_amount: 5000 }] });
    const current = JSON.stringify({ orders: [{ id: "sale-one", total_amount: 5000 }, { id: "sale-two", total_amount: 2000 }] });
    assert.equal(canAcknowledgeSnapshot(sent, current), false);
    assert.equal(canAcknowledgeSnapshot(current, current), true);
  });
  it("retains the phone's active shift and receipt sequence after downloading a backup", () => {
    const merged = retainDeviceState({ activeShiftId: null, receiptSeq: { day: "20261020", n: 0 }, orders: [{ id: "sale" }] },
      { activeShiftId: "shift-phone", receiptSeq: { day: "20261020", n: 7 }, orders: [] });
    assert.equal(merged.activeShiftId, "shift-phone");
    assert.equal(merged.receiptSeq.n, 7);
    assert.deepEqual(merged.orders, [{ id: "sale" }]);
  });
});