import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, User, Wallet, Plus, Minus, Trash2, Printer, ArrowUpCircle, CheckCircle2, X, Banknote, Download, Receipt, QrCode, Smartphone, RotateCcw, MessageSquare, WifiOff, CloudUpload, ClipboardCheck } from "lucide-react";
import { useStore, formatTZS, type Product, type Profile, type Order } from "@/lib/store";
import { StaffShell } from "@/components/staff-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { downloadReceipt, printReceipt, type ReceiptExtras } from "@/lib/receipt";
import { QRScannerModal } from "@/components/qr-scanner-modal";
import { WalletPinDialog } from "@/components/wallet-pin-dialog";

export const Route = createFileRoute("/pos")({
  component: POS,
  head: () => ({ meta: [{ title: "Walk-in POS — BitePay Staff" }, { name: "description", content: "Point of sale with wallet, cash and mobile money (Lipa Namba), receipts, refunds and offline queue." }] }),
});

type Line = { product: Product; qty: number };
type Mode = "wallet" | "cash";
type Tender = "cash" | "mobile";

function POS() {
  const { currentUser, products, profiles, findCustomer, posSale, posCashSale, topUp, reverseSale, sendReceiptMessage,
    availablePlates, activeShift, isOnline, pendingSales, enqueueSale, syncOutbox, hasStaffRole, verifyWalletPin } = useStore();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("wallet");
  const [query, setQuery] = useState("");
  const [customer, setCustomer] = useState<Profile | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [pinCustomer, setPinCustomer] = useState<Profile | null>(null); // awaiting wallet-PIN unlock
  const [walletUnlocked, setWalletUnlocked] = useState<string[]>([]); // customer ids unlocked this session
  const [lines, setLines] = useState<Line[]>([]);
  const [category, setCategory] = useState<string>("All");
  const [topupAmt, setTopupAmt] = useState<number>(10000);
  const [topupTender, setTopupTender] = useState<Tender>("cash");
  const [topupRef, setTopupRef] = useState<string>("");
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [cashName, setCashName] = useState<string>("");
  const [tender, setTender] = useState<Tender>("cash");
  const [mobileRef, setMobileRef] = useState<string>("");
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
  const change = tender === "mobile" ? 0 : Math.max(0, cashReceived - total);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || freshCustomer) return [] as Profile[];
    return profiles
      .filter((p) => p.role === "customer" && (p.full_name.toLowerCase().includes(q) || p.phone.includes(q) || p.id.toLowerCase().includes(q)))
      .slice(0, 6);
  }, [query, profiles, freshCustomer]);

  const addLine = (p: Product) => {
    const plates = availablePlates(p.id);
    if (plates !== null && plates <= 0) { showToast(`${p.name} is out of stock`); return; }
    setLines((prev) => {
      const f = prev.find((l) => l.product.id === p.id);
      return f ? prev.map((l) => l.product.id === p.id ? { ...l, qty: l.qty + 1 } : l) : [...prev, { product: p, qty: 1 }];
    });
  };
  const setLineQty = (id: string, qty: number) => setLines((prev) => qty <= 0 ? prev.filter((l) => l.product.id !== id) : prev.map((l) => l.product.id === id ? { ...l, qty } : l));

  const pickCustomer = (c: Profile) => {
    setQuery("");
    if (c.wallet_pin && !walletUnlocked.includes(c.id)) { setPinCustomer(c); return; }
    setCustomer(c);
  };

  const onScan = (text: string) => {
    setShowScanner(false);
    const c = findCustomer(text) ?? profiles.find((p) => p.role === "customer" && p.id === text) ?? null;
    if (c) { pickCustomer(c); showToast(`Loaded ${c.full_name}`); }
    else showToast("QR did not match a customer");
  };

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2500); };

  const walletShort = freshCustomer ? Math.max(0, total - freshCustomer.wallet_balance) : 0;
  const [splitCash, setSplitCash] = useState<number>(0);
  useEffect(() => { setSplitCash(walletShort); }, [walletShort]);

  const requireShift = () => {
    if (!activeShift) { showToast("Open a shift first"); return false; }
    return true;
  };

  const doWalletSale = () => {
    if (!freshCustomer) return;
    if (!requireShift()) return;
    const items = lines.map((l) => ({ product_id: l.product.id, name: l.product.name, price: l.product.price, qty: l.qty }));
    const cashPortion = walletShort > 0 ? Math.max(splitCash, walletShort) : 0;
    if (!isOnline) {
      enqueueSale({ kind: "wallet", customer_id: freshCustomer.id, customer_name: freshCustomer.full_name, items, cash_portion: cashPortion, tender, reference: mobileRef });
      showToast("Offline — sale queued to outbox");
      setLines([]); setSplitCash(0); setMobileRef("");
      return;
    }
    const res = posSale({ customerId: freshCustomer.id, items, cashPortion, tender, reference: mobileRef });
    if (!res.ok) { showToast(res.reason); return; }
    const extras: ReceiptExtras = { paymentMode: cashPortion > 0 ? "cash" : "wallet", cashierName: currentUser?.full_name, cashReceived: cashPortion || undefined, change: 0 };
    setLastReceipt({ order: res.order, extras });
    printReceipt(res.order, extras);
    setLines([]); setSplitCash(0); setMobileRef("");
    showToast(`Sale ${res.order.receipt_no ?? res.order.id} — receipt printed`);
  };

  const doCashSale = () => {
    if (lines.length === 0) return;
    if (!requireShift()) return;
    const effectiveReceived = tender === "mobile" ? total : cashReceived;
    const items = lines.map((l) => ({ product_id: l.product.id, name: l.product.name, price: l.product.price, qty: l.qty }));
    if (!isOnline) {
      enqueueSale({ kind: "cash", customer_name: cashName.trim() || "Walk-in", items, cash_received: effectiveReceived, tender, reference: mobileRef });
      showToast("Offline — sale queued to outbox");
      setLines([]); setCashReceived(0); setCashName(""); setMobileRef("");
      return;
    }
    const res = posCashSale({ items, cashReceived: effectiveReceived, customerName: cashName.trim() || (tender === "mobile" ? "Mobile Money" : "Walk-in Cash"), tender, reference: mobileRef });
    if (!res.ok) { showToast(res.reason); return; }
    const extras: ReceiptExtras = { paymentMode: "cash", cashReceived: effectiveReceived, change, cashierName: currentUser?.full_name };
    setLastReceipt({ order: res.order, extras });
    printReceipt(res.order, extras);
    setLines([]); setCashReceived(0); setCashName(""); setMobileRef("");
    showToast(`${tender === "mobile" ? "Mobile" : "Cash"} sale ${res.order.receipt_no ?? res.order.id}`);
  };

  const doTopUp = () => {
    if (!freshCustomer || topupAmt <= 0) return;
    if (topupTender === "mobile" && !topupRef.trim()) { showToast("Mobile reference required"); return; }
    topUp(freshCustomer.id, topupAmt, topupTender === "mobile" ? "Mobile money top-up" : "Cash top-up at counter", topupTender, topupRef);
    showToast(`Topped up ${formatTZS(topupAmt)} to ${freshCustomer.full_name}`);
    setTopupRef("");
  };

  const doRefund = () => {
    if (!lastReceipt) return;
    const reason = window.prompt("Reason for refund/reversal?", "Customer refund") ?? "";
    if (!reason) return;
    const res = reverseSale(lastReceipt.order.id, reason);
    if (!res.ok) { showToast(res.reason); return; }
    printReceipt(res.order, { paymentMode: lastReceipt.extras.paymentMode, cashierName: currentUser?.full_name });
    setLastReceipt({ order: res.order, extras: { paymentMode: lastReceipt.extras.paymentMode, cashierName: currentUser?.full_name } });
    showToast(`Credit note ${res.order.receipt_no ?? res.order.id} issued`);
  };

  const doSendReceipt = (channel: "sms" | "whatsapp") => {
    if (!lastReceipt) return;
    const log = sendReceiptMessage(lastReceipt.order, channel);
    if (!log) { showToast("No phone on file for this customer"); return; }
    showToast(`${channel === "sms" ? "SMS" : "WhatsApp"} receipt sent to ${log.to_phone}`);
  };

  const doSync = () => {
    const r = syncOutbox();
    showToast(`Synced ${r.synced} sale${r.synced === 1 ? "" : "s"}${r.failed ? ` · ${r.failed} failed` : ""}`);
  };

  if (!currentUser || currentUser.role !== "staff") return null;

  const canWallet = !!freshCustomer && lines.length > 0 && total > 0 && (freshCustomer.wallet_balance + splitCash >= total);
  const canCash = lines.length > 0 && total > 0 && (tender === "mobile" ? mobileRef.trim().length > 0 : cashReceived >= total);

  return (
    <StaffShell active="pos">
      {!activeShift && (
        <div className="mb-4 rounded-2xl border border-amber-400/60 bg-amber-50 p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-amber-800">
            <ClipboardCheck className="w-4 h-4" />
            <span>No shift is open. Sales are disabled until you open one.</span>
          </div>
          <Link to="/shift" className="text-sm font-bold text-amber-900 underline">Open shift →</Link>
        </div>
      )}
      {!isOnline && (
        <div className="mb-4 rounded-2xl border border-red-300 bg-red-50 p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <WifiOff className="w-4 h-4" /> You're offline — sales go to the outbox ({pendingSales.length} queued).
          </div>
        </div>
      )}
      {isOnline && pendingSales.length > 0 && (
        <div className="mb-4 rounded-2xl border border-primary/40 bg-primary/5 p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-primary">
            <CloudUpload className="w-4 h-4" /> {pendingSales.length} queued sale{pendingSales.length === 1 ? "" : "s"} ready to sync.
          </div>
          <Button size="sm" onClick={doSync}>Sync now</Button>
        </div>
      )}

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
            {filtered.map((p) => {
              const plates = availablePlates(p.id);
              const soldOut = plates !== null && plates <= 0;
              return (
                <button key={p.id} onClick={() => addLine(p)} disabled={soldOut}
                  className={`bg-surface border rounded-xl p-3 text-left hover:border-primary hover:shadow-sm transition active:scale-[0.98] ${soldOut ? "opacity-40 grayscale cursor-not-allowed" : ""}`}>
                  {p.image ? (
                    <img src={p.image} alt={p.name} className="h-20 w-full object-cover rounded-lg mb-2" />
                  ) : (
                    <div className={`h-20 rounded-lg bg-gradient-to-br ${p.gradient} grid place-items-center text-4xl mb-2`}>{p.emoji}</div>
                  )}
                  <div className="font-semibold text-sm leading-tight">{p.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center justify-between">
                    <span>{p.category}</span>
                    {plates !== null && <span className={`font-semibold ${soldOut ? "text-red-500" : "text-emerald-600"}`}>{plates} left</span>}
                  </div>
                  <div className="mt-1 font-bold text-primary text-sm">{formatTZS(p.price)}</div>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="bg-surface border rounded-2xl p-5 h-fit lg:sticky lg:top-24">
          <h2 className="font-bold text-lg">Current Receipt</h2>

          <div className="mt-3 grid grid-cols-2 gap-1.5 p-1 bg-muted rounded-xl">
            <button onClick={() => setMode("wallet")}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition ${mode === "wallet" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>
              <Wallet className="w-4 h-4" /> Wallet Customer
            </button>
            <button onClick={() => setMode("cash")}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition ${mode === "cash" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>
              <Banknote className="w-4 h-4" /> Walk-in
            </button>
          </div>

          {mode === "wallet" ? (
            <>
              <div className="mt-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, phone or ID" className="pl-9" />
                  </div>
                  <Button type="button" variant="outline" onClick={() => setShowScanner(true)} title="Scan QR ID">
                    <QrCode className="w-4 h-4" />
                  </Button>
                </div>
                {suggestions.length > 0 && (
                  <ul className="mt-2 border rounded-xl overflow-hidden bg-background shadow-sm max-h-64 overflow-y-auto">
                    {suggestions.map((s) => (
                      <li key={s.id}>
                        <button onClick={() => pickCustomer(s)} className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary grid place-items-center text-xs font-bold">
                            {s.full_name.split(" ").map((x) => x[0]).slice(0, 2).join("")}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm leading-tight truncate">{s.full_name}</div>
                            <div className="text-xs text-muted-foreground">{s.phone}</div>
                          </div>
                          <div className="text-xs font-bold text-success">{formatTZS(s.wallet_balance)}</div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

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
                  {walletShort > 0 && lines.length > 0 && (
                    <div className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
                      <div className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                        <Banknote className="w-3.5 h-3.5" /> Split payment — wallet short by {formatTZS(walletShort)}
                      </div>
                      <label className="block">
                        <span className="text-xs text-muted-foreground">Extra pay for this sale (TZS)</span>
                        <Input type="number" value={splitCash || ""} onChange={(e) => setSplitCash(Number(e.target.value) || 0)} className="mt-1 font-semibold bg-background" />
                      </label>
                      <TenderPicker tender={tender} onChange={setTender} />
                      {tender === "mobile" && (
                        <Input value={mobileRef} onChange={(e) => setMobileRef(e.target.value)} placeholder="Lipa Namba / confirmation code" className="bg-background" />
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <div className="mt-3 space-y-2">
              <label className="block">
                <span className="text-xs text-muted-foreground">Customer Name (optional)</span>
                <Input value={cashName} onChange={(e) => setCashName(e.target.value)} placeholder={tender === "mobile" ? "Mobile Money" : "Walk-in Cash"} className="mt-1" />
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
            <div className="mt-3 space-y-2.5">
              <TenderPicker tender={tender} onChange={setTender} />
              {tender === "cash" ? (
                <>
                  <label className="block">
                    <span className="text-xs text-muted-foreground">Cash Received (TZS)</span>
                    <Input type="number" value={cashReceived || ""} onChange={(e) => setCashReceived(Number(e.target.value) || 0)} placeholder="0" className="mt-1 font-semibold" />
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[total, 5000, 10000, 20000, 50000].filter((v, i, a) => v > 0 && a.indexOf(v) === i).map((v) => (
                      <button key={v} onClick={() => setCashReceived(v)} className="px-2.5 py-1 rounded-md bg-muted text-xs font-semibold hover:bg-muted/70">
                        {formatTZS(v)}
                      </button>
                    ))}
                  </div>
                  <div className={`flex items-center justify-between text-sm rounded-lg p-2.5 ${change >= 0 && cashReceived >= total && total > 0 ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                    <span className="font-medium">Change</span>
                    <span className="font-bold">{formatTZS(change)}</span>
                  </div>
                </>
              ) : (
                <>
                  <label className="block">
                    <span className="text-xs text-muted-foreground">Lipa Namba / confirmation code</span>
                    <Input value={mobileRef} onChange={(e) => setMobileRef(e.target.value)} placeholder="e.g. CFT8H9K12L" className="mt-1 font-mono" />
                  </label>
                  <div className="rounded-lg bg-primary/5 text-primary p-2.5 text-xs">
                    Charge <span className="font-bold">{formatTZS(total)}</span> via mobile money (Lipa Namba). Amount will be credited to the Bank account.
                  </div>
                </>
              )}
            </div>
          )}

          {mode === "wallet" ? (
            <Button disabled={!canWallet || !activeShift} onClick={doWalletSale} className="w-full mt-3 h-11 font-bold bg-success hover:bg-success/90 text-success-foreground disabled:opacity-50">
              <Printer className="w-4 h-4 mr-2" /> Deduct Balance & Print
            </Button>
          ) : (
            <Button disabled={!canCash || !activeShift} onClick={doCashSale} className="w-full mt-3 h-11 font-bold bg-success hover:bg-success/90 text-success-foreground disabled:opacity-50">
              <Printer className="w-4 h-4 mr-2" />
              {tender === "mobile" ? "Confirm Mobile Payment & Print" : "Collect Cash & Print"}
            </Button>
          )}

          {lastReceipt && (
            <div className="mt-4 rounded-xl border bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Receipt className="w-4 h-4 text-primary" /> Last receipt: {lastReceipt.order.receipt_no ?? lastReceipt.order.id}
                {lastReceipt.order.is_reversal && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded uppercase font-bold">Credit note</span>}
                {lastReceipt.order.reversed && <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded uppercase font-bold">Reversed</span>}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {lastReceipt.order.customer_name} · {formatTZS(lastReceipt.order.total_amount)}
                {lastReceipt.order.tender && <span> · {lastReceipt.order.tender === "mobile" ? "Mobile" : "Cash"}</span>}
                {lastReceipt.order.reference && <span className="font-mono"> · ref {lastReceipt.order.reference}</span>}
                {(lastReceipt.order.loyalty_earned ?? 0) > 0 && <span className="text-success"> · +{formatTZS(lastReceipt.order.loyalty_earned ?? 0)} loyalty</span>}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <Button size="sm" variant="outline" onClick={() => printReceipt(lastReceipt.order, lastReceipt.extras)}>
                  <Printer className="w-3.5 h-3.5 mr-1" /> Reprint
                </Button>
                <Button size="sm" variant="outline" onClick={() => downloadReceipt(lastReceipt.order, lastReceipt.extras)}>
                  <Download className="w-3.5 h-3.5 mr-1" /> Download
                </Button>
                {lastReceipt.order.customer_id !== "walkin" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => doSendReceipt("sms")}>
                      <MessageSquare className="w-3.5 h-3.5 mr-1" /> SMS
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => doSendReceipt("whatsapp")}>
                      <MessageSquare className="w-3.5 h-3.5 mr-1" /> WhatsApp
                    </Button>
                  </>
                )}
                {!lastReceipt.order.is_reversal && !lastReceipt.order.reversed && (
                  hasStaffRole("supervisor") ? (
                    <Button size="sm" variant="outline" onClick={doRefund} className="text-red-600 border-red-300 hover:bg-red-50">
                      <RotateCcw className="w-3.5 h-3.5 mr-1" /> Refund
                    </Button>
                  ) : (
                    <span className="text-[10px] text-muted-foreground self-center">Refund requires supervisor</span>
                  )
                )}
              </div>
            </div>
          )}

          {mode === "wallet" && (
            <div className="mt-5 border-t pt-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Accept Top-Up</div>
              <TenderPicker tender={topupTender} onChange={setTopupTender} />
              {topupTender === "mobile" && (
                <Input value={topupRef} onChange={(e) => setTopupRef(e.target.value)} placeholder="Lipa Namba / confirmation code" className="mt-2 font-mono" />
              )}
              <div className="flex gap-2 mt-2">
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

      {showScanner && <QRScannerModal onClose={() => setShowScanner(false)} onScan={onScan} />}

      {pinCustomer && (
        <WalletPinDialog
          title={`${pinCustomer.full_name}'s wallet PIN`}
          subtitle="This wallet is PIN protected. Ask the customer to enter their PIN to authorise charging it."
          onCancel={() => { setPinCustomer(null); showToast("Wallet locked — PIN required"); }}
          onVerify={(pin) => {
            if (!verifyWalletPin(pinCustomer.id, pin)) return "Incorrect PIN";
            setWalletUnlocked((prev) => [...prev, pinCustomer.id]);
            setCustomer(pinCustomer);
            setPinCustomer(null);
            showToast(`Wallet unlocked — ${pinCustomer.full_name}`);
            return true;
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-sm font-medium">
          <CheckCircle2 className="w-4 h-4 text-success" /> {toast}
        </div>
      )}
    </StaffShell>
  );
}

function TenderPicker({ tender, onChange }: { tender: Tender; onChange: (t: Tender) => void }) {
  return (
    <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted rounded-lg">
      <button type="button" onClick={() => onChange("cash")}
        className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition ${tender === "cash" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>
        <Banknote className="w-3.5 h-3.5" /> Cash
      </button>
      <button type="button" onClick={() => onChange("mobile")}
        className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition ${tender === "mobile" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>
        <Smartphone className="w-3.5 h-3.5" /> Mobile · Lipa Namba
      </button>
    </div>
  );
}
