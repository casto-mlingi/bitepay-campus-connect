import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { useStore, formatTZS } from "@/lib/store";
import { StaffShell } from "@/components/staff-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PayStateBadge } from "@/components/topup-status";

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
  const { currentUser, sessionReady, topUpRequests, staffTopUp, rejectTopUpRequest, profiles, can } = useStore();
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState<{ id: string; text: string; ok: boolean } | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  useEffect(() => { if (sessionReady && (!currentUser || currentUser.role !== "staff")) navigate({ to: "/" }); }, [sessionReady, currentUser, navigate]);

  const pending = useMemo(() => topUpRequests.filter((r) => r.status === "pending"), [topUpRequests]);
  const log = useMemo(() => topUpRequests.filter((r) => r.status !== "pending").sort((a, b) => (b.resolved_at ?? 0) - (a.resolved_at ?? 0)).slice(0, 50), [topUpRequests]);
  const nameOf = (id?: string) => profiles.find((p) => p.id === id)?.full_name ?? "Staff";

  if (!currentUser || currentUser.role !== "staff") return null;
  const allowed = can("customers.topup");

  const confirm = (id: string) => {
    const r = pending.find((x) => x.id === id); if (!r) return;
    const res = staffTopUp({ customerId: r.customer_id, amount: r.amount, tender: "mobile", reference: r.reference, pin, requestId: r.id });
    setMsg({ id, ok: res.ok, text: res.ok ? `Confirmed — ${formatTZS(r.amount)} added to ${r.customer_name}'s wallet.` : res.reason });
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
                  <div className="mt-3 flex gap-2">
                    <Button onClick={() => confirm(r.id)} disabled={!pin}><CheckCircle2 className="w-4 h-4 mr-1" /> Confirm</Button>
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
