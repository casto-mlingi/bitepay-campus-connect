import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Info, Clock, XCircle, Hash } from "lucide-react";
import { useStore, formatTZS } from "@/lib/store";
import { CustomerShell } from "@/components/customer-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/topup")({
  component: TopUpPage,
  head: () => ({ meta: [{ title: "Top-Up — BitePay" }, { name: "description", content: "Request a wallet top-up on BitePay." }] }),
});

const presets = [5000, 10000, 20000, 50000];

function TopUpPage() {
  const { currentUser, topUpRequests, submitTopUpRequest } = useStore();
  const navigate = useNavigate();
  const [amount, setAmount] = useState<number>(10000);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => { if (!currentUser) navigate({ to: "/" }); }, [currentUser, navigate]);

  const myRequests = useMemo(
    () => (currentUser ? topUpRequests.filter((r) => r.customer_id === currentUser.id).slice(0, 6) : []),
    [topUpRequests, currentUser],
  );

  if (!currentUser) return null;

  const submit = () => {
    setError("");
    if (amount <= 0) return setError("Enter an amount greater than 0.");
    if (!reference.trim()) return setError("Enter the Lipa Namba / payment reference from your SMS.");
    const req = submitTopUpRequest({ amount, reference, note: note.trim() || undefined });
    if (!req) return setError("Could not send request. Try again.");
    setSent(true);
    setReference("");
    setNote("");
    setTimeout(() => setSent(false), 2500);
  };

  return (
    <CustomerShell active="topup">
      <h1 className="text-2xl font-bold">Top-Up Request</h1>
      <p className="text-muted-foreground text-sm">Pay via Lipa Namba or cash, then submit your reference below. A cashier will confirm and credit your wallet.</p>

      <div className="mt-5 rounded-2xl bg-gradient-to-br from-success to-emerald-600 text-white p-5">
        <div className="text-white/85 text-sm">Current balance</div>
        <div className="text-3xl font-extrabold">{formatTZS(currentUser.wallet_balance)}</div>
      </div>

      <div className="mt-6 bg-surface border rounded-2xl p-5">
        <label className="text-sm font-semibold">Amount to top-up</label>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => setAmount(p)}
              className={`py-2.5 rounded-lg border-2 text-sm font-semibold ${amount === p ? "border-primary bg-primary/5 text-primary" : "border-border"}`}
            >
              {p / 1000}k
            </button>
          ))}
        </div>
        <div className="mt-4 flex items-center border rounded-lg px-3 py-2.5">
          <span className="text-muted-foreground text-sm mr-2">TZS</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value) || 0)}
            className="flex-1 bg-transparent outline-none font-semibold"
          />
        </div>

        <label className="block mt-4">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment reference / Confirmation code</span>
          <div className="mt-1 flex items-center border rounded-lg px-3">
            <Hash className="w-4 h-4 text-muted-foreground mr-1" />
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value.toUpperCase())}
              placeholder="e.g. QW12ABC345"
              className="border-0 focus-visible:ring-0 px-1"
            />
          </div>
        </label>

        <label className="block mt-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Note (optional)</span>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Sent via M-Pesa at 12:30" className="mt-1" />
        </label>

        <div className="mt-4 flex items-start gap-2 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          Enter the reference exactly as it appears in the payment SMS. The cashier will verify it before crediting your wallet.
        </div>

        {error && <div className="mt-3 text-sm text-destructive font-medium">{error}</div>}
        {sent && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-success/10 text-success p-3">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-semibold">Request sent — waiting for cashier confirmation.</span>
          </div>
        )}

        <Button onClick={submit} className="w-full mt-4 h-11 font-semibold">
          Submit Top-Up Request
        </Button>
      </div>

      <section className="mt-6">
        <h2 className="text-lg font-bold mb-2">My requests</h2>
        {myRequests.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No top-up requests yet.
          </div>
        ) : (
          <ul className="space-y-2">
            {myRequests.map((r) => (
              <li key={r.id} className="bg-surface border rounded-2xl p-3 flex items-center gap-3">
                <StatusIcon status={r.status} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{formatTZS(r.amount)} <span className="text-xs text-muted-foreground font-normal">· ref {r.reference}</span></div>
                  <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
                  {r.status === "rejected" && r.reject_reason && (
                    <div className="text-xs text-destructive mt-0.5">Reason: {r.reject_reason}</div>
                  )}
                </div>
                <StatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </CustomerShell>
  );
}

function StatusIcon({ status }: { status: "pending" | "approved" | "rejected" }) {
  if (status === "approved") return <CheckCircle2 className="w-5 h-5 text-success shrink-0" />;
  if (status === "rejected") return <XCircle className="w-5 h-5 text-destructive shrink-0" />;
  return <Clock className="w-5 h-5 text-amber-500 shrink-0" />;
}

function StatusBadge({ status }: { status: "pending" | "approved" | "rejected" }) {
  const map = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-700",
  } as const;
  return <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full ${map[status]}`}>{status}</span>;
}
