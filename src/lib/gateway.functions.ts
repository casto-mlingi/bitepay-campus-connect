import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

type Member = { id: string; role: string; disabled?: boolean; store_id?: string; staff_role?: string; memberships?: { store_id: string; staff_role: string }[] };

/** Verifies the signed-in staff member works at this store; managers=owner/supervisor. */
async function requireStaff(storeId: string, manager: boolean) {
  const { readSessionCookie } = await import("./auth/session.server");
  const s = readSessionCookie();
  if (!s || s.role !== "staff") throw new Error("Please sign in again.");
  const { getSql } = await import("./db.server");
  const sql = getSql();
  const [row] = await sql<{ payload: string }[]>`select payload from app_snapshots where key='global'`;
  const profiles = (row ? (JSON.parse(String(row.payload)).profiles as Member[]) : []) ?? [];
  const me = profiles.find((p) => p.id === s.uid && !p.disabled);
  const role = me?.memberships?.find((m) => m.store_id === storeId)?.staff_role ?? (me?.store_id === storeId ? me?.staff_role : undefined);
  if (!role) throw new Error("You do not work at this store.");
  if (manager && role !== "owner" && role !== "supervisor") throw new Error("Only the owner or a supervisor can do this.");
  const { ensureGatewayTables } = await import("./gateway.server");
  await ensureGatewayTables(sql);
  return { sql, uid: s.uid };
}

const store = z.object({ store_id: z.string().min(1).max(100) });

