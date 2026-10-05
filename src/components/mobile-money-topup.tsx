import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Smartphone, Loader2, CheckCircle2 } from "lucide-react";
import { getSelcomStatus, startSelcomTopup, checkSelcomTopup, claimSelcomTopup, SELCOM_NETWORKS, type SelcomNetwork } from "@/lib/selcom.functions";
import { useStore, formatTZS } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MobileMoneyTopup({ storeId, amount }: { storeId: string; amount: number }) {
  const { currentUser, creditMobileTopUp } = useStore();
  const status = useServerFn(getSelcomStatus);
  const start = useServerFn(startSelcomTopup);
  const check = useServerFn(checkSelcomTopup);
  const claim = useServerFn(claimSelcomTopup);
  const [enabled, setEnabled] = useState(false);
  const [fee, setFee] = useState<{ percent: number; flat: number }>({ percent: 0, flat: 0 });
  const [network, setNetwork] = useState<SelcomNetwork>("mpesa");
  const [phone, setPhone] = useState(currentUser?.phone ?? "");
  const [stage, setStage] = useState<"idle" | "waiting" | "done">("idle");
  const [msg, setMsg] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { status({ data: { store_id: storeId } }).then((s) => { setEnabled(s.configured); if (s.configured) setFee({ percent: s.fee_percent ?? 0, flat: s.fee_flat ?? 0 }); }).catch(() => setEnabled(false)); }, [storeId, status]);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  if (!enabled || !currentUser) return null;

  const feeAmount = Math.round((amount * fee.percent) / 100 + fee.flat);
  const total = amount + feeAmount;

  const pay = async () => {
    setMsg("");
    if (amount < 500) return setMsg("Minimum mobile top-up is TZS 500.");
    setStage("waiting");
    try {
      const r = await start({ data: { store_id: storeId, customer_id: currentUser.id, customer_name: currentUser.full_name, amount: Math.round(amount), network, phone, origin: window.location.origin } });
      if (!r.ok) { setStage("idle"); return setMsg(r.reason); }
      let tries = 0;
      timer.current = setInterval(async () => {
        tries++;
        const s = await check({ data: { order_id: r.order_id } }).catch(() => ({ status: "PENDING" }));
        if (s.status === "COMPLETED") {
          clearInterval(timer.current!);
          const c = await claim({ data: { order_id: r.order_id, customer_id: currentUser.id } });
          if (c.ok) creditMobileTopUp({ order_id: r.order_id, amount: c.amount, network: SELCOM_NETWORKS[network].label });
          setStage("done");
          setTimeout(() => setStage("idle"), 4000);
        } else if (["FAILED", "CANCELLED", "REJECTED"].includes(s.status) || tries > 40) {
          clearInterval(timer.current!);
          setStage("idle");
          setMsg(tries > 40 ? "We did not get a confirmation in time. If money left your phone, tell the cashier." : "The payment was cancelled or failed.");
        }
      }, 5000);
    } catch { setStage("idle"); setMsg("Could not reach the payment service. Try again."); }
  };

  return (
    <div className="mt-6 bg-surface border rounded-2xl p-5">
      <div className="flex items-center gap-2 font-semibold"><Smartphone className="w-5 h-5 text-primary" /> Pay now with mobile money</div>
      <p className="text-xs text-muted-foreground mt-1">Instant — no cashier needed. You'll get a prompt on your phone to enter your PIN.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {(Object.keys(SELCOM_NETWORKS) as SelcomNetwork[]).map((k) => (
          <button key={k} type="button" onClick={() => setNetwork(k)}
            className={`py-2.5 px-2 rounded-lg border-2 text-sm font-semibold ${network === k ? "border-primary bg-primary/5 text-primary" : "border-border"}`}>
            {SELCOM_NETWORKS[k].label}
          </button>
        ))}
      </div>
      <Input className="mt-3" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number, e.g. 0712 345 678" inputMode="tel" />
      {feeAmount > 0 && (
        <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm space-y-1">
          <div className="flex justify-between text-muted-foreground"><span>Wallet top-up</span><span>{formatTZS(amount)}</span></div>
          <div className="flex justify-between text-muted-foreground"><span>Transaction fee{fee.percent > 0 ? ` (${fee.percent}%)` : ""}</span><span>{formatTZS(feeAmount)}</span></div>
          <div className="flex justify-between font-bold border-t pt-1"><span>You pay</span><span>{formatTZS(total)}</span></div>
        </div>
      )}
      {msg && <div className="mt-3 text-sm text-destructive font-medium">{msg}</div>}
      {stage === "done" && <div className="mt-3 flex items-center gap-2 rounded-lg bg-success/10 text-success p-3 text-sm font-semibold"><CheckCircle2 className="w-5 h-5" /> Paid — your wallet has been topped up.</div>}
      <Button onClick={pay} disabled={stage === "waiting"} className="w-full mt-4 h-11 font-semibold">
        {stage === "waiting" ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Check your phone and enter your PIN…</> : `Pay ${formatTZS(total)}`}
      </Button>
    </div>
  );
}
