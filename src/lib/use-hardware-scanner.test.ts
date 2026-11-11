import { test } from "node:test";
import assert from "node:assert/strict";
import { isScannerBurst } from "./use-hardware-scanner.ts";

test("fast burst of keys counts as scanner input", () => { assert.equal(isScannerBurst([0, 10, 20, 30, 40]), true); });
test("human typing speed is not scanner input", () => { assert.equal(isScannerBurst([0, 150, 300, 450]), false); });
test("too-short codes are ignored", () => { assert.equal(isScannerBurst([0, 5, 10]), false); });
