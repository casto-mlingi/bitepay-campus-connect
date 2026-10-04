import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const SELCOM_NETWORKS = {
  mpesa: { label: "M-Pesa (Vodacom)", prefixes: ["74", "75", "76"] },
  yas: { label: "Yas Pesa (Mixx by Yas)", prefixes: ["65", "67", "71", "77"] },
  airtel: { label: "Airtel Money", prefixes: ["68", "69", "78"] },
  halotel: { label: "Halotel Money (HaloPesa)", prefixes: ["61", "62"] },
} as const;
export type SelcomNetwork = keyof typeof SELCOM_NETWORKS;

/** Normalize to 2557XXXXXXXX. Returns null when invalid. */
export function normalizeMsisdn(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  let local = d;
  if (local.startsWith("255")) local = local.slice(3);
  if (local.startsWith("0")) local = local.slice(1);
  return /^\d{9}$/.test(local) ? `255${local}` : null;
}

export const getSelcomStatus = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => z.object({ store_id: z.string().min(1).max(100) }).parse(raw))
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db.server");
    const { loadCreds } = await import("@/lib/selcom.server");
    try {
      const c = await loadCreds(getSql(), data.store_id);
      if (!c) return { configured: false as const };
      return { configured: true as const, vendor: c.vendor, base_url: c.base_url, api_key_hint: `…${c.api_key.slice(-4)}` };
    } catch {
      return { configured: false as const };
    }
  });

export const saveSelcomSettings = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({
    store_id: z.string().min(1).max(100),
    base_url: z.string().url().max(200),
    api_key: z.string().trim().min(8).max(300),
    api_secret: z.string().trim().min(8).max(300),
    vendor: z.string().trim().min(2).max(100),
    current_api_key: z.string().max(300).optional(),
  }).parse(raw))
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db.server");
    const { loadCreds } = await import("@/lib/selcom.server");
    const sql = getSql();
    const existing = await loadCreds(sql, data.store_id);
    // Replacing saved keys requires proving you know the current API key.
    if (existing && existing.api_key !== (data.current_api_key ?? "").trim()) {
      return { ok: false as const, reason: "Enter the current API key to replace the saved keys." };
    }
    await sql`insert into selcom_settings (store_id, base_url, api_key, api_secret, vendor)
      values (${data.store_id}, ${data.base_url}, ${data.api_key}, ${data.api_secret}, ${data.vendor})
      on conflict (store_id) do update set base_url = excluded.base_url, api_key = excluded.api_key,
        api_secret = excluded.api_secret, vendor = excluded.vendor, updated_at = now()`;
    return { ok: true as const };
  });

export const startSelcomTopup = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({
    store_id: z.string().min(1).max(100),
    customer_id: z.string().min(1).max(100),
    customer_name: z.string().max(120),
    amount: z.number().int().min(500).max(5_000_000),
    network: z.enum(["mpesa", "yas", "airtel", "halotel"]),
    phone: z.string().max(20),
    origin: z.string().url().max(200),
  }).parse(raw))
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db.server");
    const { loadCreds, selcomPost, ensureSelcomTables } = await import("@/lib/selcom.server");
    const msisdn = normalizeMsisdn(data.phone);
    if (!msisdn) return { ok: false as const, reason: "Enter a valid phone number, e.g. 0712 345 678." };
    const prefix = msisdn.slice(3, 5);
    if (!(SELCOM_NETWORKS[data.network].prefixes as readonly string[]).includes(prefix)) {
      return { ok: false as const, reason: `That number is not a ${SELCOM_NETWORKS[data.network].label} number.` };
    }
    const sql = getSql();
    const creds = await loadCreds(sql, data.store_id);
    if (!creds) return { ok: false as const, reason: "This canteen has not set up mobile money payments yet." };
    await ensureSelcomTables(sql);

    const orderId = `BP${Date.now()}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
    const webhook = Buffer.from(`${data.origin}/api/public/selcom/webhook`).toString("base64");
    const order = await selcomPost(creds, "/v1/checkout/create-order-minimal", {
      vendor: creds.vendor, order_id: orderId,
      buyer_email: "customer@bitepay.app", buyer_name: data.customer_name || "BitePay customer",
      buyer_phone: msisdn, amount: data.amount, currency: "TZS",
      webhook, buyer_remarks: "Wallet top-up", merchant_remarks: "BitePay", no_of_items: 1,
    });
    if (order.resultcode !== "000") return { ok: false as const, reason: order.message || "Selcom could not create the payment." };

    await sql`insert into selcom_payments (order_id, store_id, customer_id, amount, msisdn, network)
      values (${orderId}, ${data.store_id}, ${data.customer_id}, ${data.amount}, ${msisdn}, ${data.network})`;

    const push = await selcomPost(creds, "/v1/checkout/wallet-payment", { transid: orderId, order_id: orderId, msisdn });
    if (push.resultcode !== "000" && push.resultcode !== "111") {
      await sql`update selcom_payments set status = 'FAILED' where order_id = ${orderId}`;
      return { ok: false as const, reason: push.message || "Could not send the payment prompt to your phone." };
    }
    return { ok: true as const, order_id: orderId };
  });

export const checkSelcomTopup = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ order_id: z.string().min(4).max(60) }).parse(raw))
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db.server");
    const { refreshPaymentStatus } = await import("@/lib/selcom.server");
    const status = await refreshPaymentStatus(getSql(), data.order_id);
    return { status: status ?? "UNKNOWN" };
  });

/** Marks a COMPLETED payment as credited exactly once. */
export const claimSelcomTopup = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ order_id: z.string().min(4).max(60), customer_id: z.string().min(1).max(100) }).parse(raw))
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db.server");
    const sql = getSql();
    const rows = await sql<{ amount: string; network: string }[]>`
      update selcom_payments set credited = true
      where order_id = ${data.order_id} and customer_id = ${data.customer_id} and status = 'COMPLETED' and credited = false
      returning amount, network`;
    if (!rows[0]) return { ok: false as const };
    return { ok: true as const, amount: Number(rows[0].amount), network: rows[0].network };
  });
