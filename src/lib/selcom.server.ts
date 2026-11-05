/**
 * Mobile money gateway client — AzamPay Checkout API (replaces Selcom).
 * File/export names are kept so existing screens keep working.
 * Each store saves its own AzamPay app credentials; secrets never leave the server.
 *
 * Column mapping in `selcom_settings` (kept to preserve existing data):
 *   base_url   -> "sandbox" | "live"
 *   vendor     -> AzamPay app name
 *   api_key    -> client ID
 *   api_secret -> client secret
 *   x_api_key  -> optional X-API-Key issued during onboarding
 */
import type { getSql } from "@/lib/db.server";

type Sql = ReturnType<typeof getSql>;

export const AZAM_ENVS = {
  sandbox: { auth: "https://authenticator-sandbox.azampay.co.tz", checkout: "https://sandbox.azampay.co.tz" },
  live: { auth: "https://authenticator.azampay.co.tz", checkout: "https://checkout.azampay.co.tz" },
} as const;
export type AzamEnv = keyof typeof AZAM_ENVS;
export const DEFAULT_SELCOM_BASE_URL = "sandbox";

export async function ensureSelcomTables(sql: Sql) {
  await sql`create table if not exists selcom_settings (
    store_id text primary key,
    base_url text not null,
    api_key text not null,
    api_secret text not null,
    vendor text not null,
    fee_percent numeric not null default 0,
    fee_flat numeric not null default 0,
    updated_at timestamptz not null default now()
  )`;
  await sql`alter table selcom_settings add column if not exists fee_percent numeric not null default 0`;
  await sql`alter table selcom_settings add column if not exists fee_flat numeric not null default 0`;
  await sql`alter table selcom_settings add column if not exists x_api_key text`;
  await sql`create table if not exists selcom_payments (
    order_id text primary key,
    store_id text not null,
    customer_id text not null,
    amount numeric not null,
    msisdn text not null,
    network text not null,
    status text not null default 'PENDING',
    credited boolean not null default false,
    fee numeric not null default 0,
    created_at timestamptz not null default now()
  )`;
  await sql`alter table selcom_payments add column if not exists fee numeric not null default 0`;
  await sql`alter table selcom_payments add column if not exists gateway_ref text`;
}

/** Transaction fee the customer pays on top of the top-up amount. */
export function computeFee(amount: number, feePercent: number, feeFlat: number) {
  return Math.round((amount * feePercent) / 100 + feeFlat);
}

export type SelcomCreds = { base_url: string; api_key: string; api_secret: string; vendor: string; fee_percent: number; fee_flat: number; x_api_key: string | null };

export function envOf(c: SelcomCreds): AzamEnv {
  return c.base_url === "live" ? "live" : "sandbox";
}

export async function loadCreds(sql: Sql, storeId: string): Promise<SelcomCreds | null> {
  await ensureSelcomTables(sql);
  const rows = await sql<SelcomCreds[]>`select base_url, api_key, api_secret, vendor, fee_percent, fee_flat, x_api_key from selcom_settings where store_id = ${storeId}`;
  const r = rows[0];
  return r ? { ...r, fee_percent: Number(r.fee_percent), fee_flat: Number(r.fee_flat) } : null;
}

const tokenCache = new Map<string, { token: string; exp: number }>();

export async function azamToken(c: SelcomCreds): Promise<string> {
  const key = `${envOf(c)}:${c.api_key}`;
  const hit = tokenCache.get(key);
  if (hit && hit.exp > Date.now() + 60_000) return hit.token;
  const res = await fetch(`${AZAM_ENVS[envOf(c)].auth}/AppRegistration/GenerateToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ appName: c.vendor, clientId: c.api_key, clientSecret: c.api_secret }),
  });
  const j = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string; data?: { accessToken?: string; expire?: string } };
  const token = j.data?.accessToken;
  if (!res.ok || !token) throw new Error(j.message || `AzamPay sign-in failed (HTTP ${res.status}). Check app name, client ID and secret.`);
  const exp = j.data?.expire ? Date.parse(j.data.expire) : NaN;
  tokenCache.set(key, { token, exp: Number.isFinite(exp) ? exp : Date.now() + 30 * 60_000 });
  return token;
}

async function authHeaders(c: SelcomCreds) {
  const h: Record<string, string> = { "Content-Type": "application/json", Authorization: `Bearer ${await azamToken(c)}` };
  if (c.x_api_key) h["X-API-Key"] = c.x_api_key;
  return h;
}

export const AZAM_PROVIDER: Record<string, string> = { mpesa: "Mpesa", yas: "Tigo", airtel: "Airtel", halotel: "Halopesa", azampesa: "Azampesa" };

export async function azamMnoCheckout(c: SelcomCreds, p: { msisdn: string; amount: number; externalId: string; network: string }) {
  const res = await fetch(`${AZAM_ENVS[envOf(c)].checkout}/azampay/mno/checkout`, {
    method: "POST",
    headers: await authHeaders(c),
    body: JSON.stringify({ accountNumber: p.msisdn, amount: p.amount, currency: "TZS", externalId: p.externalId, provider: AZAM_PROVIDER[p.network] }),
  });
  const j = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string; transactionId?: string };
  return { ok: res.ok && j.success === true, message: j.message, transactionId: j.transactionId };
}

const keyCache = new Map<AzamEnv, { key: CryptoKey; at: number }>();

async function publicKey(c: SelcomCreds, fresh = false): Promise<CryptoKey | null> {
  const env = envOf(c);
  const hit = keyCache.get(env);
  if (!fresh && hit && Date.now() - hit.at < 24 * 3600_000) return hit.key;
  const res = await fetch(`${AZAM_ENVS[env].checkout}/azampay/v1/public-key?format=Pem`, { headers: await authHeaders(c) });
  const j = (await res.json().catch(() => ({}))) as { publicKey?: string };
  if (!j.publicKey) return null;
  const b64 = j.publicKey.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
  const key = await crypto.subtle.importKey("spki", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  keyCache.set(env, { key, at: Date.now() });
  return key;
}

/** Verifies AzamPay's RSA signature over {utilityref}{externalreference}{transactionstatus}{operator}. */
export async function verifyCallbackSignature(c: SelcomCreds, cb: { utilityref: string; externalreference: string; transactionstatus: string; operator: string; signature: string }) {
  const data = new TextEncoder().encode(`${cb.utilityref}${cb.externalreference}${cb.transactionstatus}${cb.operator}`);
  let sig: Uint8Array<ArrayBuffer>;
  try { sig = Uint8Array.from(atob(cb.signature), (ch) => ch.charCodeAt(0)); } catch { return false; }
  for (const fresh of [false, true]) {
    const key = await publicKey(c, fresh).catch(() => null);
    if (key && (await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, sig, data))) return true;
  }
  return false;
}

/** AzamPay Checkout has no status lookup; status is set by the verified callback. */
export async function refreshPaymentStatus(sql: Sql, orderId: string) {
  await ensureSelcomTables(sql);
  const rows = await sql<{ status: string }[]>`select status from selcom_payments where order_id = ${orderId}`;
  return rows[0]?.status ?? null;
}
