/**
 * BytePay Gateway storage: paired counter phones, received SMS payments and waiting checkouts.
 * Device secrets are stored only as SHA-256 hashes.
 */
import type { getSql } from "@/lib/db.server";
import { matchSms, compareReference, type ParsedSms } from "@/lib/sms-parser";

type Sql = ReturnType<typeof getSql>;

export async function ensureGatewayTables(sql: Sql) {
  await sql`create table if not exists gateway_devices (
    id text primary key,
    store_id text not null,
    name text not null,
    secret_hash text not null,
    battery integer, charging boolean, signal integer, network text, sim_slot integer, app_version text,
    last_ping timestamptz, revoked boolean not null default false,
    created_at timestamptz not null default now()
  )`;
  await sql`create table if not exists gateway_sms (
    id text primary key,
    store_id text not null,
    device_id text,
    provider text not null,
    reference text not null,
    amount numeric not null,
    sender_name text, sender_phone text,
    raw text not null,
    status text not null,
    reason text,
    checkout_id text,
    is_test boolean not null default false,
    received_at timestamptz not null default now(),
    unique (store_id, provider, reference)
  )`;
  await sql`create table if not exists gateway_checkouts (
    id text primary key,
    store_id text not null,
    amount numeric not null,
    label text,
    reference text,
    status text not null default 'pending',
    sms_id text,
    created_by text,
    expires_at timestamptz not null,
    paid_at timestamptz,
    created_at timestamptz not null default now()
  )`;
}

export async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

type CheckoutRow = { id: string; amount: string; reference: string | null; expires_at: Date; status: string };

/** Store a parsed SMS once (provider+reference unique) and settle the matching checkout atomically. */
export async function ingestSms(sql: Sql, storeId: string, deviceId: string | null, raw: string, p: ParsedSms, isTest = false) {
  return sql.begin(async (tx) => {
    await tx`update gateway_checkouts set status='expired' where store_id=${storeId} and status='pending' and expires_at < now()`;
    const dup = await tx<{ id: string; status: string; checkout_id: string | null }[]>`
      select id, status, checkout_id from gateway_sms where store_id=${storeId} and provider=${p.provider} and reference=${p.reference}`;
    if (dup[0]) return { duplicate: true, id: dup[0].id, status: dup[0].status, checkout_id: dup[0].checkout_id, reason: "Already received" };
    const pending = await tx<CheckoutRow[]>`select id, amount, reference, expires_at, status from gateway_checkouts
      where store_id=${storeId} and status='pending' for update`;
    const m = matchSms(p, pending.map((c) => ({ id: c.id, amount: Number(c.amount), reference: c.reference, expires_at: new Date(c.expires_at).getTime(), status: c.status })));
    const id = crypto.randomUUID();
    await tx`insert into gateway_sms (id, store_id, device_id, provider, reference, amount, sender_name, sender_phone, raw, status, reason, checkout_id, is_test)
      values (${id}, ${storeId}, ${deviceId}, ${p.provider}, ${p.reference}, ${p.amount}, ${p.sender_name}, ${p.sender_phone}, ${raw.slice(0, 1000)}, ${m.status}, ${m.reason}, ${m.checkout_id}, ${isTest})`;
    if (m.status === "matched" && m.checkout_id) {
      await tx`update gateway_checkouts set status='paid', sms_id=${id}, reference=${p.reference}, paid_at=now() where id=${m.checkout_id} and status='pending'`;
      return { duplicate: false, id, ...m, topup: null as null | { id: string; customer_name: string | null } };
    }
    const topup = await matchTopupForSms(tx as unknown as Sql, storeId, id, p);
    if (topup) return { duplicate: false, id, status: "matched" as const, reason: "Customer top-up verified", checkout_id: null, topup };
    return { duplicate: false, id, ...m, topup: null as null | { id: string; customer_name: string | null } };
  });
}

