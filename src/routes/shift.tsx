import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, Play, Square, AlertTriangle, CheckCircle2, Banknote, Smartphone, Wallet, ArrowLeftRight, Printer } from "lucide-react";
import { useStore, formatTZS, type Shift } from "@/lib/store";
import { StaffShell } from "@/components/staff-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { validHandover } from "@/lib/shift-controls";

export const Route = createFileRoute("/shift")({
  component: ShiftPage,
  head: () => ({ meta: [{ title: "Shift & Z-Report — BitePay Staff" }, { name: "description", content: "Open a shift with float, close with counted cash and mobile totals — per-tender Z-report with variance." }, { property: "og:title", content: "Shift & Z-Report — BitePay Staff" }, { property: "og:description", content: "Open a shift with float, close with counted cash and mobile totals — per-tender Z-report with variance." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
});

function ShiftPage() {
  const { currentUser, sessionReady, activeShift, shifts, orders, openShift, closeShift, transactions, profiles, isOnline } = useStore();
  const navigate = useNavigate();
  const [float, setFloat] = useState<number>(50000);
  const [countedCash, setCountedCash] = useState<number>(0);
  const [countedMobile, setCountedMobile] = useState<number>(0);
  const [retained, setRetained] = useState(0);
  const [drop, setDrop] = useState(0);
  const [witness, setWitness] = useState("");
  const [witnessPin, setWitnessPin] = useState("");
  const [closing, setClosing] = useState(false);
  const [denominations, setDenominations] = useState<Record<number, number>>({});
  const [report, setReport] = useState<Shift | null>(null);
  const [notes, setNotes] = useState<string>("");
  const [toast, setToast] = useState<string>("");

  useEffect(() => {
    if (sessionReady && !currentUser) navigate({ to: "/" });
    else if (currentUser && currentUser.role !== "staff") navigate({ to: "/dashboard" });
  }, [currentUser, navigate]);

  const show = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2200); };

  const doOpen = () => {
    const s = openShift(float);
    if (!s) show("Could not open shift"); else show(`Shift ${s.id} opened with float ${formatTZS(float)}`);
  };

  const doClose = async () => {
    setClosing(true);
    try {
      const closed = await closeShift({ counted_cash: countedCash, counted_mobile: countedMobile, retained_float: retained, cash_drop: drop, witness_id: witness, witness_pin: witnessPin, notes });
      setReport(closed); setWitnessPin(""); setNotes("");
    } catch (e) { show(e instanceof Error ? e.message : "Could not confirm handover"); }
    finally { setClosing(false); }
  };

  if (!currentUser || currentUser.role !== "staff") return null;

  return (
    <StaffShell active="shift">
      <div className="mb-6 flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><ClipboardCheck className="w-7 h-7 text-primary" /> Shift & Z-Report</h1>
          <p className="text-muted-foreground">Cash counts & witnessed handovers</p>
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
          <p className="text-sm text-muted-foreground mt-1">Cash already in the drawer at the start of this shift.</p>
          <label className="block mt-4">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Opening float (TZS)</span>
            <Input type="number" value={float || ""} onChange={(e) => setFloat(Number(e.target.value) || 0)} className="mt-1 h-11" />
          </label>
          <Button onClick={doOpen} disabled={float < 0} className="w-full mt-4 h-11 bg-primary">
            <Play className="w-4 h-4 mr-2" /> Open Shift
          </Button>
          <PastShifts onSelect={setReport} />
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_400px] gap-6">
          <div className="space-y-4">
            <h2 className="font-bold text-lg">Drawer count</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{[10000, 5000, 2000, 1000, 500, 200, 100, 50].map((value) => <label key={value} className="block"><span className="text-sm text-muted-foreground">{value.toLocaleString()} ×</span><Input aria-label={`${value} denomination count`} inputMode="numeric" type="number" min={0} step={1} value={denominations[value] || ""} placeholder="0" onChange={(e) => { const next = { ...denominations, [value]: Math.max(0, Math.floor(Number(e.target.value) || 0)) }; setDenominations(next); setCountedCash(Object.entries(next).reduce((sum, [note, qty]) => sum + Number(note) * qty, 0)); }} /></label>)}</div>
            <PastShifts onSelect={setReport} />
          </div>

          <aside className="bg-surface border rounded-2xl p-5 h-fit lg:sticky lg:top-24">
            <h3 className="font-bold flex items-center gap-2"><Square className="w-5 h-5 text-primary" /> Close Shift</h3>
            <p className="text-xs text-muted-foreground mt-1">Physical cash and confirmed mobile receipts</p>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-xs text-muted-foreground">Counted cash in drawer (TZS)</span>
                <Input type="number" value={countedCash || ""} onChange={(e) => setCountedCash(Number(e.target.value) || 0)} className="mt-1" />

              </label>
              <label className="block">
                <span className="text-xs text-muted-foreground">Counted mobile money total (TZS)</span>
                <Input type="number" value={countedMobile || ""} onChange={(e) => setCountedMobile(Number(e.target.value) || 0)} className="mt-1" />

              </label>
              <label className="block"><span className="text-xs text-muted-foreground">Float left in drawer</span><Input aria-label="Float left in drawer" inputMode="numeric" type="number" min={0} value={retained || ""} onChange={(e) => setRetained(Math.max(0, Math.round(Number(e.target.value) || 0)))} /></label>
              <label className="block"><span className="text-xs text-muted-foreground">Cash handed to manager / safe</span><Input aria-label="Cash handed to manager" inputMode="numeric" type="number" min={0} value={drop || ""} onChange={(e) => setDrop(Math.max(0, Math.round(Number(e.target.value) || 0)))} /></label>
              <label className="block"><span className="text-xs text-muted-foreground">Receiving cashier or manager</span><select aria-label="Handover witness" className="w-full min-h-12 rounded-lg border bg-background px-3 text-sm" value={witness} onChange={(e) => setWitness(e.target.value)}><option value="">Select staff member</option>{profiles.filter((p) => p.role === "staff" && !p.disabled && p.id !== currentUser.id && p.staff_role !== "waiter" && p.staff_pin).map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select></label>
              <label className="block"><span className="text-xs text-muted-foreground">Receiver’s staff PIN</span><Input aria-label="Receiver staff PIN" type="password" autoComplete="off" inputMode="numeric" value={witnessPin} onChange={(e) => setWitnessPin(e.target.value)} /></label>
              <label className="block">
                <span className="text-xs text-muted-foreground">Notes (optional)</span>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1 w-full px-3 py-2 rounded-lg border bg-background text-sm" placeholder="Explain variance if any…" />
              </label>
            </div>
            <Button onClick={doClose} disabled={closing || !isOnline || !witness || !witnessPin || !validHandover(countedCash, retained, drop, countedMobile)} variant="destructive" className="w-full mt-4 h-12">
              <Square className="w-4 h-4 mr-2" /> {closing ? "Confirming…" : "Confirm handover"}
            </Button>
          </aside>
        </div>
      )}

      {report && <ShiftReport shift={report} onClose={() => setReport(null)} />}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-sm font-medium">
          <CheckCircle2 className="w-4 h-4 text-success" /> {toast}
        </div>
      )}
    </StaffShell>
  );
}

