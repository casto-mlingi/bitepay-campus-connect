import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { useStore, formatTZS } from "@/lib/store";
import { StaffShell } from "@/components/staff-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PayStateBadge } from "@/components/topup-status";
import { useServerFn } from "@tanstack/react-start";
import { lookupGatewayReceipts, claimGatewayReceipt } from "@/lib/gateway.functions";

type Lookup = { found: true; reference: string; amount: number; used: boolean; received_at: number } | { found: false; suggestion: string | null };

export const Route = createFileRoute("/topups")({
  component: TopupsDesk,
  head: () => ({ meta: [
    { title: "Top-up confirmations — BitePay" },
    { name: "description", content: "Confirm customers' Lipa Namba and cash top-up references." },
    { property: "og:title", content: "Top-up confirmations — BitePay" },
    { property: "og:description", content: "Confirm customers' Lipa Namba and cash top-up references." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
});

function TopupsDesk() {
  const { currentUser, sessionReady, topUpRequests, staffTopUp, rejectTopUpRequest, profiles, can, store } = useStore();
  const lookupFn = useServerFn(lookupGatewayReceipts);
  const claimFn = useServerFn(claimGatewayReceipt);
  const [gw, setGw] = useState<Record<string, Lookup>>({});
  const [mLook, setMLook] = useState<Lookup | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState<{ id: string; text: string; ok: boolean } | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [verified, setVerified] = useState<Record<string, string>>({});
  const [mCust, setMCust] = useState("");
  const [mRef, setMRef] = useState("");
  const [mAmt, setMAmt] = useState("");
  const [mMsg, setMMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => { if (sessionReady && (!currentUser || currentUser.role !== "staff")) navigate({ to: "/" }); }, [sessionReady, currentUser, navigate]);

  const pending = useMemo(() => topUpRequests.filter((r) => r.status === "pending").sort((a, b) => (b.assist_requested_at ?? 0) - (a.assist_requested_at ?? 0)), [topUpRequests]);
  const refsKey = pending.map((r) => r.reference).join(",");
  useEffect(() => {
    if (!store?.id || !refsKey) return;
    let alive = true;
    const run = () => lookupFn({ data: { store_id: store.id, references: refsKey.split(",").filter((x) => x.length >= 4).slice(0, 40) } })
      .then((res) => { if (alive) setGw(res as Record<string, Lookup>); }).catch(() => {});
    run(); const t = setInterval(run, 10000);
    return () => { alive = false; clearInterval(t); };
  }, [store?.id, refsKey, lookupFn]);
  const customers = useMemo(() => profiles.filter((p) => p.role === "customer"), [profiles]);
  const log = useMemo(() => topUpRequests.filter((r) => r.status !== "pending").sort((a, b) => (b.resolved_at ?? 0) - (a.resolved_at ?? 0)).slice(0, 50), [topUpRequests]);
  const nameOf = (id?: string) => profiles.find((p) => p.id === id)?.full_name ?? "Staff";

  if (!currentUser || currentUser.role !== "staff") return null;
  const allowed = can("customers.topup");

  const smsAmount = (ref: string) => { const g = gw[ref]; return g && g.found && !g.used ? g.amount : null; };
  const confirm = async (id: string) => {
    const r = pending.find((x) => x.id === id); if (!r || busy) return;
    let amt = Math.round(Number(verified[id] ?? smsAmount(r.reference) ?? r.amount));
    if (!Number.isSafeInteger(amt) || amt <= 0) return setMsg({ id, ok: false, text: "Enter the amount shown on the till SMS." });
    if (store?.id) {
      setBusy(true);
      const c = await claimFn({ data: { store_id: store.id, reference: r.reference, request_id: r.id } }).catch(() => null);
      setBusy(false);
      if (c && !c.ok) return setMsg({ id, ok: false, text: c.reason });
      if (c?.ok && c.gateway && c.amount) amt = c.amount; // payment phone amount wins
    }
    const res = staffTopUp({ customerId: r.customer_id, amount: amt, tender: "mobile", reference: r.reference, pin, requestId: r.id });
    setMsg({ id, ok: res.ok, text: res.ok ? `Confirmed — ${formatTZS(amt)} added to ${r.customer_name}'s wallet.` : res.reason });
  };
  const checkManual = async () => {
    const ref = mRef.trim().toUpperCase();
    if (!store?.id || ref.length < 4) return setMMsg({ ok: false, text: "Enter the receipt number first." });
    setBusy(true);
    const res = await lookupFn({ data: { store_id: store.id, references: [ref] } }).catch(() => null);
    setBusy(false);
    const l = res?.[ref] as Lookup | undefined;
    setMLook(l ?? null);
    if (l?.found && !l.used) setMAmt(String(l.amount));
  };
  const manualVerify = async () => {
    let amt = Math.round(Number(mAmt));
    const ref = mRef.trim().toUpperCase();
    if (!mCust) return setMMsg({ ok: false, text: "Choose the customer." });
    if (!ref) return setMMsg({ ok: false, text: "Enter the receipt number from the till SMS." });
    if (!Number.isSafeInteger(amt) || amt <= 0) return setMMsg({ ok: false, text: "Enter the amount shown on the till SMS." });
    if (store?.id) {
      setBusy(true);
      const c = await claimFn({ data: { store_id: store.id, reference: ref, request_id: `manual-${ref}` } }).catch(() => null);
      setBusy(false);
      if (c && !c.ok) return setMMsg({ ok: false, text: c.reason });
      if (c?.ok && c.gateway && c.amount) amt = c.amount;
    }
    const res = staffTopUp({ customerId: mCust, amount: amt, tender: "mobile", reference: ref, pin });
    setMMsg({ ok: res.ok, text: res.ok ? `Verified — ${formatTZS(amt)} added (receipt ${ref}).` : res.reason });
    if (res.ok) { setMRef(""); setMAmt(""); setMLook(null); }
  };
  const reject = (id: string) => {
    if (!reason.trim()) return setMsg({ id, ok: false, text: "Enter a reason so the customer knows what to fix." });
    rejectTopUpRequest(id, reason.trim()); setRejecting(null); setReason("");
  };

  return (
    <StaffShell active="customers">
      <h1 className="text-2xl font-bold">Top-up confirmations</h1>
      <p className="text-sm text-muted-foreground">Check each reference against your till SMS or cash drawer, then confirm to credit the wallet.</p>

      {!allowed ? (
        <div className="mt-5 rounded-lg bg-muted p-4 text-sm">Your role can't confirm top-ups. Ask a supervisor.</div>
      ) : (
        <div className="mt-5 max-w-xs">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your staff PIN</label>
          <Input type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Needed to confirm" className="mt-1" />
        </div>
      )}

      {allowed && (
        <section className="mt-6 bg-surface border rounded-2xl p-4">
          <h2 className="text-lg font-bold">Manual receipt verification</h2>
          <p className="text-xs text-muted-foreground">Check the receipt number and amount on the till SMS, then credit the customer.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            <select value={mCust} onChange={(e) => setMCust(e.target.value)} className="h-10 rounded-md border bg-background px-2 text-sm sm:col-span-2">
              <option value="">Choose customer…</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name} · {c.phone}</option>)}
            </select>
            <Input value={mRef} onChange={(e) => setMRef(e.target.value.toUpperCase())} placeholder="Receipt no. e.g. DK9J93CK51" className="font-mono" />
            <Input type="number" inputMode="numeric" value={mAmt} onChange={(e) => setMAmt(e.target.value)} placeholder="Amount on SMS" />
          </div>
          {mLook && <GwBadge l={mLook} />}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" onClick={checkManual} disabled={busy || mRef.trim().length < 4}>Check payment phone</Button>
            <Button onClick={manualVerify} disabled={!pin || busy}><CheckCircle2 className="w-4 h-4 mr-1" /> Verify & credit wallet</Button>
          </div>
          {mMsg && <div className={`mt-2 text-sm font-medium ${mMsg.ok ? "text-success" : "text-destructive"}`}>{mMsg.text}</div>}
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-lg font-bold mb-2 flex items-center gap-2"><Clock className="w-5 h-5 text-warning" /> Waiting ({pending.length})</h2>
        {pending.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">No references waiting.</div>
        ) : (
          <ul className="space-y-2">
            {pending.map((r) => (
              <li key={r.id} className="bg-surface border rounded-2xl p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-lg">{formatTZS(r.amount)}</div>
                    <div className="text-sm">{r.customer_name} · {r.customer_phone}</div>
                    <div className="text-sm font-mono">Ref {r.reference}</div>
                    {gw[r.reference] && <GwBadge l={gw[r.reference]} />}
                    {r.assist_requested_at && <div className="mt-1 inline-block rounded bg-warning/15 text-warning px-2 py-0.5 text-xs font-semibold">Customer asked for help · verify manually</div>}
                    {r.note && <div className="text-xs text-muted-foreground">“{r.note}”</div>}
                    <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
                  </div>
                  <PayStateBadge state="pending" />
                </div>
                {allowed && (rejecting === r.id ? (
                  <div className="mt-3 flex gap-2">
                    <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason, e.g. reference not found" />
                    <Button variant="destructive" onClick={() => reject(r.id)}>Reject</Button>
                    <Button variant="ghost" onClick={() => setRejecting(null)}>Cancel</Button>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-1 text-xs text-muted-foreground">Amount on SMS
                      <Input type="number" inputMode="numeric" className="h-9 w-28" value={verified[r.id] ?? String(smsAmount(r.reference) ?? r.amount)} onChange={(e) => setVerified((v) => ({ ...v, [r.id]: e.target.value }))} />
                    </label>
                    <Button onClick={() => confirm(r.id)} disabled={!pin || busy}><CheckCircle2 className="w-4 h-4 mr-1" /> Confirm</Button>
                    <Button variant="outline" onClick={() => { setRejecting(r.id); setReason(""); }}><XCircle className="w-4 h-4 mr-1" /> Reject</Button>
                  </div>
                ))}
                {msg?.id === r.id && <div className={`mt-2 text-sm font-medium ${msg.ok ? "text-success" : "text-destructive"}`}>{msg.text}</div>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold mb-2">Confirmation log</h2>
        {log.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">Nothing confirmed yet.</div>
        ) : (
          <div className="bg-surface border rounded-2xl divide-y">
            {log.map((r) => (
              <div key={r.id} className="p-3 flex items-center gap-3 text-sm">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{formatTZS(r.amount)} · {r.customer_name} <span className="font-mono text-xs text-muted-foreground">ref {r.reference}</span></div>
                  <div className="text-xs text-muted-foreground">
                    {r.status === "approved" ? "Confirmed" : "Rejected"} by {nameOf(r.resolved_by)} · {r.resolved_at ? new Date(r.resolved_at).toLocaleString() : ""}
                    {r.reject_reason ? ` · ${r.reject_reason}` : ""}
                  </div>
                </div>
                <PayStateBadge state={r.status === "approved" ? "success" : "failed"} />
              </div>
            ))}
          </div>
        )}
      </section>
    </StaffShell>
  );
}

function GwBadge({ l }: { l: Lookup }) {
  if (l.found && l.used) return <div className="mt-1 inline-block rounded bg-destructive/15 text-destructive px-2 py-0.5 text-xs font-semibold">Receipt {l.reference} already used — do not credit</div>;
  if (l.found) return <div className="mt-1 inline-block rounded bg-success/15 text-success px-2 py-0.5 text-xs font-semibold">✓ Confirmed by BitePay: receipt {l.reference} · TZS {l.amount.toLocaleString()}</div>;
  return <div className="mt-1 inline-block rounded bg-muted text-muted-foreground px-2 py-0.5 text-xs font-semibold">Not on payment phone yet{l.suggestion ? ` · did you mean ${l.suggestion}?` : ""}</div>;
}
