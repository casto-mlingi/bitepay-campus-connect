import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Inbox, RefreshCw, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTZS } from "@/lib/store";
import { listIncomingLipa, claimLipaForSale } from "@/lib/gateway.functions";

type Row = { id: string; provider: string; reference: string; amount: number; sender_name: string | null; sender_phone: string | null; used: boolean; received_at: number };
const ago = (t: number) => { const m = Math.max(0, Math.round((Date.now() - t) / 60000)); return m < 1 ? "now" : m < 60 ? `${m}m ago` : `${Math.floor(m / 60)}h ago`; };

/** Lipa payments the store's SMS phone received: quick picks for the last 15 min plus a full list. */
export function IncomingLipa({ storeId, onPick }: { storeId?: string; onPick: (p: { reference: string; amount: number }) => void }) {
  const list = useServerFn(listIncomingLipa);
  const claim = useServerFn(claimLipaForSale);
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    if (!storeId || !navigator.onLine) return;
    setLoading(true);
    try { setRows(await list({ data: { store_id: storeId, hours: 24 } })); setMsg(""); }
    catch { setMsg("Could not load received payments."); }
    finally { setLoading(false); }
  }, [storeId, list]);

  useEffect(() => { void load(); const t = setInterval(load, 10_000); return () => clearInterval(t); }, [load]);

  const pick = async (r: Row) => {
    if (!storeId || r.used) return;
    const res = await claim({ data: { store_id: storeId, sms_id: r.id } });
    if (!res.ok) { setMsg(res.reason); void load(); return; }
    onPick({ reference: res.reference, amount: res.amount });
    setOpen(false); void load();
  };

  const fresh = rows.filter((r) => !r.used && Date.now() - r.received_at < 15 * 60_000).slice(0, 4);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Received by Lipa</span>
        <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => { setOpen(true); void load(); }}><Inbox className="w-4 h-4 mr-1" />See all</Button>
      </div>
      {fresh.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {fresh.map((r) => (
            <button key={r.id} type="button" onClick={() => pick(r)} className="rounded-full border border-success/40 bg-success/10 px-3 py-1.5 text-xs font-semibold text-success">
              {formatTZS(r.amount)} · <span className="font-mono">{r.reference}</span> · {ago(r.received_at)}
            </button>
          ))}
        </div>
      ) : <p className="text-xs text-muted-foreground">No new Lipa payment in the last 15 minutes.</p>}
      {msg && <p role="alert" className="text-xs text-destructive">{msg}</p>}
      {open && (
        <div className="fixed inset-0 z-[60] bg-foreground/70 grid place-items-end sm:place-items-center" onClick={() => setOpen(false)}>
          <div role="dialog" aria-label="Lipa payments received" className="bg-background w-full sm:max-w-lg max-h-[85vh] rounded-t-2xl sm:rounded-2xl p-4 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold">Lipa payments received (24h)</h3>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" aria-label="Refresh payments" onClick={load}><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></Button>
                <Button variant="ghost" size="icon" aria-label="Close payments" onClick={() => setOpen(false)}><X className="w-4 h-4" /></Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-2">Ask the customer for the amount and receipt number, then tap the matching payment.</p>
            <div className="overflow-y-auto divide-y">
              {rows.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No payments received yet. Check the SMS phone is online.</p>}
              {rows.map((r) => (
                <div key={r.id} className="py-2.5 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold">{formatTZS(r.amount)} <span className="ml-1 text-xs font-medium text-muted-foreground">{r.provider}</span></div>
                    <div className="font-mono text-xs">{r.reference}</div>
                    <div className="text-xs text-muted-foreground truncate">{[r.sender_name, r.sender_phone].filter(Boolean).join(" · ") || "—"} · {ago(r.received_at)}</div>
                  </div>
                  {r.used ? <span className="text-xs font-semibold text-muted-foreground inline-flex items-center gap-1"><CheckCircle2 className="w-4 h-4" />Used</span>
                    : <Button size="sm" onClick={() => pick(r)}>Use</Button>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
