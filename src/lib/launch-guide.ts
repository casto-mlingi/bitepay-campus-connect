export type LaunchInput = { rawCount: number; productCount: number; staffCount: number; cash: number; bank: number; salesCount: number };
export type LaunchStep = { id: string; label: string; hint: string; to: string; done: boolean };

/** Launch checklist derived only from real records — nothing extra is stored. */
export function launchSteps(i: LaunchInput): LaunchStep[] {
  return [
    { id: "raw", label: "Add raw materials", hint: "Kitchen stock like rice, oil, meat", to: "/inventory", done: i.rawCount > 0 },
    { id: "menu", label: "Add items you sell", hint: "They appear on the POS", to: "/inventory", done: i.productCount > 0 },
    { id: "staff", label: "Add your staff", hint: "Cashiers, waiters, supervisors", to: "/team", done: i.staffCount > 0 },
    { id: "cash", label: "Set opening cash", hint: "Money in the drawer and bank/mobile", to: "/finance", done: i.cash + i.bank > 0 },
    { id: "sale", label: "Make your first sale", hint: "Open a shift, then sell on the POS", to: "/pos", done: i.salesCount > 0 },
  ];
}
