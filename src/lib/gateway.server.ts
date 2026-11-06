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
    }
    return { duplicate: false, id, ...m };
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
