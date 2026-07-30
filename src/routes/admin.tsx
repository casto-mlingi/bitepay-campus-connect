import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  ShieldCheck, ArrowLeft, LogOut, Store as StoreIcon, Users, Wallet, TrendingUp, Ticket as TicketIcon,
  Plus, Minus, Pause, Play, CheckCircle2, AlertTriangle, ChefHat, Database, RefreshCw, LayoutGrid,
  CreditCard, MoreHorizontal, Search, Download, Gift, Clock, CalendarClock, Boxes, History, Building2,
} from "lucide-react";
import { useStore, formatTZS, PLAN_LABEL, PLAN_PRICE, type SubscriptionPlan, type TicketStatus } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VirtualList } from "@/components/admin/virtual-list";
import { activeDbProfile, DB_PROFILE_KEY, type DbProfileId } from "@/lib/use-snapshot-sync";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({ meta: [
    { title: "Admin Console — BitePay" },
    { name: "description", content: "BitePay SaaS admin console — monitor stores, subscriptions, payments and support tickets." },
    { property: "og:title", content: "BitePay Admin Console" },
    { property: "og:description", content: "Super admin dashboard for BitePay." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function AdminPage() {
  const { isAdminSignedIn, adminLogin, adminLogout } = useStore();
  if (!isAdminSignedIn) return <AdminLogin onLogin={adminLogin} />;
  return <AdminDashboard onLogout={adminLogout} />;
}

/* ------------------------------------------------------------------ utils */

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const DAY = 86400000;
const daysLeftOf = (expires: number) => Math.max(0, Math.ceil((expires - Date.now()) / DAY));

/* ------------------------------------------------------------------ login */

function AdminLogin({ onLogin }: { onLogin: (u: string, p: string) => boolean }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onLogin(username, password)) setError("Invalid admin credentials");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <div className="p-4">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white"><ArrowLeft className="w-4 h-4" /> Back to sign-in</Link>
      </div>
      <div className="flex-1 grid place-items-center px-5">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 grid place-items-center mb-4"><ShieldCheck className="w-7 h-7 text-primary" /></div>
          <h1 className="text-2xl font-bold">Admin Console</h1>
          <p className="text-slate-400 text-sm mt-1">Sign in to monitor stores, subscriptions and tickets.</p>
          <form onSubmit={submit} className="mt-6 space-y-3">
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-400">Username</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" className="mt-1.5 h-12 rounded-xl bg-slate-800 border-slate-700 text-white" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-400">Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="mt-1.5 h-12 rounded-xl bg-slate-800 border-slate-700 text-white" />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90">Sign in</Button>
            <p className="text-[11px] text-slate-500 text-center pt-2">Demo credentials: <span className="text-slate-300">admin / bitepay2025</span></p>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ shell */

type Section = "home" | "payments" | "users" | "stores" | "tickets" | "more";

const NAV: { id: Section; label: string; icon: ReactIcon }[] = [
  { id: "home", label: "Home", icon: LayoutGrid },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "users", label: "Users", icon: Users },
  { id: "stores", label: "Stores", icon: Boxes },
  { id: "tickets", label: "Tickets", icon: TicketIcon },
  { id: "more", label: "More", icon: MoreHorizontal },
];

type ReactIcon = typeof LayoutGrid;

type SystemLogEntry = { id: string; ts: number; category: string; action: string; detail: string; store: string };

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const {
    stores, allProfiles, adminData, tickets,
    addSubscriptionDays, changePlan, setSubscriptionStatus,
    superAdmin, adminAuditLog, subscriptionPayments, reviewSubscriptionPayment,
  } = useStore();

  const [section, setSection] = useState<Section>("home");
  const [storeId, setStoreId] = useState<string | null>(null);

  useEffect(() => {
    if (stores.length === 0) { setStoreId(null); return; }
    if (!storeId || !stores.some((s) => s.id === storeId)) setStoreId(stores[0].id);
  }, [stores, storeId]);

  const storeNameById = useMemo(() => {
    const m = new Map<string, string>();
    stores.forEach((s) => m.set(s.id, s.name));
    return m;
  }, [stores]);
  const storeName = (id: string) => storeNameById.get(id) ?? "—";

  const openTickets = tickets.filter((t) => t.status === "open" || t.status === "in_progress").length;

  /* ---- platform-wide aggregates (single pass, cheap at scale) ---------- */
  const stats = useMemo(() => {
    let customers = 0, staff = 0, activeSubs = 0, onTrial = 0, expired = 0, suspended = 0, mrr = 0, walletLiability = 0;
    for (const p of allProfiles) {
      if (p.role === "customer") {
        customers++;
        const wallets = p.wallets ?? {};
        const sum = Object.values(wallets).reduce<number>((a, b) => a + (b as number), 0);
        walletLiability += sum || p.wallet_balance || 0;
      } else if (!p.disabled) staff++;
    }
    const now = Date.now();
    for (const s of stores) {
      const left = s.subscription.expires_at - now;
      if (s.subscription.status === "suspended") suspended++;
      else if (left <= 0) expired++;
      else {
        activeSubs++;
        if (s.subscription.plan === "trial") onTrial++;
        mrr += PLAN_PRICE[s.subscription.plan];
      }
    }
    let gross = 0;
    for (const o of adminData.orders) if (!o.is_reversal) gross += o.total_amount;
    return { customers, staff, activeSubs, onTrial, expired, suspended, mrr, walletLiability, gross };
  }, [allProfiles, stores, adminData.orders]);

  /* ---- subscription payment ledger, derived from the admin audit log --- */
  const payments = useMemo(() => {
    const out = adminAuditLog
      .filter((a) => a.action === "extend_subscription" || a.action === "change_plan" || a.action === "status_change")
      .map((a) => {
        const m = /([+-]?\d+)\s*days on (.+)$/.exec(a.detail);
        const days = m ? Number(m[1]) : 0;
        const target = m ? m[2] : "Platform";
        const store = stores.find((s) => s.name === target);
        const rate = store ? PLAN_PRICE[store.subscription.plan] : 0;
        const amount = a.action === "extend_subscription" && days > 0 ? Math.round((rate / 30) * days) : 0;
        return { id: a.id, ts: a.created_at, action: a.action, days, target, amount, plan: store ? PLAN_LABEL[store.subscription.plan] : "—" };
      });
    return out;
  }, [adminAuditLog, stores]);

  const accumulatedRevenue = useMemo(() => payments.reduce((s, p) => s + p.amount, 0), [payments]);

  const revenue30 = useMemo(() => {
    const buckets = new Array(30).fill(0) as number[];
    const start = Date.now() - 29 * DAY;
    for (const p of payments) {
      if (p.ts < start) continue;
      const i = Math.min(29, Math.max(0, Math.floor((p.ts - start) / DAY)));
      buckets[i] += p.amount;
    }
    return buckets;
  }, [payments]);

  const pendingTopUps = useMemo(() => adminData.topUpRequests.filter((r) => r.status === "pending"), [adminData.topUpRequests]);

  /* ---- unified system log --------------------------------------------- */
  const systemLog = useMemo<SystemLogEntry[]>(() => {
    const out: SystemLogEntry[] = [];
    const push = (e: SystemLogEntry) => out.push(e);
    adminAuditLog.forEach((a) => push({ id: a.id, ts: a.created_at, category: "Admin", action: a.action, detail: a.detail, store: "Platform" }));
    stores.forEach((s) => push({ id: `store-${s.id}`, ts: s.created_at, category: "Store", action: "store_created", detail: `${s.name}${s.location ? ` · ${s.location}` : ""} · ${s.subscription.plan} plan`, store: s.name }));
    allProfiles.forEach((p) => push({
      id: `prof-${p.id}`, ts: (p as { created_at?: number }).created_at ?? 0, category: p.role === "staff" ? "Staff" : "Customer",
      action: p.role === "staff" ? "staff_added" : "customer_registered",
      detail: `${p.full_name}${p.staff_role ? ` · ${p.staff_role}` : ""}${p.disabled ? " · disabled" : ""}`,
      store: storeName(p.store_id ?? ""),
    }));
    adminData.orders.forEach((o) => push({ id: `ord-${o.id}`, ts: o.created_at, category: "Order", action: o.is_reversal ? "order_refunded" : "order_placed", detail: `${o.items.length} item(s) · ${formatTZS(o.total_amount)} · ${o.status}`, store: storeName(o.store_id) }));
    adminData.transactions.forEach((t) => push({ id: `tx-${t.id}`, ts: t.created_at, category: "Wallet", action: t.type, detail: `${formatTZS(t.amount)} · ${t.description ?? ""}`, store: storeName(t.store_id) }));
    adminData.topUpRequests.forEach((r) => push({ id: `top-${r.id}`, ts: r.created_at, category: "Top-up", action: `topup_${r.status}`, detail: `${formatTZS(r.amount)} · ${r.customer_name}`, store: storeName(r.store_id) }));
    adminData.purchases.forEach((p) => push({ id: `pur-${p.id}`, ts: p.date, category: "Procurement", action: "purchase", detail: `${p.supplier || "Supplier"} · ${p.raw_name} · ${formatTZS(p.total_cost)}`, store: storeName(p.store_id) }));
    adminData.expenses.forEach((e) => push({ id: `exp-${e.id}`, ts: e.date, category: "Expense", action: e.category, detail: `${e.description} · ${formatTZS(e.amount)}`, store: storeName(e.store_id) }));
    adminData.wastage.forEach((w) => push({ id: `was-${w.id}`, ts: w.created_at, category: "Wastage", action: "wastage_logged", detail: `${w.product_name} · ${w.plates} plate(s) · ${w.reason}`, store: storeName(w.store_id) }));
    adminData.shifts.forEach((s) => push({ id: `shf-${s.id}`, ts: s.opened_at, category: "Shift", action: s.closed_at ? "shift_closed" : "shift_opened", detail: `${s.cashier_name} · opening ${formatTZS(s.opening_float)}`, store: storeName(s.store_id) }));
    adminData.customDishRequests.forEach((c) => push({ id: `cdr-${c.id}`, ts: c.created_at, category: "Custom dish", action: `dish_${c.status}`, detail: `${c.dish_name} · ${c.customer_name}`, store: storeName(c.store_id) }));
    adminData.tickets.forEach((t) => push({ id: `tkt-${t.id}`, ts: t.created_at, category: "Support", action: `ticket_${t.status}`, detail: `${t.subject} · ${t.created_by_name}`, store: storeName(t.store_id) }));
    adminData.notifications.forEach((n) => push({ id: `ntf-${n.id}`, ts: n.created_at, category: "Notification", action: n.kind, detail: `${n.title} — ${n.body}`, store: storeName(n.store_id) }));
    return out.sort((a, b) => b.ts - a.ts);
  }, [adminAuditLog, stores, allProfiles, adminData, storeNameById]);

  const title = NAV.find((n) => n.id === section)?.label ?? "Dashboard";

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-0">
      {/* header */}
      <header className="bg-slate-950 text-white rounded-b-3xl md:rounded-none">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-5 pb-6 md:py-4 flex items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary grid place-items-center shrink-0"><ShieldCheck className="w-5 h-5" /></div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-400">Super Admin</div>
              <h1 className="text-2xl md:text-lg font-extrabold leading-tight">{section === "home" ? "Dashboard" : title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/" className="hidden md:inline text-xs text-slate-300 hover:text-white">App</Link>
            <button onClick={onLogout} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-white/10 hover:bg-white/20 text-sm font-semibold">
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </div>
        {/* desktop tabs */}
        <div className="hidden md:flex max-w-7xl mx-auto px-4 lg:px-8 gap-1 pb-2 overflow-x-auto">
          {NAV.map((n) => (
            <button key={n.id} onClick={() => setSection(n.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap ${section === n.id ? "bg-primary text-white" : "text-slate-300 hover:bg-slate-800"}`}>
              {n.label}
              {n.id === "tickets" && openTickets > 0 && <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{openTickets}</span>}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-5 space-y-4">
        {stores.length === 0 && (
          <div className="bg-white border border-amber-300 rounded-2xl p-5 flex items-center gap-3 text-amber-800 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" /> No store has been provisioned yet. Ask an owner to run first-time setup.
          </div>
        )}

        {section === "home" && (
          <HomeSection
            stats={stats}
            storeCount={stores.length}
            accumulatedRevenue={accumulatedRevenue}
            revenue30={revenue30}
            pendingTopUps={pendingTopUps.length}
            openTickets={openTickets}
            stores={stores}
            allProfiles={allProfiles}
            onGo={setSection}
          />
        )}

        {section === "payments" && (
          <PaymentsSection payments={payments} pending={pendingTopUps} storeName={storeName}
            accumulated={accumulatedRevenue + subscriptionPayments.filter((p) => p.status === "approved").reduce((a, b) => a + b.amount, 0)}
            subPayments={subscriptionPayments} onReview={reviewSubscriptionPayment} />
        )}

        {section === "users" && <UsersSection profiles={allProfiles} storeName={storeName} />}

        {section === "stores" && (
          <StoresSection
            stores={stores}
            allProfiles={allProfiles}
            adminData={adminData}
            selectedId={storeId}
            onSelect={setStoreId}
            onAddDays={addSubscriptionDays}
            onChangePlan={changePlan}
            onSetStatus={setSubscriptionStatus}
          />
        )}

        {section === "tickets" && <TicketsTab />}

        {section === "more" && <MoreSection log={systemLog} adminName={superAdmin.full_name} stats={stats} storeCount={stores.length} />}
      </main>

      {/* mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t">
        <div className="grid grid-cols-6">
          {NAV.map((n) => {
            const Icon = n.icon;
            const on = section === n.id;
            return (
              <button key={n.id} onClick={() => setSection(n.id)} className={`relative py-2.5 flex flex-col items-center gap-0.5 ${on ? "text-primary" : "text-slate-500"}`}>
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-semibold">{n.label}</span>
                {n.id === "tickets" && openTickets > 0 && <span className="absolute top-1 right-4 w-2 h-2 rounded-full bg-red-500" />}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

/* ------------------------------------------------------------------- home */

type Stats = { customers: number; staff: number; activeSubs: number; onTrial: number; expired: number; suspended: number; mrr: number; walletLiability: number; gross: number };

function HomeSection({ stats, storeCount, accumulatedRevenue, revenue30, pendingTopUps, openTickets, stores, allProfiles, onGo }: {
  stats: Stats; storeCount: number; accumulatedRevenue: number; revenue30: number[]; pendingTopUps: number; openTickets: number;
  stores: ReturnType<typeof useStore>["stores"]; allProfiles: ReturnType<typeof useStore>["allProfiles"]; onGo: (s: Section) => void;
}) {
  const max = Math.max(1, ...revenue30);
  const billing = useMemo(() => {
    const groups = new Map<string, typeof stores>();
    stores.forEach((s) => {
      const key = s.owner_user_id ?? "unassigned";
      const arr = groups.get(key) ?? [];
      arr.push(s);
      groups.set(key, arr);
    });
    return Array.from(groups.entries()).map(([ownerId, group]) => ({
      ownerId,
      owner: allProfiles.find((p) => p.id === ownerId),
      group,
      mrr: group.reduce((sum, s) => sum + (s.subscription.status === "active" ? PLAN_PRICE[s.subscription.plan] : 0), 0),
    })).sort((a, b) => b.mrr - a.mrr);
  }, [stores, allProfiles]);

  return (
    <>
      <div className="rounded-3xl p-6 bg-gradient-to-br from-primary to-primary/70 text-white shadow-lg">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/80"><TrendingUp className="w-4 h-4" /> Accumulated revenue</div>
        <div className="text-4xl font-extrabold mt-2">{formatTZS(accumulatedRevenue)}</div>
        <p className="text-sm text-white/80 mt-1">All subscription payments · MRR {formatTZS(stats.mrr)}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={<StoreIcon className="w-4 h-4" />} label="Stores" value={storeCount.toLocaleString()} />
        <Stat icon={<CheckCircle2 className="w-4 h-4" />} label="Active subs" value={stats.activeSubs.toLocaleString()} />
        <Stat icon={<Users className="w-4 h-4" />} label="Customers" value={stats.customers.toLocaleString()} />
        <Stat icon={<ChefHat className="w-4 h-4" />} label="Staff" value={stats.staff.toLocaleString()} />
        <Stat icon={<CalendarClock className="w-4 h-4" />} label="On trial" value={stats.onTrial.toLocaleString()} />
        <Stat icon={<AlertTriangle className="w-4 h-4" />} label="Expired" value={stats.expired.toLocaleString()} />
        <Stat icon={<Clock className="w-4 h-4" />} label="Pending top-ups" value={pendingTopUps.toLocaleString()} />
        <Stat icon={<Wallet className="w-4 h-4" />} label="Wallet liability" value={formatTZS(stats.walletLiability)} />
      </div>

      <div className="bg-white border rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">Revenue · last 30 days</h3>
          <TrendingUp className="w-4 h-4 text-primary" />
        </div>
        <div className="mt-4 h-32 flex items-end gap-[3px]">
          {revenue30.map((v, i) => (
            <div key={i} title={formatTZS(v)} className="flex-1 rounded-t bg-primary/80 min-h-[2px]" style={{ height: `${(v / max) * 100}%` }} />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">Daily subscription income across every store.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <QuickAction icon={<CreditCard className="w-4 h-4" />} label="Review payments" onClick={() => onGo("payments")} />
        <QuickAction icon={<Gift className="w-4 h-4" />} label="Gift free days" onClick={() => onGo("stores")} />
        <QuickAction icon={<TicketIcon className="w-4 h-4" />} label={`Support tickets${openTickets ? ` (${openTickets})` : ""}`} onClick={() => onGo("tickets")} />
      </div>

      <div className="bg-white border rounded-2xl p-5">
        <h3 className="font-bold flex items-center gap-2"><Building2 className="w-4 h-4" /> Billing accounts</h3>
        <p className="text-xs text-muted-foreground mt-0.5 mb-3">Owners grouped with every store they run — each store is billed on its own plan.</p>
        <VirtualList
          items={billing}
          rowHeight={104}
          height={Math.min(420, Math.max(120, billing.length * 104))}
          empty="No billing accounts yet."
          renderRow={(b) => (
            <div className="border rounded-xl p-3 h-[96px] flex items-start justify-between gap-3 overflow-hidden">
              <div className="min-w-0">
                <div className="font-semibold truncate">{b.owner?.full_name ?? "Unassigned owner"}</div>
                <div className="text-xs text-muted-foreground truncate">{b.owner?.phone ?? "—"} · {b.group.length} store{b.group.length === 1 ? "" : "s"}</div>
                <div className="mt-1.5 flex gap-1.5 overflow-hidden">
                  {b.group.slice(0, 3).map((s) => (
                    <span key={s.id} className="text-[11px] font-semibold px-2 py-1 rounded-full bg-muted whitespace-nowrap">{s.name} · {PLAN_LABEL[s.subscription.plan]}</span>
                  ))}
                  {b.group.length > 3 && <span className="text-[11px] text-muted-foreground py-1">+{b.group.length - 3}</span>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">MRR</div>
                <div className="text-lg font-extrabold">{formatTZS(b.mrr)}</div>
              </div>
            </div>
          )}
        />
      </div>
    </>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white border rounded-2xl p-4">
      <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] uppercase tracking-widest">{icon}{label}</div>
      <div className="text-2xl font-extrabold mt-1 truncate">{value}</div>
    </div>
  );
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="bg-white border rounded-2xl p-4 flex items-center gap-2 font-semibold text-sm hover:bg-muted/50 text-left">
      <span className="text-primary">{icon}</span>{label}
    </button>
  );
}

/* --------------------------------------------------------------- payments */

type PaymentRow = { id: string; ts: number; action: string; days: number; target: string; amount: number; plan: string };

function PaymentsSection({ payments, pending, storeName, accumulated, subPayments, onReview }: {
  payments: PaymentRow[];
  pending: ReturnType<typeof useStore>["adminData"]["topUpRequests"];
  storeName: (id: string) => string;
  accumulated: number;
  subPayments: ReturnType<typeof useStore>["subscriptionPayments"];
  onReview: ReturnType<typeof useStore>["reviewSubscriptionPayment"];
}) {
  const [q, setQ] = useState("");
  const term = useDeferredValue(q).trim().toLowerCase();
  const filtered = useMemo(
    () => (!term ? payments : payments.filter((p) => `${p.target} ${p.action} ${p.plan}`.toLowerCase().includes(term))),
    [payments, term],
  );

  const subPending = subPayments.filter((p) => p.status === "pending");
  const subReviewed = subPayments.filter((p) => p.status !== "pending");

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Stat icon={<TrendingUp className="w-4 h-4" />} label="Collected" value={formatTZS(accumulated)} />
        <Stat icon={<Clock className="w-4 h-4" />} label="Pending approvals" value={(pending.length + subPending.length).toLocaleString()} />
      </div>

      <div className="bg-white border rounded-2xl p-5">
        <h3 className="font-bold flex items-center gap-2"><CreditCard className="w-4 h-4" /> Subscription payments awaiting verification ({subPending.length})</h3>
        {subPending.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-3">No submitted receipts right now.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {subPending.map((p) => (
              <div key={p.id} className="border rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{p.store_name} · {p.plan}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    Receipt <span className="font-mono font-semibold text-foreground">{p.receipt_no}</span>
                    {p.payer_name ? ` · ${p.payer_name}` : ""} · {new Date(p.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-primary whitespace-nowrap">{formatTZS(p.amount)}</span>
                  <Button className="h-9" onClick={() => onReview(p.id, "approve")}>Approve</Button>
                  <Button variant="outline" className="h-9" onClick={() => onReview(p.id, "reject")}>Reject</Button>
                </div>
              </div>
            ))}
          </div>
        )}
        {subReviewed.length > 0 && (
          <div className="mt-4 border-t pt-3 space-y-1.5">
            {subReviewed.slice(0, 20).map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{p.store_name} · <span className="font-mono">{p.receipt_no}</span></span>
                <span className={`font-semibold ${p.status === "approved" ? "text-emerald-600" : "text-red-600"}`}>{p.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border rounded-2xl p-5">
        <h3 className="font-bold flex items-center gap-2"><Clock className="w-4 h-4" /> Pending approvals ({pending.length})</h3>
        <VirtualList
          items={pending}
          rowHeight={72}
          height={Math.min(300, Math.max(96, pending.length * 72))}
          empty="No pending payments. New submissions appear here."
          renderRow={(r) => (
            <div className="border rounded-xl px-3 h-[64px] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold truncate">{r.customer_name}</div>
                <div className="text-xs text-muted-foreground truncate">{new Date(r.created_at).toLocaleString()} · {storeName(r.store_id)}</div>
              </div>
              <div className="font-bold text-primary whitespace-nowrap">{formatTZS(r.amount)}</div>
            </div>
          )}
        />
      </div>

      <div className="bg-white border rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="font-bold">Payment history ({filtered.length.toLocaleString()})</h3>
          <Button variant="outline" className="h-9" onClick={() => downloadCsv(`bitepay-payments-${new Date().toISOString().slice(0, 10)}.csv`,
            [["timestamp", "store", "action", "days", "plan", "amount"], ...filtered.map((p) => [new Date(p.ts).toISOString(), p.target, p.action, p.days, p.plan, p.amount])])}>
            <Download className="w-4 h-4 mr-1.5" /> CSV
          </Button>
        </div>
        <SearchBox value={q} onChange={setQ} placeholder="Search store, plan, action…" />
        <VirtualList
          items={filtered}
          rowHeight={72}
          height={520}
          empty="No subscription payments recorded yet."
          renderRow={(p) => (
            <div className="border rounded-xl px-3 h-[64px] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold truncate">{p.target}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {new Date(p.ts).toLocaleString()} · {p.action.replace("_", " ")}{p.days ? ` · ${p.days > 0 ? "+" : ""}${p.days}d` : ""}
                </div>
              </div>
              {p.amount > 0
                ? <div className="font-bold text-primary whitespace-nowrap">{formatTZS(p.amount)}</div>
                : <div className="inline-flex items-center gap-1 text-amber-600 font-bold text-sm whitespace-nowrap"><Gift className="w-4 h-4" /> Gift</div>}
            </div>
          )}
        />
      </div>
    </>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative mt-3 mb-2">
      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-11 pl-9 rounded-xl" />
    </div>
  );
}

/* ------------------------------------------------------------------ users */

function UsersSection({ profiles, storeName }: { profiles: ReturnType<typeof useStore>["allProfiles"]; storeName: (id: string) => string }) {
  const [q, setQ] = useState("");
  const [role, setRole] = useState<"all" | "customer" | "staff">("all");
  const term = useDeferredValue(q).trim().toLowerCase();

  const filtered = useMemo(() => {
    return profiles.filter((p) => {
      if (role !== "all" && p.role !== role) return false;
      if (!term) return true;
      return `${p.full_name} ${p.phone ?? ""}`.toLowerCase().includes(term);
    });
  }, [profiles, role, term]);

  return (
    <div className="bg-white border rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="font-bold">Users ({filtered.length.toLocaleString()} of {profiles.length.toLocaleString()})</h3>
        <Button variant="outline" className="h-9" onClick={() => downloadCsv(`bitepay-users-${new Date().toISOString().slice(0, 10)}.csv`,
          [["name", "role", "phone", "user_id", "store", "wallet", "disabled"],
            ...filtered.map((p) => [p.full_name, p.role, p.phone ?? "", String(p.id), storeName(p.store_id ?? ""), p.wallet_balance ?? 0, p.disabled ? "yes" : "no"])])}>
          <Download className="w-4 h-4 mr-1.5" /> CSV
        </Button>
      </div>
      <SearchBox value={q} onChange={setQ} placeholder="Search name or phone…" />
      <div className="flex gap-1.5 mb-2">
        {(["all", "customer", "staff"] as const).map((r) => (
          <button key={r} onClick={() => setRole(r)}
            className={`px-3 h-8 rounded-full text-xs font-semibold border capitalize ${role === r ? "bg-primary text-white border-primary" : "hover:bg-muted"}`}>{r}</button>
        ))}
      </div>
      <VirtualList
        items={filtered}
        rowHeight={80}
        height={560}
        empty="No users match this search."
        renderRow={(p) => (
          <div className="border rounded-xl px-3 h-[72px] flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold truncate">{p.full_name}</div>
              <div className="text-xs text-muted-foreground truncate">{p.phone || "—"} · {storeName(p.store_id ?? "")}</div>
              <div className="text-[11px] text-muted-foreground/80 truncate">
                {p.role === "customer" ? `Wallet ${formatTZS(p.wallet_balance ?? 0)}` : `${p.staff_role ?? "staff"}${p.disabled ? " · disabled" : ""}`}
              </div>
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${p.role === "staff" ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-600"}`}>{p.role}</span>
          </div>
        )}
      />
    </div>
  );
}

/* ----------------------------------------------------------------- stores */

function StoresSection({ stores, allProfiles, adminData, selectedId, onSelect, onAddDays, onChangePlan, onSetStatus }: {
  stores: ReturnType<typeof useStore>["stores"];
  allProfiles: ReturnType<typeof useStore>["allProfiles"];
  adminData: ReturnType<typeof useStore>["adminData"];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddDays: (days: number, storeId?: string) => void;
  onChangePlan: (plan: SubscriptionPlan, storeId?: string) => void;
  onSetStatus: (status: "active" | "suspended", storeId?: string) => void;
}) {
  const [q, setQ] = useState("");
  const term = useDeferredValue(q).trim().toLowerCase();
  const filtered = useMemo(
    () => (!term ? stores : stores.filter((s) => `${s.name} ${s.location ?? ""}`.toLowerCase().includes(term))),
    [stores, term],
  );
  const store = stores.find((s) => s.id === selectedId) ?? null;

  const detail = useMemo(() => {
    if (!store) return null;
    const profiles = allProfiles.filter((p) => p.store_id === store.id);
    const orders = adminData.orders.filter((o) => o.store_id === store.id && !o.is_reversal);
    const t = adminData.treasuries[store.id] ?? { cash: 0, bank: 0 };
    return {
      customers: profiles.filter((p) => p.role === "customer").length,
      staff: profiles.filter((p) => p.role === "staff" && !p.disabled).length,
      revenue: orders.reduce((s, o) => s + o.total_amount, 0),
      liquidity: t.cash + t.bank,
      cash: t.cash, bank: t.bank,
    };
  }, [store, allProfiles, adminData]);

  return (
    <>
      <div className="bg-white border rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="font-bold">All stores ({filtered.length.toLocaleString()})</h3>
          <Button variant="outline" className="h-9" onClick={() => downloadCsv(`bitepay-stores-${new Date().toISOString().slice(0, 10)}.csv`,
            [["store", "location", "plan", "status", "days_left", "mrr"],
              ...filtered.map((s) => [s.name, s.location ?? "", PLAN_LABEL[s.subscription.plan], s.subscription.status, daysLeftOf(s.subscription.expires_at), PLAN_PRICE[s.subscription.plan]])])}>
            <Download className="w-4 h-4 mr-1.5" /> CSV
          </Button>
        </div>
        <SearchBox value={q} onChange={setQ} placeholder="Search store or location…" />
        <VirtualList
          items={filtered}
          rowHeight={132}
          height={520}
          empty="No stores match this search."
          renderRow={(s) => {
            const left = daysLeftOf(s.subscription.expires_at);
            const on = s.id === selectedId;
            return (
              <div className={`border rounded-xl p-3 h-[124px] ${on ? "border-primary bg-primary/5" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => onSelect(s.id)} className="text-left min-w-0">
                    <div className="font-bold truncate">{s.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{s.location || "—"}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Expires in <span className="font-semibold text-foreground">{left} days</span></div>
                  </button>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-slate-100 text-slate-600 whitespace-nowrap">{PLAN_LABEL[s.subscription.plan]}</span>
                </div>
                <div className="mt-2 flex gap-1.5 flex-wrap">
                  <Pill onClick={() => onAddDays(7, s.id)} tone="gift"><Gift className="w-3 h-3" /> +7d</Pill>
                  <Pill onClick={() => onAddDays(30, s.id)} tone="gift">+30d</Pill>
                  <Pill onClick={() => onChangePlan("starter", s.id)}>Starter</Pill>
                  <Pill onClick={() => onChangePlan("pro", s.id)}>Pro</Pill>
                  {s.subscription.status === "suspended"
                    ? <Pill onClick={() => onSetStatus("active", s.id)} tone="ok">Reactivate</Pill>
                    : <Pill onClick={() => onSetStatus("suspended", s.id)} tone="warn">Suspend</Pill>}
                </div>
              </div>
            );
          }}
        />
      </div>

      {store && detail && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat icon={<StoreIcon className="w-4 h-4" />} label="Active store" value={store.name} />
            <Stat icon={<Users className="w-4 h-4" />} label="Customers · Staff" value={`${detail.customers} · ${detail.staff}`} />
            <Stat icon={<Wallet className="w-4 h-4" />} label="Liquidity" value={formatTZS(detail.liquidity)} />
            <Stat icon={<TrendingUp className="w-4 h-4" />} label="Gross revenue" value={formatTZS(detail.revenue)} />
          </div>
          <SubscriptionTab
            plan={store.subscription.plan}
            status={store.subscription.status}
            expiresAt={store.subscription.expires_at}
            daysLeft={daysLeftOf(store.subscription.expires_at)}
            onAddDays={(d) => onAddDays(d, store.id)}
            onChangePlan={(p) => onChangePlan(p, store.id)}
            onSetStatus={(s) => onSetStatus(s, store.id)}
          />
        </>
      )}
    </>
  );
}

function Pill({ children, onClick, tone = "default" }: { children: React.ReactNode; onClick: () => void; tone?: "default" | "gift" | "warn" | "ok" }) {
  const map = {
    default: "bg-slate-100 text-slate-700 hover:bg-slate-200",
    gift: "bg-amber-100 text-amber-800 hover:bg-amber-200",
    warn: "bg-red-100 text-red-700 hover:bg-red-200",
    ok: "bg-emerald-600 text-white hover:bg-emerald-700",
  } as const;
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-1 px-2.5 h-7 rounded-full text-[11px] font-bold ${map[tone]}`}>{children}</button>
  );
}

/* ------------------------------------------------------------------- more */

function MoreSection({ log, adminName, stats, storeCount }: { log: SystemLogEntry[]; adminName: string; stats: Stats; storeCount: number }) {
  const [view, setView] = useState<"log" | "database" | "plans">("log");
  return (
    <>
      <div className="bg-white border rounded-2xl p-4 flex items-center justify-between gap-3">
        <div>
          <div className="font-bold">{adminName}</div>
          <div className="text-xs text-muted-foreground">{storeCount.toLocaleString()} stores · {stats.customers.toLocaleString()} customers · {stats.staff.toLocaleString()} staff</div>
        </div>
        <ShieldCheck className="w-5 h-5 text-primary" />
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {([["log", "Activity log"], ["plans", "Plan pricing"], ["database", "Database"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setView(id)}
            className={`px-3 h-9 rounded-full text-xs font-bold border ${view === id ? "bg-primary text-white border-primary" : "bg-white hover:bg-muted"}`}>{label}</button>
        ))}
      </div>

      {view === "log" && <SystemLogTab entries={log} />}
      {view === "plans" && <PlanPricingPanel />}
      {view === "database" && <DatabaseTab />}
    </>
  );
}

function PlanPricingPanel() {
  const plans: SubscriptionPlan[] = ["trial", "starter", "pro", "enterprise"];
  return (
    <div className="bg-white border rounded-2xl p-5">
      <h3 className="font-bold">Plan pricing</h3>
      <p className="text-xs text-muted-foreground mb-3">Rates applied to every new subscription and renewal.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {plans.map((p) => (
          <div key={p} className="border rounded-xl p-4">
            <div className="font-bold">{PLAN_LABEL[p]}</div>
            <div className="text-2xl font-extrabold mt-1">{PLAN_PRICE[p] === 0 ? "Free" : formatTZS(PLAN_PRICE[p])}</div>
            <div className="text-xs text-muted-foreground mt-1">per month</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SystemLogTab({ entries }: { entries: SystemLogEntry[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const term = useDeferredValue(q).trim().toLowerCase();

  const categories = useMemo(() => ["All", ...Array.from(new Set(entries.map((e) => e.category))).sort()], [entries]);
  const filtered = useMemo(() => entries.filter((e) =>
    (cat === "All" || e.category === cat) &&
    (!term || `${e.action} ${e.detail} ${e.store} ${e.category}`.toLowerCase().includes(term))
  ), [entries, term, cat]);

  return (
    <div className="bg-white border rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-bold flex items-center gap-2"><History className="w-4 h-4" /> Activity log</h3>
          <p className="text-xs text-muted-foreground">Every recorded event across all stores — {entries.length.toLocaleString()} entries.</p>
        </div>
        <Button variant="outline" className="h-9" onClick={() => downloadCsv(`bitepay-system-log-${new Date().toISOString().slice(0, 10)}.csv`,
          [["timestamp", "category", "action", "detail", "store"], ...filtered.map((e) => [new Date(e.ts).toISOString(), e.category, e.action, e.detail, e.store])])}>
          <Download className="w-4 h-4 mr-1.5" /> CSV
        </Button>
      </div>

      <SearchBox value={q} onChange={setQ} placeholder="Search action, detail, store…" />
      <div className="flex gap-1.5 flex-wrap mb-2">
        {categories.map((c) => (
          <button key={c} onClick={() => setCat(c)}
            className={`px-3 h-8 rounded-full text-xs font-semibold border ${cat === c ? "bg-primary text-white border-primary" : "hover:bg-muted"}`}>{c}</button>
        ))}
      </div>

      <VirtualList
        items={filtered}
        rowHeight={88}
        height={560}
        empty="No events match this filter."
        renderRow={(e) => (
          <div className="border rounded-xl px-3 h-[80px] flex items-start justify-between gap-3 py-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">{e.category}</span>
                <p className="font-semibold text-sm truncate">{e.action}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{e.detail}</p>
              <p className="text-[11px] text-muted-foreground/80 truncate">{e.store}</p>
            </div>
            <p className="text-[11px] text-muted-foreground whitespace-nowrap">{e.ts ? new Date(e.ts).toLocaleString() : "—"}</p>
          </div>
        )}
      />
    </div>
  );
}

/* ------------------------------------------------------- subscription tab */

function StatusBadge({ status, daysLeft }: { status: string; daysLeft: number }) {
  const expired = daysLeft === 0 && status !== "suspended";
  const tone = expired ? "bg-red-100 text-red-700" : status === "suspended" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700";
  return <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full ${tone}`}>{expired ? "Expired" : status}</span>;
}

function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const map: Record<TicketStatus, string> = {
    open: "bg-blue-100 text-blue-700",
    in_progress: "bg-amber-100 text-amber-700",
    resolved: "bg-emerald-100 text-emerald-700",
    closed: "bg-slate-100 text-slate-600",
  };
  return <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${map[status]}`}>{status.replace("_", " ")}</span>;
}

function SubscriptionTab({ plan, status, expiresAt, daysLeft, onAddDays, onChangePlan, onSetStatus }: {
  plan: SubscriptionPlan; status: string; expiresAt: number; daysLeft: number;
  onAddDays: (d: number) => void; onChangePlan: (p: SubscriptionPlan) => void; onSetStatus: (s: "active" | "suspended") => void;
}) {
  const [customDays, setCustomDays] = useState(30);
  const plans: SubscriptionPlan[] = ["trial", "starter", "pro", "enterprise"];
  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="font-bold">Current subscription</h3>
          <StatusBadge status={status} daysLeft={daysLeft} />
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <Kv k="Plan" v={PLAN_LABEL[plan]} />
          <Kv k="Status" v={status} />
          <Kv k="Expires" v={new Date(expiresAt).toLocaleDateString()} />
          <Kv k="Days left" v={String(daysLeft)} />
          <Kv k="Monthly price" v={formatTZS(PLAN_PRICE[plan])} />
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-5">
        <h3 className="font-bold mb-3">Add days to subscription</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {[7, 14, 30, 60, 90, 180, 365].map((d) => (
            <button key={d} onClick={() => onAddDays(d)} className="px-4 h-10 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">+{d} days</button>
          ))}
        </div>
        <div className="flex items-end gap-2 flex-wrap">
          <div className="flex-1 min-w-[140px]">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Custom (± days)</Label>
            <Input type="number" value={customDays} onChange={(e) => setCustomDays(Number(e.target.value))} className="h-11 mt-1.5 rounded-xl" />
          </div>
          <Button onClick={() => onAddDays(customDays)} className="h-11 rounded-xl"><Plus className="w-4 h-4 mr-1" />Apply</Button>
          <Button variant="outline" onClick={() => onAddDays(-Math.abs(customDays))} className="h-11 rounded-xl"><Minus className="w-4 h-4 mr-1" />Deduct</Button>
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-5">
        <h3 className="font-bold mb-3">Change plan</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {plans.map((p) => (
            <button key={p} onClick={() => onChangePlan(p)}
              className={`text-left p-4 rounded-xl border-2 transition ${plan === p ? "border-primary bg-primary/5" : "border-transparent bg-slate-50 hover:border-slate-300"}`}>
              <p className="font-bold">{PLAN_LABEL[p]}</p>
              <p className="text-2xl font-extrabold mt-1">{PLAN_PRICE[p] === 0 ? "Free" : formatTZS(PLAN_PRICE[p])}</p>
              <p className="text-xs text-muted-foreground mt-1">{p === "trial" ? "14-day evaluation" : p === "starter" ? "1 outlet, basic reports" : p === "pro" ? "Multi-cashier, analytics" : "Unlimited, priority support"}</p>
              {plan === p && <p className="text-xs font-bold text-primary mt-2">CURRENT</p>}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-5">
        <h3 className="font-bold mb-3">Account controls</h3>
        <div className="flex flex-wrap gap-2">
          {status !== "suspended" ? (
            <Button onClick={() => onSetStatus("suspended")} variant="outline" className="border-amber-500 text-amber-700"><Pause className="w-4 h-4 mr-1" /> Suspend account</Button>
          ) : (
            <Button onClick={() => onSetStatus("active")} className="bg-emerald-600 hover:bg-emerald-700"><Play className="w-4 h-4 mr-1" /> Reactivate</Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2">Suspended stores can't sign in until reactivated by an admin.</p>
      </div>
    </div>
  );
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{k}</p>
      <p className="font-semibold mt-0.5 capitalize">{v}</p>
    </div>
  );
}

/* ---------------------------------------------------------------- tickets */

function TicketsTab() {
  const { tickets, replyToTicket, updateTicketStatus } = useStore();
  const [selected, setSelected] = useState<string | null>(tickets[0]?.id ?? null);
  const [reply, setReply] = useState("");
  const [q, setQ] = useState("");
  const term = useDeferredValue(q).trim().toLowerCase();
  const list = useMemo(() => (!term ? tickets : tickets.filter((t) => `${t.subject} ${t.created_by_name}`.toLowerCase().includes(term))), [tickets, term]);
  const active = tickets.find((t) => t.id === selected);

  const send = () => {
    if (!active || !reply.trim()) return;
    replyToTicket(active.id, reply);
    setReply("");
  };

  return (
    <div className="grid md:grid-cols-[320px_1fr] gap-4">
      <div className="bg-white border rounded-2xl p-3">
        <div className="px-1 pb-2 font-bold text-sm">All tickets ({list.length.toLocaleString()})</div>
        <SearchBox value={q} onChange={setQ} placeholder="Search tickets…" />
        <VirtualList
          items={list}
          rowHeight={76}
          height={480}
          empty="No tickets yet. Users can send support messages from the app."
          renderRow={(t) => (
            <button onClick={() => setSelected(t.id)} className={`w-full text-left border rounded-xl px-3 h-[68px] flex flex-col justify-center ${selected === t.id ? "border-primary bg-primary/5" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-sm truncate flex-1">{t.subject}</p>
                <TicketStatusBadge status={t.status} />
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">{t.created_by_name} · {t.priority}</p>
            </button>
          )}
        />
      </div>
      <div className="bg-white border rounded-2xl p-5">
        {!active ? (
          <p className="text-sm text-muted-foreground">Select a ticket to view details.</p>
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-lg font-bold">{active.subject}</h3>
                <p className="text-xs text-muted-foreground">#{active.id} · {active.category} · {active.priority} priority · from {active.created_by_name}</p>
              </div>
              <div className="flex gap-1 flex-wrap">
                {(["open", "in_progress", "resolved", "closed"] as TicketStatus[]).map((s) => (
                  <button key={s} onClick={() => updateTicketStatus(active.id, s)}
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${active.status === s ? "bg-primary text-white" : "bg-slate-100 hover:bg-slate-200"}`}>
                    {s.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 space-y-3 max-h-[380px] overflow-auto">
              <Bubble from="store" author={active.created_by_name} body={active.message} at={active.created_at} />
              {active.replies.map((r) => <Bubble key={r.id} from={r.from} author={r.author_name} body={r.body} at={r.created_at} />)}
            </div>
            <div className="mt-4 pt-3 border-t">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Admin reply</Label>
              <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} className="mt-1.5 w-full rounded-xl border p-3 text-sm" placeholder="Write a reply to the store..." />
              <div className="flex justify-end mt-2">
                <Button onClick={send} disabled={!reply.trim()}><CheckCircle2 className="w-4 h-4 mr-1" /> Send reply</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Bubble({ from, author, body, at }: { from: "store" | "admin"; author: string; body: string; at: number }) {
  const isAdmin = from === "admin";
  return (
    <div className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] rounded-2xl p-3 text-sm ${isAdmin ? "bg-primary text-white" : "bg-slate-100"}`}>
        <p className={`text-[10px] uppercase tracking-wider font-bold mb-1 ${isAdmin ? "text-white/70" : "text-muted-foreground"}`}>
          {isAdmin ? <>{author} <ChefHat className="inline w-3 h-3 ml-0.5" /></> : author}
        </p>
        <p className="whitespace-pre-wrap">{body}</p>
        <p className={`text-[10px] mt-1.5 ${isAdmin ? "text-white/60" : "text-muted-foreground"}`}>{new Date(at).toLocaleString()}</p>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- database */

type DbProfile = { id: DbProfileId; label: string; description: string; connection: string };
const DB_PROFILES: DbProfile[] = [
  { id: "memory", label: "In-Memory (Demo)", description: "Client-side only — no server sync. Great for demos and previews.", connection: "browser://localStorage" },
  { id: "postgres", label: "Postgres (Coolify · Contabo)", description: "Default. Data is saved locally and synchronised to the Contabo database — offline changes upload automatically once back online.", connection: "postgres://…@contabo:5432/bitepay" },
];

function DatabaseTab() {
  const [active, setActive] = useState<DbProfileId>(() => activeDbProfile());
  const { sync } = useStore();
  const [health, setHealth] = useState<{ ok?: boolean; latency_ms?: number; version?: string; table_count?: number; error?: string; loading: boolean; checked_at?: number }>({ loading: false });

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(DB_PROFILE_KEY, active);
  }, [active]);

  const ping = async () => {
    setHealth((h) => ({ ...h, loading: true }));
    try {
      const res = await fetch("/api/public/health/db");
      const json = await res.json();
      setHealth({ ...json, loading: false, checked_at: Date.now() });
    } catch (err) {
      setHealth({ ok: false, loading: false, error: err instanceof Error ? err.message : String(err), checked_at: Date.now() });
    }
  };

  useEffect(() => { if (active === "postgres") void ping(); }, [active]);

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1"><Database className="w-5 h-5 text-primary" /><h3 className="font-bold">Active database connection</h3></div>
        <p className="text-sm text-muted-foreground mb-4">Pick which backend the app should treat as the source of truth. Selection is stored on this device.</p>
        <div className="grid gap-2">
          {DB_PROFILES.map((p) => {
            const selected = active === p.id;
            return (
              <label key={p.id} className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition ${selected ? "border-primary bg-primary/5" : "border-transparent bg-slate-50 hover:border-slate-300"}`}>
                <input type="radio" name="db-profile" className="mt-1 accent-primary" checked={selected} onChange={() => setActive(p.id)} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-bold">{p.label}</div>
                    {selected && <span className="text-[10px] font-bold uppercase tracking-wider bg-primary text-white px-2 py-0.5 rounded-full">Active</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{p.description}</div>
                  <div className="text-[11px] font-mono text-slate-500 mt-1">{p.connection}</div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="font-bold">Synchronisation</h3>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${sync.status === "synced" ? "bg-emerald-100 text-emerald-700" : sync.status === "error" ? "bg-red-100 text-red-700" : sync.status === "offline" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{sync.status}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <Kv k="Revision" v={String(sync.revision)} />
          <Kv k="Queued changes" v={sync.pendingPush ? "Yes — will upload" : "None"} />
          <Kv k="Last synced" v={sync.lastSyncedAt ? new Date(sync.lastSyncedAt).toLocaleTimeString() : "—"} />
        </div>
        {sync.error && <div className="mt-3 p-3 rounded-lg bg-red-50 text-red-700 text-xs break-all">{sync.error}</div>}
        <div className="flex gap-2 mt-4 flex-wrap">
          <button onClick={() => void sync.pushNow()} className="h-9 px-3 rounded-lg bg-primary text-white text-sm font-semibold">Push to database</button>

          <button onClick={() => void sync.pullNow()} className="h-9 px-3 rounded-lg border text-sm font-semibold hover:bg-muted">Pull from database</button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">Changes are saved on this device instantly and uploaded to Postgres automatically whenever there is a connection.</p>
      </div>

      <div className="bg-white border rounded-2xl p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="font-bold">Postgres health</h3>
          <button onClick={ping} disabled={health.loading} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-sm font-semibold hover:bg-muted disabled:opacity-60">
            <RefreshCw className={`w-4 h-4 ${health.loading ? "animate-spin" : ""}`} /> {health.loading ? "Checking…" : "Re-check"}
          </button>
        </div>
        {health.checked_at ? (
          health.ok ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <Kv k="Status" v="Connected" />
              <Kv k="Latency" v={`${health.latency_ms} ms`} />
              <Kv k="Tables" v={String(health.table_count ?? 0)} />
              <Kv k="Version" v={(health.version ?? "").split(" on ")[0]} />
              <Kv k="Checked" v={new Date(health.checked_at).toLocaleTimeString()} />
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              <div className="font-semibold">Connection failed</div>
              <div className="text-xs mt-1 break-all">{health.error}</div>
            </div>
          )
        ) : (
          <p className="text-sm text-muted-foreground">Run a check to see live connection details.</p>
        )}
      </div>
    </div>
  );
}
