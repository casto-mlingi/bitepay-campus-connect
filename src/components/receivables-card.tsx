import { useMemo, useState } from "react";
import { HandCoins, Receipt, AlertTriangle } from "lucide-react";
import { useStore, formatTZS, type Order } from "@/lib/store";
import { ListFilter, useListFilter } from "@/components/list-filter";

/**
 * Pay-on-delivery hand-over desk: collect full OR partial payments against an
 * order, each with its own reference + receipt. An order cannot be completed
 * until the outstanding balance hits zero (owners may close it out instead).
 */
export function ReceivablesCard() {
  const { receivables, recordOrderPayment, closeOutOrder, can, hasStaffRole } = useStore();
  const { filter, setFilter, range } = useListFilter();
  const [toast, setToast] = useState("");

  const rows = useMemo(() => {
    const q = filter.q.trim().toLowerCase();
    return receivables.filter((o) => {
      if (q && !(o.customer_name.toLowerCase().includes(q) || o.id.toLowerCase().includes(q))) return false;
      if (filter.status === "partial" && (o.amount_paid ?? 0) <= 0) return false;
      if (filter.status === "unpaid" && (o.amount_paid ?? 0) > 0) return false;
      if (o.created_at < range.from || o.created_at > range.to) return false;
      return true;
    });
  }, [receivables, filter, range]);

  if (!can("pos.sell")) return null;

  const totalDue = rows.reduce((s, o) => s + o.outstanding, 0);

  return (
    <section className="mb-6 bg-surface border rounded-2xl overflow-hidden">
      <div className="p-4 border-b flex flex-wrap items-center gap-3">
        <h2 className="font-bold flex items-center gap-2"><HandCoins className="w-4 h-4 text-primary" /> Pay-on-delivery collections</h2>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{rows.length} open · {formatTZS(totalDue)} due</span>
      </div>
      <div className="p-4 border-b">
        <ListFilter
          filter={filter}
          onChange={setFilter}
          placeholder="Search by client or order"
          statuses={[{ value: "unpaid", label: "Nothing paid" }, { value: "partial", label: "Partially paid" }]}
        />
      </div>
      <div className="divide-y">
        {rows.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">Nothing outstanding — every hand-over is settled.</div>}
        {rows.map((o) => (
          <ReceivableRow
            key={o.id}
            order={o}
            onCollect={(amount, tender, reference) => {
              const res = recordOrderPayment(o.id, { amount, tender, reference });
              if (!res.ok) { flash(setToast, res.reason); return false; }
              flash(setToast, res.outstanding > 0
                ? `Receipt ${res.payment.receipt_no} · ${formatTZS(res.outstanding)} still outstanding`
                : `Receipt ${res.payment.receipt_no} · fully settled`);
              return true;
            }}
            canCloseOut={hasStaffRole("owner")}
            onCloseOut={() => {
              const reason = window.prompt("Write-off reason?", "Uncollectible");
              if (!reason) return;
              const res = closeOutOrder(o.id, reason);
              flash(setToast, res.ok ? "Order closed out" : res.reason);
            }}
          />
        ))}
      </div>
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background px-4 py-2.5 rounded-xl shadow-xl text-sm">{toast}</div>}
    </section>
  );
}

function flash(set: (v: string) => void, msg: string) {
  set(msg);
  setTimeout(() => set(""), 3000);
}

function ReceivableRow({
  order, onCollect, canCloseOut, onCloseOut,
}: {
  order: Order & { outstanding: number };
  onCollect: (amount: number, tender: "cash" | "mobile", reference?: string) => boolean;
  canCloseOut: boolean;
  onCloseOut: () => void;
}) {
  const [amount, setAmount] = useState<number>(order.outstanding);
  const [tender, setTender] = useState<"cash" | "mobile">("cash");
  const [reference, setReference] = useState("");
  const payments = order.payments ?? [];

  return (
    <div className="p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold">{order.customer_name}</div>
          <div className="text-xs text-muted-foreground">
            {order.id} · total {formatTZS(order.total_amount)} · paid {formatTZS(order.amount_paid ?? 0)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Outstanding</div>
          <div className="font-bold text-rose-600">{formatTZS(order.outstanding)}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center border rounded-lg px-3">
          <span className="text-xs text-muted-foreground mr-2">TZS</span>
          <input
            type="number" min={0} step="any" value={amount || ""}
            onChange={(e) => setAmount(Number(e.target.value) || 0)}
            className="w-28 py-2 bg-transparent outline-none text-sm font-semibold"
            aria-label="Amount received"
          />
        </div>
        <select value={tender} onChange={(e) => setTender(e.target.value as "cash" | "mobile")} className="h-10 rounded-lg border bg-background px-3 text-sm" aria-label="Tender">
          <option value="cash">Cash</option>
          <option value="mobile">Mobile money</option>
        </select>
        {tender === "mobile" && (
          <input value={reference} onChange={(e) => setReference(e.target.value.toUpperCase())} placeholder="Reference" className="h-10 rounded-lg border bg-background px-3 text-sm" />
        )}
        <button
          onClick={() => { if (onCollect(amount, tender, reference.trim() || undefined)) { setReference(""); setAmount(0); } }}
          disabled={amount <= 0}
          className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-bold disabled:opacity-50"
        >
          Record payment
        </button>
        <button onClick={() => setAmount(order.outstanding)} className="h-10 px-3 rounded-lg border text-xs font-semibold hover:bg-muted">Full balance</button>
        {canCloseOut && (
          <button onClick={onCloseOut} className="h-10 px-3 rounded-lg border text-xs font-semibold text-rose-700 hover:bg-rose-50 inline-flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Close out
          </button>
        )}
      </div>

      {payments.length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-1 border-t pt-2">
          {payments.map((p) => (
            <li key={p.id} className="flex items-center gap-2">
              <Receipt className="w-3 h-3" />
              {new Date(p.created_at).toLocaleString()} · {p.tender}
              {p.reference ? ` (${p.reference})` : ""} · <b className="text-foreground">{formatTZS(p.amount)}</b> · {p.receipt_no} · by {p.by_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
