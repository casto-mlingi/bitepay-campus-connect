import { describe, it, expect } from "bun:test";
import { parseSms, matchSms, compareReference } from "./sms-parser";

describe("parseSms", () => {
  it("M-Pesa 10-char receipt", () => {
    const r = parseSms("DK5J93A97U Imethibitishwa. Umepokea Tsh10,000.00 kutoka 0754123456 - JUMA ALLY tarehe 5/11/26 saa 10:12 AM. Salio jipya la M-Pesa ni Tsh25,500.00.");
    expect(r).toMatchObject({ provider: "mpesa", reference: "DK5J93A97U", amount: 10000, balance: 25500 });
  });
  it("Airtel 11-char reference", () => {
    const r = parseSms("Muamala No: BLS5G24296L Imethibitishwa. Umepokea Tsh 5,000.00 kutoka 0688123456 ANNA. Salio Tsh 15,000.00 Airtel Money");
    expect(r).toMatchObject({ provider: "airtel", reference: "BLS5G24296L", amount: 5000 });
  });
  it("Airtel bank TID ignores the balance", () => {
    const r = parseSms("Umepokea Tsh 30,000.00 kutoka CRDB - CASTO ALOYCE MLINGI. Salio Tsh 30,500.00. TID:CI260806.2136.N70162", "AirtelMoney");
    expect(r).toMatchObject({ provider: "airtel", reference: "CI260806.2136.N70162", amount: 30000, balance: 30500 });
  });
  it("HaloPesa", () => {
    const r = parseSms("DAU0MLEDY4W Imethibitishwa. Umepokea TSh 10,000 kutoka 0621234567 PETER. Salio lako HaloPesa ni TSh 12,000");
    expect(r).toMatchObject({ provider: "halopesa", reference: "DAU0MLEDY4W", amount: 10000 });
  });
  it("Mixx by Yas", () => {
    const r = parseSms("Kumbukumbu no: DI7KK2JWC8. Umepokea TSh 2,500 kutoka 0712345678 - MARY. Salio jipya TSh 40,000. Mixx by Yas");
    expect(r).toMatchObject({ provider: "mixx", reference: "DI7KK2JWC8", amount: 2500 });
  });
  it("ignores outgoing payments", () => {
    expect(parseSms("DK5J93A97U Imethibitishwa. Umetuma Tsh 1,000 kwa JOHN. Salio Tsh 9,000 M-Pesa")).toBeNull();
  });
});

describe("matching", () => {
  const now = 1_000_000;
  const c = (id: string, amount: number, reference: string | null = null, expires = now + 60_000) => ({ id, amount, reference, expires_at: expires, status: "pending" });
  it("typo in typed reference goes to review, spaces are fine", () => {
    expect(compareReference("dk5j 93a97u", "DK5J93A97U")).toBe("exact");
    expect(compareReference("DK5J93A97V", "DK5J93A97U")).toBe("near");
  });
  it("single waiting checkout with amount is matched", () => {
    expect(matchSms({ reference: "X1", amount: 5000 }, [c("a", 5000)], now)).toMatchObject({ status: "matched", checkout_id: "a" });
  });
  it("two checkouts with same amount need review", () => {
    expect(matchSms({ reference: "X1", amount: 5000 }, [c("a", 5000), c("b", 5000)], now).status).toBe("review");
  });
  it("expired checkouts are never paid", () => {
    expect(matchSms({ reference: "X1", amount: 5000 }, [c("a", 5000, null, now - 1)], now).status).toBe("unmatched");
  });
  it("wrong amount is never paid", () => {
    expect(matchSms({ reference: "X1", amount: 4999 }, [c("a", 5000)], now).status).toBe("unmatched");
  });
});
