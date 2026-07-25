import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, User, Wallet, Plus, Minus, Trash2, Printer, ArrowUpCircle, CheckCircle2, X, Banknote, Download, Receipt } from "lucide-react";
import { useStore, formatTZS, type Product, type Profile, type Order } from "@/lib/store";
import { StaffShell } from "@/components/staff-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { downloadReceipt, printReceipt, type ReceiptExtras } from "@/lib/receipt";

export const Route = createFileRoute("/pos")({
  component: POS,
  head: () => ({ meta: [{ title: "Walk-in POS — BitePay Staff" }, { name: "description", content: "Point of sale for wallet or cash customers with printable receipts." }] }),
});

type Line = { product: Product; qty: number };
type Mode = "wallet" | "cash";

function POS() {
  const { currentUser, products, findCustomer, posSale, posCashSale, topUp, profiles } = useStore();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("wallet");
  const [query, setQuery] = useState("");
  const [customer, setCustomer] = useState<Profile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [category, setCategory] = useState<string>("All");
  const [topupAmt, setTopupAmt] = useState<number>(10000);
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [cashName, setCashName] = useState<string>("");
  const [toast, setToast] = useState<string>("");
  const [lastReceipt, setLastReceipt] = useState<{ order: Order; extras: ReceiptExtras } | null>(null);

  useEffect(() => {
    if (!currentUser) navigate({ to: "/" });
    else if (currentUser.role !== "staff") navigate({ to: "/dashboard" });
  }, [currentUser, navigate]);

  const freshCustomer = customer ? profiles.find((p) => p.id === customer.id) ?? null : null;

  const categories = useMemo(() => ["All", ...Array.from(new Set(products.map((p) => p.category)))], [products]);
  const filtered = category === "All" ? products : products.filter((p) => p.category === category);
  const total = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
  const change = Math.max(0, cashReceived - total);

  const addLine = (p: Product) => {
    setLines((prev) => {
      const f = prev.find((l) => l.product.id === p.id);
      return f ? prev.map((l) => l.product.id === p.id ? { ...l, qty: l.qty + 1 } : l) : [...prev, { product: p, qty: 1 }];
    });
  };
  const setLineQty = (id: string, qty: number) => setLines((prev) => qty <= 0 ? prev.filter((l) => l.product.id !== id) : prev.map((l) => l.product.id === id ? { ...l, qty } : l));

  const doSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const c = findCustomer(query);
    setCustomer(c);
    setNotFound(!c);
  };

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2200); };

  const walletShort = freshCustomer ? Math.max(0, total - freshCustomer.wallet_balance) : 0;
  const [splitCash, setSplitCash] = useState<number>(0);
  useEffect(() => { setSplitCash(walletShort); }, [walletShort]);

  const doWalletSale = () => {
    if (!freshCustomer) return;
    const items = lines.map((l) => ({ product_id: l.product.id, name: l.product.name, price: l.product.price, qty: l.qty }));
    const cashPortion = walletShort > 0 ? Math.max(splitCash, walletShort) : 0;
    const o = posSale(freshCustomer.id, items, cashPortion);
    if (!o) { showToast("Insufficient wallet balance"); return; }
    const extras: ReceiptExtras = { paymentMode: cashPortion > 0 ? "cash" : "wallet", cashierName: currentUser?.full_name, cashReceived: cashPortion || undefined, change: 0 };
    setLastReceipt({ order: o, extras });
    printReceipt(o, extras);
    setLines([]);
    setSplitCash(0);
    showToast(`Sale ${o.receipt_no ?? o.id} — receipt printed`);
  };

  const doCashSale = () => {
    if (lines.length === 0) return;
    const items = lines.map((l) => ({ product_id: l.product.id, name: l.product.name, price: l.product.price, qty: l.qty }));
    const o = posCashSale(items, cashReceived, cashName.trim() || "Walk-in Cash");
    if (!o) { showToast("Cash received is less than total"); return; }
    const extras: ReceiptExtras = { paymentMode: "cash", cashReceived, change, cashierName: currentUser?.full_name };
    setLastReceipt({ order: o, extras });
    printReceipt(o, extras);
    setLines([]);
    setCashReceived(0);
    setCashName("");
    showToast(`Cash sale ${o.id} — change ${formatTZS(extras.change ?? 0)}`);
  };

  const doTopUp = () => {
    if (!freshCustomer || topupAmt <= 0) return;
    topUp(freshCustomer.id, topupAmt);
    showToast(`Topped up ${formatTZS(topupAmt)} to ${freshCustomer.full_name}`);
  };

  if (!currentUser || currentUser.role !== "staff") return null;

  const canWallet = !!freshCustomer && lines.length > 0 && total > 0 && (freshCustomer.wallet_balance + splitCash >= total);
  const canCash = lines.length > 0 && cashReceived >= total && total > 0;

  return (
    <StaffShell active="pos">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
        <section>
          <h1 className="text-2xl font-bold">Walk-in POS</h1>
          <p className="text-muted-foreground text-sm">Tap products to add to receipt</p>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {categories.map((c) => (
              <button key={c} onClick={() => setCategory(c)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border ${category === c ? "bg-foreground text-background border-foreground" : "bg-surface border-border"}`}>{c}</button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map((p) => (
              <button key={p.id} onClick={() => addLine(p)}
                className="bg-surface border rounded-xl p-3 text-left hover:border-primary hover:shadow-sm transition active:scale-[0.98]">
                <div className={`h-20 rounded-lg bg-gradient-to-br ${p.gradient} grid place-items-center text-4xl mb-2`}>{p.emoji}</div>
                <div className="font-semibold text-sm leading-tight">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.category}</div>
                <div className="mt-1 font-bold text-primary text-sm">{formatTZS(p.price)}</div>
              </button>
            ))}
          </div>
        </section>

        <aside className="bg-surface border rounded-2xl p-5 h-fit lg:sticky lg:top-24">
          <h2 className="font-bold text-lg">Current Receipt</h2>

          {/* Sale mode toggle */}
          <div className="mt-3 grid grid-cols-2 gap-1.5 p-1 bg-muted rounded-xl">
            <button onClick={() => setMode("wallet")}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition ${mode === "wallet" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>
              <Wallet className="w-4 h-4" /> Wallet Customer
            </button>
            <button onClick={() => setMode("cash")}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition ${mode === "cash" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>
              <Banknote className="w-4 h-4" /> Cash Customer
            </button>
          </div>

          {mode === "wallet" ? (
            <>
              <form onSubmit={doSearch} className="mt-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={query} onChange={(e) => { setQuery(e.target.value); setNotFound(false); }}
                    placeholder="Search customer by phone or ID" className="pl-9" />
                </div>
                <div className="text-xs text-muted-foreground mt-1">Try <button type="button" className="underline" onClick={() => { setQuery("0712345678"); }}>0712345678</button></div>
              </form>

              {notFound && <div className="mt-3 text-sm text-destructive">No customer found.</div>}

              {freshCustomer && (
                <>
                  <div className="mt-3 rounded-xl border p-3 flex items-center gap-3 bg-muted/40">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary grid place-items-center"><User className="w-5 h-5" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{freshCustomer.full_name}</div>
                      <div className="text-xs text-muted-foreground">{freshCustomer.phone}</div>
                    </div>
                    <button onClick={() => { setCustomer(null); setQuery(""); }} className="p-1 hover:bg-background rounded"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="mt-3 rounded-xl bg-success/10 text-success p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium"><Wallet className="w-4 h-4" /> Wallet</div>
                    <div className="font-bold">{formatTZS(freshCustomer.wallet_balance)}</div>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="mt-3 space-y-2">
              <label className="block">
                <span className="text-xs text-muted-foreground">Customer Name (optional)</span>
                <Input value={cashName} onChange={(e) => setCashName(e.target.value)} placeholder="Walk-in Cash" className="mt-1" />
              </label>
            </div>
          )}

          <div className="mt-4 border-t pt-3">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Items</div>
            {lines.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">Tap products on the left</div>
            ) : (
              <ul className="space-y-1.5 max-h-56 overflow-y-auto">
                {lines.map((l) => (
                  <li key={l.product.id} className="flex items-center gap-2 text-sm">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{l.product.name}</div>
                      <div className="text-xs text-muted-foreground">{formatTZS(l.product.price)}</div>
                    </div>
                    <div className="flex items-center gap-1 bg-muted rounded-md">
                      <button onClick={() => setLineQty(l.product.id, l.qty - 1)} className="w-7 h-7 grid place-items-center">
                        {l.qty === 1 ? <Trash2 className="w-3.5 h-3.5 text-destructive" /> : <Minus className="w-3.5 h-3.5" />}
                      </button>
                      <span className="w-5 text-center font-semibold text-xs">{l.qty}</span>
                      <button onClick={() => setLineQty(l.product.id, l.qty + 1)} className="w-7 h-7 grid place-items-center"><Plus className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="w-16 text-right font-semibold text-sm">{formatTZS(l.product.price * l.qty)}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-4 border-t pt-3 flex items-center justify-between text-lg font-bold">
            <span>Total</span><span>{formatTZS(total)}</span>
          </div>

          {mode === "cash" && (
            <div className="mt-3 space-y-2">
              <label className="block">
                <span className="text-xs text-muted-foreground">Cash Received (TZS)</span>
                <Input type="number" value={cashReceived || ""} onChange={(e) => setCashReceived(Number(e.target.value) || 0)}
                  placeholder="0" className="mt-1 font-semibold" />
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[total, 5000, 10000, 20000, 50000].filter((v, i, a) => v > 0 && a.indexOf(v) === i).map((v) => (
                  <button key={v} onClick={() => setCashReceived(v)}
                    className="px-2.5 py-1 rounded-md bg-muted text-xs font-semibold hover:bg-muted/70">
                    {formatTZS(v)}
                  </button>
                ))}
              </div>
              <div className={`flex items-center justify-between text-sm rounded-lg p-2.5 ${change >= 0 && cashReceived >= total && total > 0 ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                <span className="font-medium">Change</span>
                <span className="font-bold">{formatTZS(change)}</span>
              </div>
            </div>
          )}

          {mode === "wallet" ? (
            <Button disabled={!canWallet} onClick={doWalletSale}
              className="w-full mt-3 h-11 font-bold bg-success hover:bg-success/90 text-success-foreground disabled:opacity-50">
              <Printer className="w-4 h-4 mr-2" /> Deduct Balance & Print
            </Button>
          ) : (
            <Button disabled={!canCash} onClick={doCashSale}
              className="w-full mt-3 h-11 font-bold bg-success hover:bg-success/90 text-success-foreground disabled:opacity-50">
              <Printer className="w-4 h-4 mr-2" /> Collect Cash & Print
            </Button>
          )}

          {lastReceipt && (
            <div className="mt-4 rounded-xl border bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Receipt className="w-4 h-4 text-primary" /> Last receipt: {lastReceipt.order.id}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {lastReceipt.order.customer_name} · {formatTZS(lastReceipt.order.total_amount)}
              </div>
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="outline" onClick={() => printReceipt(lastReceipt.order, lastReceipt.extras)}>
                  <Printer className="w-3.5 h-3.5 mr-1" /> Reprint
                </Button>
                <Button size="sm" variant="outline" onClick={() => downloadReceipt(lastReceipt.order, lastReceipt.extras)}>
                  <Download className="w-3.5 h-3.5 mr-1" /> Download
                </Button>
              </div>
            </div>
          )}

          {mode === "wallet" && (
            <div className="mt-5 border-t pt-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Accept Cash Top-Up</div>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center border rounded-lg px-3">
                  <span className="text-xs text-muted-foreground mr-2">TZS</span>
                  <input type="number" value={topupAmt} onChange={(e) => setTopupAmt(Number(e.target.value) || 0)}
                    className="flex-1 py-2 bg-transparent outline-none font-semibold text-sm" />
                </div>
                <Button disabled={!freshCustomer || topupAmt <= 0} onClick={doTopUp} variant="outline" className="whitespace-nowrap">
                  <ArrowUpCircle className="w-4 h-4 mr-1.5" /> Top-Up
                </Button>
              </div>
            </div>
          )}
        </aside>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-sm font-medium">
          <CheckCircle2 className="w-4 h-4 text-success" /> {toast}
        </div>
      )}
    </StaffShell>
  );
}
