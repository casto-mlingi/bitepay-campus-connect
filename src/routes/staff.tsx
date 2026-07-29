import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clock, ChefHat, PackageCheck, CheckCircle2, MapPin, ShoppingBag, ArrowRight, Sparkles, Check, X } from "lucide-react";
import { useStore, formatTZS, type Order, type OrderStatus, type CustomDishRequest } from "@/lib/store";
import { StaffShell } from "@/components/staff-shell";

export const Route = createFileRoute("/staff")({
  component: StaffDashboard,
  head: () => ({ meta: [{ title: "Live Orders — BitePay Staff" }, { name: "description", content: "Kanban view of live canteen orders for BitePay staff." }] }),
});

const columns: { key: OrderStatus; title: string; sub: string; icon: React.ReactNode; accent: string }[] = [
  { key: "new", title: "New Orders", sub: "Tap to accept", icon: <Clock className="w-4 h-4" />, accent: "border-t-primary" },
  { key: "in-progress", title: "In Progress", sub: "Being cooked", icon: <ChefHat className="w-4 h-4" />, accent: "border-t-amber-500" },
  { key: "ready", title: "Ready", sub: "Pickup / deliver", icon: <PackageCheck className="w-4 h-4" />, accent: "border-t-emerald-500" },
  { key: "completed", title: "Completed", sub: "Delivered", icon: <CheckCircle2 className="w-4 h-4" />, accent: "border-t-slate-400" },
];

const nextLabel: Record<OrderStatus, string | null> = {
  "new": "Start Preparing",
  "in-progress": "Mark Ready",
  "ready": "Mark Completed",
  "completed": null,
};

