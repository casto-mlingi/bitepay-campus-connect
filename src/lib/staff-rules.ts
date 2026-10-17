export type StaffRole = "cashier" | "waiter" | "supervisor" | "owner";
export type Permission =
  | "pos.sell" | "pos.wallet" | "pos.refund" | "shift.manage"
  | "customers.view" | "customers.topup"
  | "inventory.view" | "inventory.edit"
  | "finance.view" | "finance.edit" | "analytics.view"
  | "team.view" | "team.manage_cashier" | "team.manage_all" | "settings.manage";

export const PERMISSIONS: Record<StaffRole, Permission[]> = {
  waiter: ["pos.sell", "shift.manage"],
  cashier: ["pos.sell", "pos.wallet", "pos.refund", "shift.manage", "customers.view", "customers.topup", "inventory.view"],
  supervisor: ["pos.sell", "pos.wallet", "pos.refund", "shift.manage", "customers.view", "customers.topup", "inventory.view", "inventory.edit", "finance.view", "finance.edit", "analytics.view", "team.view", "team.manage_cashier"],
  owner: ["pos.sell", "pos.wallet", "pos.refund", "shift.manage", "customers.view", "customers.topup", "inventory.view", "inventory.edit", "finance.view", "finance.edit", "analytics.view", "team.view", "team.manage_cashier", "team.manage_all", "settings.manage"],
};

export function requiresStaffPin(role: StaffRole) { return role !== "waiter"; }
export function canAssignStaffRole(role: StaffRole, manageAll: boolean) {
  return manageAll || role === "cashier" || role === "waiter";
}
export function validateStaffInput(input: { full_name: string; phone: string; password: string; role: StaffRole; staff_pin?: string }) {
  if (!input.full_name.trim() || !input.phone.trim() || !input.password) return "Name, phone and password are required";
  if (input.password.length < 4) return "Password must be at least 4 characters";
  if (requiresStaffPin(input.role) && !/^\d{4,6}$/.test(input.staff_pin ?? "")) return "Staff PIN must be 4–6 digits";
  return null;
}