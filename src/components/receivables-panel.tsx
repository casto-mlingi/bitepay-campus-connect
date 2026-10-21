import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { HandCoins, X, Truck, Wallet, Beer, Search } from "lucide-react";
import { useStore, formatTZS } from "@/lib/store";
import { BUCKETS, agingTotals, buildReceivables, customerBalances, type ArItem, type ArSource } from "@/lib/receivables";

const SOURCE: Record<ArSource, { label: string; icon: React.ReactNode }> = {
  delivery: { label: "Pay on delivery", icon: <Truck className="w-3.5 h-3.5" /> },
  pay_later: { label: "Pay later (wallet)", icon: <Wallet className="w-3.5 h-3.5" /> },
  tab: { label: "Open tab", icon: <Beer className="w-3.5 h-3.5" /> },
};

export function ReceivablesPanel() {
  const { receivables, openBills, profiles, payLaterRequests, debtorBalance, store, recordOrderPayment } = useStore();
  const [view, setView] = useState<"items" | "customers">("items");
  const [source, setSource] = useState<ArSource | "all">("all");
  const [q, setQ] = useState("");
  const [collecting, setCollecting] = useState<ArItem | null>(null);
  const [toast, setToast] = useState("");

  const items = useMemo(() => {
    const debtors = profiles.filter((p) => p.role === "customer").map((p) => {
      const lines = payLaterRequests.filter((r) => r.customer_id === p.id && r.status === "approved");
      return {
        customer_id: p.id, name: p.full_name, phone: p.phone, balance: debtorBalance(p.id),
        since: Math.min(...lines.map((r) => r.resolved_at ?? r.created_at), Date.now()),
        due: lines.length ? Math.min(...lines.map((r) => r.due_at ?? Infinity)) : undefined,
      };
    }).map((d) => ({ ...d, due: Number.isFinite(d.due) ? d.due : undefined }));
    return buildReceivables({ orders: receivables, tabs: openBills, debtors, termsDays: store?.credit_terms_days ?? 7 });
  }, [receivables, openBills, profiles, payLaterRequests, debtorBalance, store?.credit_terms_days]);

  const totals = agingTotals(items);
  const filtered = items.filter((i) => (source === "all" || i.source === source) && (!q || i.party.toLowerCase().includes(q.toLowerCase()) || i.ref.toLowerCase().includes(q.toLowerCase())));
  const customers = customerBalances(filtered);
  const late = totals.total - totals.current;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="col-span-2 lg:col-span-1 bg-surface border rounded-2xl p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><HandCoins className="w-4 h-4" /> Customers owe you</div>
          <div className="text-2xl font-bold font-mono mt-1">{formatTZS(totals.total)}</div>
          <div className={`text-xs mt-1 ${late ? "text-destructive font-semibold" : "text-muted-foreground"}`}>{late ? `${formatTZS(late)} is late` : "Nothing late"}</div>
        </div>
        {BUCKETS.map((b) => (
          <div key={b.key} className="bg-surface border rounded-2xl p-4">
            <div className="text-xs text-muted-foreground">{b.label}</div>
            <div className={`text-lg font-bold font-mono mt-1 ${b.key !== "current" && totals[b.key] ? "text-destructive" : ""}`}>{formatTZS(totals[b.key])}</div>
          </div>
        ))}
      </div>

      <div className="bg-surface border rounded-2xl p-4 sm:p-5 min-w-0 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 bg-muted p-1 rounded-xl text-sm">
            {(["items", "customers"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} className={`px-3 h-9 rounded-lg font-semibold ${view === v ? "bg-background shadow-sm" : ""}`}>
                {v === "items" ? "Unpaid bills" : "By customer"}
              </button>
            ))}
          </div>
          <select aria-label="Type of debt" value={source} onChange={(e) => setSource(e.target.value as ArSource | "all")} className="h-11 rounded-xl border bg-background px-3 text-sm">
            <option value="all">All types</option>
            {(Object.keys(SOURCE) as ArSource[]).map((s) => <option key={s} value={s}>{SOURCE[s].label}</option>)}
          </select>
          <label className="flex-1 min-w-[160px] flex items-center gap-2 h-11 rounded-xl border bg-background px-3">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search customer or bill" className="flex-1 bg-transparent outline-none" />
          </label>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">Nobody owes you money right now.</p>
        ) : view === "customers" ? (
          <ul className="divide-y">
            {customers.map((c) => (
              <li key={c.party} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{c.party}</div>
                  <div className="text-xs text-muted-foreground">{c.phone ? `${c.phone} · ` : ""}{c.items} unpaid · {c.maxLate ? <span className="text-destructive font-semibold">{c.maxLate} days late</span> : "not yet due"}</div>
                </div>
                <div className="font-mono font-bold text-destructive">{formatTZS(c.total)}</div>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="space-y-2">
            {filtered.map((i) => (
              <li key={i.id} className="border rounded-xl p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{i.party}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted inline-flex items-center gap-1">{SOURCE[i.source].icon}{SOURCE[i.source].label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${i.daysLate ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-700"}`}>
                      {i.daysLate ? `${i.daysLate} days late` : "Not yet due"}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">{i.ref} · since {new Date(i.since).toLocaleDateString()} · due {new Date(i.due).toLocaleDateString()}</div>
                </div>
                <div className="font-mono font-bold text-destructive sm:text-right">{formatTZS(i.amount)}</div>
                {i.source === "delivery" && (
                  <button onClick={() => setCollecting(i)} className="h-11 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">Receive payment</button>
                )}
                {i.source === "tab" && (
                  <Link to="/pos" className="h-11 px-4 rounded-xl border text-sm font-semibold inline-flex items-center justify-center">Open in POS</Link>
                )}
                {i.source === "pay_later" && (
                  <Link to="/customers" className="h-11 px-4 rounded-xl border text-sm font-semibold inline-flex items-center justify-center">Top up wallet</Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {collecting && (
        <CollectSheet item={collecting} onClose={() => setCollecting(null)} onCollect={(amount, tender, reference) => {
          const r = recordOrderPayment(collecting.order_id!, { amount, tender, reference });
          if (!r.ok) return r.reason;
          setCollecting(null);
          setToast(r.outstanding > 0 ? `Receipt ${r.payment.receipt_no} · ${formatTZS(r.outstanding)} still owed` : `Receipt ${r.payment.receipt_no} · fully paid`);
          setTimeout(() => setToast(""), 3500);
          return null;
        }} />
      )}
      {toast && <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-foreground text-background px-4 py-2.5 rounded-xl shadow-xl text-sm">{toast}</div>}
    </div>
  );
}

function CollectSheet({ item, onClose, onCollect }: {
  item: ArItem; onClose: () => void; onCollect: (amount: number, tender: "cash" | "mobile", reference?: string) => string | null;
}) {
  const [amount, setAmount] = useState(String(item.amount));
  const [tender, setTender] = useState<"cash" | "mobile">("cash");
  const [ref, setRef] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const n = Math.max(0, Math.round(Number(amount) || 0));
  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <form className="bg-background w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-3" onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); if (n > item.amount) { setErr(`Enter up to ${formatTZS(item.amount)}`); return; } setErr(onCollect(n, tender, ref.trim() || undefined)); }}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">Receive from {item.party}</h3>
          <button type="button" aria-label="Close" onClick={onClose} className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center"><X className="w-5 h-5" /></button>
        </div>
        <label className="block text-sm font-medium">Amount (TZS)
          <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))} className="w-full h-11 px-3 rounded-lg border bg-background font-mono" />
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(["cash", "mobile"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTender(t)} className={`h-11 rounded-lg border text-sm font-semibold ${tender === t ? "bg-foreground text-background border-foreground" : ""}`}>
              {t === "cash" ? "Cash" : "Mobile money"}
            </button>
          ))}
        </div>
        {tender === "mobile" && <input value={ref} onChange={(e) => setRef(e.target.value.toUpperCase())} placeholder="Reference, e.g. M-Pesa code" className="w-full h-11 px-3 rounded-lg border bg-background" />}
        <div className="bg-muted rounded-xl p-3 text-sm font-mono space-y-1">
          <div className="flex justify-between"><span className="font-sans text-muted-foreground">Owed now</span><span>{formatTZS(item.amount)}</span></div>
          <div className="flex justify-between"><span className="font-sans text-muted-foreground">Owed after</span><span>{formatTZS(Math.max(0, item.amount - n))}</span></div>
        </div>
        {err && <p className="text-sm text-destructive font-semibold">{err}</p>}
        <button disabled={n <= 0} className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-50">Receive {formatTZS(n)}</button>
      </form>
    </div>
  );
}
