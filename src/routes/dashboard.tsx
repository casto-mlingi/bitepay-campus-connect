import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Wallet, ShoppingBag, ClipboardList, ArrowUpCircle, ArrowRight, Clock, CheckCircle2, ChefHat, Bell } from "lucide-react";
import { useStore, formatTZS } from "@/lib/store";
import { CustomerShell } from "@/components/customer-shell";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — BitePay" }, { name: "description", content: "Your BitePay wallet, quick actions and recent orders." }] }),
});

function Dashboard() {
  const { currentUser, orders, products } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) navigate({ to: "/" });
    else if (currentUser.role === "staff") navigate({ to: "/staff" });
  }, [currentUser, navigate]);

  if (!currentUser || currentUser.role !== "customer") return null;

  const myOrders = orders.filter((o) => o.customer_id === currentUser.id).slice(0, 4);
  const featured = products.slice(0, 6);

  return (
    <CustomerShell active="home">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Good day,</p>
          <h1 className="text-2xl font-bold">{currentUser.full_name.split(" ")[0]} 👋</h1>
        </div>
        <button aria-label="Notifications" className="w-10 h-10 rounded-full bg-surface border grid place-items-center">
          <Bell className="w-4 h-4" />
        </button>
      </div>

      {/* Wallet card */}
      <div className="mt-5 relative overflow-hidden rounded-3xl bg-gradient-to-br from-success to-emerald-600 text-white p-6 shadow-lg shadow-emerald-500/25">
        <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-white/10" />
        <div className="absolute -right-14 top-20 w-32 h-32 rounded-full bg-white/10" />
        <div className="relative">
          <div className="flex items-center gap-2 text-white/85 text-sm">
            <Wallet className="w-4 h-4" /> Wallet Balance
          </div>
          <div className="mt-2 text-4xl font-extrabold tracking-tight">
            {formatTZS(currentUser.wallet_balance)}
          </div>
          <div className="mt-5 flex gap-2">
            <Link to="/topup" className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur text-white text-sm font-semibold px-4 py-2 rounded-xl">
              <ArrowUpCircle className="w-4 h-4" /> Top-Up
            </Link>
            <Link to="/menu" className="inline-flex items-center gap-1.5 bg-white text-emerald-700 text-sm font-semibold px-4 py-2 rounded-xl">
              Order Now <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Promo hero — Special For You */}
      <div className="mt-6 rounded-3xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 p-5 flex items-center gap-4 overflow-hidden">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-primary uppercase tracking-wider">Special For You</div>
          <div className="mt-1 font-bold text-lg leading-tight">Chicken Teriyaki Combo</div>
          <div className="text-xs text-muted-foreground mt-0.5">25% off — today only</div>
          <Link to="/menu" className="inline-flex items-center gap-1 mt-3 bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-lg">
            Order Now <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 to-red-500 grid place-items-center text-5xl shrink-0 shadow-lg shadow-orange-500/30">
          🍱
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <QuickAction to="/menu" icon={<ShoppingBag className="w-5 h-5" />} label="Order" tint="bg-primary/10 text-primary" />
        <QuickAction to="/history" icon={<ClipboardList className="w-5 h-5" />} label="History" tint="bg-slate-900/5 text-foreground" />
        <QuickAction to="/topup" icon={<ArrowUpCircle className="w-5 h-5" />} label="Top-Up" tint="bg-emerald-500/10 text-emerald-600" />
      </div>

      {/* Top of week */}
      <section className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Top of Week</h2>
          <Link to="/menu" className="text-sm text-primary font-semibold">See all</Link>
        </div>
        <div className="-mx-4 px-4 overflow-x-auto">
          <div className="flex gap-3 pb-1">
            {featured.map((p) => (
              <Link key={p.id} to="/menu" className="w-36 shrink-0 bg-surface border rounded-2xl p-3">
                <div className={`w-full aspect-square rounded-xl bg-gradient-to-br ${p.gradient} grid place-items-center text-5xl`}>{p.emoji}</div>
                <div className="mt-2 font-semibold text-sm leading-tight line-clamp-1">{p.name}</div>
                <div className="text-primary font-bold text-sm mt-0.5">{formatTZS(p.price)}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Recent orders */}
      <section className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Recent Orders</h2>
          <Link to="/history" className="text-sm text-primary font-semibold">See all</Link>
        </div>
        {myOrders.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
            <ChefHat className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No orders yet — grab a bite!
          </div>
        ) : (
          <ul className="space-y-2">
            {myOrders.map((o) => (
              <li key={o.id} className="bg-surface rounded-2xl p-4 flex items-center justify-between border">
                <div className="min-w-0">
                  <div className="font-semibold">{o.id}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
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
    <Link to={to} className="bg-surface border rounded-2xl p-4 flex flex-col items-start gap-2 hover:shadow-sm transition">
      <div className={`w-10 h-10 rounded-xl grid place-items-center ${tint}`}>{icon}</div>
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