function StaffDashboard() {
  const { currentUser, orders, advanceOrder } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) navigate({ to: "/" });
    else if (currentUser.role !== "staff") navigate({ to: "/dashboard" });
  }, [currentUser, navigate]);

  if (!currentUser || currentUser.role !== "staff") return null;

  return (
    <StaffShell active="orders">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Live Orders</h1>
          <p className="text-muted-foreground">Real-time board — advance orders as you cook.</p>
        </div>
        <div className="hidden sm:flex gap-4 text-sm">
          {columns.map((c) => (
            <div key={c.key} className="text-center">
              <div className="text-2xl font-bold">{orders.filter((o) => o.status === c.key).length}</div>
              <div className="text-xs text-muted-foreground">{c.title}</div>
            </div>
          ))}
        </div>
      </div>

      <CustomDishRequestsPanel />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {columns.map((col) => {
          const list = orders.filter((o) => o.status === col.key);
          return (
            <div key={col.key} className={`bg-surface rounded-2xl border border-t-4 ${col.accent} flex flex-col`}>
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold">{col.icon}{col.title}</div>
                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-semibold">{list.length}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{col.sub}</div>
              </div>
              <div className="p-3 space-y-2 min-h-[240px]">
                {list.length === 0 && (
                  <div className="text-center text-xs text-muted-foreground py-10">Nothing here</div>
                )}
                {list.map((o) => (
                  <OrderCard key={o.id} order={o} nextLabel={nextLabel[o.status]} onAdvance={() => advanceOrder(o.id)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </StaffShell>
  );
}

function OrderCard({ order, nextLabel, onAdvance }: { order: Order; nextLabel: string | null; onAdvance: () => void }) {
  const mins = Math.max(0, Math.round((Date.now() - order.created_at) / 60000));
  return (
    <div className="bg-background rounded-xl border p-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-bold">{order.id}</div>
          <div className="text-xs text-muted-foreground">{order.customer_name}</div>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" /> {mins}m
        </div>
      </div>
      <ul className="mt-2 space-y-0.5 text-sm">
        {order.items.map((i) => (
          <li key={i.product_id} className="flex justify-between">
            <span className="truncate"><span className="text-muted-foreground">{i.qty}×</span> {i.name}</span>
            <span className="text-muted-foreground">{formatTZS(i.price * i.qty)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between border-t pt-2">
        <div className="flex items-center gap-1 text-xs">
          {order.delivery_type === "delivery" ? <MapPin className="w-3 h-3 text-primary" /> : <ShoppingBag className="w-3 h-3 text-primary" />}
          <span className="capitalize font-medium">{order.delivery_type}</span>
        </div>
        <div className="font-bold text-sm">{formatTZS(order.total_amount)}</div>
      </div>
      {nextLabel && (
        <button
          onClick={onAdvance}
          className="mt-3 w-full bg-foreground text-background text-sm font-semibold py-2 rounded-lg flex items-center justify-center gap-1.5 hover:bg-foreground/90"
        >
          {nextLabel} <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

function CustomDishRequestsPanel() {
  const { customDishRequests, respondCustomDishRequest, can } = useStore();
  const pending = customDishRequests.filter((r) => r.status === "pending");
  const recent = customDishRequests.filter((r) => r.status !== "pending").slice(0, 3);
  if (!can("customers.read")) return null;
  if (pending.length === 0 && recent.length === 0) return null;

  return (
    <section className="mb-6 bg-gradient-to-br from-primary/5 to-orange-50 border border-primary/20 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-primary" />
        <h2 className="font-bold">Custom dish requests</h2>
        {pending.length > 0 && (
          <span className="text-[10px] font-bold uppercase tracking-wider bg-primary text-white px-2 py-0.5 rounded-full">{pending.length} pending</span>
        )}
      </div>
      {pending.length === 0 ? (
        <p className="text-sm text-muted-foreground">No new requests. Great job keeping up!</p>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {pending.map((r) => <RequestCard key={r.id} r={r} onRespond={respondCustomDishRequest} />)}
        </div>
      )}
    </section>
  );
}

function RequestCard({ r, onRespond }: { r: CustomDishRequest; onRespond: (id: string, i: { action: "accept" | "reject"; price?: number; note?: string; reason?: string }) => { ok: boolean; error?: string } }) {
  const [mode, setMode] = useState<"idle" | "accept" | "reject">("idle");
  const [price, setPrice] = useState(r.suggested_price || 0);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");

  const submit = () => {
    if (mode === "accept") {
      if (price <= 0) return;
      onRespond(r.id, { action: "accept", price, note });
    } else if (mode === "reject") {
      if (!reason.trim()) return;
      onRespond(r.id, { action: "reject", reason });
    }
  };

  return (
    <div className="bg-background border rounded-xl p-3 space-y-2">
      <div>
        <div className="font-bold text-sm">{r.dish_name}</div>
        <div className="text-xs text-muted-foreground">from {r.customer_name}</div>
      </div>
      <p className="text-xs text-foreground/80 line-clamp-3">{r.description}</p>
      {r.ingredients.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {r.ingredients.map((i) => <span key={i} className="text-[10px] bg-muted rounded-full px-2 py-0.5">{i}</span>)}
        </div>
      )}
      {r.suggested_price ? <div className="text-xs text-muted-foreground">Budget: <span className="font-semibold text-foreground">{formatTZS(r.suggested_price)}</span></div> : null}

      {mode === "idle" && (
        <div className="flex gap-2 pt-1">
          <button onClick={() => setMode("accept")} className="flex-1 inline-flex items-center justify-center gap-1 bg-emerald-600 text-white text-xs font-semibold py-2 rounded-lg"><Check className="w-3.5 h-3.5" /> Accept</button>
          <button onClick={() => setMode("reject")} className="flex-1 inline-flex items-center justify-center gap-1 bg-red-600 text-white text-xs font-semibold py-2 rounded-lg"><X className="w-3.5 h-3.5" /> Decline</button>
        </div>
      )}

      {mode === "accept" && (
        <div className="space-y-2 pt-1">
          <input type="number" min={0} value={price || ""} onChange={(e) => setPrice(Number(e.target.value) || 0)} placeholder="Quote price (TZS)" className="w-full px-2.5 py-1.5 rounded-lg border text-sm" />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="w-full px-2.5 py-1.5 rounded-lg border text-sm" />
          <div className="flex gap-2">
            <button onClick={() => setMode("idle")} className="flex-1 text-xs font-semibold py-1.5 rounded-lg border">Cancel</button>
            <button onClick={submit} disabled={price <= 0} className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-emerald-600 text-white disabled:opacity-50">Send quote</button>
          </div>
        </div>
      )}

      {mode === "reject" && (
        <div className="space-y-2 pt-1">
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (shown to customer)" className="w-full px-2.5 py-1.5 rounded-lg border text-sm" />
          <div className="flex gap-2">
            <button onClick={() => setMode("idle")} className="flex-1 text-xs font-semibold py-1.5 rounded-lg border">Cancel</button>
            <button onClick={submit} disabled={!reason.trim()} className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-red-600 text-white disabled:opacity-50">Send decline</button>
          </div>
        </div>
      )}
    </div>
  );
}

