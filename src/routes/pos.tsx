import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, User, Wallet, Plus, Minus, Trash2, Printer, ArrowUpCircle, CheckCircle2, X, Banknote, Download, Receipt, QrCode, Smartphone, RotateCcw, MessageSquare, WifiOff, CloudUpload, ClipboardCheck, Save, ListOrdered } from "lucide-react";
import { useStore, formatTZS, type Product, type Profile, type Order } from "@/lib/store";
import { StaffShell } from "@/components/staff-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { downloadReceipt, printReceipt, printBill, type ReceiptExtras } from "@/lib/receipt";
import { QRScannerModal } from "@/components/qr-scanner-modal";
import { isBeverage } from "@/lib/business-rules";
import { WalletPinDialog } from "@/components/wallet-pin-dialog";

export const Route = createFileRoute("/pos")({
  component: POS,
  head: () => ({ meta: [{ title: "Walk-in POS — BitePay Staff" }, { name: "description", content: "Point of sale with wallet, cash and mobile money (Lipa Namba), receipts, refunds and offline queue." }, { property: "og:title", content: "Walk-in POS — BitePay Staff" }, { property: "og:description", content: "Point of sale with wallet, cash and mobile money (Lipa Namba), receipts, refunds and offline queue." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
});

type Line = { product: Product; qty: number };
type Mode = "wallet" | "cash";
type Tender = "cash" | "mobile";

function POS() {
  const { currentUser, sessionReady, products, profiles, findCustomer, posSale, posCashSale, topUp, reverseSale, sendReceiptMessage,
    availablePlates, activeShift, isOnline, pendingSales, enqueueSale, syncOutbox, hasStaffRole, verifyWalletPin,
    waiterTablesEnabled, waiterForTable, can, store, scanWalletCustomer, requestRefund, tableAssignments, openBills, saveBill, closeBill } = useStore();
  const navigate = useNavigate();
  const [selectedMode, setMode] = useState<Mode>("wallet");
  const qrOnly = can("pos.wallet_qr") && !can("pos.wallet");
  const walletAllowed = can("pos.wallet") || qrOnly;
  const mode = walletAllowed ? selectedMode : "cash";
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
  const [kitchenNote, setKitchenNote] = useState("");
  const [prepare, setPrepare] = useState(false);
  const [productKind, setProductKind] = useState("all");
  const [tableNo, setTableNo] = useState<string>("");
  const [toast, setToast] = useState<string>("");
  const [lastReceipt, setLastReceipt] = useState<{ order: Order; extras: ReceiptExtras } | null>(null);
  const [billId, setBillId] = useState<string | null>(null);
  const [billLabel, setBillLabel] = useState("");
  const [waiterId, setWaiterId] = useState("");
  const [showBill, setShowBill] = useState(false);
  const [showTabs, setShowTabs] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  useEffect(() => {
    if (sessionReady && !currentUser) navigate({ to: "/" });
    else if (currentUser && currentUser.role !== "staff") navigate({ to: "/dashboard" });
  }, [currentUser, navigate]);

  const freshCustomer = customer ? profiles.find((p) => p.id === customer.id) ?? null : null;

  const categories = useMemo(() => ["All", ...Array.from(new Set(products.map((p) => p.category)))], [products]);
  const [itemSearch, setItemSearch] = useState("");
  const filtered = products.filter((p) => (category === "All" || p.category === category) && (productKind === "all" || isBeverage(p.category) === (productKind === "beverages")) && (!itemSearch.trim() || p.name.toLowerCase().includes(itemSearch.trim().toLowerCase())));
  const isWaiter = currentUser?.staff_role === "waiter";
  const servers = profiles.filter((p) => p.role === "staff" && !p.disabled);
  const itemCount = lines.reduce((n, l) => n + l.qty, 0);
  const toItems = () => lines.map((l) => ({ product_id: l.product.id, name: l.product.name, price: l.product.price, qty: l.qty }));
  const resetBill = (orderId?: string) => {
    if (billId) closeBill(billId, "paid", orderId);
    setBillId(null); setBillLabel(""); setTableNo(""); setWaiterId(""); setPayOpen(false); setShowBill(false);
  };
  const doSaveBill = () => {
    if (!lines.length) return;
    const res = saveBill({ id: billId ?? undefined, label: billLabel, table_no: tableNo, waiter_id: waiterId || (isWaiter ? currentUser?.id : waiterForTable(tableNo)?.waiter_id), items: toItems(), kitchen_note: kitchenNote });
    if (!res.ok) { showToast(res.reason); return; }
    showToast(`Bill saved · ${res.bill.label}`);
    setLines([]); setKitchenNote(""); setBillId(null); setBillLabel(""); setTableNo(""); setWaiterId(""); setPayOpen(false); setShowBill(false);
  };
  const openSavedBill = (id: string) => {
    const b = openBills.find((x) => x.id === id);
    if (!b) return;
    const next: Line[] = [];
    for (const it of b.items) {
      const prod = products.find((p) => p.id === it.product_id) ?? { id: it.product_id, store_id: b.store_id, name: it.name, description: "", price: it.price, category: "", emoji: "🍽️", gradient: "" };
      next.push({ product: { ...prod, price: it.price }, qty: it.qty });
    }
    setLines(next); setBillId(b.id); setBillLabel(b.label); setTableNo(b.table_no ?? ""); setWaiterId(b.waiter_id ?? ""); setKitchenNote(b.kitchen_note ?? "");
    setShowTabs(false); setShowBill(true);
  };
  const cancelSavedBill = (id: string) => {
    if (!window.confirm("Remove this saved bill? Use this only if the customer left without ordering.")) return;
    closeBill(id, "cancelled");
    if (id === billId) { setLines([]); setBillId(null); setBillLabel(""); }
    showToast("Saved bill removed");
  };
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
    if (c.wallet_pin && (qrOnly || !walletUnlocked.includes(c.id))) { setPinCustomer(c); return; }
    setCustomer(c);
  };

  const onScan = (text: string) => {
    setShowScanner(false);
    const c = qrOnly ? scanWalletCustomer(text) : findCustomer(text) ?? profiles.find((p) => p.role === "customer" && p.id === text) ?? null;
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
    if (!walletAllowed || !freshCustomer || !lines.length) return;
    if (qrOnly && !isOnline) { showToast("QR wallet payments need a connection; use cash or ask a cashier"); return; }
    if (!requireShift()) return;
    const items = lines.map((l) => ({ product_id: l.product.id, name: l.product.name, price: l.product.price, qty: l.qty }));
    const cashPortion = walletShort > 0 ? Math.max(splitCash, walletShort) : 0;
    if (!isOnline) {
      enqueueSale({ kind: "wallet", customer_id: freshCustomer.id, customer_name: freshCustomer.full_name, items, cash_portion: cashPortion, tender, reference: mobileRef, table_no: tableNo.trim() || undefined, kitchen_note: kitchenNote, prepare });
      showToast("Offline — sale queued to outbox");
      setLines([]); setSplitCash(0); setMobileRef("");
      return;
    }
    const res = posSale({ customerId: freshCustomer.id, items, cashPortion, tender, reference: mobileRef, table_no: tableNo.trim() || undefined, kitchen_note: kitchenNote, prepare, waiter_id: waiterId || undefined });
    if (!res.ok) { showToast(res.reason); return; }
    const extras: ReceiptExtras = { paymentMode: cashPortion > 0 ? "cash" : "wallet", cashierName: currentUser?.full_name, cashReceived: cashPortion || undefined, change: 0 };
    setLastReceipt({ order: res.order, extras });
    printReceipt(res.order, extras);
    setLines([]); setSplitCash(0); setMobileRef(""); setKitchenNote(""); resetBill(res.order.id);
    if (qrOnly) { setCustomer(null); setWalletUnlocked([]); }
    showToast(`Sale ${res.order.receipt_no ?? res.order.id} — receipt printed`);
  };

  const doCashSale = () => {
    if (lines.length === 0) return;
    if (!requireShift()) return;
    const effectiveReceived = tender === "mobile" ? total : cashReceived;
    const items = lines.map((l) => ({ product_id: l.product.id, name: l.product.name, price: l.product.price, qty: l.qty }));
    if (!isOnline) {
      enqueueSale({ kind: "cash", customer_name: cashName.trim() || "Walk-in", items, cash_received: effectiveReceived, tender, reference: mobileRef, table_no: tableNo.trim() || undefined, kitchen_note: kitchenNote, prepare });
      showToast("Offline — sale queued to outbox");
      setLines([]); setCashReceived(0); setCashName(""); setMobileRef("");
      return;
    }
    const res = posCashSale({ items, cashReceived: effectiveReceived, customerName: cashName.trim() || (tender === "mobile" ? "Mobile Money" : "Walk-in Cash"), tender, reference: mobileRef, table_no: tableNo.trim() || undefined, kitchen_note: kitchenNote, prepare, waiter_id: waiterId || undefined });
    if (!res.ok) { showToast(res.reason); return; }
    const extras: ReceiptExtras = { paymentMode: "cash", cashReceived: effectiveReceived, change, cashierName: currentUser?.full_name };
    setLastReceipt({ order: res.order, extras });
    printReceipt(res.order, extras);
    setLines([]); setCashReceived(0); setCashName(""); setMobileRef(""); setKitchenNote(""); resetBill(res.order.id);
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

  const doRequestRefund = () => {
    if (!lastReceipt) return;
    const reason = window.prompt("Reason for refund request?") ?? "";
    if (!reason.trim()) return;
    const result = requestRefund(lastReceipt.order.id, reason);
    showToast(result.ok ? "Refund request sent to manager" : result.reason);
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
  const creditedWaiter = waiterId ? servers.find((s) => s.id === waiterId)?.full_name : (tableNo.trim() ? waiterForTable(tableNo)?.waiter_name : undefined);

  const billPanel = (
    <div className="flex flex-col gap-4">
      {/* 1. Who is this bill for */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold text-xl truncate">{billId ? `Bill · ${billLabel}` : "New bill"}</h2>
        {billId && <span className="shrink-0 text-xs font-bold uppercase bg-amber-100 text-amber-800 px-2 py-1 rounded-full">Saved</span>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-sm font-medium">Table
          <Input value={tableNo} onChange={(e) => setTableNo(e.target.value)} placeholder="e.g. 4" list="assigned-tables" className="mt-1 h-12 text-base" />
          <datalist id="assigned-tables">{tableAssignments.filter((t) => !qrOnly || t.waiter_id === currentUser.id).map((t) => <option key={t.id} value={t.table_no}>{t.section}</option>)}</datalist>
        </label>
        <label className="block text-sm font-medium">Customer name
          <Input value={billLabel} onChange={(e) => setBillLabel(e.target.value)} placeholder="Optional" className="mt-1 h-12 text-base" />
        </label>
      </div>
      {!isWaiter && (
        <label className="block text-sm font-medium">Waiter who served
          <select value={waiterId} onChange={(e) => setWaiterId(e.target.value)} className="mt-1 w-full h-12 rounded-md border bg-background px-3 text-base">
            <option value="">{tableNo.trim() && waiterForTable(tableNo) ? `Table waiter · ${waiterForTable(tableNo)?.waiter_name}` : "No waiter (counter sale)"}</option>
            {servers.map((s) => <option key={s.id} value={s.id}>{s.full_name}{s.staff_role ? ` · ${s.staff_role}` : ""}</option>)}
          </select>
        </label>
      )}

      {/* 2. Items */}
      <div className="border-t pt-3">
        {lines.length === 0 ? (
          <div className="text-base text-muted-foreground py-8 text-center">Tap a drink or dish to add it</div>
        ) : (
          <ul className="divide-y max-h-[40vh] overflow-y-auto">
            {lines.map((l) => (
              <li key={l.product.id} className="flex items-center gap-3 py-2">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{l.product.name}</div>
                  <div className="text-sm text-muted-foreground">{formatTZS(l.product.price * l.qty)}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button aria-label="Less" onClick={() => setLineQty(l.product.id, l.qty - 1)} className="w-11 h-11 rounded-full bg-muted grid place-items-center active:scale-95">
                    {l.qty === 1 ? <Trash2 className="w-5 h-5 text-destructive" /> : <Minus className="w-5 h-5" />}
                  </button>
                  <span className="w-8 text-center font-bold text-lg">{l.qty}</span>
                  <button aria-label="More" onClick={() => setLineQty(l.product.id, l.qty + 1)} className="w-11 h-11 rounded-full bg-primary/10 text-primary grid place-items-center active:scale-95"><Plus className="w-5 h-5" /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Input aria-label="Kitchen / bar notes" value={kitchenNote} onChange={(e) => setKitchenNote(e.target.value)} placeholder="Note for kitchen / bar (optional)" className="h-11" />

      <div className="flex items-center justify-between text-2xl font-bold border-t pt-3">
        <span>Total</span><span>{formatTZS(total)}</span>
      </div>

      {/* 3. Big simple actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button disabled={!lines.length} onClick={doSaveBill} className="h-14 text-base font-bold col-span-2 sm:col-span-1">
          <Save className="w-5 h-5 mr-2" /> Save bill
        </Button>
        <Button disabled={!lines.length} variant="outline" className="h-14 text-base font-semibold col-span-2 sm:col-span-1" onClick={() => printBill({ items: toItems(), customerName: billLabel || freshCustomer?.full_name || cashName, tableNo, kitchenNote, businessName: store?.name })}>
          <Printer className="w-5 h-5 mr-2" /> Print bill
        </Button>
        <Button disabled={!lines.length} onClick={() => setPayOpen((v) => !v)} className="h-14 text-base font-bold col-span-2 bg-success hover:bg-success/90 text-success-foreground">
          <Banknote className="w-5 h-5 mr-2" /> {payOpen ? "Hide payment" : `Take payment · ${formatTZS(total)}`}
        </Button>
      </div>
      {creditedWaiter && <p className="text-sm text-muted-foreground -mt-2">Credited to <b>{creditedWaiter}</b></p>}

      {payOpen && lines.length > 0 && (
        <div className="rounded-2xl border-2 border-success/40 p-3 space-y-3">
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted rounded-xl">
            {walletAllowed && <button onClick={() => setMode("wallet")}
              className={`flex items-center justify-center gap-1.5 h-11 rounded-lg text-sm font-semibold ${mode === "wallet" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
              <Wallet className="w-4 h-4" /> {qrOnly ? "Scan QR" : "Wallet"}
            </button>}
            <button onClick={() => setMode("cash")}
              className={`flex items-center justify-center gap-1.5 h-11 rounded-lg text-sm font-semibold ${mode === "cash" ? "bg-background shadow-sm" : "text-muted-foreground"} ${walletAllowed ? "" : "col-span-2"}`}>
              <Banknote className="w-4 h-4" /> Cash / Lipa Namba
            </button>
          </div>

          {mode === "wallet" ? (
            <>
              <div className="flex gap-2">
                {!qrOnly && <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name or phone" className="pl-9 h-11" />
                </div>}
                <Button type="button" variant="outline" className={`h-11 ${qrOnly ? "flex-1" : ""}`} onClick={() => setShowScanner(true)} aria-label="Scan customer QR">
                  <QrCode className="w-5 h-5" />{qrOnly && <span className="ml-2">Scan customer QR</span>}
                </Button>
              </div>
              {!qrOnly && suggestions.length > 0 && (
                <ul className="border rounded-xl overflow-hidden bg-background max-h-56 overflow-y-auto">
                  {suggestions.map((s) => (
                    <li key={s.id}>
                      <button onClick={() => pickCustomer(s)} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-muted">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate">{s.full_name}</div>
                          <div className="text-xs text-muted-foreground">{s.phone}</div>
                        </div>
                        <div className="text-xs font-bold text-success">{formatTZS(s.wallet_balance)}</div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {freshCustomer && (
                <div className="rounded-xl border p-3 flex items-center gap-3 bg-muted/40">
                  <User className="w-5 h-5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{freshCustomer.full_name}</div>
                    {!qrOnly && <div className="text-xs text-success font-bold">{formatTZS(freshCustomer.wallet_balance)}</div>}
                  </div>
                  <button onClick={() => { setCustomer(null); setQuery(""); }} className="p-2 hover:bg-background rounded" aria-label="Remove customer"><X className="w-4 h-4" /></button>
                </div>
              )}
              {freshCustomer && walletShort > 0 && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
                  <div className="text-sm font-semibold text-amber-800">Wallet short by {formatTZS(walletShort)} — collect the rest</div>
                  <Input type="number" value={splitCash || ""} onChange={(e) => setSplitCash(Number(e.target.value) || 0)} className="h-11 font-semibold bg-background" />
                  <TenderPicker tender={tender} onChange={setTender} />
                  {tender === "mobile" && <Input value={mobileRef} onChange={(e) => setMobileRef(e.target.value)} placeholder="Lipa Namba code" className="h-11 bg-background" />}
                </div>
              )}
              <Button disabled={!canWallet || !activeShift} onClick={doWalletSale} className="w-full h-14 text-base font-bold bg-success hover:bg-success/90 text-success-foreground">
                <CheckCircle2 className="w-5 h-5 mr-2" /> Pay from wallet & print
              </Button>
            </>
          ) : (
            <>
              <TenderPicker tender={tender} onChange={setTender} />
              {tender === "cash" ? (
                <>
                  <Input type="number" inputMode="numeric" value={cashReceived || ""} onChange={(e) => setCashReceived(Number(e.target.value) || 0)} placeholder="Cash received" className="h-12 text-lg font-semibold" />
                  <div className="grid grid-cols-3 gap-1.5">
                    {[total, 5000, 10000, 20000, 50000].filter((v, i, a) => v > 0 && a.indexOf(v) === i).map((v) => (
                      <button key={v} onClick={() => setCashReceived(v)} className="h-11 rounded-lg bg-muted text-sm font-semibold active:scale-95">{v === total ? "Exact" : formatTZS(v)}</button>
                    ))}
                  </div>
                  <div className={`flex items-center justify-between rounded-lg p-3 text-lg ${cashReceived >= total ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                    <span className="font-medium">Change</span><span className="font-bold">{formatTZS(change)}</span>
                  </div>
                </>
              ) : (
                <Input value={mobileRef} onChange={(e) => setMobileRef(e.target.value)} placeholder="Lipa Namba confirmation code" className="h-12 font-mono" />
              )}
              <Button disabled={!canCash || !activeShift} onClick={doCashSale} className="w-full h-14 text-base font-bold bg-success hover:bg-success/90 text-success-foreground">
                <CheckCircle2 className="w-5 h-5 mr-2" /> {tender === "mobile" ? "Confirm Lipa Namba & print" : "Paid in cash & print"}
              </Button>
            </>
          )}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="w-5 h-5" checked={prepare} onChange={(e) => setPrepare(e.target.checked)} />Send to kitchen / bar after payment</label>
          {!activeShift && <p className="text-sm text-amber-800">Open a shift before taking payment.</p>}
        </div>
      )}

      {lastReceipt && (
        <div className="rounded-xl border bg-muted/30 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold flex-wrap">
            <Receipt className="w-4 h-4 text-primary" /> Last receipt {lastReceipt.order.receipt_no ?? ""}
            {lastReceipt.order.is_reversal && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded uppercase font-bold">Credit note</span>}
            {lastReceipt.order.reversed && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded uppercase font-bold">Reversed</span>}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {lastReceipt.order.customer_name} · {formatTZS(lastReceipt.order.total_amount)}
            {lastReceipt.order.waiter_name && <span> · {lastReceipt.order.waiter_name}</span>}
            {lastReceipt.order.reference && <span className="font-mono"> · ref {lastReceipt.order.reference}</span>}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <Button size="sm" variant="outline" onClick={() => printReceipt(lastReceipt.order, lastReceipt.extras)}><Printer className="w-3.5 h-3.5 mr-1" /> Reprint</Button>
            <Button size="sm" variant="outline" onClick={() => downloadReceipt(lastReceipt.order, lastReceipt.extras)}><Download className="w-3.5 h-3.5 mr-1" /> Download</Button>
            {lastReceipt.order.customer_id !== "walkin" && (
              <>
                <Button size="sm" variant="outline" onClick={() => doSendReceipt("sms")}><MessageSquare className="w-3.5 h-3.5 mr-1" /> SMS</Button>
                <Button size="sm" variant="outline" onClick={() => doSendReceipt("whatsapp")}><MessageSquare className="w-3.5 h-3.5 mr-1" /> WhatsApp</Button>
              </>
            )}
            {!lastReceipt.order.is_reversal && !lastReceipt.order.reversed && (
              hasStaffRole("supervisor")
                ? <Button size="sm" variant="outline" onClick={doRefund} className="text-destructive"><RotateCcw className="w-3.5 h-3.5 mr-1" /> Refund</Button>
                : <Button size="sm" variant="outline" onClick={doRequestRefund}><RotateCcw className="w-3.5 h-3.5 mr-1" />Request refund</Button>
            )}
          </div>
        </div>
      )}

      {can("customers.topup") && freshCustomer && !qrOnly && (
        <details className="rounded-xl border p-3">
          <summary className="text-sm font-semibold cursor-pointer">Top up {freshCustomer.full_name}'s wallet</summary>
          <div className="mt-2 space-y-2">
            <TenderPicker tender={topupTender} onChange={setTopupTender} />
            {topupTender === "mobile" && <Input value={topupRef} onChange={(e) => setTopupRef(e.target.value)} placeholder="Lipa Namba code" className="font-mono" />}
            <div className="flex gap-2">
              <Input type="number" value={topupAmt} onChange={(e) => setTopupAmt(Number(e.target.value) || 0)} className="h-11 font-semibold" />
              <Button disabled={topupAmt <= 0} onClick={doTopUp} variant="outline" className="h-11"><ArrowUpCircle className="w-4 h-4 mr-1.5" /> Top up</Button>
            </div>
          </div>
        </details>
      )}
    </div>
  );

  return (
    <StaffShell active="pos">
      {!activeShift && (
        <div className="mb-3 rounded-2xl border border-amber-400/60 bg-amber-50 p-3 flex items-center justify-between gap-3 text-amber-900">
          <span className="flex items-center gap-2 text-sm"><ClipboardCheck className="w-4 h-4 shrink-0" /> No shift open. You can save bills; payments need a shift.</span>
          <Link to="/shift" className="text-sm font-bold underline shrink-0">Open shift</Link>
        </div>
      )}
      {!isOnline && (
        <div className="mb-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive flex items-center gap-2">
          <WifiOff className="w-4 h-4" /> Offline — everything is saved on this device ({pendingSales.length} waiting).
        </div>
      )}
      {isOnline && pendingSales.length > 0 && (
        <div className="mb-3 rounded-2xl border border-primary/40 bg-primary/5 p-3 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-sm text-primary"><CloudUpload className="w-4 h-4" /> {pendingSales.length} sale(s) ready to send.</span>
          <Button size="sm" onClick={doSync}>Send now</Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_340px] lg:grid-cols-[minmax(0,1fr)_400px] gap-4 lg:gap-6 pb-28 md:pb-0">
        <section className="min-w-0">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} placeholder="Find a drink or dish" className="pl-10 h-12 text-base" />
            </div>
            <Button variant="outline" onClick={() => setShowTabs(true)} className="h-12 px-4 text-base font-semibold relative">
              <ListOrdered className="w-5 h-5 sm:mr-2" /><span className="hidden sm:inline">Saved bills</span>
              {openBills.length > 0 && <span className="ml-1.5 min-w-6 h-6 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold grid place-items-center">{openBills.length}</span>}
            </Button>
          </div>

          {store?.business_type === "bar" && (
            <div className="mt-3 grid grid-cols-3 gap-2" role="group" aria-label="Product type">
              {["all", "beverages", "food"].map((kind) => (
                <Button key={kind} variant={productKind === kind ? "default" : "outline"} className="h-11 text-base" onClick={() => { setProductKind(kind); setCategory("All"); }}>
                  {kind === "all" ? "All" : kind === "food" ? "Food" : "Drinks"}
                </Button>
              ))}
            </div>
          )}

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {categories.map((c) => (
              <button key={c} onClick={() => setCategory(c)}
                className={`h-10 px-4 rounded-full text-sm font-semibold whitespace-nowrap border ${category === c ? "bg-foreground text-background border-foreground" : "bg-surface border-border"}`}>{c}</button>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-2 min-[480px]:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5">
            {filtered.map((p) => {
              const plates = availablePlates(p.id);
              const soldOut = plates !== null && plates <= 0;
              const inBill = lines.find((l) => l.product.id === p.id)?.qty ?? 0;
              return (
                <button key={p.id} onClick={() => addLine(p)} disabled={soldOut}
                  className={`relative bg-surface border-2 rounded-2xl p-2 text-left transition active:scale-[0.97] ${inBill ? "border-primary" : "border-border hover:border-primary/50"} ${soldOut ? "opacity-40 grayscale cursor-not-allowed" : ""}`}>
                  {inBill > 0 && <span className="absolute top-1 right-1 z-10 min-w-7 h-7 px-1.5 rounded-full bg-primary text-primary-foreground text-sm font-bold grid place-items-center">{inBill}</span>}
                  {p.image ? (
                    <div className="aspect-square w-full rounded-xl bg-muted overflow-hidden grid place-items-center">
                      <img src={p.image} alt={p.name} loading="lazy" className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className={`aspect-square w-full rounded-xl bg-gradient-to-br ${p.gradient} grid place-items-center text-5xl`}>{p.emoji}</div>
                  )}
                  <div className="mt-2 font-semibold text-sm leading-tight line-clamp-2">{p.name}</div>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <span className="font-bold text-primary text-sm">{formatTZS(p.price)}</span>
                    {plates !== null && <span className={`text-xs font-semibold ${soldOut ? "text-destructive" : "text-muted-foreground"}`}>{soldOut ? "Sold out" : `${plates} left`}</span>}
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && <div className="col-span-full text-center text-muted-foreground py-10">No items found</div>}
          </div>
        </section>

        <aside className="hidden md:block bg-surface border rounded-2xl p-4 lg:p-5 h-fit md:sticky md:top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
          {billPanel}
        </aside>
      </div>

      {/* Phone: bottom bar + bill sheet */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface border-t p-3 grid grid-cols-[auto_minmax(0,1fr)] gap-2">
        <Button variant="outline" onClick={() => setShowTabs(true)} className="h-14 px-4 relative">
          <ListOrdered className="w-5 h-5" />
          {openBills.length > 0 && <span className="ml-1 font-bold">{openBills.length}</span>}
        </Button>
        <Button onClick={() => setShowBill(true)} className="h-14 text-base font-bold justify-between px-4">
          <span>Bill · {itemCount} item{itemCount === 1 ? "" : "s"}</span><span>{formatTZS(total)}</span>
        </Button>
      </div>
      {showBill && (
        <div className="md:hidden fixed inset-0 z-50 bg-foreground/40" onClick={() => setShowBill(false)}>
          <div className="absolute inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-3xl bg-surface p-4 pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end -mt-1 mb-1">
              <button onClick={() => setShowBill(false)} className="p-2 rounded-full bg-muted" aria-label="Close bill"><X className="w-5 h-5" /></button>
            </div>
            {billPanel}
          </div>
        </div>
      )}

      {/* Saved bills drawer */}
      {showTabs && (
        <div className="fixed inset-0 z-50 bg-foreground/40" onClick={() => setShowTabs(false)}>
          <div className="absolute right-0 inset-y-0 w-full sm:w-[420px] bg-surface p-4 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold">Saved bills ({openBills.length})</h2>
              <button onClick={() => setShowTabs(false)} className="p-2 rounded-full bg-muted" aria-label="Close"><X className="w-5 h-5" /></button>
            </div>
            {lines.length > 0 && !billId && <p className="mb-3 text-sm rounded-lg bg-amber-50 text-amber-900 p-2">You have an unsaved bill. Save it first or it will be replaced when you open another.</p>}
            {openBills.length === 0 ? (
              <p className="text-muted-foreground text-center py-10">No saved bills. Add items and tap <b>Save bill</b>.</p>
            ) : (
              <ul className="space-y-2">
                {openBills.map((b) => {
                  const sum = b.items.reduce((s, i) => s + i.price * i.qty, 0);
                  const count = b.items.reduce((s, i) => s + i.qty, 0);
                  const mins = Math.max(0, Math.round((Date.now() - b.created_at) / 60000));
                  return (
                    <li key={b.id} className={`rounded-2xl border-2 ${b.id === billId ? "border-primary" : "border-border"}`}>
                      <button onClick={() => openSavedBill(b.id)} className="w-full text-left p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-lg truncate">{b.label}</span>
                          <span className="font-bold shrink-0">{formatTZS(sum)}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">{count} item{count === 1 ? "" : "s"} · {b.waiter_name ?? "—"} · {mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)} h`} ago</div>
                      </button>
                      {(!isWaiter || b.created_by_id === currentUser.id) && (
                        <div className="px-3 pb-2 flex justify-end">
                          <button onClick={() => cancelSavedBill(b.id)} className="text-xs text-destructive font-semibold">Remove</button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

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
        <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-foreground text-background px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-sm font-medium">
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
        className={`flex items-center justify-center gap-1.5 h-11 rounded-md text-sm font-semibold transition ${tender === "cash" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>
        <Banknote className="w-3.5 h-3.5" /> Cash
      </button>
      <button type="button" onClick={() => onChange("mobile")}
        className={`flex items-center justify-center gap-1.5 h-11 rounded-md text-sm font-semibold transition ${tender === "mobile" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>
        <Smartphone className="w-3.5 h-3.5" /> Mobile · Lipa Namba
      </button>
    </div>
  );
}
