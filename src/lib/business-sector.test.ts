import { test } from "node:test";
import assert from "node:assert/strict";
import { sectorTerms } from "./business-rules";
test("retail types never say canteen", () => {
  for (const t of ["shop", "hardware", "supermarket", "wholesale"] as const) assert.doesNotMatch(JSON.stringify(sectorTerms(t)), /canteen/i);
});
test("hospitality uses venue, canteen keeps canteen", () => {
  assert.equal(sectorTerms("bar").choose, "Choose venue");
  assert.equal(sectorTerms("canteen").choose, "Choose canteen");
});
