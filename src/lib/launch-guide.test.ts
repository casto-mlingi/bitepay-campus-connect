import { it } from "node:test";
import { strict as assert } from "node:assert";
import { launchSteps } from "./launch-guide";

it("new store has every launch step open", () => {
  assert.equal(launchSteps({ rawCount: 0, productCount: 0, staffCount: 0, cash: 0, bank: 0, salesCount: 0 }).filter((s) => s.done).length, 0);
});

it("steps turn done from real records", () => {
  assert.ok(launchSteps({ rawCount: 3, productCount: 2, staffCount: 1, cash: 0, bank: 5000, salesCount: 1 }).every((x) => x.done));
});