export const pairGatewayDevice = createServerFn({ method: "POST" })
  .inputValidator((r: unknown) => store.extend({ name: z.string().trim().min(1).max(60) }).parse(r))
  .handler(async ({ data }) => {
    const { sql } = await requireStaff(data.store_id, true);
    const { sha256 } = await import("./gateway.server");
    const id = `GW-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    const secret = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
    await sql`insert into gateway_devices (id, store_id, name, secret_hash) values (${id}, ${data.store_id}, ${data.name}, ${await sha256(secret)})`;
    return { device_id: id, secret };
  });

export const revokeGatewayDevice = createServerFn({ method: "POST" })
  .inputValidator((r: unknown) => store.extend({ device_id: z.string().max(100) }).parse(r))
  .handler(async ({ data }) => {
    const { sql } = await requireStaff(data.store_id, true);
    await sql`update gateway_devices set revoked=true where id=${data.device_id} and store_id=${data.store_id}`;
    return { ok: true };
  });

export const getGatewayOverview = createServerFn({ method: "POST" })
  .inputValidator((r: unknown) => store.parse(r))
  .handler(async ({ data }) => {
    const { sql } = await requireStaff(data.store_id, false);
    const devices = await sql<{ id: string; name: string; battery: number | null; charging: boolean | null; signal: number | null; network: string | null; sim_slot: number | null; app_version: string | null; last_ping: Date | null }[]>`
      select id, name, battery, charging, signal, network, sim_slot, app_version, last_ping from gateway_devices
      where store_id=${data.store_id} and not revoked order by created_at`;
    const sms = await sql<{ id: string; provider: string; reference: string; amount: string; sender_name: string | null; sender_phone: string | null; status: string; reason: string | null; checkout_id: string | null; is_test: boolean; received_at: Date }[]>`
      select id, provider, reference, amount, sender_name, sender_phone, status, reason, checkout_id, is_test, received_at
      from gateway_sms where store_id=${data.store_id} order by received_at desc limit 300`;
    return {
      devices: devices.map((d) => ({ ...d, last_ping: d.last_ping ? new Date(d.last_ping).getTime() : null })),
      sms: sms.map((s) => ({ ...s, amount: Number(s.amount), received_at: new Date(s.received_at).getTime() })),
    };
  });

/** Simulation panel: parse a pasted SMS; optionally record it as a test payment. */
export const simulateGatewaySms = createServerFn({ method: "POST" })
  .inputValidator((r: unknown) => store.extend({ sms: z.string().trim().min(5).max(1000), record: z.boolean() }).parse(r))
  .handler(async ({ data }) => {
    const { sql } = await requireStaff(data.store_id, true);
    const { parseSms } = await import("./sms-parser");
    const p = parseSms(data.sms);
    if (!p) return { parsed: null, result: null };
    if (!data.record) return { parsed: p, result: null };
    const { ingestSms } = await import("./gateway.server");
    const r = await ingestSms(sql, data.store_id, null, data.sms, { ...p, reference: `TEST-${p.reference}` }, true);
    return { parsed: p, result: { status: r.status, reason: r.reason, duplicate: r.duplicate } };
  });

export const markGatewaySms = createServerFn({ method: "POST" })
  .inputValidator((r: unknown) => store.extend({ sms_id: z.string().max(100), status: z.enum(["flagged", "unmatched"]) }).parse(r))
  .handler(async ({ data }) => {
    const { sql } = await requireStaff(data.store_id, true);
    await sql`update gateway_sms set status=${data.status} where id=${data.sms_id} and store_id=${data.store_id} and status <> 'matched'`;
    return { ok: true };
  });

export const createGatewayCheckout = createServerFn({ method: "POST" })
  .inputValidator((r: unknown) => store.extend({ amount: z.number().int().min(100).max(10_000_000), label: z.string().max(80).optional(), minutes: z.number().int().min(1).max(60).default(10) }).parse(r))
  .handler(async ({ data }) => {
    const { sql, uid } = await requireStaff(data.store_id, false);
    const id = crypto.randomUUID();
    const expires = new Date(Date.now() + data.minutes * 60_000);
    await sql`insert into gateway_checkouts (id, store_id, amount, label, created_by, expires_at) values (${id}, ${data.store_id}, ${data.amount}, ${data.label ?? null}, ${uid}, ${expires})`;
    return { id, expires_at: expires.getTime() };
  });

export const getGatewayCheckout = createServerFn({ method: "POST" })
  .inputValidator((r: unknown) => store.extend({ id: z.string().max(100) }).parse(r))
  .handler(async ({ data }) => {
    const { sql } = await requireStaff(data.store_id, false);
    await sql`update gateway_checkouts set status='expired' where id=${data.id} and status='pending' and expires_at < now()`;
    const [c] = await sql<{ status: string; reference: string | null; amount: string; expires_at: Date }[]>`
      select status, reference, amount, expires_at from gateway_checkouts where id=${data.id} and store_id=${data.store_id}`;
    if (!c) return null;
    return { status: c.status, reference: c.reference, amount: Number(c.amount), expires_at: new Date(c.expires_at).getTime() };
  });

export const cancelGatewayCheckout = createServerFn({ method: "POST" })
  .inputValidator((r: unknown) => store.extend({ id: z.string().max(100) }).parse(r))
  .handler(async ({ data }) => {
    const { sql } = await requireStaff(data.store_id, false);
    await sql`update gateway_checkouts set status='cancelled' where id=${data.id} and store_id=${data.store_id} and status='pending'`;
    return { ok: true };
  });

export const submitCheckoutReference = createServerFn({ method: "POST" })
  .inputValidator((r: unknown) => store.extend({ id: z.string().max(100), reference: z.string().trim().min(6).max(40) }).parse(r))
  .handler(async ({ data }) => {
    const { sql } = await requireStaff(data.store_id, false);
    const { claimByReference } = await import("./gateway.server");
    return claimByReference(sql, data.store_id, data.id, data.reference);
  });

/* ---------- Customer Lipa Namba top-ups (gateway verified) ---------- */
async function requireCustomer() {
  const { readSessionCookie } = await import("./auth/session.server");
  const s = readSessionCookie();
  if (!s) throw new Error("Please sign in again.");
  const { getSql } = await import("./db.server");
  const sql = getSql();
  const { ensureGatewayTables, ensureTopupTable } = await import("./gateway.server");
  await ensureGatewayTables(sql);
  await ensureTopupTable(sql);
  return { sql, uid: s.uid };
}

export const registerGatewayTopup = createServerFn({ method: "POST" })
  .inputValidator((r: unknown) => z.object({
    id: z.string().min(1).max(100), store_id: z.string().min(1).max(100),
    customer_name: z.string().max(120), customer_phone: z.string().max(30),
    amount: z.number().int().min(100).max(10_000_000), reference: z.string().trim().min(6).max(40),
  }).parse(r))
  .handler(async ({ data }) => {
    const { sql, uid } = await requireCustomer();
    const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from gateway_topups
      where customer_id=${uid} and status <> 'paid' and created_at > now() - interval '15 minutes'`;
    if (n >= 3) return { status: "blocked", paid_amount: null as number | null };
    const { registerTopup } = await import("./gateway.server");
    const r = await registerTopup(sql, { ...data, customer_id: uid });
    if (r.status === "paid") {
      const { settlePaidTopupsInSnapshot } = await import("./gateway-credits");
      await settlePaidTopupsInSnapshot(sql).catch(() => {});
    }
    return r;
  });

