import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { assertPreservesRecords, isLocalSyncHost, scopedSnapshotUpdate } from "./snapshot-safety";

describe("customer data preservation", () => {
  it("blocks localhost test hosts", () => {
    assert.equal(isLocalSyncHost("localhost:8080"), true);
    assert.equal(isLocalSyncHost("127.0.0.1:8080"), true);
    assert.equal(isLocalSyncHost("bitepay.kgsons.co.tz"), false);
  });
  it("rejects replacement that deletes existing customer records", () => {
    assert.throws(() => assertPreservesRecords({ profiles: [{ id: "real-customer" }] }, { profiles: [{ id: "test-customer" }] }));
  });
  it("retains another store's data and missing rows", () => {
    const before = { orders: [{ id: "sale-a", store_id: "a", total: 500 }, { id: "sale-b", store_id: "b", total: 1000 }] };
    const after = scopedSnapshotUpdate(before, { orders: [{ id: "sale-b", store_id: "b", total: 0 }, { id: "sale-new", store_id: "a", total: 200 }] }, "owner-a", new Set(["a"]));
    assert.deepEqual(after.orders, [...before.orders, { id: "sale-new", store_id: "a", total: 200 }]);
  });
  it("preserves treasury balances when an incoming snapshot omits them", () => {
    assert.throws(() => assertPreservesRecords({ treasuries: { a: { cash: 12000 } } }, { treasuries: {} }));
  });
  it("customers cannot replace another wallet or treasury", () => {
    const previous = { profiles: [{ id: "other", store_id: "a", wallet_balance: 12000 }], treasuries: { a: { cash: 25000 } } };
    const updated = scopedSnapshotUpdate(previous, { profiles: [{ id: "other", store_id: "a", wallet_balance: 0 }], treasuries: { a: { cash: 0 } } }, "customer", new Set(["a"]), "customer");
    assert.deepEqual(updated, previous);
  });
  it("a snapshot cannot promote its own staff identity", () => {
    const previous = { profiles: [{ id: "cashier", role: "staff", staff_role: "cashier", store_id: "a" }] };
    const updated = scopedSnapshotUpdate(previous, { profiles: [{ id: "cashier", role: "staff", staff_role: "owner", store_id: "b" }] }, "cashier", new Set(["a"]));
    assert.equal((updated.profiles as typeof previous.profiles)[0]?.staff_role, "cashier");
    assert.equal((updated.profiles as typeof previous.profiles)[0]?.store_id, "a");
  });
});
import { it as t2 } from "node:test";
import assertMod from "node:assert/strict";
import { adminSnapshotUpdate } from "./snapshot-safety";
t2("admin plan and days changes are saved, but store sales and cash are not touched", () => {
  const prev = { stores: [{ id: "s1", name: "A", subscription: { plan: "trial", expires_at: 1 } }], orders: [{ id: "o1", store_id: "s1" }], treasuries: { s1: { cash: 500, bank: 0 } }, adminAuditLog: [] };
  const next = adminSnapshotUpdate(prev, { stores: [{ id: "s1", name: "Hacked", subscription: { plan: "starter", expires_at: 99 } }], orders: [], treasuries: { s1: { cash: 0, bank: 0 } }, adminAuditLog: [{ id: "a1" }] }) as any;
  assertMod.equal(next.stores[0].subscription.plan, "starter");
  assertMod.equal(next.stores[0].subscription.expires_at, 99);
  assertMod.equal(next.stores[0].name, "A");
  assertMod.equal(next.orders.length, 1);
  assertMod.equal(next.treasuries.s1.cash, 500);
  assertMod.equal(next.adminAuditLog.length, 1);
});
