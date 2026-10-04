import { createFileRoute } from "@tanstack/react-router";

// Selcom calls this when a payment finishes. We never trust the body:
// we re-ask Selcom for the real status using the store's own keys.
export const Route = createFileRoute("/api/public/selcom/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as { order_id?: unknown };
        const orderId = typeof body.order_id === "string" ? body.order_id.slice(0, 60) : "";
        if (orderId) {
          const { getSql } = await import("@/lib/db.server");
          const { refreshPaymentStatus } = await import("@/lib/selcom.server");
          await refreshPaymentStatus(getSql(), orderId).catch(() => null);
        }
        return Response.json({ result: "SUCCESS", resultcode: "000" });
      },
    },
  },
});
