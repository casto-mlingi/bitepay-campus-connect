/**
 * Tanzanian mobile-money SMS parser (pure, no I/O).
 * Supports M-Pesa, Mixx by Yas (Tigo Pesa), Airtel Money, HaloPesa and TTCL Pesa.
 * Only INCOMING payments are returned; the balance ("Salio") is never mistaken for the paid amount.
 */
export type Provider = "mpesa" | "mixx" | "airtel" | "halopesa" | "ttcl" | "unknown";

export const PROVIDER_LABEL: Record<Provider, string> = {
  mpesa: "M-Pesa", mixx: "Mixx by Yas", airtel: "Airtel Money", halopesa: "HaloPesa", ttcl: "TTCL Pesa", unknown: "Unknown",
};

export type ParsedSms = {
  provider: Provider;
  reference: string;
  amount: number;
  sender_name: string | null;
  sender_phone: string | null;
  balance: number | null;
};

export function detectProvider(text: string, sender = ""): Provider {
  const s = `${sender} ${text}`.toLowerCase();
  if (/m-?pesa|vodacom/.test(s)) return "mpesa";
  if (/halo\s?pesa|halotel/.test(s)) return "halopesa";
  if (/airtel/.test(s)) return "airtel";
  if (/mixx|tigo|\byas\b/.test(s)) return "mixx";
  if (/ttcl|t-?pesa/.test(s)) return "ttcl";
  return "unknown";
}

export function normalizeReference(ref: string): string {
  return ref.toUpperCase().replace(/[\s\-_]/g, "");
}

const num = (s: string) => Number(s.replace(/,/g, ""));
const AMT = String.raw`(?:tsh|tzs|sh)\.?\s*([\d,]+(?:\.\d{1,2})?)`;

function findAmount(text: string): number | null {
  const patterns = [
    new RegExp(String.raw`(?:umepokea|received|umelipwa|amekutumia|imepokelewa)[^\d]{0,30}?` + AMT, "i"),
    new RegExp(AMT + String.raw`\s*(?:imepokelewa|imepokea|received|kutoka|from)`, "i"),
    new RegExp(String.raw`(?:umepokea|received)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:tsh|tzs)`, "i"),
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return num(m[1]);
  }
  // Fallback: first money figure not labelled as balance or fee.
  const all = [...text.matchAll(new RegExp(AMT, "gi"))];
  for (const m of all) {
    const before = text.slice(Math.max(0, (m.index ?? 0) - 20), m.index).toLowerCase();
    if (!/salio|balance|ada|fee|makato/.test(before)) return num(m[1]);
  }
  return null;
}

function findReference(text: string): string | null {
  const tid = text.match(/\bTID\s*[:.]?\s*([A-Z0-9][A-Z0-9.]{6,30}[A-Z0-9])/i);
  if (tid) return tid[1].toUpperCase();
  const labelled = text.match(/(?:muamala|kumbukumbu|ref(?:erence)?|txn\s*id|transaction\s*id|namba ya muamala)\s*(?:no\.?|namba)?\s*[:.]?\s*([A-Z0-9]{8,20})/i);
  if (labelled && /\d/.test(labelled[1]) && /[A-Z]/i.test(labelled[1])) return labelled[1].toUpperCase();
  const lead = text.trim().match(/^([A-Z0-9]{10,11})\b/);
  if (lead && /\d/.test(lead[1]) && /[A-Z]/.test(lead[1])) return lead[1];
  const any = text.match(/\b(?=[A-Z0-9]*\d)(?=[A-Z0-9]*[A-Z])[A-Z0-9]{10,11}\b/);
  return any ? any[0] : null;
}

function findBalance(text: string): number | null {
  const m = text.match(new RegExp(String.raw`(?:salio(?:\s+jipya)?|balance|new balance)[^\d]{0,20}?` + AMT, "i"));
  return m ? num(m[1]) : null;
}

function findSender(text: string): { name: string | null; phone: string | null } {
  const phone = text.match(/(?:\+?255|0)[67]\d{8}/)?.[0] ?? null;
  const m = text.match(/(?:kutoka(?:\s+kwa)?|from)\s+(.+?)(?=\s*(?:\.\s|,|\s+tarehe|\s+on\s|\s+salio|\s+balance|\s+saa|\s+\d{1,2}\/|$))/i);
  let name = m ? m[1].replace(/(?:\+?255|0)[67]\d{8}/, "").replace(/[-\s]+$/, "").trim() : null;
  if (name === "") name = null;
  return { name, phone };
}

/** Returns null for outgoing, unrelated or unreadable messages. */
/** Telco reversal / refund notices must never credit a wallet. */
export function isReversalSms(text: string) {
  return /imerudishwa|imesitishwa|kurejesh|rejeshwa|revers|refund|cancelled|imeghairiwa/i.test(text);
}

export function parseSms(text: string, sender = ""): ParsedSms | null {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return null;
  const incoming = /umepokea|received|imepokelewa|umelipwa|amekutumia|imethibitishwa.*kutoka/i.test(t);
  if (!incoming) return null;
  if (isReversalSms(t)) return null;
  const amount = findAmount(t);
  const reference = findReference(t);
  if (!amount || amount <= 0 || !reference) return null;
  const s = findSender(t);
  return { provider: detectProvider(t, sender), reference, amount: Math.round(amount), sender_name: s.name, sender_phone: s.phone, balance: findBalance(t) };
}

/** Levenshtein distance, capped for speed. */
export function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]; dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

export type RefMatch = "exact" | "near" | "none";
/** Exact after removing spaces/case; "near" = one typo, which must go to human review. */
export function compareReference(typed: string, actual: string): RefMatch {
  const a = normalizeReference(typed), b = normalizeReference(actual);
  if (!a || !b) return "none";
  if (a === b) return "exact";
  return editDistance(a, b) <= 1 ? "near" : "none";
}

export type PendingCheckout = { id: string; amount: number; reference: string | null; expires_at: number; status: string };
export type MatchResult = { status: "matched" | "review" | "unmatched"; checkout_id: string | null; reason: string };

/** Decide which pending checkout an incoming SMS pays. Never auto-approves ambiguous cases. */
export function matchSms(sms: { reference: string; amount: number }, pending: PendingCheckout[], now = Date.now()): MatchResult {
  const live = pending.filter((c) => c.status === "pending" && c.expires_at > now && c.amount === sms.amount);
  const exact = live.filter((c) => c.reference && compareReference(c.reference, sms.reference) === "exact");
  if (exact.length === 1) return { status: "matched", checkout_id: exact[0].id, reason: "Reference and amount match" };
  const near = live.filter((c) => c.reference && compareReference(c.reference, sms.reference) === "near");
  if (near.length) return { status: "review", checkout_id: near[0].id, reason: "Reference has a small typo — confirm manually" };
  const open = live.filter((c) => !c.reference);
  if (open.length === 1) return { status: "matched", checkout_id: open[0].id, reason: "Only one waiting payment with this amount" };
  if (open.length > 1) return { status: "review", checkout_id: null, reason: "Several waiting payments have this amount" };
  return { status: "unmatched", checkout_id: null, reason: "No waiting payment with this amount" };
}
