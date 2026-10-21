import { it } from "node:test";
import { strict as assert } from "node:assert";
import { agingTotals, bucketOf, buildReceivables, customerBalances } from "./receivables";

const DAY = 86_400_000;

it("lateness buckets follow 1–30, 31–60, 61–90 and over 90 days", () => {
  assert.equal(bucketOf(10 * DAY, 5 * DAY).bucket, "current");
  assert.equal(bucketOf(0, 30 * DAY).bucket, "d1_30");
  assert.equal(bucketOf(0, 31 * DAY).bucket, "d31_60");
  assert.equal(bucketOf(0, 75 * DAY).bucket, "d61_90");
  assert.equal(bucketOf(0, 91 * DAY).bucket, "d90_plus");
});

it("combines delivery balances, pay-later debts and open tabs into one total", () => {
  const items = buildReceivables({
    now: 40 * DAY, termsDays: 7,
    orders: [
      { id: "a", customer_name: "Asha", created_at: 0, total_amount: 20000, amount_paid: 5000, payment_status: "unpaid" },
      { id: "b", customer_name: "Paid", created_at: 0, total_amount: 9000, payment_status: "paid" },
      { id: "c", customer_name: "Gone", created_at: 0, total_amount: 9000, payment_status: "unpaid", closed_out: true },
    ],
    debtors: [{ customer_id: "u1", name: "Asha", balance: 3000, since: 39 * DAY }],
    tabs: [
      { id: "t", label: "Table 4", items: [{ price: 3000, qty: 5 }], status: "open", created_at: 40 * DAY },
      { id: "x", label: "Closed", items: [{ price: 3000, qty: 1 }], status: "paid", created_at: 0 },
    ],
  });
  const t = agingTotals(items);
  assert.equal(t.total, 15000 + 3000 + 15000);
  assert.equal(t.d31_60, 15000); // delivery: due day 7, 33 days late
  const asha = customerBalances(items).find((c) => c.party === "Asha");
  assert.equal(asha?.total, 18000);
  assert.equal(asha?.items, 2);
});
