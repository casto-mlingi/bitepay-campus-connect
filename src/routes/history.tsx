import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Lock } from "lucide-react";
import { useStore, formatTZS } from "@/lib/store";
import { CustomerShell } from "@/components/customer-shell";
import { WalletPinDialog } from "@/components/wallet-pin-dialog";

export const Route = createFileRoute("/history")({
  component: HistoryPage,
  head: () => ({ meta: [{ title: "Transactions — BitePay" }, { name: "description", content: "Your BitePay wallet transaction history." }] }),
});

function HistoryPage() {
  const { currentUser, transactions, verifyWalletPin } = useStore();
  const navigate = useNavigate();
  const [unlocked, setUnlocked] = useState(false);
  const [asking, setAsking] = useState(false);
  useEffect(() => { if (!currentUser) navigate({ to: "/" }); }, [currentUser, navigate]);
  if (!currentUser) return null;

  const locked = Boolean(currentUser.wallet_pin) && !unlocked;
  if (locked) {
    return (
      <CustomerShell active="history">
        <h1 className="text-2xl font-bold">Transaction History</h1>
        <p className="text-muted-foreground text-sm">Protected by your wallet PIN</p>
        <div className="mt-8 rounded-3xl border border-dashed p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary grid place-items-center mx-auto"><Lock className="w-6 h-6" /></div>
          <p className="mt-4 text-sm text-muted-foreground">Enter your wallet PIN to view your top-ups and deductions.</p>
          <button onClick={() => setAsking(true)} className="mt-4 h-11 px-6 rounded-xl bg-primary text-primary-foreground font-semibold text-sm">Unlock records</button>
        </div>
        {asking && (
          <WalletPinDialog
            title="Unlock wallet records"
            subtitle="Enter your 4–6 digit wallet PIN."
            onCancel={() => setAsking(false)}
            onVerify={(pin) => {
              if (!verifyWalletPin(currentUser.id, pin)) return "Incorrect PIN";
              setAsking(false); setUnlocked(true); return true;
            }}
          />
        )}
      </CustomerShell>
    );
  }

  const mine = transactions.filter((t) => t.customer_id === currentUser.id);

  return (
    <CustomerShell active="history">
      <h1 className="text-2xl font-bold">Transaction History</h1>
      <p className="text-muted-foreground text-sm">All top-ups and deductions on your wallet</p>

      <div className="mt-5 bg-surface border rounded-2xl divide-y">
        {mine.length === 0 && <div className="p-8 text-center text-muted-foreground text-sm">No transactions yet.</div>}
        {mine.map((t) => {
          const credit = t.type === "topup";
          return (
            <div key={t.id} className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full grid place-items-center ${credit ? "bg-success/15 text-success" : "bg-primary/10 text-primary"}`}>
                {credit ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{t.description}</div>
                <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</div>
              </div>
              <div className={`font-bold ${credit ? "text-success" : "text-foreground"}`}>
                {credit ? "+" : "−"}{formatTZS(t.amount)}
              </div>
            </div>
          );
        })}
      </div>
    </CustomerShell>
  );
}
