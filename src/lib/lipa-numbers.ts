export const LIPA_PROVIDERS = {
  mpesa: "M-Pesa",
  mixx: "Mixx by Yas (Tigo Pesa)",
  airtel: "Airtel Money",
  halopesa: "HaloPesa",
  ttcl: "TTCL Pesa",
  bank: "Bank",
} as const;
export type LipaProvider = keyof typeof LIPA_PROVIDERS;
export type LipaNumber = { id: string; provider: LipaProvider; number: string; account_name: string; active: boolean };

/** Keeps only complete, valid entries (max 10) so customers never see a broken number. */
export function cleanLipaNumbers(list: unknown): LipaNumber[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((l): l is LipaNumber => !!l && typeof l === "object" && (l as LipaNumber).provider in LIPA_PROVIDERS)
    .map((l) => ({ id: String(l.id), provider: l.provider, number: String(l.number).replace(/\s+/g, "").slice(0, 20), account_name: String(l.account_name).trim().slice(0, 60), active: l.active !== false }))
    .filter((l) => /^[0-9A-Za-z*#-]{3,20}$/.test(l.number) && l.account_name.length > 0)
    .slice(0, 10);
}

export const activeLipaNumbers = (list: unknown) => cleanLipaNumbers(list).filter((l) => l.active);
