import { it } from "node:test";
import assert from "node:assert/strict";
import { safeBalance, validMovement, type SafeMovement } from "./safe-custody";
const m = (kind: SafeMovement["kind"], amount: number): SafeMovement => ({ id: kind + amount, store_id: "s", kind, amount, recorded_by: "J", created_at: 1 });
it("expected safe cash = drops - safe expenses - deposits - owner handovers", () => {
  const r = safeBalance(
    [{ closed_at: 1, cash_drop: 3_200_000 }, { cash_drop: 999 }],
    [{ amount: 180_000, payment_method: "cash" }, { shift_id: "x", amount: 5000, payment_method: "cash" }],
    [m("bank", 1_500_000), m("owner", 1_000_000)],
  );
  assert.equal(r.expected, 520_000);
});
it("blocks handing over more than the safe holds", () => assert.notEqual(validMovement(600_000, "owner", undefined, 520_000), null));
it("bank deposit needs a reference", () => assert.notEqual(validMovement(100, "bank", "", 520_000), null));
