import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Called by the BytePay Gateway Android app on paired counter phones.
// Auth: X-Device-Id + X-Gateway-Secret (hash compared server-side). `sms` is optional so the
// same call works as a heartbeat.
const Body = z.object({
  sms: z.string().trim().min(5).max(1000).optional(),
  sender: z.string().max(60).optional().default(""),
  battery: z.number().int().min(0).max(100).optional(),
  charging: z.boolean().optional(),
  signal: z.number().int().min(0).max(5).optional(),
  network: z.string().max(40).optional(),
  sim_slot: z.number().int().min(0).max(4).optional(),
  app_version: z.string().max(40).optional(),
});

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Device-Id, X-Gateway-Secret",
};

export const Route = createFileRoute("/api/public/gateway/sms")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        const deviceId = request.headers.get("x-device-id") ?? "";
        const secret = request.headers.get("x-gateway-secret") ?? "";
        if (!deviceId || deviceId.length > 100 || secret.length < 20 || secret.length > 200) {
          return Response.json({ ok: false, error: "unauthorized" }, { status: 401, headers: cors });
        }
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ ok: false, error: "invalid_body" }, { status: 400, headers: cors });
        const b = parsed.data;
        const { getSql } = await import("@/lib/db.server");
        const { ensureGatewayTables, sha256, safeEqual, ingestSms } = await import("@/lib/gateway.server");
        const { parseSms } = await import("@/lib/sms-parser");
        const sql = getSql();
        await ensureGatewayTables(sql);
        const [dev] = await sql<{ store_id: string; secret_hash: string; revoked: boolean }[]>`
          select store_id, secret_hash, revoked from gateway_devices where id=${deviceId}`;
        if (!dev || dev.revoked || !safeEqual(dev.secret_hash, await sha256(secret))) {
          return Response.json({ ok: false, error: "unauthorized" }, { status: 401, headers: cors });
        }
        await sql`update gateway_devices set last_ping=now(), battery=coalesce(${b.battery ?? null}, battery),
          charging=coalesce(${b.charging ?? null}, charging), signal=coalesce(${b.signal ?? null}, signal),
          network=coalesce(${b.network ?? null}, network), sim_slot=coalesce(${b.sim_slot ?? null}, sim_slot),
          app_version=coalesce(${b.app_version ?? null}, app_version) where id=${deviceId}`;
        if (!b.sms) return Response.json({ ok: true, type: "heartbeat" }, { headers: cors });
        const p = parseSms(b.sms, b.sender);
        if (!p) return Response.json({ ok: true, type: "ignored", reason: "Not an incoming payment SMS" }, { headers: cors });
        const r = await ingestSms(sql, dev.store_id, deviceId, b.sms, p);
        return Response.json({ ok: true, type: "payment", provider: p.provider, reference: p.reference, amount: p.amount,
          status: r.status, duplicate: r.duplicate, matched: r.status === "matched" }, { headers: cors });
      },
    },
  },
});
