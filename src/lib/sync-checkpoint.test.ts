import { describe, it, expect } from "bun:test";
import { canAcknowledgeSnapshot, retainDeviceState } from "./sync-checkpoint";

describe("phone-first automatic saving", () => {
  it("does not clear an offline sale entered while an earlier upload is in flight", () => {
    const sent = JSON.stringify({ orders: [{ id: "sale-one", total_amount: 5000 }] });
    const current = JSON.stringify({ orders: [{ id: "sale-one", total_amount: 5000 }, { id: "sale-two", total_amount: 2000 }] });
    expect(canAcknowledgeSnapshot(sent, current)).toBe(false);
    expect(canAcknowledgeSnapshot(current, current)).toBe(true);
  });
  it("retains the phone's active shift and receipt sequence after downloading a backup", () => {
    const merged = retainDeviceState({ activeShiftId: null, receiptSeq: { day: "20261020", n: 0 }, orders: [{ id: "sale" }] },
      { activeShiftId: "shift-phone", receiptSeq: { day: "20261020", n: 7 }, orders: [] });
    expect(merged.activeShiftId).toBe("shift-phone");
    expect(merged.receiptSeq.n).toBe(7);
    expect(merged.orders).toEqual([{ id: "sale" }]);
  });
});