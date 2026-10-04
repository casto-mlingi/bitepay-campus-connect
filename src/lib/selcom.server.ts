/**
 * Selcom API Gateway client (port of the official `selcom-apigw-client`
 * package to fetch + node:crypto so it runs on the edge server).
 * Each store saves its own API key/secret; secrets never leave the server.
 */
import { createHmac } from "node:crypto";
import type { getSql } from "@/lib/db.server";

type Sql = ReturnType<typeof getSql>;

export const DEFAULT_SELCOM_BASE_URL = "https://apigw.selcommobile.com";

export async function ensureSelcomTables(sql: Sql) {
  await sql`create table if not exists selcom_settings (
    store_id text primary key,
    base_url text not null,
    api_key text not null,
    api_secret text not null,
    vendor text not null,
    updated_at timestamptz not null default now()
  )`;
  await sql`create table if not exists selcom_payments (
    order_id text primary key,
    store_id text not null,
    customer_id text not null,
    amount numeric not null,
    msisdn text not null,
    network text not null,
    status text not null default 'PENDING',
    credited boolean not null default false,
    created_at timestamptz not null default now()
  )`;
}

export type SelcomCreds = { base_url: string; api_key: string; api_secret: string; vendor: string };

export async function loadCreds(sql: Sql, storeId: string): Promise<SelcomCreds | null> {
  await ensureSelcomTables(sql);
  const rows = await sql<SelcomCreds[]>`select base_url, api_key, api_secret, vendor from selcom_settings where store_id = ${storeId}`;
  return rows[0] ?? null;
}

function timestamp() {
  // YYYY-MM-DDTHH:mm:ss+00:00
  return new Date().toISOString().replace(/\.\d{3}Z$/, "+00:00");
}

function headers(creds: SelcomCreds, data: Record<string, string | number>) {
  const ts = timestamp();
  let signed = `timestamp=${ts}`;
  const fields: string[] = [];
  for (const k of Object.keys(data)) {
    signed += `&${k}=${data[k]}`;
    fields.push(k);
  }
  const digest = createHmac("sha256", creds.api_secret).update(signed).digest("base64");
  return {
    "Content-Type": "application/json",
    Authorization: `SELCOM ${Buffer.from(creds.api_key, "ascii").toString("base64")}`,
    "Digest-Method": "HS256",
    Digest: digest,
    Timestamp: ts,
    "Signed-Fields": fields.join(","),
  };
}

export type SelcomResponse = { result?: string; resultcode?: string; message?: string; data?: Array<Record<string, unknown>> };

export async function selcomPost(creds: SelcomCreds, path: string, data: Record<string, string | number>): Promise<SelcomResponse> {
  const res = await fetch(creds.base_url.replace(/\/$/, "") + path, {
    method: "POST", headers: headers(creds, data), body: JSON.stringify(data),
  });
  return (await res.json().catch(() => ({ result: "FAIL", message: `HTTP ${res.status}` }))) as SelcomResponse;
}

export async function selcomGet(creds: SelcomCreds, path: string, data: Record<string, string | number>): Promise<SelcomResponse> {
  const qs = new URLSearchParams(Object.entries(data).map(([k, v]) => [k, String(v)]));
  const res = await fetch(`${creds.base_url.replace(/\/$/, "")}${path}?${qs}`, { method: "GET", headers: headers(creds, data) });
  return (await res.json().catch(() => ({ result: "FAIL", message: `HTTP ${res.status}` }))) as SelcomResponse;
}

/** Ask Selcom for the real status of an order and store it. */
export async function refreshPaymentStatus(sql: Sql, orderId: string) {
  await ensureSelcomTables(sql);
  const rows = await sql<{ store_id: string; status: string }[]>`select store_id, status from selcom_payments where order_id = ${orderId}`;
  const row = rows[0];
  if (!row) return null;
  if (row.status === "COMPLETED") return "COMPLETED";
  const creds = await loadCreds(sql, row.store_id);
  if (!creds) return row.status;
  const r = await selcomGet(creds, "/v1/checkout/order-status", { order_id: orderId });
  const ps = String(r.data?.[0]?.["payment_status"] ?? row.status).toUpperCase();
  if (ps !== row.status) await sql`update selcom_payments set status = ${ps} where order_id = ${orderId}`;
  return ps;
}