/** Customer/cashier typed the receipt number: claim an already-received unclaimed SMS. */
export async function claimByReference(sql: Sql, storeId: string, checkoutId: string, typed: string) {
  return sql.begin(async (tx) => {
    const [co] = await tx<CheckoutRow[]>`select id, amount, reference, expires_at, status from gateway_checkouts where id=${checkoutId} and store_id=${storeId} for update`;
    if (!co) return { status: "missing" as const };
    if (co.status !== "pending") return { status: co.status };
    if (new Date(co.expires_at).getTime() < Date.now()) {
      await tx`update gateway_checkouts set status='expired' where id=${checkoutId}`;
      return { status: "expired" as const };
    }
    const smsRows = await tx<{ id: string; reference: string; amount: string }[]>`select id, reference, amount from gateway_sms
      where store_id=${storeId} and checkout_id is null and status in ('unmatched','review') and received_at > now() - interval '1 day' for update`;
    for (const s of smsRows) {
      const cmp = compareReference(typed, s.reference);
      if (cmp === "exact" && Number(s.amount) === Number(co.amount)) {
        await tx`update gateway_sms set status='matched', checkout_id=${checkoutId}, reason='Receipt number entered' where id=${s.id}`;
        await tx`update gateway_checkouts set status='paid', sms_id=${s.id}, reference=${s.reference}, paid_at=now() where id=${checkoutId}`;
        return { status: "paid" as const };
      }
      if (cmp === "exact") return { status: "pending" as const, message: "Receipt found but the amount is different." };
      if (cmp === "near") return { status: "pending" as const, message: `Did you mean ${s.reference}? Check the number.` };
    }
    await tx`update gateway_checkouts set reference=${typed.toUpperCase().replace(/\s/g, "")} where id=${checkoutId}`;
    return { status: "pending" as const, message: "Saved. Waiting for the payment SMS to arrive." };
  });
}

/* ---------- Customer Lipa Namba top-ups verified by the gateway phone ---------- */
export const TOPUP_WINDOW_MS = 10 * 60_000;

export async function ensureTopupTable(sql: Sql) {
  await sql`create table if not exists gateway_topups (
    id text primary key,
    store_id text not null,
    customer_id text not null,
    customer_name text, customer_phone text,
    amount numeric not null,
    reference text not null,
    status text not null default 'pending',
    sms_id text,
    created_at timestamptz not null default now(),
    expires_at timestamptz not null,
    paid_at timestamptz
  )`;
  await sql`alter table gateway_topups add column if not exists paid_amount numeric`;
}

/** Receipts older than this cannot be claimed (stops reuse of old SMS). */
export const SMS_CLAIM_WINDOW = "15 minutes";

export async function expireTopups(sql: Sql, storeId: string) {
  await sql`update gateway_topups set status='failed' where store_id=${storeId} and status='pending' and expires_at < now()`;
}

/** Register a customer's typed reference; pays instantly if the SMS already arrived. */
export async function registerTopup(sql: Sql, t: { id: string; store_id: string; customer_id: string; customer_name: string; customer_phone: string; amount: number; reference: string }) {
  await ensureTopupTable(sql);
  const ref = t.reference.toUpperCase().replace(/\s/g, "");
  return sql.begin(async (tx) => {
    const [existing] = await tx<{ status: string }[]>`select status from gateway_topups where id=${t.id}`;
    if (existing) return { status: existing.status, paid_amount: null as number | null };
    await tx`insert into gateway_topups (id, store_id, customer_id, customer_name, customer_phone, amount, reference, expires_at)
      values (${t.id}, ${t.store_id}, ${t.customer_id}, ${t.customer_name}, ${t.customer_phone}, ${t.amount}, ${ref}, ${new Date(Date.now() + TOPUP_WINDOW_MS)})`;
    const smsRows = await tx<{ id: string; reference: string; amount: string }[]>`select id, reference, amount from gateway_sms
      where store_id=${t.store_id} and checkout_id is null and status in ('unmatched','review') and received_at > now() - interval '15 minutes' for update`;
    for (const s of smsRows) {
      if (compareReference(ref, s.reference) === "exact") {
        const paid = Number(s.amount);
        await tx`update gateway_sms set status='matched', checkout_id=${"topup:" + t.id}, reason='Customer top-up' where id=${s.id}`;
        await tx`update gateway_topups set status='paid', sms_id=${s.id}, paid_amount=${paid}, paid_at=now() where id=${t.id}`;
        return { status: "paid", paid_amount: paid };
      }
    }
    return { status: "pending" as string, paid_amount: null as number | null };
  });
}

