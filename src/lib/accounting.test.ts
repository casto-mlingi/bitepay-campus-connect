import { it } from "node:test";
import { strict as assert } from "node:assert";
import { buildLedger, isBalanced, saleEntry, trialBalance } from "./accounting";

const base = { purchases: [], expenses: [], cogs: 0, walletLiabilities: 0, inventoryValue: 0 };

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