export const checkGatewayTopups = createServerFn({ method: "POST" })
  .inputValidator((r: unknown) => z.object({ ids: z.array(z.string().max(100)).max(30) }).parse(r))
  .handler(async ({ data }) => {
    const { sql, uid } = await requireCustomer();
    if (!data.ids.length) return [];
    await sql`update gateway_topups set status='failed' where customer_id=${uid} and status='pending' and expires_at < now()`;
    const rows = await sql<{ id: string; status: string; amount: string; paid_amount: string | null; expires_at: Date }[]>`
      select id, status, amount, paid_amount, expires_at from gateway_topups where customer_id=${uid} and id = any(${data.ids})`;
    return rows.map((r) => ({ id: r.id, status: r.status, amount: Number(r.amount), paid_amount: r.paid_amount == null ? null : Number(r.paid_amount), expires_at: new Date(r.expires_at).getTime() }));
  });

export const lookupGatewayReceipts = createServerFn({ method: "POST" })
  .inputValidator((r: unknown) => store.extend({ references: z.array(z.string().trim().min(4).max(40)).max(40) }).parse(r))
  .handler(async ({ data }) => {
    const { sql } = await requireStaff(data.store_id, false);
    const { lookupReceipt } = await import("./gateway.server");
    const out: Record<string, Awaited<ReturnType<typeof lookupReceipt>>> = {};
    for (const ref of data.references) out[ref] = await lookupReceipt(sql, data.store_id, ref);
    return out;
  });

export const claimGatewayReceipt = createServerFn({ method: "POST" })
  .inputValidator((r: unknown) => store.extend({ reference: z.string().trim().min(4).max(40), request_id: z.string().min(1).max(100) }).parse(r))
  .handler(async ({ data }) => {
    const { sql } = await requireStaff(data.store_id, false);
    const { claimReceiptForStaff, ensureTopupTable } = await import("./gateway.server");
    await ensureTopupTable(sql);
    return claimReceiptForStaff(sql, data.store_id, data.reference, data.request_id);
  });

/** Recent Lipa Namba payments received by the store's SMS phone, for cashiers at checkout. */
export const listIncomingLipa = createServerFn({ method: "POST" })
  .inputValidator((r: unknown) => store.extend({ hours: z.number().int().min(1).max(72).default(24) }).parse(r))
  .handler(async ({ data }) => {
    const { sql } = await requireStaff(data.store_id, false);
    const since = new Date(Date.now() - data.hours * 3_600_000);
    const rows = await sql<{ id: string; provider: string; reference: string; amount: string; sender_name: string | null; sender_phone: string | null; status: string; checkout_id: string | null; received_at: Date }[]>`
      select id, provider, reference, amount, sender_name, sender_phone, status, checkout_id, received_at from gateway_sms
      where store_id=${data.store_id} and not is_test and received_at > ${since} order by received_at desc limit 200`;
    return rows.map((r) => ({ id: r.id, provider: r.provider, reference: r.reference, amount: Number(r.amount), sender_name: r.sender_name, sender_phone: r.sender_phone ? r.sender_phone.replace(/\d(?=\d{3})/g, "•") : null, used: !!r.checkout_id || r.status === "matched" || r.status === "ignored", received_at: new Date(r.received_at).getTime() }));
  });

/** Locks one received Lipa payment to a POS sale so no other till can use it. */
export const claimLipaForSale = createServerFn({ method: "POST" })
  .inputValidator((r: unknown) => store.extend({ sms_id: z.string().min(1).max(100) }).parse(r))
  .handler(async ({ data }) => {
    const { sql, uid } = await requireStaff(data.store_id, false);
    return sql.begin(async (tx) => {
      const [s] = await tx<{ id: string; reference: string; amount: string; status: string; checkout_id: string | null }[]>`
        select id, reference, amount, status, checkout_id from gateway_sms where id=${data.sms_id} and store_id=${data.store_id} and not is_test for update`;
      if (!s) return { ok: false as const, reason: "Payment not found." };
      if (s.checkout_id || s.status === "matched" || s.status === "ignored") return { ok: false as const, reason: "This payment was already used." };
      await tx`update gateway_sms set status='matched', checkout_id=${"pos:" + uid + ":" + Date.now()}, reason='Used at POS' where id=${s.id}`;
      return { ok: true as const, reference: s.reference, amount: Number(s.amount) };
    });
  });
