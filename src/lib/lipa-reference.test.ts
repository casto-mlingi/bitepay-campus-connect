import { it } from "node:test";
import assert from "node:assert/strict";
import { extractLipaReference } from "./lipa-reference";
it("reads an M-Pesa receipt code from SMS text", () => {
  assert.equal(extractLipaReference("DKBJ93DH4T Imethibitishwa. Umelipa Tsh10,000.00 kwa CHRIS CANTEEN"), "DKBJ93DH4T");
});
it("prefers a labelled reference", () => {
  assert.equal(extractLipaReference("Paid TZS 5000 on 11/11/2026 Ref: AB12CD34EF balance TZS2000"), "AB12CD34EF");
});
it("returns null when no code", () => { assert.equal(extractLipaReference("Asante kwa malipo"), null); });
