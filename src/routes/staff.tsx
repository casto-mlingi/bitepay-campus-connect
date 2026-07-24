import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Clock, ChefHat, PackageCheck, CheckCircle2, MapPin, ShoppingBag, ArrowRight } from "lucide-react";
import { useStore, formatTZS, type Order, type OrderStatus } from "@/lib/store";
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
