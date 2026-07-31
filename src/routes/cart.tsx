import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Minus, Plus, Trash2, Wallet, AlertTriangle, CheckCircle2, ArrowLeft } from "lucide-react";
import { useStore, formatTZS, type DeliveryType } from "@/lib/store";
import { CustomerShell } from "@/components/customer-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/cart")({
  component: CartPage,
  head: () => ({ meta: [{ title: "Cart — BitePay" }, { name: "description", content: "Review your order and pay from your BitePay wallet." }] }),
});

function CartPage() {
  const { currentUser, cart, setQty, placeOrder, serviceRate } = useStore();
  const navigate = useNavigate();
  const [delivery, setDelivery] = useState<DeliveryType>("pickup");
  const [placed, setPlaced] = useState<string | null>(null);

  useEffect(() => { if (!currentUser) navigate({ to: "/" }); }, [currentUser, navigate]);
  if (!currentUser) return null;

  const subtotal = cart.reduce((s, c) => s + c.product.price * c.qty, 0);
  const tax = Math.max(0, Math.round(subtotal * (serviceRate / 100)));
  const total = subtotal + tax;
  const canPay = currentUser.wallet_balance >= total && cart.length > 0;

  if (placed) {
    return (
      <CustomerShell active="menu">
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-full bg-success/15 text-success grid place-items-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="mt-5 text-2xl font-bold">Congratulations! 🎉</h1>
          <p className="mt-1.5 text-muted-foreground text-sm max-w-xs mx-auto">
            Your order <span className="font-semibold text-foreground">{placed}</span> is complete. Please enjoy the best menu from us.
          </p>
          <div className="mt-8 flex gap-3 justify-center">
            <Button asChild variant="outline" className="rounded-xl"><Link to="/menu">Order more</Link></Button>
            <Button asChild className="rounded-xl bg-success hover:bg-success/90 text-success-foreground"><Link to="/dashboard">Get Started</Link></Button>
          </div>
        </div>
      </CustomerShell>
    );
  }

  return (
    <CustomerShell active="menu">
      <div className="flex items-center gap-2">
        <Link to="/menu" className="p-2 -ml-2 rounded-lg hover:bg-muted"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-2xl font-bold">My Cart</h1>
        {cart.length > 0 && <span className="ml-1 text-muted-foreground text-sm">({cart.length})</span>}
      </div>

      {cart.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed p-10 text-center text-muted-foreground">
          Your cart is empty. <Link to="/menu" className="text-primary font-semibold">Browse menu →</Link>
        </div>
      ) : (
        <>
          <ul className="mt-4 space-y-2">
            {cart.map((c) => (
              <li key={c.product.id} className="bg-surface border rounded-2xl p-3 flex items-center gap-3">
                {c.product.image ? (
                  <img src={c.product.image} alt={c.product.name} className="w-14 h-14 rounded-full object-cover shrink-0" />
                ) : (
                  <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${c.product.gradient} grid place-items-center text-2xl shrink-0`}>{c.product.emoji}</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{c.product.name}</div>
                  <div className="text-sm text-primary font-bold">{formatTZS(c.product.price)}</div>
                </div>
                <div className="flex items-center gap-1 bg-muted rounded-full">
                  <button onClick={() => setQty(c.product.id, c.qty - 1)} className="w-8 h-8 grid place-items-center">
                    {c.qty === 1 ? <Trash2 className="w-4 h-4 text-destructive" /> : <Minus className="w-4 h-4" />}
                  </button>
                  <span className="min-w-[1.25rem] text-center font-bold text-sm">{c.qty}</span>
                  <button onClick={() => setQty(c.product.id, c.qty + 1)} className="w-8 h-8 grid place-items-center rounded-full bg-success text-success-foreground"><Plus className="w-4 h-4" /></button>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 bg-surface border rounded-3xl p-5">
            <h3 className="font-bold mb-3">Order Summary</h3>
            <Row label="Subtotal" value={formatTZS(subtotal)} />
            {tax > 0 && <Row label={`Extra charge (${serviceRate}%)`} value={formatTZS(tax)} />}
            <div className="my-3 border-t border-dashed" />
            <Row label="Total" value={formatTZS(total)} strong />
          </div>

          <div className="mt-4 bg-surface border rounded-3xl p-5">
            <h3 className="font-bold mb-3">Delivery</h3>
            <div className="grid grid-cols-2 gap-2">
              {(["pickup", "delivery"] as DeliveryType[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDelivery(d)}
                  className={`py-3 rounded-xl text-sm font-semibold capitalize border-2 transition ${
                    delivery === d ? "border-primary bg-primary/5 text-primary" : "border-border"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 bg-surface border rounded-3xl p-5">
            <h3 className="font-bold mb-3">Payment</h3>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground flex items-center gap-1.5"><Wallet className="w-4 h-4" /> Wallet Balance</span>
              <span className="font-semibold text-success">{formatTZS(currentUser.wallet_balance)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Order Total</span>
              <span className="font-semibold">{formatTZS(total)}</span>
            </div>

            {!canPay && (
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-primary/10 text-primary p-3">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <div className="font-semibold">Low Balance</div>
                  <div>You need {formatTZS(total - currentUser.wallet_balance)} more. <Link to="/topup" className="underline font-medium">Top-up now</Link>.</div>
                </div>
              </div>
            )}

            <Button
              disabled={!canPay}
              onClick={() => { const o = placeOrder(delivery); if (o) setPlaced(o.id); }}
              className="w-full mt-4 h-12 rounded-xl text-base font-bold bg-success hover:bg-success/90 text-success-foreground disabled:opacity-50"
            >
              Place Order
            </Button>
          </div>
        </>
      )}
    </CustomerShell>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${strong ? "text-base font-bold" : "text-sm"}`}>
      <span className={strong ? "" : "text-muted-foreground"}>{label}</span>
      <span className={strong ? "text-primary" : ""}>{value}</span>
    </div>
  );
}
