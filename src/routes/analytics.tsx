import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BarChart3, TrendingUp, TrendingDown, Trash2, DollarSign, AlertTriangle } from "lucide-react";
import { useStore, formatTZS } from "@/lib/store";
import { StaffShell } from "@/components/staff-shell";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
  head: () => ({
    meta: [
      { title: "Analytics Dashboard — BitePay Staff" },
      { name: "description", content: "Live P&L, batch costs, and wastage tracking for the canteen." },
      { property: "og:title", content: "Analytics Dashboard — BitePay Staff" },
      { property: "og:description", content: "Compare today's sales revenue against batch costs in real time." },
    ],
  }),
});

function AnalyticsPage() {
  const { currentUser, orders, batches, wastage, products, logWastage } = useStore();
  const navigate = useNavigate();
  const [showWaste, setShowWaste] = useState(false);
  const [wasteBatch, setWasteBatch] = useState("");
  const [wastePlates, setWastePlates] = useState(1);
  const [wasteReason, setWasteReason] = useState("Spoiled");

  useEffect(() => {
    if (!currentUser) navigate({ to: "/" });
    else if (currentUser.role !== "staff") navigate({ to: "/dashboard" });
  }, [currentUser, navigate]);

  const startOfDay = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }, []);

  const todaysOrders = orders.filter((o) => o.created_at >= startOfDay);
  const revenue = todaysOrders.reduce((s, o) => s + o.total_amount, 0);
  const todaysBatches = batches.filter((b) => b.created_at >= startOfDay);
  const batchCost = todaysBatches.reduce((s, b) => s + b.raw_cost, 0);
  const profit = revenue - batchCost;
  const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
  const todaysWastage = wastage.filter((w) => w.created_at >= startOfDay);
  const wastageCost = todaysWastage.reduce((s, w) => {
    const b = batches.find((x) => x.id === w.batch_id);
    return s + (b ? b.unit_cost * w.plates : 0);
  }, 0);

  if (!currentUser || currentUser.role !== "staff") return null;

  const submitWaste = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wasteBatch) return;
    logWastage(wasteBatch, wastePlates, wasteReason);
    setShowWaste(false); setWasteBatch(""); setWastePlates(1); setWasteReason("Spoiled");
  };

  return (
    <StaffShell active="analytics">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><BarChart3 className="w-7 h-7 text-primary" /> Admin Analytics</h1>
          <p className="text-muted-foreground">Live financials and operational health.</p>
        </div>
        <button onClick={() => setShowWaste(true)} className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-600">
          <Trash2 className="w-4 h-4" /> Log Wastage
        </button>
      </div>

      {/* Daily P&L */}
      <div className="bg-gradient-to-br from-foreground to-foreground/80 text-background rounded-3xl p-6 mb-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider opacity-70"><DollarSign className="w-4 h-4" /> Today's P&L</div>
        <div className="grid md:grid-cols-4 gap-4 mt-4">
          <PLBlock label="Sales Revenue" value={formatTZS(revenue)} icon={<TrendingUp className="w-4 h-4 text-emerald-400" />} />
          <PLBlock label="Batch Costs" value={formatTZS(batchCost)} icon={<TrendingDown className="w-4 h-4 text-orange-400" />} />
          <PLBlock label="Wastage Loss" value={formatTZS(wastageCost)} icon={<AlertTriangle className="w-4 h-4 text-red-400" />} />
          <div className="bg-background/10 rounded-2xl p-4">
            <div className="text-xs opacity-70">Estimated Profit</div>
            <div className={`text-2xl font-black mt-1 ${profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatTZS(profit)}</div>
            <div className="text-[11px] opacity-70 mt-0.5">Margin {margin}%</div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-surface border rounded-2xl p-5">
          <h2 className="font-bold mb-3">Today's Batches</h2>
          {todaysBatches.length === 0 && <div className="text-xs text-muted-foreground text-center py-6">No batches logged today</div>}
          <ul className="divide-y">
            {todaysBatches.map((b) => {
              const prod = products.find((p) => p.id === b.product_id);
              return (
                <li key={b.id} className="py-3 flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-sm">{prod?.emoji} {prod?.name}</div>
                    <div className="text-xs text-muted-foreground">{b.id} · {b.plates_remaining}/{b.plates} left · {formatTZS(b.unit_cost)}/plate</div>
                  </div>
                  <div className="font-mono text-sm">{formatTZS(b.raw_cost)}</div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="bg-surface border rounded-2xl p-5">
          <h2 className="font-bold mb-3">Wastage Log</h2>
          {todaysWastage.length === 0 && <div className="text-xs text-muted-foreground text-center py-6">No wastage recorded 🎉</div>}
          <ul className="divide-y">
            {todaysWastage.map((w) => (
              <li key={w.id} className="py-3 flex justify-between items-center">
                <div>
                  <div className="font-semibold text-sm">{w.product_name}</div>
                  <div className="text-xs text-muted-foreground">{w.plates} plates · {w.reason}</div>
                </div>
                <div className="text-xs text-red-500 font-semibold">−{w.plates}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {showWaste && (
        <div className="fixed inset-0 bg-black/50 grid place-items-center z-50 p-4" onClick={() => setShowWaste(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={submitWaste} className="bg-background rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-bold text-lg flex items-center gap-2"><Trash2 className="w-5 h-5 text-red-500" /> Log Wastage</h3>
            <label className="block text-sm">
              <div className="text-muted-foreground mb-1">Batch</div>
              <select required value={wasteBatch} onChange={(e) => setWasteBatch(e.target.value)} className="w-full px-3 py-2 rounded-lg border bg-background">
                <option value="">Select a batch…</option>
                {batches.filter((b) => b.plates_remaining > 0).map((b) => {
                  const p = products.find((x) => x.id === b.product_id);
                  return <option key={b.id} value={b.id}>{p?.name} — {b.id} ({b.plates_remaining} left)</option>;
                })}
              </select>
            </label>
            <label className="block text-sm">
              <div className="text-muted-foreground mb-1">Plates Wasted</div>
              <input type="number" min={1} value={wastePlates} onChange={(e) => setWastePlates(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border bg-background" />
            </label>
            <label className="block text-sm">
              <div className="text-muted-foreground mb-1">Reason</div>
              <select value={wasteReason} onChange={(e) => setWasteReason(e.target.value)} className="w-full px-3 py-2 rounded-lg border bg-background">
                <option>Spoiled</option><option>Burnt</option><option>Dropped</option><option>Expired</option><option>Other</option>
              </select>
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowWaste(false)} className="flex-1 py-2 rounded-lg border font-semibold text-sm">Cancel</button>
              <button className="flex-1 py-2 rounded-lg bg-red-500 text-white font-semibold text-sm">Deduct Plates</button>
            </div>
          </form>
        </div>
      )}
    </StaffShell>
  );
}

function PLBlock({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-background/10 rounded-2xl p-4">
      <div className="text-xs opacity-70 flex items-center gap-1">{icon} {label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}
