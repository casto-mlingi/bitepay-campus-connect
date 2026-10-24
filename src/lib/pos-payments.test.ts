import { it } from "node:test";
import { strict as assert } from "node:assert";
import { walletSettlement, cashSettlement, validWalletPayout, debtSince } from "./pos-payments";

it("10,240 wallet on an 11,000 bill leaves exactly 760 debt", () => {
  assert.deepEqual(walletSettlement(10240, 11000, 0, 20000, true), { ok: true, walletCharge: 11000, walletPaid: 10240, debtAdded: 760, balanceAfter: -760, received: 0 });
});
it("the cap includes existing debt, not just the new bill", () => {
  assert.equal(walletSettlement(-19700, 500, 0, 20000, true).ok, false);
  assert.equal(walletSettlement(-19500, 500, 0, 20000, true).ok, true);
});
it("zero disables new debt and debt requires an explicit choice", () => {
  assert.equal(walletSettlement(10240, 11000, 0, 0, true).ok, false);
  assert.equal(walletSettlement(10240, 11000, 0, 20000, false).ok, false);
});
it("collecting 760 covers the shortage without debt", () => {
  const s = walletSettlement(10240, 11000, 760, 0, false);
  assert.ok(s.ok); if (s.ok) assert.equal(s.balanceAfter, 0);
});
it("15,000 cash on a 10,000 bill saves 5,000 and keeps the full cash received", () => {
  assert.deepEqual(cashSettlement(10000, 15000, "cash", true, 0), { ok: true, received: 15000, change: 5000, changeSaved: 5000, changeReturned: 0, cashDelta: 15000, bankDelta: 0 });
});
it("20,000 Lipa on a 15,000 bill increases bank 20,000 and returns 5,000 cash", () => {
  assert.deepEqual(cashSettlement(15000, 20000, "mobile", false, 5000), { ok: true, received: 20000, change: 5000, changeSaved: 0, changeReturned: 5000, cashDelta: -5000, bankDelta: 20000 });
});
it("Lipa change saved to wallet does not reduce drawer cash", () => {
  const s = cashSettlement(15000, 20000, "mobile", true, 0);
  assert.ok(s.ok); if (s.ok) { assert.equal(s.cashDelta, 0); assert.equal(s.bankDelta, 20000); assert.equal(s.changeSaved, 5000); }
});
it("cash change requires enough drawer cash for Lipa overpayment", () => {
  assert.equal(cashSettlement(15000, 20000, "mobile", false, 4999).ok, false);
});
it("rejects invalid or insufficient received amounts", () => {
  assert.equal(cashSettlement(15000, NaN, "mobile", false, 0).ok, false);
  assert.equal(cashSettlement(15000, 14999, "cash", false, 0).ok, false);
});
it("customer cash repayment cannot exceed positive credit or drawer cash", () => {
  assert.equal(validWalletPayout(5000, 5000, 5000), true);
  assert.equal(validWalletPayout(5000, 5001, 9000), false);
  assert.equal(validWalletPayout(-760, 1, 5000), false);
});
it("new debt ages from its actual deduction after an earlier debt was cleared", () => {
  assert.equal(debtSince([{ type: "deduction", amount: 760, created_at: 100 }, { type: "topup", amount: 10000, created_at: 200 }, { type: "deduction", amount: 10000, created_at: 300 }], -760), 300);
});