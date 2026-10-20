import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { addCanonicalOnboarding } from "./onboarding";

const data = { store: { name: "New canteen", location: "Campus", contact_phone: "0700000000", admin_email: "owner@example.test", currency: "TZS", low_balance_threshold: 3000 }, owner: { full_name: "Owner", phone: "0700000001", password: "test-only-password", staff_pin: "1234" }, opening_cash: 15000, opening_bank: 20000 };
describe("canonical store registration", () => {
  it("preserves existing canteens and sales while saving the new owner's canonical IDs", () => {
    const previous = { stores: [{ id: "old-store" }], profiles: [{ id: "old-owner" }], orders: [{ id: "old-sale", total_amount: 5000 }], treasuries: { "old-store": { cash: 42000, bank: 1000 } } };
    const next = addCanonicalOnboarding(previous, data, { storeId: "db-store", ownerId: "db-owner" }, 1000);
    assert.deepEqual(next.orders, previous.orders);
    assert.deepEqual(next.stores.map((s) => s.id), ["old-store", "db-store"]);
    assert.equal(next.profiles[1]?.store_id, "db-store");
    assert.deepEqual(next.treasuries["old-store"], { cash: 42000, bank: 1000 });
    assert.deepEqual(next.treasuries["db-store"], { cash: 15000, bank: 20000 });
  });
  it("resuming the same registration does not duplicate records or reset balances", () => {
    const first = addCanonicalOnboarding({}, data, { storeId: "db-store", ownerId: "db-owner" }, 1000);
    first.treasuries["db-store"] = { cash: 17000, bank: 20000 };
    const resumed = addCanonicalOnboarding(first, data, { storeId: "db-store", ownerId: "db-owner" }, 2000);
    assert.equal(resumed.stores.length, 1);
    assert.equal(resumed.profiles.length, 1);
    assert.deepEqual(resumed.treasuries["db-store"], { cash: 17000, bank: 20000 });
  });
});