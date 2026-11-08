import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { activeLipaNumbers, cleanLipaNumbers } from "./lipa-numbers.ts";

describe("lipa numbers", () => {
  it("drops entries without a registered name", () => {
    assert.deepEqual(cleanLipaNumbers([{ id: "1", provider: "mpesa", number: "5544321", account_name: " ", active: true }]), []);
  });
  it("hides inactive numbers from customers", () => {
    const list = [{ id: "1", provider: "airtel", number: "887 766", account_name: "Casto Biz", active: false }, { id: "2", provider: "mpesa", number: "5544321", account_name: "Casto Biz", active: true }];
    assert.deepEqual(activeLipaNumbers(list).map((l) => l.id), ["2"]);
    assert.equal(cleanLipaNumbers(list)[0].number, "887766");
  });
});
