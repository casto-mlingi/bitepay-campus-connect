import { it } from "node:test";
import { strict as assert } from "node:assert";
import { buildLedger, isBalanced, saleEntry, trialBalance } from "./accounting";

const base = { purchases: [], expenses: [], cogs: 0, walletLiabilities: 0, inventoryValue: 0 };

it("5,000 saved change clears 3,000 existing debt and leaves 2,000 credit", () => {
  const e = saleEntry({ id: "change-debt", created_at: 1, total_amount: 10000, cash_paid: 10000, cash_delta: 15000, bank_delta: 0, change_saved: 5000, change_debt_settled: 3000, payment_status: "paid" });
  assert.equal(e.lines.find((l) => l.account === "1100")?.credit, 3000);
  assert.equal(e.lines.find((l) => l.account === "2000")?.credit, 2000);
  assert.ok(isBalanced(e));
});

it("10,000 topup clears 7,000 receivable and creates 3,000 deposits", () => {
  const e = buildLedger({ ...base, orders: [], cash: 10000, bank: 0, walletTopups: [{ id: "t", amount: 10000, balance_before: -7000, tender: "cash", description: "Topup", created_at: 1 }] }).find((e) => e.id === "topup-t");
  assert.equal(e?.lines.find((l) => l.account === "1100")?.credit, 7000);
  assert.equal(e?.lines.find((l) => l.account === "2000")?.credit, 3000);
  assert.ok(e && isBalanced(e));
});
it("200 loyalty is an expense and wallet credit, never cash income", () => {
  const e = saleEntry({ id: "r", created_at: 1, total_amount: 10000, wallet_paid: 10000, cash_paid: 0, payment_status: "paid", loyalty_earned: 200 });
  assert.equal(e.lines.find((l) => l.account === "6000")?.debit, 200);
  assert.ok(isBalanced(e));
});

it("a wallet shortage is a 760 receivable, not wallet deposits", () => {
  const e = saleEntry({ id: "debt", created_at: 1, total_amount: 11000, wallet_paid: 10240, cash_paid: 0, payment_status: "paid" });
  assert.equal(e.lines.find((l) => l.account === "1100")?.debit, 760);
  assert.ok(isBalanced(e));
});
it("Lipa overpayment records full bank receipt and cash change", () => {
  const e = saleEntry({ id: "lipa", created_at: 1, total_amount: 15000, cash_paid: 15000, tender: "mobile", cash_delta: -5000, bank_delta: 20000, payment_status: "paid" });
  assert.equal(e.lines.find((l) => l.account === "1010")?.debit, 20000);
  assert.equal(e.lines.find((l) => l.account === "1000")?.credit, 5000);
  assert.ok(isBalanced(e));
});
it("saved 5,000 change is a liability, not extra sales", () => {
  const e = saleEntry({ id: "change", created_at: 1, total_amount: 10000, cash_paid: 10000, cash_delta: 15000, bank_delta: 0, change_saved: 5000, payment_status: "paid" });
  assert.equal(e.lines.find((l) => l.account === "2000")?.credit, 5000);
  assert.equal(e.lines.find((l) => l.account === "4000")?.credit, 10000);
  assert.ok(isBalanced(e));
});
it("returning saved change reduces cash and customer liability by 5,000", () => {
  const entries = buildLedger({ ...base, cash: 0, bank: 0, orders: [], walletPayouts: [{ id: "p", amount: 5000, created_at: 1 }] });
  const payout = entries.find((e) => e.id === "wallet-payout-p");
  assert.equal(payout?.lines.find((l) => l.account === "1000")?.credit, 5000);
  assert.equal(payout?.lines.find((l) => l.account === "2000")?.debit, 5000);
});

it("a cash sale increases cash and revenue by the exact amount", () => {
  const e = saleEntry({ id: "a", created_at: 1, total_amount: 15000, cash_paid: 15000, payment_status: "paid" });
  assert.ok(isBalanced(e));
  assert.deepEqual(e.lines.find((l) => l.account === "1000"), { account: "1000", debit: 15000, credit: 0 });
});

it("a refund reduces cash and revenue", () => {
  const e = saleEntry({ id: "r", created_at: 2, total_amount: -5000, cash_paid: -5000, payment_status: "paid" });
  assert.deepEqual(e.lines.find((l) => l.account === "1000"), { account: "1000", debit: 0, credit: 5000 });
  assert.deepEqual(e.lines.find((l) => l.account === "4000"), { account: "4000", debit: 5000, credit: 0 });
});

it("an unpaid bill is a receivable, not cash", () => {
  const e = saleEntry({ id: "u", created_at: 3, total_amount: 8000, payment_status: "unpaid" });
  assert.equal(e.lines.find((l) => l.account === "1100")?.debit, 8000);
  assert.equal(e.lines.find((l) => l.account === "1000"), undefined);
});

it("the trial balance always balances and ties to real cash", () => {
  const entries = buildLedger({
    ...base, cash: 12000, bank: 3000,
    orders: [{ id: "a", created_at: 1, total_amount: 10000, cash_paid: 10000, payment_status: "paid" }],
    expenses: [{ id: "x", date: 2, category: "Labor", description: "", amount: 2500, payment_method: "cash" }],
  });
  const tb = trialBalance(entries);
  assert.ok(tb.balanced);
  assert.equal(tb.rows.find((r) => r.code === "1000")?.debit, 12000);
  assert.equal(tb.rows.find((r) => r.code === "1010")?.debit, 3000);
});
