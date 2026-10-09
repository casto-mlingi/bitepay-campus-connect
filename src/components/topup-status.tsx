import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Clock, XCircle, LifeBuoy, Loader2, RefreshCw } from "lucide-react";
import { listMySelcomPayments, SELCOM_NETWORKS, type SelcomNetwork } from "@/lib/selcom.functions";
import { diagnoseTopupIssue } from "@/lib/topup-help.functions";
import { formatTZS } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TopupReceiptButton } from "@/components/topup-receipt";

export type PayState = "pending" | "success" | "failed";

export function PayStateBadge({ state }: { state: PayState }) {
  const map = {
    pending: { cls: "bg-warning/15 text-warning", label: "Pending", Icon: Clock },
    success: { cls: "bg-success/15 text-success", label: "Successful", Icon: CheckCircle2 },
    failed: { cls: "bg-destructive/15 text-destructive", label: "Failed", Icon: XCircle },
  }[state];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full ${map.cls}`}>
      <map.Icon className="w-3 h-3" /> {map.label}
    </span>
  );
}

export function selcomState(status: string, credited: boolean): PayState {
  if (status === "COMPLETED" && credited) return "success";
  if (["FAILED", "CANCELLED", "REJECTED"].includes(status)) return "failed";
  return "pending";
}

type Row = Awaited<ReturnType<typeof listMySelcomPayments>>[number];

export function useMyMobilePayments(customerId: string | undefined) {
  const list = useServerFn(listMySelcomPayments);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const refresh = useCallback(() => {
    if (!customerId) return;
    setLoading(true);
    list({ data: { customer_id: customerId } }).then(setRows).catch(() => {}).finally(() => setLoading(false));
  }, [customerId, list]);
  useEffect(() => { refresh(); }, [refresh]);
  return { rows, loading, refresh };
}

const netLabel = (n: string) => SELCOM_NETWORKS[n as SelcomNetwork]?.label ?? n;

export function MobilePaymentsList({ rows, loading, refresh }: { rows: Row[]; loading: boolean; refresh: () => void }) {
  return (
    <section className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold">Mobile money payments</h2>
        <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">No mobile money payments yet.</div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const st = selcomState(r.status, r.credited);
            return (
              <li key={r.order_id} className="bg-surface border rounded-2xl p-3 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{formatTZS(r.amount)} <span className="text-xs text-muted-foreground font-normal">· {netLabel(r.network)}</span></div>
                  <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()} · {r.order_id}</div>
                  <div className="text-xs mt-0.5 text-muted-foreground">
                    {st === "success" ? "Confirmed — added to your wallet." : st === "failed" ? "Not paid. No money was added." : "Waiting for confirmation from your network."}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <PayStateBadge state={st} />
                  {st === "success" && <TopupReceiptButton payment={r} network={netLabel(r.network)} />}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function TopupHelp({ rows }: { rows: Row[] }) {
  const diagnose = useServerFn(diagnoseTopupIssue);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState("");
  const [err, setErr] = useState("");

  const ask = async () => {
    setErr(""); setAnswer("");
    if (text.trim().length < 5) return setErr("Tell us a bit more about what happened.");
    setBusy(true);
    try {
      const recent = rows.slice(0, 5).map((r) => `${new Date(r.created_at).toLocaleString()}: TZS ${r.amount} (+fee ${r.fee}) via ${netLabel(r.network)} — status ${r.status}${r.credited ? ", credited" : ""}`).join("\n");
      const r = await diagnose({ data: { description: text.trim(), recent } });
      if (r.ok) setAnswer(r.text); else setErr(r.reason);
    } catch { setErr("Could not get help right now. Please try again."); }
    finally { setBusy(false); }
  };

  return (
    <section className="mt-6 bg-surface border rounded-2xl p-5">
      <div className="flex items-center gap-2 font-bold"><LifeBuoy className="w-5 h-5 text-primary" /> Problem with a mobile money top-up?</div>
      <p className="text-xs text-muted-foreground mt-1">Describe what happened and we'll suggest the likely cause and what to do next. Never share your PIN.</p>
      <Textarea className="mt-3" rows={3} value={text} onChange={(e) => setText(e.target.value)} maxLength={1500}
        placeholder="e.g. I chose M-Pesa but no PIN prompt came to my phone" />
      {err && <div className="mt-2 text-sm text-destructive font-medium">{err}</div>}
      <Button onClick={ask} disabled={busy} className="w-full mt-3">
        {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Checking…</> : "Get help"}
      </Button>
      {answer && (
        <div className="mt-4 rounded-lg bg-muted p-3 text-sm whitespace-pre-wrap">
          {answer.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
            part.startsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <span key={i}>{part}</span>)}
        </div>
      )}
    </section>
  );
}
