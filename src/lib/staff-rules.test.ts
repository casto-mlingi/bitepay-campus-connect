import { describe, expect, test } from "bun:test";
import { PERMISSIONS, requiresStaffPin, validateStaffInput, canAssignStaffRole } from "./staff-rules";

describe("waiter access", () => {
  test("waiters can be added without a staff PIN", () => {
    expect(requiresStaffPin("waiter")).toBe(false);
    expect(validateStaffInput({ full_name: "Test waiter", phone: "0700000001", password: "test-pass", role: "waiter" })).toBeNull();
  });
  test("waiters can sell without wallet or top-up access", () => {
    expect(PERMISSIONS.waiter).toContain("pos.sell");
    expect(PERMISSIONS.waiter).not.toContain("pos.wallet");
    expect(PERMISSIONS.waiter).not.toContain("customers.view");
    expect(PERMISSIONS.waiter).not.toContain("customers.topup");
  });
  test("cashiers still need a staff PIN", () => {
    expect(validateStaffInput({ full_name: "Test cashier", phone: "0700000002", password: "test-pass", role: "cashier" })).toBe("Staff PIN must be 4–6 digits");
  });
  test("owners may add every staff role", () => {
    for (const role of ["waiter", "cashier", "supervisor", "owner"] as const) expect(canAssignStaffRole(role, true)).toBe(true);
    expect(canAssignStaffRole("waiter", false)).toBe(true);
    expect(canAssignStaffRole("owner", false)).toBe(false);
  });
});