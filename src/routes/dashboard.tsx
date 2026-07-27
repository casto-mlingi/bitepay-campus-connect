import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wallet, ShoppingBag, ClipboardList, ArrowUpCircle, ArrowRight, Clock, CheckCircle2, ChefHat, Bell, Download, Printer, QrCode, AlertTriangle, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useStore, formatTZS } from "@/lib/store";
import { downloadReceipt, printReceipt } from "@/lib/receipt";
import { CustomerShell } from "@/components/customer-shell";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — BitePay" }, { name: "description", content: "Your BitePay wallet, quick actions, digital ID and recent orders." }] }),
});

function Dashboard() {
  const { currentUser, orders, products, LOW_BALANCE_THRESHOLD, notifications, unreadNotifications, markNotificationsRead, dismissNotification } = useStore();
  const navigate = useNavigate();
  const [showId, setShowId] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [popup, setPopup] = useState<null | { title: string; body: string; kind: string }>(null);

  useEffect(() => {
    if (!currentUser) navigate({ to: "/" });
    else if (currentUser.role === "staff") navigate({ to: "/staff" });
  }, [currentUser, navigate]);

  // Auto-popup the newest unread notification on login/mount
  useEffect(() => {
    if (!currentUser || currentUser.role !== "customer") return;
    const unread = notifications.filter((n) => n.user_id === currentUser.id && !n.read);
    if (unread.length > 0) {
      const latest = unread[0];
      setPopup({ title: latest.title, body: latest.body, kind: latest.kind });
    }
    // Only run once on mount per user
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  if (!currentUser || currentUser.role !== "customer") return null;

  const myOrders = orders.filter((o) => o.customer_id === currentUser.id).slice(0, 4);
  const featured = products.slice(0, 6);
  const isLow = currentUser.wallet_balance < LOW_BALANCE_THRESHOLD;
  const myNotifs = notifications.filter((n) => n.user_id === currentUser.id);
  const unreadCount = unreadNotifications(currentUser.id).length;

  return (
    <CustomerShell active="home">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Good day,</p>
          <h1 className="text-2xl font-bold">{currentUser.full_name.split(" ")[0]} 👋</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowId(true)} aria-label="My QR ID" className="w-10 h-10 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-md shadow-orange-500/30">
            <QrCode className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setShowNotif(true); markNotificationsRead(currentUser.id); }}
            aria-label="Notifications"
            className="relative w-10 h-10 rounded-full bg-surface border grid place-items-center"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold grid place-items-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>


      {isLow && (
        <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-amber-800">Wallet running low</div>
            <div className="text-xs text-amber-700">Top up via Lipa Namba to keep ordering.</div>
          </div>
          <Link to="/topup" className="text-xs font-bold text-primary underline whitespace-nowrap">Top up now</Link>
        </div>
      )}

      <div className="mt-5 relative overflow-hidden rounded-3xl bg-gradient-to-br from-success to-emerald-600 text-white p-6 shadow-lg shadow-emerald-500/25">
        <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-white/10" />
        <div className="absolute -right-14 top-20 w-32 h-32 rounded-full bg-white/10" />
        <div className="relative">
          <div className="flex items-center gap-2 text-white/85 text-sm">
            <Wallet className="w-4 h-4" /> Wallet Balance
          </div>
          <div className="mt-2 text-4xl font-extrabold tracking-tight">
            {formatTZS(currentUser.wallet_balance)}
          </div>
          <div className="mt-5 flex gap-2">
            <Link to="/topup" className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur text-white text-sm font-semibold px-4 py-2 rounded-xl">
              <ArrowUpCircle className="w-4 h-4" /> Top-Up
            </Link>
            <Link to="/menu" className="inline-flex items-center gap-1.5 bg-white text-emerald-700 text-sm font-semibold px-4 py-2 rounded-xl">
              Order Now <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      <button onClick={() => setShowId(true)} className="mt-4 w-full rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-4 flex items-center gap-4 text-left hover:bg-primary/10 transition">
        <div className="w-14 h-14 rounded-xl bg-white grid place-items-center shrink-0">
          <QRCodeSVG value={currentUser.id} size={48} level="M" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-primary uppercase tracking-wider">Your BitePay ID</div>
          <div className="font-bold truncate">{currentUser.full_name}</div>
          <div className="text-xs text-muted-foreground">Show at POS to pay from wallet</div>
        </div>
        <ArrowRight className="w-4 h-4 text-primary shrink-0" />
      </button>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <QuickAction to="/menu" icon={<ShoppingBag className="w-5 h-5" />} label="Order" tint="bg-primary/10 text-primary" />
        <QuickAction to="/history" icon={<ClipboardList className="w-5 h-5" />} label="History" tint="bg-slate-900/5 text-foreground" />
        <QuickAction to="/topup" icon={<ArrowUpCircle className="w-5 h-5" />} label="Top-Up" tint="bg-emerald-500/10 text-emerald-600" />
      </div>

      <section className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Top of Week</h2>
          <Link to="/menu" className="text-sm text-primary font-semibold">See all</Link>
        </div>
        <div className="-mx-4 px-4 overflow-x-auto">
          <div className="flex gap-3 pb-1">
            {featured.map((p) => (
              <Link key={p.id} to="/menu" className="w-36 shrink-0 bg-surface border rounded-2xl p-3">
                <div className={`w-full aspect-square rounded-xl bg-gradient-to-br ${p.gradient} grid place-items-center text-5xl`}>{p.emoji}</div>
                <div className="mt-2 font-semibold text-sm leading-tight line-clamp-1">{p.name}</div>
                <div className="text-primary font-bold text-sm mt-0.5">{formatTZS(p.price)}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Recent Receipts</h2>
          <Link to="/history" className="text-sm text-primary font-semibold">See all</Link>
        </div>
        {myOrders.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
            <ChefHat className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No orders yet — grab a bite!
          </div>
        ) : (
          <ul className="space-y-2">
            {myOrders.map((o) => (
              <li key={o.id} className="bg-surface rounded-2xl p-4 border">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold">{o.receipt_no ?? o.id}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold">{formatTZS(o.total_amount)}</div>
                    <StatusPill status={o.status} />
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-dashed flex gap-2">
                  <button onClick={() => downloadReceipt(o, { paymentMode: "wallet" })}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-muted hover:bg-muted/70">
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                  <button onClick={() => printReceipt(o, { paymentMode: "wallet" })}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-muted hover:bg-muted/70">
                    <Printer className="w-3.5 h-3.5" /> Print
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {showId && (
        <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4" onClick={() => setShowId(false)}>
          <div className="bg-background rounded-3xl w-full max-w-sm p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-bold text-primary uppercase tracking-wider">My BitePay ID</div>
              <button onClick={() => setShowId(false)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="bg-white p-5 rounded-2xl inline-block">
              <QRCodeSVG value={currentUser.id} size={220} level="H" />
            </div>
            <div className="mt-4 font-bold text-lg">{currentUser.full_name}</div>
            <div className="text-xs text-muted-foreground">{currentUser.phone}</div>
            <div className="mt-2 inline-block font-mono text-xs bg-muted px-2 py-1 rounded">{currentUser.id}</div>
            <p className="mt-4 text-xs text-muted-foreground">Show this to the cashier — they'll scan to charge your wallet. No printed card needed.</p>
          </div>
        </div>
      )}

      {popup && (
        <div className="fixed inset-0 z-[60] bg-black/60 grid place-items-center p-4 animate-in fade-in" onClick={() => setPopup(null)}>
          <div className="bg-background rounded-3xl w-full max-w-sm p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className={`w-11 h-11 rounded-2xl grid place-items-center shrink-0 ${popup.kind === "low_balance" ? "bg-amber-100 text-amber-700" : popup.kind === "topup" ? "bg-emerald-100 text-emerald-700" : "bg-primary/10 text-primary"}`}>
                {popup.kind === "low_balance" ? <AlertTriangle className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold">{popup.title}</div>
                <div className="text-sm text-muted-foreground mt-1">{popup.body}</div>
              </div>
              <button onClick={() => setPopup(null)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="mt-5 flex gap-2">
              {popup.kind === "low_balance" ? (
                <Link to="/topup" onClick={() => setPopup(null)} className="flex-1 inline-flex items-center justify-center gap-1.5 bg-primary text-primary-foreground font-semibold px-4 py-2.5 rounded-xl">
                  Top up now <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <button onClick={() => setPopup(null)} className="flex-1 bg-primary text-primary-foreground font-semibold px-4 py-2.5 rounded-xl">Got it</button>
              )}
            </div>
          </div>
        </div>
      )}

      {showNotif && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-end sm:items-center sm:justify-center" onClick={() => setShowNotif(false)}>
          <div className="bg-background rounded-t-3xl sm:rounded-3xl w-full max-w-md p-5 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold text-lg">Notifications</div>
              <button onClick={() => setShowNotif(false)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            {myNotifs.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <div className="text-sm">You're all caught up</div>
              </div>
            ) : (
              <ul className="space-y-2">
                {myNotifs.map((n) => (
                  <li key={n.id} className="rounded-2xl border p-3 flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${n.kind === "low_balance" ? "bg-amber-100 text-amber-700" : n.kind === "topup" ? "bg-emerald-100 text-emerald-700" : "bg-primary/10 text-primary"}`}>
                      {n.kind === "low_balance" ? <AlertTriangle className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{n.title}</div>
                      <div className="text-xs text-muted-foreground">{n.body}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</div>
                    </div>
                    <button onClick={() => dismissNotification(n.id)} className="p-1 rounded hover:bg-muted text-muted-foreground"><X className="w-3.5 h-3.5" /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </CustomerShell>

  );
}

function QuickAction({ to, icon, label, tint }: { to: string; icon: React.ReactNode; label: string; tint: string }) {
  return (
    <Link to={to} className="bg-surface border rounded-2xl p-4 flex flex-col items-start gap-2 hover:shadow-sm transition">
      <div className={`w-10 h-10 rounded-xl grid place-items-center ${tint}`}>{icon}</div>
      <span className="text-sm font-semibold">{label}</span>
    </Link>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    "new": { label: "New", cls: "bg-primary/10 text-primary", icon: <Clock className="w-3 h-3" /> },
    "in-progress": { label: "Preparing", cls: "bg-amber-100 text-amber-700", icon: <Clock className="w-3 h-3" /> },
    "ready": { label: "Ready", cls: "bg-emerald-100 text-emerald-700", icon: <CheckCircle2 className="w-3 h-3" /> },
    "completed": { label: "Completed", cls: "bg-slate-100 text-slate-600", icon: <CheckCircle2 className="w-3 h-3" /> },
  };
  const s = map[status] ?? map["new"];
  return <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full mt-1 ${s.cls}`}>{s.icon}{s.label}</span>;
}
