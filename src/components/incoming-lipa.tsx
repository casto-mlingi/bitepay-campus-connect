import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Inbox, RefreshCw, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTZS } from "@/lib/store";
import { listIncomingLipa, claimLipaForSale } from "@/lib/gateway.functions";

type Row = { id: string; provider: string; reference: string; amount: number; sender_name: string | null; sender_phone: string | null; used: boolean; received_at: number };
const ago = (t: number) => { const m = Math.max(0, Math.round((Date.now() - t) / 60000)); return m < 1 ? "now" : m < 60 ? `${m}m ago` : `${Math.floor(m / 60)}h ago`; };

/** Lipa payments the store's SMS phone received: quick picks for the last 15 min plus a full list. */
export type LipaCheck = "none" | "checking" | "verified" | "used" | "missing" | "override";
const norm = (v: string) => v.trim().toUpperCase().replace(/\s+/g, "");

export function IncomingLipa({ storeId, onPick, reference = "", onStatus }: { storeId?: string; onPick: (p: { reference: string; amount: number }) => void; reference?: string; onStatus?: (s: LipaCheck) => void }) {
  const list = useServerFn(listIncomingLipa);
  const claim = useServerFn(claimLipaForSale);
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [claimed, setClaimed] = useState<string[]>([]);
  const [override, setOverride] = useState("");

  const load = useCallback(async () => {
    if (!storeId || !navigator.onLine) return;
    setLoading(true);
    try { setRows(await list({ data: { store_id: storeId, hours: 24 } })); setMsg(""); setLoaded(true); }
    catch { setMsg("Could not load received payments."); }
    finally { setLoading(false); }
  }, [storeId, list]);

  useEffect(() => { void load(); const t = setInterval(load, 10_000); return () => clearInterval(t); }, [load]);

  const pick = async (r: Row) => {
    if (!storeId || r.used) return;
    const res = await claim({ data: { store_id: storeId, sms_id: r.id } });
    if (!res.ok) { setMsg(res.reason); void load(); return; }
    setClaimed((c) => [...c, norm(res.reference)]);
    onPick({ reference: res.reference, amount: res.amount });
    setOpen(false); void load();
  };

  const ref = norm(reference);
  const match = ref.length >= 6 ? rows.find((r) => norm(r.reference) === ref) : undefined;
  const status: LipaCheck = ref.length < 6 ? "none" : claimed.includes(ref) ? "verified" : match && !match.used ? "checking" : match ? "used" : override === ref ? "override" : loaded ? "missing" : "checking";
  useEffect(() => { onStatus?.(status); }, [status, onStatus]);
  // A typed or scanned receipt that matches an unused SMS is locked to this sale and fills the amount.
  useEffect(() => { if (match && !match.used && !claimed.includes(ref)) void pick(match); }, [match?.id, match?.used]); // eslint-disable-line react-hooks/exhaustive-deps
  // Re-check quickly while waiting for a late SMS.
  useEffect(() => { if (status !== "missing" && status !== "override") return; const t = setInterval(load, 4_000); return () => clearInterval(t); }, [status, load]);
  useEffect(() => { if (status === "override" && match && !match.used) void pick(match); }, [status, match]); // eslint-disable-line react-hooks/exhaustive-deps

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
      {status === "verified" && <p className="rounded-lg bg-success/10 px-3 py-2 text-sm font-semibold text-success inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" />Payment confirmed by SMS{(() => { const r = rows.find((x) => norm(x.reference) === ref); return r ? ` · ${formatTZS(r.amount)}${r.sender_name ? ` from ${r.sender_name}` : ""}` : ""; })()}</p>}
      {status === "checking" && <p className="text-xs text-muted-foreground">Checking receipt…</p>}
      {status === "used" && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">This receipt was already used. Ask for another payment.</p>}
      {status === "missing" && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 space-y-2">
          <p className="text-sm font-semibold">SMS not received yet — still checking.</p>
          <Button type="button" size="sm" variant="outline" onClick={() => setOverride(ref)}>Accept without SMS</Button>
        </div>
      )}
      {status === "override" && <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs font-semibold">Accepted without SMS — marked unconfirmed for the shift check.</p>}
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
