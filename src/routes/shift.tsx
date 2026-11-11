import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Boxes, ClipboardCheck, Play, Square, CheckCircle2, ArrowLeftRight, Printer } from "lucide-react";
import { useStore, formatTZS, type Shift, type ShiftStockLine } from "@/lib/store";
import { StaffShell } from "@/components/staff-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { validHandover } from "@/lib/shift-controls";
import { lossCharges, shortage, unresolvedLosses, type LossBasis, type LossDisposition } from "@/lib/staff-debts";

export const Route = createFileRoute("/shift")({
  component: ShiftPage,
  head: () => ({ meta: [{ title: "Shift & Z-Report — BitePay Staff" }, { name: "description", content: "Open a shift with float, close with counted cash and mobile totals — per-tender Z-report with variance." }, { property: "og:title", content: "Shift & Z-Report — BitePay Staff" }, { property: "og:description", content: "Open a shift with float, close with counted cash and mobile totals — per-tender Z-report with variance." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
});

function ShiftPage() {
  const { currentUser, sessionReady, activeShift, openShift, closeShift, profiles, isOnline } = useStore();
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
  const [lossOpen, setLossOpen] = useState(false);

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
    if (unresolvedLosses(activeShift?.stock_counts ?? []).length > 0) { setLossOpen(true); return; }
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
        <div className="grid lg:grid-cols-[1fr_400px] gap-6 pb-4">
          <div className="space-y-4">
            <h2 className="font-bold text-lg">Drawer count</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{[10000, 5000, 2000, 1000, 500, 200, 100, 50].map((value) => <label key={value} className="block"><span className="text-sm text-muted-foreground">{value.toLocaleString()} ×</span><Input aria-label={`${value} denomination count`} inputMode="numeric" type="number" min={0} step={1} value={denominations[value] || ""} placeholder="0" onChange={(e) => { const next = { ...denominations, [value]: Math.max(0, Math.floor(Number(e.target.value) || 0)) }; setDenominations(next); setCountedCash(Object.entries(next).reduce((sum, [note, qty]) => sum + Number(note) * qty, 0)); }} /></label>)}</div>
            <StockCount onSaved={show} />
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

      {lossOpen && <LossDialog onClose={() => setLossOpen(false)} onDone={() => { setLossOpen(false); show("Loss decisions saved · tap Confirm handover"); }} />}
      {report && <ShiftReport shift={report} onClose={() => setReport(null)} />}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-sm font-medium">
          <CheckCircle2 className="w-4 h-4 text-success" /> {toast}
        </div>
      )}
    </StaffShell>
  );
}

function StockCount({ onSaved }: { onSaved: (m: string) => void }) {
  const { products, availablePlates, activeShift, saveShiftStockCount } = useStore();
  const items = products.filter((p) => !p.archived_at).map((p) => ({ p, expected: availablePlates(p.id) })).filter((x): x is { p: typeof x.p; expected: number } => x.expected !== null);
  const saved = Object.fromEntries((activeShift?.stock_counts ?? []).map((l) => [l.product_id, l.counted]));
  const [counts, setCounts] = useState<Record<string, number | undefined>>(saved);
  const [q, setQ] = useState("");
  if (items.length === 0) return null;
  const shown = items.filter((x) => x.p.name.toLowerCase().includes(q.toLowerCase()));
  const save = () => {
    const lines: ShiftStockLine[] = items.filter((x) => counts[x.p.id] !== undefined).map((x) => ({ product_id: x.p.id, name: x.p.name, expected: x.expected, counted: counts[x.p.id]! }));
    if (lines.length === 0) return onSaved("Enter at least one counted quantity");
    saveShiftStockCount(lines); onSaved(`Stock count saved · ${lines.length} item(s)`);
  };
  return (
    <section className="bg-surface border rounded-2xl p-4">
      <h2 className="font-bold text-lg flex items-center gap-2"><Boxes className="w-5 h-5 text-primary" /> Stock count</h2>
      <p className="text-xs text-muted-foreground">Count items on the shelf. Differences appear on the handover report.</p>
      <Input placeholder="Search item…" value={q} onChange={(e) => setQ(e.target.value)} className="mt-3" />
      <ul className="mt-3 divide-y max-h-96 overflow-y-auto">
        {shown.map(({ p, expected }) => { const c = counts[p.id]; const diff = c === undefined ? null : c - expected; return (
          <li key={p.id} className="flex items-center gap-3 py-2">
            <div className="flex-1 min-w-0"><div className="font-medium truncate">{p.name}</div><div className="text-xs text-muted-foreground">System: {expected}{diff !== null && <span className={diff === 0 ? " text-success" : " text-destructive font-semibold"}> · {diff === 0 ? "OK" : diff > 0 ? `+${diff}` : diff}</span>}</div></div>
            <Input aria-label={`${p.name} counted`} inputMode="numeric" type="number" min={0} className="w-24 h-11" placeholder="Count" value={c ?? ""} onChange={(e) => setCounts({ ...counts, [p.id]: e.target.value === "" ? undefined : Math.max(0, Math.floor(Number(e.target.value) || 0)) })} />
          </li>); })}
      </ul>
      <Button onClick={save} className="w-full mt-3 h-11">Save stock count</Button>
      {activeShift?.stock_counted_at && <p className="text-xs text-muted-foreground mt-2">Last saved {new Date(activeShift.stock_counted_at).toLocaleTimeString()}</p>}
    </section>
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
              <div>Cash Δ <span className={Math.abs(s.cash_variance ?? 0) === 0 ? "text-success" : "text-destructive"}>{formatTZS(s.cash_variance ?? 0)}</span></div>
              <div>Mob Δ <span className={Math.abs(s.mobile_variance ?? 0) === 0 ? "text-success" : "text-destructive"}>{formatTZS(s.mobile_variance ?? 0)}</span></div>
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
  const stock = shift.stock_counts ?? [];
  const print = () => { const w = window.open("", "_blank"); if (!w) return; const text = ["BitePay — Shift handover", shift.id, `Cashier: ${shift.cashier_name}`, `Receiver: ${shift.witness_name ?? "Legacy report — no witness"}`, `Closed: ${new Date(shift.closed_at ?? 0).toLocaleString()}`, ...fields.map(([label, value]) => `${label}: ${value.toLocaleString()}`), ...(stock.length ? ["Stock count (counted/system, difference):", ...stock.map((l) => `${l.name}: ${l.counted}/${l.expected} (${l.counted - l.expected})${l.disposition ? ` — ${lossText(l)}` : ""}`)] : []), shift.notes ?? ""].join("\n"); w.document.title = "BitePay Shift Handover"; const pre = w.document.createElement("pre"); pre.textContent = text; w.document.body.appendChild(pre); w.print(); };
  return <div className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-4"><section role="dialog" aria-label="Shift handover report" className="bg-background border rounded-lg p-5 w-full max-w-lg max-h-[85dvh] overflow-y-auto"><h2 className="font-bold text-xl">Shift handover report</h2><p className="text-sm text-muted-foreground break-all">{shift.id}</p><p className="mt-3 text-sm">Cashier: {shift.cashier_name}<br />Receiver: {shift.witness_name ?? "Not recorded"}</p><dl className="mt-4 space-y-2">{fields.map(([label, value]) => <div key={label} className="flex justify-between gap-4 text-sm"><dt>{label}</dt><dd className={value < 0 ? "text-destructive font-bold" : "font-semibold"}>{value.toLocaleString()}</dd></div>)}</dl>{shift.notes && <p className="mt-3 text-sm">{shift.notes}</p>}{stock.length > 0 && <div className="mt-4 border-t pt-3"><h3 className="font-semibold text-sm">Stock count</h3><dl className="mt-2 space-y-1">{stock.map((l) => <div key={l.product_id} className="flex flex-wrap justify-between gap-x-4 text-sm"><dt>{l.name} <span className="text-muted-foreground">({l.counted}/{l.expected})</span></dt><dd className={l.counted - l.expected < 0 ? "text-destructive font-bold" : "font-semibold"}>{l.counted - l.expected}</dd>{l.disposition && <p className="basis-full text-xs text-muted-foreground">{lossText(l)}</p>}</div>)}</dl></div>}<div className="mt-5 flex gap-2"><Button onClick={print}><Printer className="w-4 h-4 mr-2" />Print report</Button><Button variant="outline" onClick={onClose}>Close</Button></div></section></div>;
}

function lossText(l: ShiftStockLine) {
  const amt = formatTZS(l.loss_amount ?? 0);
  if (l.disposition === "spoilage") return `Written off as spoilage (${amt})${l.reason ? ` · ${l.reason}` : ""}${l.approved_by ? ` · approved by ${l.approved_by}` : ""}`;
  return `Charged ${(l.charges ?? []).map((c) => `${c.name} ${formatTZS(c.amount)}`).join(", ")} at ${l.basis === "cost" ? "cost" : "selling"} price${l.approved_by ? ` · approved by ${l.approved_by}` : ""}`;
}

type Decision = { disposition: LossDisposition; basis: LossBasis; waiter: string; reason: string };
function LossDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { activeShift, products, profiles, resolveStockLosses } = useStore();
  const storeId = activeShift?.store_id;
  const roleOf = (p: (typeof profiles)[number]) => p.memberships?.find((m) => m.store_id === storeId)?.staff_role ?? (p.store_id === storeId ? p.staff_role : undefined);
  const staff = profiles.filter((p) => p.role === "staff" && !p.disabled && roleOf(p));
  const waiters = staff.filter((p) => roleOf(p) === "waiter");
  const team = staff.filter((p) => p.id === activeShift?.cashier_id || roleOf(p) === "waiter");
  const approvers = staff.filter((p) => (roleOf(p) === "owner" || roleOf(p) === "supervisor") && p.staff_pin);
  const lines = activeShift?.stock_counts ?? [];
  const short = lines.filter((l) => shortage(l) > 0);
  const [d, setD] = useState<Record<string, Decision>>(() => Object.fromEntries(short.map((l) => [l.product_id, { disposition: "cashier", basis: "retail", waiter: "", reason: "" }])));
  const [approver, setApprover] = useState("");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  if (!activeShift) return null;
  const cashier = { id: activeShift.cashier_id, name: activeShift.cashier_name };
  const calc = (l: ShiftStockLine) => {
    const x = d[l.product_id]; const p = products.find((q) => q.id === l.product_id);
    const who = x.disposition === "cashier" ? [cashier] : x.disposition === "waiter" ? waiters.filter((w) => w.id === x.waiter).map((w) => ({ id: w.id, name: w.full_name })) : x.disposition === "team" ? team.map((w) => ({ id: w.id, name: w.full_name })) : [];
    return { ...lossCharges(shortage(l), p?.cost_price ?? 0, p?.price ?? 0, x.disposition, x.basis, who), p };
  };
  const set = (id: string, patch: Partial<Decision>) => setD((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  const totalCharged = short.reduce((s, l) => s + calc(l).charges.reduce((a, c) => a + c.amount, 0), 0);
  const save = () => {
    const next = lines.map((l) => { if (shortage(l) === 0) return l; const x = d[l.product_id]; const r = calc(l); return { ...l, disposition: x.disposition, basis: x.disposition === "spoilage" ? "cost" as const : x.basis, reason: x.reason.trim() || undefined, loss_amount: r.total, charges: r.charges }; });
    if (short.some((l) => d[l.product_id].disposition === "spoilage" && !d[l.product_id].reason.trim())) return setErr("Write a short reason for each spoilage write-off");
    const res = resolveStockLosses(next, approver, pin);
    if (!res.ok) return setErr(res.reason);
    onDone();
  };
  const opts: [LossDisposition, string][] = [["spoilage", "Spoilage / breakage (store pays, at cost)"], ["cashier", `Charge cashier (${cashier.name})`], ["waiter", "Charge a waiter"], ["team", `Split across shift team (${team.length})`]];
  return <div className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-3"><section role="dialog" aria-label="Missing stock" className="bg-background border rounded-lg p-4 sm:p-5 w-full max-w-lg max-h-[90dvh] overflow-y-auto">
    <h2 className="font-bold text-lg">Missing stock found</h2>
    <p className="text-sm text-muted-foreground">{short.length} item(s) are short. A supervisor or the owner decides who pays before the shift can close.</p>
    <ul className="mt-3 space-y-3">{short.map((l) => { const x = d[l.product_id]; const r = calc(l); return <li key={l.product_id} className="border rounded-lg p-3">
      <div className="flex justify-between gap-2"><span className="font-semibold">{l.name}</span><span className="text-destructive font-bold">−{shortage(l)}</span></div>
      <p className="text-xs text-muted-foreground">Cost {formatTZS(r.p?.cost_price ?? 0)} · Price {formatTZS(r.p?.price ?? 0)} each</p>
      <div className="mt-2 space-y-1.5">{opts.map(([v, label]) => <label key={v} className="flex items-center gap-2 text-sm min-h-9"><input type="radio" name={`d-${l.product_id}`} checked={x.disposition === v} onChange={() => set(l.product_id, { disposition: v })} className="w-4 h-4 accent-primary" />{label}</label>)}</div>
      {x.disposition === "spoilage" && <Input className="mt-2" placeholder="Reason, e.g. dropped bottle" value={x.reason} onChange={(e) => set(l.product_id, { reason: e.target.value })} />}
      {x.disposition === "waiter" && <select aria-label="Waiter" className="mt-2 w-full min-h-11 rounded-lg border bg-background px-3 text-sm" value={x.waiter} onChange={(e) => set(l.product_id, { waiter: e.target.value })}><option value="">Select waiter</option>{waiters.map((w) => <option key={w.id} value={w.id}>{w.full_name}</option>)}</select>}
      {x.disposition !== "spoilage" && <div className="mt-2 flex gap-2">{(["retail", "cost"] as const).map((b) => <button key={b} type="button" onClick={() => set(l.product_id, { basis: b })} className={`flex-1 min-h-10 rounded-lg border text-sm ${x.basis === b ? "bg-primary text-primary-foreground border-primary" : "bg-background"}`}>{b === "retail" ? "Selling price" : "Cost price"}</button>)}</div>}
      <p className="mt-2 text-sm font-semibold">{x.disposition === "spoilage" ? `Store write-off ${formatTZS(r.total)}` : r.charges.length ? r.charges.map((c) => `${c.name}: ${formatTZS(c.amount)}`).join(" · ") : "Choose who pays"}</p>
    </li>; })}</ul>
    <div className="mt-4 space-y-2">
      <select aria-label="Approver" className="w-full min-h-11 rounded-lg border bg-background px-3 text-sm" value={approver} onChange={(e) => setApprover(e.target.value)}><option value="">Approved by (supervisor / owner)</option>{approvers.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select>
      <Input aria-label="Approver PIN" type="password" inputMode="numeric" autoComplete="off" placeholder="Approver PIN" value={pin} onChange={(e) => setPin(e.target.value)} />
    </div>
    {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
    <div className="mt-4 flex gap-2"><Button variant="outline" onClick={onClose} className="flex-1 h-11">Recount</Button><Button onClick={save} disabled={!approver || !pin} className="flex-1 h-11">Save · staff owe {formatTZS(totalCharged)}</Button></div>
  </section></div>;
}
