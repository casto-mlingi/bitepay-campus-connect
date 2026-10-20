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
});