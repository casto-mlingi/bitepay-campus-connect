import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Wallet, ShoppingBag, ClipboardList, ArrowUpCircle, ArrowRight, Clock, CheckCircle2, ChefHat } from "lucide-react";
import { useStore, formatTZS } from "@/lib/store";
import { CustomerShell } from "@/components/customer-shell";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — BitePay" }, { name: "description", content: "Your BitePay wallet, quick actions and recent orders." }] }),
});

function Dashboard() {
  const { currentUser, orders } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) navigate({ to: "/" });
    else if (currentUser.role === "staff") navigate({ to: "/staff" });
  }, [currentUser, navigate]);

  if (!currentUser || currentUser.role !== "customer") return null;

  const myOrders = orders.filter((o) => o.customer_id === currentUser.id).slice(0, 4);

  return (
    <CustomerShell active="home">
      <div>
        <p className="text-sm text-muted-foreground">Good day,</p>
        <h1 className="text-2xl font-bold">{currentUser.full_name.split(" ")[0]} 👋</h1>
      </div>

      {/* Wallet card */}
      <div className="mt-5 relative overflow-hidden rounded-2xl bg-gradient-to-br from-success to-emerald-600 text-white p-6 shadow-lg shadow-emerald-500/20">
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -right-12 top-16 w-28 h-28 rounded-full bg-white/10" />
        <div className="relative">
          <div className="flex items-center gap-2 text-white/85 text-sm">
            <Wallet className="w-4 h-4" /> Wallet Balance
          </div>
          <div className="mt-2 text-4xl font-extrabold tracking-tight">
            {formatTZS(currentUser.wallet_balance)}
          </div>
          <div className="mt-4 flex gap-2">
            <Link to="/topup" className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur text-white text-sm font-medium px-3 py-1.5 rounded-lg">
              <ArrowUpCircle className="w-4 h-4" /> Top-Up
            </Link>
            <Link to="/menu" className="inline-flex items-center gap-1.5 bg-white text-emerald-700 text-sm font-semibold px-3 py-1.5 rounded-lg">
              Order Now <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <QuickAction to="/menu" icon={<ShoppingBag className="w-5 h-5" />} label="Order Now" tint="bg-primary/10 text-primary" />
        <QuickAction to="/history" icon={<ClipboardList className="w-5 h-5" />} label="History" tint="bg-slate-900/5 text-foreground" />
        <QuickAction to="/topup" icon={<ArrowUpCircle className="w-5 h-5" />} label="Top-Up" tint="bg-emerald-500/10 text-emerald-600" />
      </div>

      {/* Recent orders */}
      <section className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Recent Orders</h2>
          <Link to="/history" className="text-sm text-primary font-medium">See all</Link>
        </div>
        {myOrders.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
            <ChefHat className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No orders yet — grab a bite!
          </div>
        ) : (
          <ul className="space-y-2">
            {myOrders.map((o) => (
              <li key={o.id} className="bg-surface rounded-xl p-4 flex items-center justify-between border">
                <div>
                  <div className="font-semibold">{o.id}</div>
                  <div className="text-xs text-muted-foreground">
                    {o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatTZS(o.total_amount)}</div>
                  <StatusPill status={o.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </CustomerShell>
  );
}

function QuickAction({ to, icon, label, tint }: { to: string; icon: React.ReactNode; label: string; tint: string }) {
  return (
    <Link to={to} className="bg-surface border rounded-xl p-4 flex flex-col items-start gap-2 hover:shadow-sm transition">
      <div className={`w-9 h-9 rounded-lg grid place-items-center ${tint}`}>{icon}</div>
      <span className="text-sm font-semibold">{label}</span>
    </Link>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    "new": { label: "New", cls: "bg-primary/10 text-primary", icon: <Clock className="w-3 h-3" /> },
    "in-progress": { label: "Preparing", cls: "bg-amber-100 text-amber-700", icon: <Clock className="w-3 h-3" /> },
    "ready": { label: "Ready", cls: "bg-emerald-100 text-emerald-700", icon: <CheckCircle2 className="w-3 h-3" /> },
    "completed": { label: "Completed", cls: "bg-slate-100 text-slate-600", icon: <CheckCircle2 className="w-3 h-3" /> },
  };
  const s = map[status] ?? map["new"];
  return <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full mt-1 ${s.cls}`}>{s.icon}{s.label}</span>;
}
