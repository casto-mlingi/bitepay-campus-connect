import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LipaNumbersList } from "@/components/lipa-numbers";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { registerGatewayTopup, checkGatewayTopups } from "@/lib/gateway.functions";
import { CheckCircle2, Info, Clock, XCircle, Hash, Smartphone, ReceiptText } from "lucide-react";
import { useStore, formatTZS } from "@/lib/store";
import { CustomerShell } from "@/components/customer-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MobileMoneyTopup } from "@/components/mobile-money-topup";
import { MobilePaymentsList, PayStateBadge, TopupHelp, useMyMobilePayments } from "@/components/topup-status";

export const Route = createFileRoute("/topup")({
  component: TopUpPage,
  head: () => ({ meta: [{ title: "Top-Up — BitePay" }, { name: "description", content: "Request a wallet top-up on BitePay." }, { property: "og:title", content: "Top-Up — BitePay" }, { property: "og:description", content: "Request a wallet top-up on BitePay." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
});

const presets = [5000, 10000, 20000, 50000];

function TopUpPage() {
  const { currentUser, sessionReady, topUpRequests, submitTopUpRequest, settleGatewayTopUp, requestTopUpAssist, store } = useStore();
  const registerGw = useServerFn(registerGatewayTopup);
  const checkGw = useServerFn(checkGatewayTopups);
  const [now, setNow] = useState(Date.now());
  const activeStoreId = store?.id ?? null;
  const navigate = useNavigate();
  const [amount, setAmount] = useState<number>(10000);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [method, setMethod] = useState<"mobile" | "reference">("mobile");
  const mobile = useMyMobilePayments(currentUser?.id);

  useEffect(() => { if (sessionReady && !currentUser) navigate({ to: "/" }); }, [currentUser, navigate]);

  const myRequests = useMemo(
    () => (currentUser ? topUpRequests.filter((r) => r.customer_id === currentUser.id).slice(0, 6) : []),
    [topUpRequests, currentUser],
  );

  const pendingIds = myRequests.filter((r) => r.status === "pending" && !r.assist_requested_at).map((r) => r.id).join(",");
  useEffect(() => {
    if (!pendingIds) return;
    const ids = pendingIds.split(",");
    let alive = true;
    const tick = async () => {
      const rows = await checkGw({ data: { ids } }).catch(() => []);
      if (!alive) return;
      for (const row of rows) {
        if (row.status === "paid") settleGatewayTopUp(row.id, "paid", row.paid_amount);
        else if (row.status === "failed") settleGatewayTopUp(row.id, "failed");
      }
    };
    tick();
    const t = setInterval(tick, 6000);
    const c = setInterval(() => setNow(Date.now()), 1000);
    return () => { alive = false; clearInterval(t); clearInterval(c); };
  }, [pendingIds, checkGw, settleGatewayTopUp]);

  if (!currentUser) return null;

  const submit = () => {
    setError("");
    if (amount <= 0) return setError("Enter an amount greater than 0.");
    if (!reference.trim()) return setError("Enter the Lipa Namba / payment reference from your SMS.");
    const req = submitTopUpRequest({ amount, reference, note: note.trim() || undefined });
    if (!req) return setError("Could not send request. Try again.");
    registerGw({ data: { id: req.id, store_id: req.store_id, customer_name: req.customer_name, customer_phone: req.customer_phone, amount: Math.round(req.amount), reference: req.reference } })
      .then((r) => { if (r.status === "paid") settleGatewayTopUp(req.id, "paid", r.paid_amount); else if (r.status === "blocked") { settleGatewayTopUp(req.id, "failed"); setError("Too many unconfirmed receipts. Wait 15 minutes or ask the cashier."); } })
      .catch(() => {});
    setSent(true);
    setReference("");
    setNote("");
    setTimeout(() => setSent(false), 2500);
  };

  return (
    <CustomerShell active="topup">
      <h1 className="text-2xl font-bold">Top-Up Request</h1>
      <p className="text-muted-foreground text-sm">Pay via Lipa Namba or cash, then submit your reference below. Your wallet is credited automatically when the store's payment phone receives the SMS (within 10 minutes).</p>

      <div className="mt-5 rounded-2xl bg-gradient-to-br from-success to-emerald-600 text-white p-5">
        <div className="text-white/85 text-sm">Current balance</div>
        <div className="text-3xl font-extrabold">{formatTZS(currentUser.wallet_balance)}</div>
      </div>

      <LipaNumbersList value={store?.lipa_numbers} />

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

        <div className="mt-5">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment method</span>
          <div className="mt-2 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
            <button
              type="button"
              onClick={() => setMethod("mobile")}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${method === "mobile" ? "bg-surface shadow text-primary" : "text-muted-foreground"}`}
            >
              <Smartphone className="w-4 h-4" /> Mobile money
            </button>
            <button
              type="button"
              onClick={() => setMethod("reference")}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${method === "reference" ? "bg-surface shadow text-primary" : "text-muted-foreground"}`}
            >
              <ReceiptText className="w-4 h-4" /> Lipa Namba / cash
            </button>
          </div>
        </div>

        {method === "mobile" ? (
          activeStoreId ? (
            <MobileMoneyTopup storeId={activeStoreId} amount={amount} onChange={mobile.refresh} />
          ) : (
            <div className="mt-4 rounded-lg bg-muted p-3 text-sm text-muted-foreground">Mobile money top-up is not available for this canteen yet.</div>
          )
        ) : (
          <>
            <div className="mt-5 text-sm font-semibold">Already paid? Send your reference to the cashier</div>
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
                <span className="text-sm font-semibold">Request sent — verifying with the store's payment phone.</span>
              </div>
            )}

            <Button onClick={submit} className="w-full mt-4 h-11 font-semibold">
              Submit Top-Up Request
            </Button>
          </>
        )}
      </div>

      <MobilePaymentsList {...mobile} />

      <section className="mt-6">
        <h2 className="text-lg font-bold mb-2">Lipa Namba / cash requests</h2>
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
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {r.status === "approved" ? `Payment confirmed by BitePay — receipt ${r.reference}, TZS ${r.amount.toLocaleString()} added.` : r.status === "rejected" ? "Not confirmed. No money was added." : r.assist_requested_at ? `Sent to the cashier with receipt ${r.reference} and TZS ${r.amount.toLocaleString()} — waiting for manual check.` : `Checking with the store's payment phone… ${Math.max(0, Math.ceil((r.created_at + 600000 - now) / 60000))} min left`}
                  </div>
                  {r.status === "rejected" && r.reject_reason && (
                    <div className="text-xs text-destructive mt-0.5">Reason: {r.reject_reason}</div>
                  )}
                  {(r.status === "rejected" || (r.status === "pending" && !r.assist_requested_at && now - r.created_at > 120000)) && (
                    <Button size="sm" variant="outline" className="mt-2 h-8" onClick={() => requestTopUpAssist(r.id)}>Request cashier assistance</Button>
                  )}
                </div>
                <StatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <TopupHelp rows={mobile.rows} />
    </CustomerShell>
  );
}

function StatusIcon({ status }: { status: "pending" | "approved" | "rejected" }) {
  if (status === "approved") return <CheckCircle2 className="w-5 h-5 text-success shrink-0" />;
  if (status === "rejected") return <XCircle className="w-5 h-5 text-destructive shrink-0" />;
  return <Clock className="w-5 h-5 text-warning shrink-0" />;
}

function StatusBadge({ status }: { status: "pending" | "approved" | "rejected" }) {
  return <PayStateBadge state={status === "approved" ? "success" : status === "rejected" ? "failed" : "pending"} />;
}
