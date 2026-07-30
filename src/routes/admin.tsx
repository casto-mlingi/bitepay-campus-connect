import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, ArrowLeft, LogOut, Store as StoreIcon, Users, Wallet, TrendingUp, Ticket as TicketIcon, Plus, Minus, Pause, Play, CheckCircle2, AlertTriangle, ChefHat, Database, RefreshCw } from "lucide-react";
import { useStore, formatTZS, PLAN_LABEL, PLAN_PRICE, type SubscriptionPlan, type TicketStatus } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({ meta: [
    { title: "Admin Console — BitePay" },
    { name: "description", content: "BitePay SaaS admin console — monitor stores, subscriptions and support tickets." },
    { property: "og:title", content: "BitePay Admin Console" },
    { property: "og:description", content: "Super admin dashboard for BitePay." },
  ] }),
});

function AdminPage() {
  const { isAdminSignedIn, adminLogin, adminLogout } = useStore();
  if (!isAdminSignedIn) return <AdminLogin onLogin={adminLogin} />;
  return <AdminDashboard onLogout={adminLogout} />;
}

function AdminLogin({ onLogin }: { onLogin: (u: string, p: string) => boolean }) {
  const navigate = useNavigate();
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

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const {
    store, profiles, orders, transactions, tickets, cash, bank,
    addSubscriptionDays, changePlan, setSubscriptionStatus, subscriptionDaysLeft,
    superAdmin, adminAuditLog,
  } = useStore();
  const [tab, setTab] = useState<"overview" | "subscription" | "tickets" | "database" | "audit">("overview");

  const customerCount = profiles.filter((p) => p.role === "customer").length;
  const staffCount = profiles.filter((p) => p.role === "staff" && !p.disabled).length;
  const totalRevenue = orders.filter((o) => !o.is_reversal).reduce((s, o) => s + o.total_amount, 0);
  const walletLiability = profiles.filter((p) => p.role === "customer").reduce((s, p) => s + p.wallet_balance, 0);
  const openTickets = tickets.filter((t) => t.status === "open" || t.status === "in_progress").length;
  const daysLeft = subscriptionDaysLeft();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary grid place-items-center"><ShieldCheck className="w-5 h-5" /></div>
            <div>
              <div className="font-bold leading-tight">BitePay Admin</div>
              <div className="text-[10px] uppercase tracking-widest text-slate-400">SaaS Control Panel</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right text-sm">
              <div className="font-semibold">{superAdmin.full_name}</div>
              <div className="text-[10px] uppercase tracking-widest text-slate-400">Super Admin</div>
            </div>
            <Link to="/" className="text-xs text-slate-300 hover:text-white">App</Link>
            <button onClick={onLogout} className="p-2 rounded-lg hover:bg-slate-800"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 lg:px-8 flex gap-1 overflow-x-auto pb-2">
          {(["overview", "subscription", "tickets", "database", "audit"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize whitespace-nowrap ${tab === t ? "bg-primary text-white" : "text-slate-300 hover:bg-slate-800"}`}>
              {t === "audit" ? "Audit log" : t}
              {t === "tickets" && openTickets > 0 && <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{openTickets}</span>}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-6">
        {!store && (
          <div className="bg-white border border-amber-300 rounded-2xl p-6 flex items-center gap-3 text-amber-800">
            <AlertTriangle className="w-5 h-5" /> No store has been provisioned yet. Ask the owner to run first-time setup.
          </div>
        )}

        {tab === "overview" && store && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard icon={<StoreIcon className="w-5 h-5" />} label="Active store" value={store.name} sub={store.location || "—"} />
              <MetricCard icon={<Users className="w-5 h-5" />} label="Customers · Staff" value={`${customerCount} · ${staffCount}`} sub={`${transactions.length} txns`} />
              <MetricCard icon={<Wallet className="w-5 h-5" />} label="Liquidity" value={formatTZS(cash + bank)} sub={`Cash ${formatTZS(cash)} / Bank ${formatTZS(bank)}`} />
              <MetricCard icon={<TrendingUp className="w-5 h-5" />} label="Gross revenue" value={formatTZS(totalRevenue)} sub={`Wallet liability ${formatTZS(walletLiability)}`} />
            </div>

            <div className="bg-white border rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Subscription</p>
                  <h2 className="text-2xl font-bold mt-1">{PLAN_LABEL[store.subscription.plan]}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {store.subscription.status === "active" && daysLeft > 0 && <>Active · {daysLeft} day{daysLeft === 1 ? "" : "s"} left</>}
                    {store.subscription.status === "suspended" && <span className="text-amber-600">Suspended by admin</span>}
                    {daysLeft === 0 && store.subscription.status !== "suspended" && <span className="text-red-600">Expired</span>}
                  </p>
                </div>
                <StatusBadge status={store.subscription.status} daysLeft={daysLeft} />
              </div>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                <button onClick={() => addSubscriptionDays(7)} className="h-10 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 flex items-center justify-center gap-1"><Plus className="w-4 h-4" /> 7 days</button>
                <button onClick={() => addSubscriptionDays(30)} className="h-10 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 flex items-center justify-center gap-1"><Plus className="w-4 h-4" /> 30 days</button>
                <button onClick={() => addSubscriptionDays(90)} className="h-10 rounded-lg bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800 flex items-center justify-center gap-1"><Plus className="w-4 h-4" /> 90 days</button>
                <button onClick={() => setTab("subscription")} className="h-10 rounded-lg border text-sm font-semibold hover:bg-muted">Manage plan →</button>
              </div>
            </div>

            <div className="bg-white border rounded-2xl p-6">
              <h3 className="font-bold flex items-center gap-2"><TicketIcon className="w-4 h-4" /> Recent tickets</h3>
              {tickets.length === 0 ? (
                <p className="text-sm text-muted-foreground mt-3">No support tickets yet.</p>
              ) : (
                <div className="mt-3 divide-y">
                  {tickets.slice(0, 5).map((t) => (
                    <div key={t.id} className="py-3 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{t.subject}</p>
                        <p className="text-xs text-muted-foreground">by {t.created_by_name} · {new Date(t.created_at).toLocaleString()}</p>
                      </div>
                      <TicketStatusBadge status={t.status} />
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => setTab("tickets")} className="mt-3 text-sm font-semibold text-primary">Manage tickets →</button>
            </div>
          </>
        )}

        {tab === "subscription" && store && <SubscriptionTab
          plan={store.subscription.plan} status={store.subscription.status}
          expiresAt={store.subscription.expires_at} daysLeft={daysLeft}
          onAddDays={addSubscriptionDays} onChangePlan={changePlan} onSetStatus={setSubscriptionStatus}
        />}

        {tab === "tickets" && <TicketsTab />}

        {tab === "database" && <DatabaseTab />}

        {tab === "audit" && (
          <div className="bg-white border rounded-2xl p-6">
            <h3 className="font-bold mb-3">Admin audit log</h3>
            {adminAuditLog.length === 0 ? <p className="text-sm text-muted-foreground">No actions recorded yet.</p> : (
              <div className="divide-y">
                {adminAuditLog.map((a) => (
                  <div key={a.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">{a.action}</p>
                      <p className="text-xs text-muted-foreground">{a.detail}</p>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-nowrap">{new Date(a.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function MetricCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border rounded-2xl p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-widest">{icon}{label}</div>
      <div className="text-xl font-bold mt-1.5 truncate">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</div>}
    </div>
  );
}

function StatusBadge({ status, daysLeft }: { status: string; daysLeft: number }) {
  const expired = daysLeft === 0 && status !== "suspended";
  const tone = expired ? "bg-red-100 text-red-700" : status === "suspended" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700";
  const label = expired ? "Expired" : status;
  return <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full ${tone}`}>{label}</span>;
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
      <div className="bg-white border rounded-2xl p-6">
        <h3 className="font-bold">Current subscription</h3>
        <div className="mt-4 grid sm:grid-cols-3 gap-4 text-sm">
          <Kv k="Plan" v={PLAN_LABEL[plan]} />
          <Kv k="Status" v={status} />
          <Kv k="Expires" v={new Date(expiresAt).toLocaleDateString()} />
          <Kv k="Days left" v={String(daysLeft)} />
          <Kv k="Monthly price" v={formatTZS(PLAN_PRICE[plan])} />
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-6">
        <h3 className="font-bold mb-3">Add days to subscription</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {[7, 14, 30, 60, 90, 180, 365].map((d) => (
            <button key={d} onClick={() => onAddDays(d)} className="px-4 h-10 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">+{d} days</button>
          ))}
        </div>
        <div className="flex items-end gap-2 max-w-md">
          <div className="flex-1">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Custom (± days)</Label>
            <Input type="number" value={customDays} onChange={(e) => setCustomDays(Number(e.target.value))} className="h-11 mt-1.5" />
          </div>
          <Button onClick={() => onAddDays(customDays)} className="h-11"><Plus className="w-4 h-4 mr-1" />Apply</Button>
          <Button variant="outline" onClick={() => onAddDays(-Math.abs(customDays))} className="h-11"><Minus className="w-4 h-4 mr-1" />Deduct</Button>
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-6">
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

      <div className="bg-white border rounded-2xl p-6">
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

function TicketsTab() {
  const { tickets, replyToTicket, updateTicketStatus } = useStore();
  const [selected, setSelected] = useState<string | null>(tickets[0]?.id ?? null);
  const [reply, setReply] = useState("");
  const active = tickets.find((t) => t.id === selected);

  const send = () => {
    if (!active || !reply.trim()) return;
    replyToTicket(active.id, reply);
    setReply("");
  };

  return (
    <div className="grid md:grid-cols-[320px_1fr] gap-4">
      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="p-4 border-b font-bold text-sm">All tickets ({tickets.length})</div>
        <div className="max-h-[600px] overflow-auto divide-y">
          {tickets.length === 0 && <p className="p-4 text-sm text-muted-foreground">No tickets yet.</p>}
          {tickets.map((t) => (
            <button key={t.id} onClick={() => setSelected(t.id)}
              className={`w-full text-left p-3 hover:bg-slate-50 ${selected === t.id ? "bg-primary/5" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-sm truncate flex-1">{t.subject}</p>
                <TicketStatusBadge status={t.status} />
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">{t.created_by_name} · {t.priority}</p>
            </button>
          ))}
        </div>
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
              <div className="flex gap-1">
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

type DbProfile = { id: DbProfileId; label: string; description: string; connection: string };
const DB_PROFILES: DbProfile[] = [
  { id: "memory", label: "In-Memory (Demo)", description: "Client-side only — no server sync. Great for demos and previews.", connection: "browser://localStorage" },
  { id: "postgres", label: "Postgres (Coolify · Contabo)", description: "Default. Data is saved locally and synchronised to the Contabo database — offline changes upload automatically once back online.", connection: "postgres://…@contabo:5432/bitepay" },
];


function DatabaseTab() {
  const [active, setActive] = useState<DbProfileId>(() => {
    return activeDbProfile();
  });
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

  useEffect(() => { if (active === "postgres") ping(); }, [active]);

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-1"><Database className="w-5 h-5 text-primary" /><h3 className="font-bold">Active database connection</h3></div>
        <p className="text-sm text-muted-foreground mb-4">Pick which backend the app should treat as the source of truth. Selection is stored on this device.</p>
        <div className="grid gap-2">
          {DB_PROFILES.map((p) => {
            const selected = active === p.id;
            return (
              <label key={p.id} className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition ${selected ? "border-primary bg-primary/5" : "border-transparent bg-slate-50 hover:border-slate-300"}`}>
                <input
                  type="radio"
                  name="db-profile"
                  className="mt-1 accent-primary"
                  checked={selected}
                  onChange={() => setActive(p.id)}
                />
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

      <div className="bg-white border rounded-2xl p-6">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="font-bold">Postgres health</h3>
          <button onClick={ping} disabled={health.loading} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-sm font-semibold hover:bg-muted disabled:opacity-60">
            <RefreshCw className={`w-4 h-4 ${health.loading ? "animate-spin" : ""}`} /> {health.loading ? "Checking…" : "Re-check"}
          </button>
        </div>
        {health.checked_at ? (
          health.ok ? (
            <div className="grid sm:grid-cols-3 gap-3 text-sm">
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

