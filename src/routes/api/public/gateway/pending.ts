import { createFileRoute } from "@tanstack/react-router";

// BytePay Gateway Android app polls this to list customer Lipa Namba top-ups waiting for an SMS.
// Auth: X-Device-Id + X-Gateway-Secret. Items older than 10 minutes are marked failed.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Device-Id, X-Gateway-Secret",
};

export const Route = createFileRoute("/api/public/gateway/pending")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      GET: async ({ request }) => {
        const deviceId = request.headers.get("x-device-id") ?? "";
        const secret = request.headers.get("x-gateway-secret") ?? "";
        if (!deviceId || deviceId.length > 100 || secret.length < 20 || secret.length > 200) {
          return Response.json({ ok: false, error: "unauthorized" }, { status: 401, headers: cors });
        }
        const { getSql } = await import("@/lib/db.server");
        const { ensureGatewayTables, ensureTopupTable, expireTopups, sha256, safeEqual } = await import("@/lib/gateway.server");
        const sql = getSql();
        await ensureGatewayTables(sql);
        await ensureTopupTable(sql);
        const [dev] = await sql<{ store_id: string; secret_hash: string; revoked: boolean }[]>`
          select store_id, secret_hash, revoked from gateway_devices where id=${deviceId}`;
        if (!dev || dev.revoked || !safeEqual(dev.secret_hash, await sha256(secret))) {
          return Response.json({ ok: false, error: "unauthorized" }, { status: 401, headers: cors });
        }
        await sql`update gateway_devices set last_ping=now() where id=${deviceId}`;
        await expireTopups(sql, dev.store_id);
        const rows = await sql<{ id: string; reference: string; amount: string; customer_name: string | null; customer_phone: string | null; created_at: Date; expires_at: Date }[]>`
          select id, reference, amount, customer_name, customer_phone, created_at, expires_at from gateway_topups
          where store_id=${dev.store_id} and status='pending' order by created_at limit 100`;
        const now = Date.now();
        const recent = await sql<{ id: string; status: string; reference: string; amount: string; customer_name: string | null }[]>`
          select id, status, reference, amount, customer_name from gateway_topups
          where store_id=${dev.store_id} and status in ('paid','failed') and created_at > now() - interval '30 minutes' order by created_at desc limit 30`;
        return Response.json({
          ok: true,
          pending: rows.map((r) => {
            const exp = new Date(r.expires_at).getTime();
            return { id: r.id, type: "topup", reference: r.reference, amount: Number(r.amount), customer_name: r.customer_name, customer_phone: r.customer_phone,
              created_at: new Date(r.created_at).getTime(), expires_at: exp, seconds_left: Math.max(0, Math.round((exp - now) / 1000)) };
          }),
          recent: recent.map((r) => ({ id: r.id, status: r.status === "paid" ? "verified" : "failed", reference: r.reference, amount: Number(r.amount), customer_name: r.customer_name })),
        }, { headers: cors });
      },
    },
  },
});
