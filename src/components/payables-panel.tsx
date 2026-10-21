import { useMemo, useState } from "react";
import { Truck, Plus, X, AlertTriangle, Clock, CheckCircle2, Banknote } from "lucide-react";
import { useStore, formatTZS, type PaymentMethod, type Purchase } from "@/lib/store";
import { agingOf, billBalance, paidOn, type Aging } from "@/lib/payables";

const STATUS: Record<Aging, { label: string; cls: string }> = {
  overdue: { label: "Overdue", cls: "bg-destructive/10 text-destructive" },
  due_soon: { label: "Due soon", cls: "bg-amber-500/15 text-amber-700" },
  current: { label: "Not yet due", cls: "bg-muted text-foreground" },
  paid: { label: "Paid", cls: "bg-emerald-500/10 text-emerald-700" },
};

export function PayablesPanel() {
  const { vendors, vendorPayments, purchases, saveVendor, payVendorBill, cash, bank } = useStore();
  const [showVendor, setShowVendor] = useState(false);
  const [paying, setPaying] = useState<Purchase | null>(null);
  const [filter, setFilter] = useState<"open" | "all">("open");
  const now = Date.now();

  const bills = useMemo(() => purchases.filter((p) => p.on_credit).map((p) => ({
    p, balance: billBalance(p, vendorPayments), paid: paidOn(p.id, vendorPayments), aging: agingOf(p, vendorPayments, now),
  })).sort((a, b) => (a.p.due_date ?? a.p.date) - (b.p.due_date ?? b.p.date)), [purchases, vendorPayments, now]);

  const totals = useMemo(() => {
    const t = { owed: 0, overdue: 0, dueSoon: 0 };
    for (const b of bills) {
      t.owed += b.balance;
      if (b.aging.status === "overdue") t.overdue += b.balance;
      if (b.aging.status === "due_soon") t.dueSoon += b.balance;
    }
    return t;
  }, [bills]);

  const owedBy = (vendorId: string, name: string) =>
    bills.filter((b) => (b.p.vendor_id ? b.p.vendor_id === vendorId : b.p.supplier === name)).reduce((s, b) => s + b.balance, 0);

  const shown = filter === "open" ? bills.filter((b) => b.balance > 0) : bills;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Kpi icon={<Truck className="w-4 h-4" />} label="Total owed to suppliers" value={totals.owed} />
        <Kpi icon={<AlertTriangle className="w-4 h-4" />} label="Overdue" value={totals.overdue} tone="danger" />
        <Kpi icon={<Clock className="w-4 h-4" />} label="Due in next 3 days" value={totals.dueSoon} tone="warn" />
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-2 bg-surface border rounded-2xl p-5 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg">Suppliers</h2>
            <button onClick={() => setShowVendor(true)} className="h-10 px-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-1">
              <Plus className="w-4 h-4" /> Add supplier
            </button>
          </div>
          {vendors.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No suppliers yet. Add the people you buy stock from.</p>
          ) : (
            <ul className="divide-y">
              {vendors.map((v) => {
                const owed = owedBy(v.id, v.name);
                return (
                  <li key={v.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{v.name}</div>
                      <div className="text-xs text-muted-foreground">{v.phone || "No phone"} · {v.terms_days ? `pay in ${v.terms_days} days` : "cash on delivery"}</div>
                    </div>
                    <div className={`font-mono text-sm font-semibold ${owed ? "text-destructive" : "text-muted-foreground"}`}>{owed ? formatTZS(owed) : "—"}</div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="lg:col-span-3 bg-surface border rounded-2xl p-5 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="font-bold text-lg">Supplier bills</h2>
            <div className="flex gap-1 bg-muted p-1 rounded-xl text-sm">
              {(["open", "all"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={`px-3 h-9 rounded-lg font-semibold ${filter === f ? "bg-background shadow-sm" : ""}`}>
                  {f === "open" ? "Unpaid" : "All"}
                </button>
              ))}
            </div>
          </div>
          {shown.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {filter === "open" ? "Nothing owed. Choose “Pay later (bill)” in Procurement to buy on credit." : "No supplier bills yet."}
            </p>
          ) : (
            <ul className="space-y-2">
              {shown.map(({ p, balance, paid, aging }) => (
                <li key={p.id} className="border rounded-xl p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{p.supplier}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS[aging.status].cls}`}>
                        {STATUS[aging.status].label}{aging.daysOverdue ? ` +${aging.daysOverdue}d` : ""}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {p.id} · {p.qty} × {p.raw_name} · due {new Date(p.due_date ?? p.date).toLocaleDateString()}
                    </div>
                    <div className="text-xs mt-1">
                      Bill {formatTZS(p.total_cost)} · Paid <span className="text-emerald-700">{formatTZS(paid)}</span> · Owed <span className="font-semibold text-destructive">{formatTZS(balance)}</span>
                    </div>
                  </div>
                  {balance > 0 ? (
                    <button onClick={() => setPaying(p)} className="h-11 px-4 rounded-xl bg-foreground text-background text-sm font-semibold flex items-center justify-center gap-1">
                      <Banknote className="w-4 h-4" /> Pay supplier
                    </button>
                  ) : <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-surface border rounded-2xl p-5 min-w-0">
        <h2 className="font-bold text-lg mb-3">Supplier payment history</h2>
        {vendorPayments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No supplier payments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr className="text-left"><th className="py-2 pr-3">Date</th><th className="pr-3">Supplier</th><th className="pr-3">Bill</th><th className="pr-3">From</th><th className="pr-3">Ref</th><th className="pr-3 text-right">Money out</th></tr>
              </thead>
              <tbody className="divide-y">
                {vendorPayments.map((v) => {
                  const bill = purchases.find((p) => p.id === v.purchase_id);
                  return (
                    <tr key={v.id}>
                      <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">{new Date(v.created_at).toLocaleString()}</td>
                      <td className="pr-3">{bill?.supplier ?? "—"}</td>
                      <td className="pr-3 font-mono text-xs">{v.purchase_id}</td>
                      <td className="pr-3">{v.method === "bank" ? "Bank / mobile" : "Cash"}</td>
                      <td className="pr-3 text-xs">{v.reference ?? "—"}{v.paid_by_name ? ` · ${v.paid_by_name}` : ""}</td>
                      <td className="pr-3 text-right font-mono font-semibold text-destructive">−{formatTZS(v.amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showVendor && <VendorModal onClose={() => setShowVendor(false)} onSave={(v) => { if (saveVendor(v)) setShowVendor(false); }} />}
      {paying && (
        <PayModal bill={paying} owed={billBalance(paying, vendorPayments)} cash={cash} bank={bank}
          onClose={() => setPaying(null)}
          onPay={(amount, method, reference) => {
            const r = payVendorBill({ purchase_id: paying.id, amount, method, reference });
            if (r.ok) setPaying(null);
            return r.ok ? null : r.reason;
          }} />
      )}
    </div>
  );
}

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone?: "danger" | "warn" }) {
  const cls = tone === "danger" && value ? "text-destructive" : tone === "warn" && value ? "text-amber-700" : "";
  return (
    <div className="bg-surface border rounded-2xl p-4">
      <div className="text-xs text-muted-foreground flex items-center gap-1">{icon} {label}</div>
      <div className={`text-2xl font-bold font-mono mt-1 ${cls}`}>{formatTZS(value)}</div>
    </div>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-background w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">{title}</h3>
          <button aria-label="Close" onClick={onClose} className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputCls = "w-full h-11 px-3 rounded-lg border bg-background";

function VendorModal({ onClose, onSave }: { onClose: () => void; onSave: (v: { name: string; phone?: string; terms_days: number }) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [terms, setTerms] = useState(7);
  return (
    <Sheet title="Add supplier" onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onSave({ name, phone, terms_days: terms }); }}>
        <label className="block text-sm font-medium">Name<input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Serengeti Breweries" className={inputCls} /></label>
        <label className="block text-sm font-medium">Phone<input value={phone} inputMode="tel" onChange={(e) => setPhone(e.target.value)} placeholder="Optional" className={inputCls} /></label>
        <div className="text-sm font-medium">Pay within
          <div className="grid grid-cols-4 gap-2 mt-1">
            {[0, 7, 14, 30].map((d) => (
              <button key={d} type="button" onClick={() => setTerms(d)} className={`h-11 rounded-lg border text-sm font-semibold ${terms === d ? "bg-foreground text-background border-foreground" : ""}`}>
                {d ? `${d} days` : "On delivery"}
              </button>
            ))}
          </div>
        </div>
        <button className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold">Save supplier</button>
      </form>
    </Sheet>
  );
}

function PayModal({ bill, owed, cash, bank, onClose, onPay }: {
  bill: Purchase; owed: number; cash: number; bank: number; onClose: () => void;
  onPay: (amount: number, method: PaymentMethod, reference?: string) => string | null;
}) {
  const [amount, setAmount] = useState(String(owed));
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [ref, setRef] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const n = Math.max(0, Math.round(Number(amount) || 0));
  const before = method === "bank" ? bank : cash;
  return (
    <Sheet title={`Pay ${bill.supplier}`} onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); setErr(onPay(n, method, ref)); }}>
        <label className="block text-sm font-medium">Amount (TZS)
          <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))} className={`${inputCls} font-mono`} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(["cash", "bank"] as PaymentMethod[]).map((m) => (
            <button key={m} type="button" onClick={() => setMethod(m)} className={`h-11 rounded-lg border text-sm font-semibold ${method === m ? "bg-foreground text-background border-foreground" : ""}`}>
              {m === "bank" ? "Bank / mobile" : "Cash"}
            </button>
          ))}
        </div>
        <label className="block text-sm font-medium">Reference<input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Optional, e.g. M-Pesa code" className={inputCls} /></label>
        <div className="bg-muted rounded-xl p-3 text-sm space-y-1 font-mono">
          <div className="flex justify-between"><span className="font-sans text-muted-foreground">Owed now</span><span>{formatTZS(owed)}</span></div>
          <div className="flex justify-between"><span className="font-sans text-muted-foreground">Owed after</span><span>{formatTZS(Math.max(0, owed - n))}</span></div>
          <div className="flex justify-between"><span className="font-sans text-muted-foreground">{method === "bank" ? "Bank" : "Cash"} after</span><span className={before - n < 0 ? "text-destructive" : ""}>{formatTZS(before - n)}</span></div>
        </div>
        {err && <p className="text-sm text-destructive font-semibold">{err}</p>}
        <button className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold">Pay {formatTZS(n)}</button>
      </form>
    </Sheet>
  );
}
