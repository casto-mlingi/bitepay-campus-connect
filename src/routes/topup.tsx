import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Info } from "lucide-react";
import { useStore, formatTZS } from "@/lib/store";
import { CustomerShell } from "@/components/customer-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/topup")({
  component: TopUpPage,
  head: () => ({ meta: [{ title: "Top-Up — BitePay" }, { name: "description", content: "Request a wallet top-up on BitePay." }] }),
});

const presets = [5000, 10000, 20000, 50000];

function TopUpPage() {
  const { currentUser } = useStore();
  const navigate = useNavigate();
  const [amount, setAmount] = useState<number>(10000);
  const [sent, setSent] = useState(false);

  useEffect(() => { if (!currentUser) navigate({ to: "/" }); }, [currentUser, navigate]);
  if (!currentUser) return null;

  return (
    <CustomerShell active="topup">
      <h1 className="text-2xl font-bold">Top-Up Request</h1>
      <p className="text-muted-foreground text-sm">Pay cash at the counter to load your BitePay wallet.</p>

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

        <div className="mt-4 flex items-start gap-2 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          Show this request at the cashier. They will accept cash and credit your wallet instantly.
        </div>

        {sent ? (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-success/10 text-success p-3">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-semibold">Request sent — please pay at counter.</span>
          </div>
        ) : (
          <Button onClick={() => setSent(true)} className="w-full mt-4 h-11 font-semibold">
            Send Request to Cashier
          </Button>
        )}
      </div>
    </CustomerShell>
  );
}
