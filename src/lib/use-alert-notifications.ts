import { useEffect, useRef } from "react";
import { useStore, formatTZS } from "@/lib/store";
import { alertsEnabled, notify } from "@/lib/push-notifications";

/**
 * Watches live app data and raises an OS notification whenever something new
 * arrives for the signed-in person: new orders and menu requests for staff,
 * and order / wallet updates for customers.
 */
export function useAlertNotifications() {
  const { currentUser, notifications, orders, customDishRequests } = useStore();
  const seen = useRef<Set<string> | null>(null);
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      seen.current = null;
      lastUserId.current = null;
      return;
    }

    const isStaff = currentUser.role === "staff";
    const events: { id: string; title: string; body: string; tag: string }[] = [];

    for (const n of notifications) {
      if (n.user_id !== currentUser.id || n.read) continue;
      events.push({ id: `n:${n.id}`, title: n.title, body: n.body, tag: `n-${n.id}` });
    }

    if (isStaff) {
      for (const o of orders) {
        if (o.status !== "new" || o.is_reversal) continue;
        events.push({
          id: `o:${o.id}`,
          title: "New order received",
          body: `${o.customer_name} · ${o.items.reduce((s, i) => s + i.qty, 0)} item(s) · ${formatTZS(o.total_amount)}`,
          tag: `order-${o.id}`,
        });
      }
      for (const r of customDishRequests) {
        if (r.status !== "pending") continue;
        events.push({
          id: `r:${r.id}`,
          title: "New menu request",
          body: `${r.customer_name} asked for "${r.dish_name}". Review and price it.`,
          tag: `request-${r.id}`,
        });
      }
    }

    // First pass after sign-in only records what already exists — no backlog spam.
    if (seen.current === null || lastUserId.current !== currentUser.id) {
      seen.current = new Set(events.map((e) => e.id));
      lastUserId.current = currentUser.id;
      return;
    }

    const fresh = events.filter((e) => !seen.current!.has(e.id));
    for (const e of events) seen.current.add(e.id);
    if (!fresh.length || !alertsEnabled()) return;

    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate?.([180, 90, 180]); } catch { /* optional */ }
    }
    for (const e of fresh.slice(0, 3)) {
      void notify({ title: e.title, body: e.body, tag: e.tag });
    }
    if (fresh.length > 3) {
      void notify({
        title: `${fresh.length - 3} more updates`,
        body: "Open BitePay to see everything that just came in.",
        tag: "bulk",
        silent: true,
      });
    }
  }, [currentUser, notifications, orders, customDishRequests]);
}
