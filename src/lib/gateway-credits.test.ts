import { test } from "node:test";
import assert from "node:assert/strict";
import { applyGatewayCredits } from "./gateway-credits";
import { liveWallet } from "./wallet-balances";

const paid = [{ id: "TR-1", store_id: "s1", customer_id: "c1", reference: "DKBJ93DH4T", amount: 100, paid_at: 1 }];
const base = { profiles: [], transactions: [{ id: "x", store_id: "s1", customer_id: "c1", type: "deduction", amount: 5000 }], topUpRequests: [{ id: "TR-1", customer_id: "c1", status: "approved", amount: 5000 }], treasuries: { s1: { cash: 0, bank: 0 } } };

test("verified SMS amount of 100 is added to the wallet once", () => {
  const { snapshot } = applyGatewayCredits(base, paid);
  const p = { id: "c1", wallet_anchors: { s1: { balance: 0, transaction_ids: [] } } };
  assert.equal(liveWallet(p, "s1", ["s1"], snapshot.transactions as never), -4900);
  const again = applyGatewayCredits(snapshot, paid);
  assert.equal(again.credited.length, 0);
  assert.equal((snapshot.treasuries as never as Record<string, { bank: number }>).s1.bank, 100);
});

test("phone copy and server copy of the same top-up count once", () => {
  const rows = [{ id: "t-local", store_id: "s1", customer_id: "c1", type: "topup", amount: 100, reference: "gw:TR-1" }, { id: "gw-TR-1", store_id: "s1", customer_id: "c1", type: "topup", amount: 100, reference: "gw:TR-1" }];
  assert.equal(liveWallet({ id: "c1", wallet_anchors: { s1: { balance: 0, transaction_ids: [] } } }, "s1", ["s1"], rows as never), 100);
});

test("staff-confirmed receipt is not credited a second time", () => {
  const s = { ...base, transactions: [{ id: "t9", customer_id: "c1", type: "topup", amount: 100, reference: "DKBJ93DH4T" }] };
  assert.equal(applyGatewayCredits(s, paid).credited.length, 0);
});
