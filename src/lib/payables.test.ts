import { it } from "node:test";
import { strict as assert } from "node:assert";
import { agingOf, billBalance, validPayment, type VendorPayment } from "./payables";
import { buildLedger, trialBalance, balances } from "./accounting";

const DAY = 86_400_000;
const bill = { id: "PO-1", total_cost: 100000, on_credit: true, vendor_id: "v1", date: 0, due_date: 7 * DAY };
const pay = (amount: number): VendorPayment => ({ id: "p" + amount, store_id: "s", vendor_id: "v1", purchase_id: "PO-1", amount, method: "cash", created_at: 1 });

it("a partial supplier payment reduces the amount owed exactly", () => {
  assert.equal(billBalance(bill, [pay(40000)]), 60000);
});

it("a payment larger than the amount owed is rejected", () => {
  assert.equal(validPayment(bill, [pay(40000)], 60001), false);
  assert.equal(validPayment(bill, [pay(40000)], 60000), true);
});

it("a bill past its due date is overdue; within 3 days is due soon", () => {
  assert.equal(agingOf(bill, [], 9 * DAY).status, "overdue");
  assert.equal(agingOf(bill, [], 9 * DAY).daysOverdue, 2);
  assert.equal(agingOf(bill, [], 5 * DAY).status, "due_soon");
  assert.equal(agingOf(bill, [pay(100000)], 9 * DAY).status, "paid");
});

it("buying on credit records a payable, and paying it clears the payable from cash", () => {
  const purchase = { ...bill, supplier: "TBL", raw_name: "Beer", payment_method: "cash" as const };
  const entries = buildLedger({ orders: [], purchases: [purchase], vendorPayments: [pay(40000)], expenses: [], cogs: 0, cash: -40000, bank: 0, walletLiabilities: 0, inventoryValue: 100000 });
  const b = balances(entries);
  assert.equal(b["2100"], -60000);
  assert.equal(b["1000"], -40000);
  assert.ok(trialBalance(entries).balanced);
});
