import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// AzamPay posts here when a mobile money checkout finishes.
// We only accept it when AzamPay's RSA signature verifies and the
// reference, phone and amount match a pending payment we created.
const Callback = z.object({
  utilityref: z.string().min(4).max(128),
  externalreference: z.string().max(128).default(""),
  transactionstatus: z.string().max(40),
  operator: z.string().max(40).default(""),
  amount: z.union([z.string(), z.number()]).transform(String),
  msisdn: z.string().max(20).default(""),
  signature: z.string().max(4000).nullable().optional(),
}).passthrough();

export const Route = createFileRoute("/api/public/azampay/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = Callback.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ success: false }, { status: 400 });
        const cb = parsed.data;
        const { getSql } = await import("@/lib/db.server");
        const { ensureSelcomTables, loadCreds, computeFee, verifyCallbackSignature } = await import("@/lib/selcom.server");
        const sql = getSql();
        await ensureSelcomTables(sql);
        const rows = await sql<{ store_id: string; amount: string; fee: string; msisdn: string; status: string }[]>`
          select store_id, amount, fee, msisdn, status from selcom_payments where order_id = ${cb.utilityref}`;
        const row = rows[0];
        if (!row) return Response.json({ success: false }, { status: 404 });
        if (row.status !== "PENDING") return Response.json({ success: true });
        const creds = await loadCreds(sql, row.store_id);
        if (!creds || !cb.signature) return Response.json({ success: false }, { status: 401 });
        const valid = await verifyCallbackSignature(creds, { ...cb, signature: cb.signature }).catch(() => false);
        if (!valid) return Response.json({ success: false }, { status: 401 });

        const ok = cb.transactionstatus.toLowerCase() === "success";
        const expected = Number(row.amount) + Number(row.fee || computeFee(0, 0, 0));
        const digits = (s: string) => s.replace(/\D/g, "").slice(-9);
        const matches = Math.round(Number(cb.amount)) === Math.round(expected) && (!cb.msisdn || digits(cb.msisdn) === digits(row.msisdn));
        const status = ok && matches ? "COMPLETED" : "FAILED";
        await sql`update selcom_payments set status = ${status}, gateway_ref = coalesce(${cb.externalreference || null}, gateway_ref)
          where order_id = ${cb.utilityref} and status = 'PENDING'`;
        return Response.json({ success: true });
      },
    },
  },
});
