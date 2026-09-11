import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { HandCoins, AlertTriangle, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useStore, formatTZS, type PayLaterRequest } from "@/lib/store";
import { StaffShell } from "@/components/staff-shell";
import { AccessDenied } from "@/components/access-denied";
import { ListFilter, useListFilter } from "@/components/list-filter";

export const Route = createFileRoute("/credit")({
  component: CreditPage,
  head: () => ({ meta: [
    { title: "Pay-later credit approvals — BitePay Staff" },
    { name: "description", content: "Approve or decline customer pay-later requests, set credit terms and watch overdue debtor balances." },
    { property: "og:title", content: "Pay-later credit approvals — BitePay Staff" },
    { property: "og:description", content: "Approve or decline customer pay-later requests and track overdue debtors." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function CreditPage() {
  const {
    currentUser, sessionReady, can, store, payLaterRequests, reviewPayLaterRequest,
    profiles, debtorBalance, isOverdue, creditLimitOf,
  } = useStore();
  const navigate = useNavigate();
  const { filter, setFilter, range } = useListFilter();
  const [toast, setToast] = useState("");
  const [days, setDays] = useState<number>(store?.credit_terms_days ?? 7);
  const [pin, setPin] = useState("");

  useEffect(() => {
    if (sessionReady && !currentUser) navigate({ to: "/" });
    else if (currentUser.role !== "staff") navigate({ to: "/dashboard" });
  }, [currentUser, navigate]);

  const rows = useMemo(() => {
    const q = filter.q.trim().toLowerCase();
    return payLaterRequests.filter((r) => {
      if (q && !(r.customer_name.toLowerCase().includes(q) || r.customer_phone.includes(q))) return false;
      if (filter.status !== "all" && r.status !== filter.status) return false;
      if (r.created_at < range.from || r.created_at > range.to) return false;
      return true;
    });
  }, [payLaterRequests, filter, range]);

  const debtors = useMemo(
    () => profiles
      .filter((p) => p.role === "customer" && p.wallet_balance < 0)
      .map((p) => ({ p, owing: debtorBalance(p.id), overdue: isOverdue(p.id) }))
      .sort((a, b) => Number(b.overdue) - Number(a.overdue) || b.owing - a.owing),
    [profiles, debtorBalance, isOverdue],
  );

  if (!currentUser || currentUser.role !== "staff") return null;
  if (!can("customers.topup")) return <StaffShell><AccessDenied feature="Credit approvals" /></StaffShell>;

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2800); };
  const pending = rows.filter((r) => r.status === "pending");
  const totalOwed = debtors.reduce((s, d) => s + d.owing, 0);
  const overdueCount = debtors.filter((d) => d.overdue).length;

  const review = (r: PayLaterRequest, action: "approve" | "reject") => {
    const reason = action === "reject" ? (window.prompt("Reason for declining?", "Please top up instead") ?? "") : undefined;
    if (action === "reject" && !reason) return;
    const res = reviewPayLaterRequest(r.id, action, { pin: pin || undefined, reason, days });
    flash(res.ok
      ? (action === "approve" ? `Approved ${formatTZS(r.amount)} credit for ${r.customer_name} · due in ${days} days` : "Request declined")
      : res.reason);
    setPin("");
  };

  return (
    <StaffShell active="credit">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2"><HandCoins className="w-7 h-7 text-primary" /> Pay-later approvals</h1>
          <p className="text-muted-foreground text-sm">Approve credit terms and keep an eye on debtor balances.</p>
        </div>
        <div className="flex items-end gap-2">
          <label className="text-xs font-semibold text-muted-foreground">
            Credit terms (days)
            <input type="number" min={1} value={days} onChange={(e) => setDays(Math.max(1, Number(e.target.value) || 1))}
              className="mt-1 block w-24 h-10 rounded-xl border bg-background px-3 text-sm font-semibold text-foreground" />
          </label>
          <label className="text-xs font-semibold text-muted-foreground">
            Your PIN
            <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="••••"
              className="mt-1 block w-24 h-10 rounded-xl border bg-background px-3 text-sm text-foreground" />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Card label="Awaiting approval" value={String(pending.length)} />
        <Card label="Debtors" value={String(debtors.length)} />
        <Card label="Total owed" value={formatTZS(totalOwed)} tone="rose" />
        <Card label="Overdue" value={String(overdueCount)} tone={overdueCount > 0 ? "rose" : undefined} />
      </div>

      <section className="bg-surface border rounded-2xl overflow-hidden mb-6">
        <div className="p-4 border-b">
          <ListFilter
            filter={filter}
            onChange={setFilter}
            placeholder="Search by client name or phone"
            statuses={[
              { value: "pending", label: "Pending" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
              { value: "settled", label: "Settled" },
            ]}
          />
        </div>
        <div className="divide-y">
          {rows.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No pay-later requests match this view.</div>}
          {rows.map((r) => (
            <div key={r.id} className="p-4 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px]">
                <div className="font-semibold">{r.customer_name} <span className="text-xs font-normal text-muted-foreground">· {r.customer_phone}</span></div>
                <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2 mt-0.5">
                  <Clock className="w-3 h-3" /> {new Date(r.created_at).toLocaleString()}
                  {r.due_at && <span>· due {new Date(r.due_at).toLocaleDateString()}</span>}
                  {r.resolved_by && <span>· by {r.resolved_by}</span>}
                </div>
                {r.reason && <div className="text-xs italic text-muted-foreground mt-1">"{r.reason}"</div>}
                {r.reject_reason && <div className="text-xs text-rose-700 mt-1">Declined — {r.reject_reason}</div>}
              </div>
              <div className="text-lg font-bold">{formatTZS(r.amount)}</div>
              <StatusPill status={r.status} />
              {r.status === "pending" && (
                <div className="flex gap-2">
                  <button onClick={() => review(r, "approve")} className="h-9 px-3 rounded-lg bg-emerald-600 text-white text-xs font-bold inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button onClick={() => review(r, "reject")} className="h-9 px-3 rounded-lg border text-xs font-bold text-rose-700 inline-flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Decline
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-surface border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600" /> Debtor balances
        </div>
        <div className="divide-y">
          {debtors.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No client is in debt right now.</div>}
          {debtors.map(({ p, owing, overdue }) => (
            <div key={p.id} className="p-4 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[180px]">
                <div className="font-semibold">{p.full_name}</div>
                <div className="text-xs text-muted-foreground">{p.phone} · approved credit {formatTZS(creditLimitOf(p.id))}</div>
              </div>
              {overdue && <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">Overdue</span>}
              <div className="font-bold text-rose-600">− {formatTZS(owing)}</div>
            </div>
          ))}
        </div>
      </section>

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background px-4 py-2.5 rounded-xl shadow-xl text-sm">{toast}</div>}
    </StaffShell>
  );
}

function Card({ label, value, tone }: { label: string; value: string; tone?: "rose" }) {
  return (
    <div className={`rounded-2xl border p-4 ${tone === "rose" ? "bg-rose-50 border-rose-200" : "bg-surface"}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${tone === "rose" ? "text-rose-700" : ""}`}>{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: PayLaterRequest["status"] }) {
  const map: Record<PayLaterRequest["status"], string> = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-slate-200 text-slate-700",
    settled: "bg-sky-100 text-sky-700",
  };
  return <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${map[status]}`}>{status}</span>;
}
