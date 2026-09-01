import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BadgePercent, Receipt, Users, Wallet, Banknote, Clock, Activity } from "lucide-react";
import { useStore, formatTZS } from "@/lib/store";
import { StaffShell } from "@/components/staff-shell";
import { AccessDenied } from "@/components/access-denied";

export const Route = createFileRoute("/my-performance")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search['id'] === "string" ? (search['id'] as string) : "",
    period: typeof search['period'] === "string" ? (search['period'] as string) : "month",
  }),
  component: PerformancePage,
  head: () => ({ meta: [
    { title: "Staff performance & commission — BitePay" },
    { name: "description", content: "Track staff activity, customers served and commission earned in your BitePay canteen." },
    { property: "og:title", content: "Staff performance & commission — BitePay" },
    { property: "og:description", content: "Track staff activity, customers served and commission earned in your BitePay canteen." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

const PERIODS: { key: string; label: string; from: () => number }[] = [
  { key: "today", label: "Today", from: () => new Date(new Date().setHours(0, 0, 0, 0)).getTime() },
  { key: "week", label: "This week", from: () => Date.now() - 7 * 86400000 },
  { key: "month", label: "This month", from: () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime() },
  { key: "all", label: "All time", from: () => 0 },
];

function PerformancePage() {
  const { currentUser, profiles, staffPerformance, can } = useStore();
  const { id, period } = Route.useSearch();
  const navigate = useNavigate();
  const [p, setP] = useState(period);

  useEffect(() => {
    if (!currentUser) navigate({ to: "/" });
    else if (currentUser.role !== "staff") navigate({ to: "/dashboard" });
  }, [currentUser, navigate]);

  const targetId = id || currentUser?.id || "";
  const member = profiles.find((x) => x.id === targetId) ?? currentUser;
  const from = useMemo(() => (PERIODS.find((x) => x.key === p) ?? PERIODS[2]).from(), [p]);
  const stats = useMemo(
    () => (member ? staffPerformance(member.id, { from }) : null),
    [member, from, staffPerformance],
  );

  if (!currentUser || currentUser.role !== "staff" || !member || !stats) return null;
  const viewingOther = member.id !== currentUser.id;
  if (viewingOther && !can("team.view")) return <StaffShell><AccessDenied feature="Staff performance" /></StaffShell>;

  return (
    <StaffShell active="team">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Activity className="w-7 h-7 text-primary" /> {viewingOther ? member.full_name : "My performance"}</h1>
          <p className="text-muted-foreground capitalize">{member.staff_role ?? "cashier"} · activity log & commission</p>
        </div>
        <div className="flex gap-1 bg-muted rounded-xl p-1">
          {PERIODS.map((x) => (
            <button
              key={x.key}
              onClick={() => { setP(x.key); navigate({ to: "/my-performance", search: { id, period: x.key } }); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${p === x.key ? "bg-background shadow-sm" : "text-muted-foreground"}`}
            >{x.label}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat icon={<Receipt className="w-4 h-4" />} label="Orders handled" value={String(stats.orders)} />
        <Stat icon={<Users className="w-4 h-4" />} label="Customers served" value={String(stats.customersServed)} />
        <Stat icon={<Banknote className="w-4 h-4" />} label="Sales value" value={formatTZS(stats.sales)} />
        <Stat icon={<BadgePercent className="w-4 h-4" />} label={`Commission (${stats.commissionRate}%)`} value={formatTZS(stats.commission)} tone />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="bg-surface border rounded-2xl p-5 space-y-3">
          <h2 className="font-bold">Collections</h2>
          <Line icon={<Banknote className="w-4 h-4" />} label="Cash / mobile" value={formatTZS(stats.cashCollected)} />
          <Line icon={<Wallet className="w-4 h-4" />} label="Wallet charged" value={formatTZS(stats.walletCollected)} />
          <Line icon={<Clock className="w-4 h-4" />} label="Shifts worked" value={String(stats.shifts)} />
          <p className="text-xs text-muted-foreground pt-2 border-t">
            Commission is {stats.commissionRate}% of the sales value this member handled. Owners set the default rate in
            Settings and can override it per member in Team.
          </p>
        </div>

        <div className="bg-surface border rounded-2xl lg:col-span-2 overflow-hidden">
          <div className="px-5 py-3 border-b font-bold">Activity log</div>
          <div className="divide-y max-h-[560px] overflow-y-auto">
            {stats.feed.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No activity in this period.</div>}
            {stats.feed.map((f) => (
              <div key={f.id} className="px-5 py-3 flex items-start justify-between gap-3 text-sm">
                <div>
                  <div className="font-semibold">{f.title}</div>
                  <div className="text-xs text-muted-foreground">{f.detail}</div>
                </div>
                <div className="text-right shrink-0">
                  {f.amount != null && <div className="font-bold">{formatTZS(f.amount)}</div>}
                  <div className="text-[11px] text-muted-foreground">{new Date(f.at).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </StaffShell>
  );
}

function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${tone ? "bg-primary/5 border-primary/20" : "bg-surface"}`}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

function Line({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">{icon}{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