/** Called inside SMS ingest when no POS checkout matched: settle one exact pending top-up. */
export async function matchTopupForSms(tx: Sql, storeId: string, smsId: string, p: ParsedSms) {
  await ensureTopupTable(tx);
  const rows = await tx<{ id: string; reference: string; amount: string; customer_name: string | null }[]>`
    select id, reference, amount, customer_name from gateway_topups
    where store_id=${storeId} and status='pending' and expires_at >= now() for update`;
  // The SMS amount is the financial truth: match on receipt number only, credit what the phone received.
  const hits = rows.filter((r) => compareReference(r.reference, p.reference) === "exact");
  if (hits.length !== 1) return null;
  const h = hits[0];
  await tx`update gateway_topups set status='paid', sms_id=${smsId}, paid_amount=${p.amount}, paid_at=now() where id=${h.id} and status='pending'`;
  await tx`update gateway_sms set status='matched', checkout_id=${"topup:" + h.id}, reason='Customer top-up' where id=${smsId}`;
  return { id: h.id, customer_name: h.customer_name };
}

/** Staff lookup: receipt + amount only (never the payer's name). */
export async function lookupReceipt(sql: Sql, storeId: string, reference: string) {
  const ref = reference.toUpperCase().replace(/\s/g, "");
  const rows = await sql<{ id: string; reference: string; amount: string; status: string; checkout_id: string | null; received_at: Date }[]>`
    select id, reference, amount, status, checkout_id, received_at from gateway_sms where store_id=${storeId} and received_at > now() - interval '3 days' order by received_at desc limit 500`;
  const exact = rows.find((r) => compareReference(ref, r.reference) === "exact");
  if (exact) return { found: true as const, reference: exact.reference, amount: Number(exact.amount), used: !!exact.checkout_id || exact.status === "matched" || exact.status === "ignored", received_at: new Date(exact.received_at).getTime() };
  const near = rows.find((r) => compareReference(ref, r.reference) === "near");
  return { found: false as const, suggestion: near?.reference ?? null };
}

/** Lock a receipt to a staff-confirmed top-up so it can never be credited twice. */
export async function claimReceiptForStaff(sql: Sql, storeId: string, reference: string, requestId: string) {
  const ref = reference.toUpperCase().replace(/\s/g, "");
  return sql.begin(async (tx) => {
    const rows = await tx<{ id: string; reference: string; amount: string; checkout_id: string | null; status: string }[]>`
      select id, reference, amount, checkout_id, status from gateway_sms where store_id=${storeId} and received_at > now() - interval '3 days' for update`;
    const s = rows.find((r) => compareReference(ref, r.reference) === "exact");
    if (!s) return { ok: true as const, gateway: false, amount: null as number | null };
    if (s.checkout_id || s.status === "matched" || s.status === "ignored") return { ok: false as const, reason: "This receipt was already used." };
    await tx`update gateway_sms set status='matched', checkout_id=${"staff:" + requestId}, reason='Confirmed by staff' where id=${s.id}`;
    await tx`update gateway_topups set status='paid', sms_id=${s.id}, paid_amount=${Number(s.amount)}, paid_at=now() where id=${requestId} and status <> 'paid'`.catch(() => {});
    return { ok: true as const, gateway: true, amount: Number(s.amount) };
  });
}
