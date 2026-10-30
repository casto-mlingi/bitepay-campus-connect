import { expect, test } from "bun:test";
import { launchSteps } from "./launch-guide";

test("new store has every launch step open", () => {
  expect(launchSteps({ rawCount: 0, productCount: 0, staffCount: 0, cash: 0, bank: 0, salesCount: 0 }).filter((s) => s.done)).toHaveLength(0);
});

test("steps turn done from real records", () => {
  const s = launchSteps({ rawCount: 3, productCount: 2, staffCount: 1, cash: 0, bank: 5000, salesCount: 1 });
  expect(s.every((x) => x.done)).toBe(true);
});