function PastShifts({ onSelect }: { onSelect: (shift: Shift) => void }) {
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
              <Button variant="ghost" size="sm" onClick={() => onSelect(s)} aria-label={`View report ${s.id}`}><Printer className="w-4 h-4" /> Report</Button>
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

function ShiftReport({ shift, onClose }: { shift: Shift; onClose: () => void }) {
  const fields: [string, number][] = [["Starting drawer cash", shift.opening_float], ["Expected cash", shift.expected_cash ?? (shift.counted_cash ?? 0) - (shift.cash_variance ?? 0)], ["Counted cash", shift.counted_cash ?? 0], ["Shortage / surplus", shift.cash_variance ?? 0], ["Float left in drawer", shift.retained_float ?? 0], ["Handed to manager / safe", shift.cash_drop ?? 0], ["Expected mobile", shift.expected_mobile ?? (shift.counted_mobile ?? 0) - (shift.mobile_variance ?? 0)], ["Counted mobile", shift.counted_mobile ?? 0], ["Mobile difference", shift.mobile_variance ?? 0]];
  const print = () => { const w = window.open("", "_blank"); if (!w) return; const text = ["BitePay — Shift handover", shift.id, `Cashier: ${shift.cashier_name}`, `Receiver: ${shift.witness_name ?? "Legacy report — no witness"}`, `Closed: ${new Date(shift.closed_at ?? 0).toLocaleString()}`, ...fields.map(([label, value]) => `${label}: ${value.toLocaleString()}`), shift.notes ?? ""].join("\n"); w.document.title = "BitePay Shift Handover"; const pre = w.document.createElement("pre"); pre.textContent = text; w.document.body.appendChild(pre); w.print(); };
  return <div className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-4"><section role="dialog" aria-label="Shift handover report" className="bg-background border rounded-lg p-5 w-full max-w-lg max-h-[85dvh] overflow-y-auto"><h2 className="font-bold text-xl">Shift handover report</h2><p className="text-sm text-muted-foreground break-all">{shift.id}</p><p className="mt-3 text-sm">Cashier: {shift.cashier_name}<br />Receiver: {shift.witness_name ?? "Not recorded"}</p><dl className="mt-4 space-y-2">{fields.map(([label, value]) => <div key={label} className="flex justify-between gap-4 text-sm"><dt>{label}</dt><dd className={value < 0 ? "text-destructive font-bold" : "font-semibold"}>{value.toLocaleString()}</dd></div>)}</dl>{shift.notes && <p className="mt-3 text-sm">{shift.notes}</p>}<div className="mt-5 flex gap-2"><Button onClick={print}><Printer className="w-4 h-4 mr-2" />Print report</Button><Button variant="outline" onClick={onClose}>Close</Button></div></section></div>;
}
