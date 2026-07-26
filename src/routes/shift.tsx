import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, Play, Square, AlertTriangle, CheckCircle2, Banknote, Smartphone, Wallet, ArrowLeftRight } from "lucide-react";
import { useStore, formatTZS } from "@/lib/store";
import { StaffShell } from "@/components/staff-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/shift")({
  component: ShiftPage,
  head: () => ({ meta: [{ title: "Shift & Z-Report — BitePay Staff" }, { name: "description", content: "Open a shift with float, close with counted cash and mobile totals — per-tender Z-report with variance." }] }),
});

function ShiftPage() {
  const { currentUser, activeShift, shifts, orders, openShift, closeShift } = useStore();
  const navigate = useNavigate();
  const [float, setFloat] = useState<number>(50000);
  const [countedCash, setCountedCash] = useState<number>(0);
  const [countedMobile, setCountedMobile] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [toast, setToast] = useState<string>("");

  useEffect(() => {
    if (!currentUser) navigate({ to: "/" });
    else if (currentUser.role !== "staff") navigate({ to: "/dashboard" });
  }, [currentUser, navigate]);

  const shiftOrders = useMemo(
    () => activeShift ? orders.filter((o) => o.shift_id === activeShift.id) : [],
    [activeShift, orders]
  );

  const stats = useMemo(() => {
    const cashSales = shiftOrders.reduce((s, o) => s + (o.tender === "cash" ? (o.cash_paid ?? 0) : 0), 0);
    const mobileSales = shiftOrders.reduce((s, o) => s + (o.tender === "mobile" ? (o.cash_paid ?? 0) : 0), 0);
    const walletSales = shiftOrders.reduce((s, o) => s + (o.wallet_paid ?? 0), 0);
    const gross = shiftOrders.filter((o) => !o.is_reversal).reduce((s, o) => s + o.total_amount, 0);
    const reversals = shiftOrders.filter((o) => o.is_reversal).reduce((s, o) => s + Math.abs(o.total_amount), 0);
    return { cashSales, mobileSales, walletSales, gross, reversals };
  }, [shiftOrders]);

  const expectedCash = (activeShift?.opening_float ?? 0) + stats.cashSales;
  const cashVariance = countedCash - expectedCash;
  const mobileVariance = countedMobile - stats.mobileSales;

  const show = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2200); };

  const doOpen = () => {
    const s = openShift(float);
    if (!s) show("Could not open shift"); else show(`Shift ${s.id} opened with float ${formatTZS(float)}`);
  };

  const doClose = () => {
    const s = closeShift({ counted_cash: countedCash, counted_mobile: countedMobile, notes });
    if (!s) show("Could not close shift");
    else { show(`Shift closed · cash Δ ${formatTZS(s.cash_variance ?? 0)} · mobile Δ ${formatTZS(s.mobile_variance ?? 0)}`); setCountedCash(0); setCountedMobile(0); setNotes(""); }
  };

  if (!currentUser || currentUser.role !== "staff") return null;

  return (
    <StaffShell active="shift">
      <div className="mb-6 flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><ClipboardCheck className="w-7 h-7 text-primary" /> Shift & Z-Report</h1>
          <p className="text-muted-foreground">Open with a float, close by counting cash and mobile — variance is flagged automatically.</p>
        </div>
        {activeShift ? (
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Shift open · {activeShift.cashier_name}
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-muted-foreground" /> No active shift
          </span>
        )}
      </div>

      {!activeShift ? (
        <div className="bg-surface border rounded-2xl p-6 max-w-lg">
          <h2 className="font-bold text-lg flex items-center gap-2"><Play className="w-5 h-5 text-primary" /> Open new shift</h2>
          <p className="text-sm text-muted-foreground mt-1">Add the physical cash you're starting the drawer with. It's added to Cash on Hand.</p>
          <label className="block mt-4">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Opening float (TZS)</span>
            <Input type="number" value={float || ""} onChange={(e) => setFloat(Number(e.target.value) || 0)} className="mt-1 h-11" />
          </label>
          <Button onClick={doOpen} disabled={float <= 0} className="w-full mt-4 h-11 bg-primary">
            <Play className="w-4 h-4 mr-2" /> Open Shift
          </Button>
          <PastShifts />
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_400px] gap-6">
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-foreground to-foreground/80 text-background rounded-3xl p-6">
              <div className="text-xs uppercase tracking-wider opacity-70">Live Z-Report — {activeShift.id}</div>
              <div className="grid md:grid-cols-3 gap-4 mt-4">
                <ZBlock icon={<Banknote className="w-4 h-4 text-emerald-400" />} label="Cash sales" value={formatTZS(stats.cashSales)} />
                <ZBlock icon={<Smartphone className="w-4 h-4 text-sky-400" />} label="Mobile sales (Lipa Namba)" value={formatTZS(stats.mobileSales)} />
                <ZBlock icon={<Wallet className="w-4 h-4 text-primary" />} label="Wallet deductions" value={formatTZS(stats.walletSales)} />
              </div>
              <div className="mt-4 pt-4 border-t border-white/20 grid md:grid-cols-3 gap-4 text-sm">
                <div><span className="opacity-70">Opening float</span><div className="font-bold">{formatTZS(activeShift.opening_float)}</div></div>
                <div><span className="opacity-70">Gross revenue</span><div className="font-bold">{formatTZS(stats.gross)}</div></div>
                <div><span className="opacity-70">Reversals</span><div className="font-bold">− {formatTZS(stats.reversals)}</div></div>
              </div>
            </div>

            <div className="bg-surface border rounded-2xl p-5">
              <h3 className="font-bold mb-3">Sales in this shift ({shiftOrders.length})</h3>
              {shiftOrders.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">No sales yet — head to the <Link to="/pos" className="text-primary font-semibold">POS</Link>.</div>
              ) : (
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground border-b">
                      <tr className="text-left"><th className="px-2 py-2">Receipt</th><th>Customer</th><th>Tender</th><th>Ref</th><th className="text-right">Cash/Mob</th><th className="text-right">Wallet</th><th className="text-right">Total</th></tr>
                    </thead>
                    <tbody className="divide-y">
                      {shiftOrders.map((o) => (
                        <tr key={o.id} className={o.is_reversal ? "text-red-600" : ""}>
                          <td className="px-2 py-2 font-mono text-xs">{o.receipt_no ?? o.id}</td>
                          <td>{o.customer_name}</td>
                          <td className="capitalize text-xs">{o.tender ?? "wallet"}</td>
                          <td className="text-xs text-muted-foreground">{o.reference ?? "—"}</td>
                          <td className="text-right">{formatTZS(o.cash_paid ?? 0)}</td>
                          <td className="text-right">{formatTZS(o.wallet_paid ?? 0)}</td>
                          <td className="text-right font-semibold">{formatTZS(o.total_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <aside className="bg-surface border rounded-2xl p-5 h-fit lg:sticky lg:top-24">
            <h3 className="font-bold flex items-center gap-2"><Square className="w-5 h-5 text-primary" /> Close Shift</h3>
            <p className="text-xs text-muted-foreground mt-1">Count the drawer and confirm the mobile total from your provider portal.</p>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-xs text-muted-foreground">Counted cash in drawer (TZS)</span>
                <Input type="number" value={countedCash || ""} onChange={(e) => setCountedCash(Number(e.target.value) || 0)} className="mt-1" />
                <VarianceRow expected={expectedCash} counted={countedCash} variance={cashVariance} label="Cash" />
              </label>
              <label className="block">
                <span className="text-xs text-muted-foreground">Counted mobile money total (TZS)</span>
                <Input type="number" value={countedMobile || ""} onChange={(e) => setCountedMobile(Number(e.target.value) || 0)} className="mt-1" />
                <VarianceRow expected={stats.mobileSales} counted={countedMobile} variance={mobileVariance} label="Mobile" />
              </label>
              <label className="block">
                <span className="text-xs text-muted-foreground">Notes (optional)</span>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1 w-full px-3 py-2 rounded-lg border bg-background text-sm" placeholder="Explain variance if any…" />
              </label>
            </div>
            <Button onClick={doClose} className="w-full mt-4 h-11 bg-red-500 hover:bg-red-600">
              <Square className="w-4 h-4 mr-2" /> Close Shift & Print Z-Report
            </Button>
          </aside>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-sm font-medium">
          <CheckCircle2 className="w-4 h-4 text-success" /> {toast}
        </div>
      )}
    </StaffShell>
  );
}

function ZBlock({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-background/10 rounded-2xl p-4">
      <div className="text-xs opacity-70 flex items-center gap-1">{icon}{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

function VarianceRow({ expected, counted, variance, label }: { expected: number; counted: number; variance: number; label: string }) {
  const abs = Math.abs(variance);
  const ok = abs < 500;
  return (
    <div className="mt-1.5 flex items-center justify-between text-[11px]">
      <span className="text-muted-foreground">Expected {formatTZS(expected)}</span>
      <span className={`inline-flex items-center gap-1 font-semibold ${ok ? "text-emerald-600" : "text-red-600"}`}>
        {ok ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
        {label} Δ {variance >= 0 ? "+" : "−"}{formatTZS(abs)}
      </span>
    </div>
  );
}

function PastShifts() {
  const { shifts } = useStore();
  const closed = shifts.filter((s) => s.closed_at);
  if (closed.length === 0) return null;
  return (
    <div className="mt-6 border-t pt-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Past shifts</div>
      <ul className="space-y-1.5 text-sm">
        {closed.slice(0, 5).map((s) => (
          <li key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
            <div>
              <div className="font-semibold">{s.cashier_name} · <span className="font-mono text-xs">{s.id}</span></div>
              <div className="text-xs text-muted-foreground">{new Date(s.opened_at).toLocaleString()} → {s.closed_at ? new Date(s.closed_at).toLocaleTimeString() : "—"}</div>
            </div>
            <div className="text-right text-xs">
              <div>Cash Δ <span className={Math.abs(s.cash_variance ?? 0) < 500 ? "text-emerald-600" : "text-red-600"}>{formatTZS(s.cash_variance ?? 0)}</span></div>
              <div>Mob Δ <span className={Math.abs(s.mobile_variance ?? 0) < 500 ? "text-emerald-600" : "text-red-600"}>{formatTZS(s.mobile_variance ?? 0)}</span></div>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground"><ArrowLeftRight className="w-3 h-3" /> Reconcile daily against bank statement.</div>
    </div>
  );
}
