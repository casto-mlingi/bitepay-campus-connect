import { describe, expect, it } from "vitest";
import { activeLipaNumbers, cleanLipaNumbers } from "./lipa-numbers";

describe("lipa numbers", () => {
  it("drops entries without a registered name", () => {
    expect(cleanLipaNumbers([{ id: "1", provider: "mpesa", number: "5544321", account_name: " ", active: true }])).toEqual([]);
  });
  it("hides inactive numbers from customers", () => {
    const list = [{ id: "1", provider: "airtel", number: "887 766", account_name: "Casto Biz", active: false }, { id: "2", provider: "mpesa", number: "5544321", account_name: "Casto Biz", active: true }];
    expect(activeLipaNumbers(list).map((l) => l.id)).toEqual(["2"]);
    expect(cleanLipaNumbers(list)[0].number).toBe("887766");
  });
});
