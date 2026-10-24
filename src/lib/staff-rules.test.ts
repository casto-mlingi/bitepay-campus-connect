import { describe, it as test } from "node:test";
import { strict as assert } from "node:assert";
import { PERMISSIONS, requiresStaffPin, validateStaffInput, canAssignStaffRole } from "./staff-rules";

describe("waiter access", () => {
  test("managers can set debt limits but cashiers and waiters cannot", () => {
    assert.ok(PERMISSIONS.supervisor.includes("settings.credit"));
    assert.ok(PERMISSIONS.owner.includes("settings.manage"));
    assert.ok(!PERMISSIONS.cashier.includes("settings.credit"));
    assert.ok(!PERMISSIONS.waiter.includes("settings.credit"));
  });
  test("waiters can be added without a staff PIN", () => {
    assert.equal(requiresStaffPin("waiter"), false);
    assert.equal(validateStaffInput({ full_name: "Test waiter", phone: "0700000001", password: "test-pass", role: "waiter" }), null);
  });
  test("waiters can sell with QR-only wallet access and no top-ups or wallet browsing", () => {
    assert.ok(PERMISSIONS.waiter.includes("pos.sell"));
    assert.ok(PERMISSIONS.waiter.includes("pos.wallet_qr"));
    assert.ok(!PERMISSIONS.waiter.includes("pos.wallet"));
    assert.ok(!PERMISSIONS.waiter.includes("customers.view"));
    assert.ok(!PERMISSIONS.waiter.includes("customers.topup"));
  });
  test("cashiers still need a staff PIN", () => {
    assert.equal(validateStaffInput({ full_name: "Test cashier", phone: "0700000002", password: "test-pass", role: "cashier" }), "Staff PIN must be 4–6 digits");
  });
  test("owners may add every staff role", () => {
    for (const role of ["waiter", "cashier", "supervisor", "owner"] as const) assert.equal(canAssignStaffRole(role, true), true);
    assert.equal(canAssignStaffRole("waiter", false), true);
    assert.equal(canAssignStaffRole("owner", false), false);
  });
});