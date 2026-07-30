import { Link, useNavigate } from "@tanstack/react-router";
import { ChefHat, LogOut, LayoutDashboard, Store, Package, BarChart3, Maximize2, Minimize2, Wallet, Users, ClipboardCheck, WifiOff, Wifi, Users2, Settings } from "lucide-react";
import { useStore } from "@/lib/store";
import { useEffect, useState, type ReactNode } from "react";
import { SyncPill } from "@/components/sync-pill";

export type StaffTab = "orders" | "pos" | "inventory" | "analytics" | "finance" | "customers" | "shift" | "team" | "settings" | "stores";

export function StaffShell({ children, active }: { children: ReactNode; active?: StaffTab }) {
  const { currentUser, logout, activeShift, isOnline, pendingSales, hasStaffRole, can, store, subscriptionDaysLeft, isSubscriptionBlocked, topUpRequests, myStores, currentStoreId, switchStore } = useStore();

  const pendingTopUps = topUpRequests.filter((r) => r.status === "pending").length;
  const navigate = useNavigate();
  const [isFull, setIsFull] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch { /* ignore */ }
  };

  const signOut = () => { logout(); navigate({ to: "/" }); };

  const role = currentUser?.staff_role ?? "cashier";
  const roleTone = role === "owner" ? "bg-amber-100 text-amber-700" : role === "supervisor" ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-700";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-surface border-b">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link to="/staff" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-primary grid place-items-center text-white">
                <ChefHat className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold leading-tight">{store?.name ?? "BitePay"}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Staff Console</div>
              </div>
            </Link>
            {myStores.length > 1 && (
              <select
                aria-label="Switch store"
                value={currentStoreId ?? ""}
                onChange={(e) => switchStore(e.target.value)}
                className="hidden lg:block h-9 max-w-[180px] rounded-lg border bg-background px-2 text-sm font-medium"
              >
                {myStores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}

            <nav className="hidden md:flex items-center gap-1">
              <TopLink to="/staff" icon={<LayoutDashboard className="w-4 h-4" />} label="Live Orders" active={active === "orders"} />
              <TopLink to="/pos" icon={<Store className="w-4 h-4" />} label="POS" active={active === "pos"} />
              <TopLink to="/shift" icon={<ClipboardCheck className="w-4 h-4" />} label="Shift" active={active === "shift"} />
              <TopLink to="/customers" icon={<Users className="w-4 h-4" />} label="Customers" active={active === "customers"} badge={pendingTopUps} />
              {hasStaffRole("supervisor") && <TopLink to="/inventory" icon={<Package className="w-4 h-4" />} label="Inventory" active={active === "inventory"} />}
              {hasStaffRole("supervisor") && <TopLink to="/finance" icon={<Wallet className="w-4 h-4" />} label="Finance" active={active === "finance"} />}
              {hasStaffRole("supervisor") && <TopLink to="/analytics" icon={<BarChart3 className="w-4 h-4" />} label="Analytics" active={active === "analytics"} />}
              {can("team.view") && <TopLink to="/team" icon={<Users2 className="w-4 h-4" />} label="Team" active={active === "team"} />}
              {can("settings.manage") && <TopLink to="/settings" icon={<Settings className="w-4 h-4" />} label="Settings" active={active === "settings"} />}
              {(myStores.length > 1 || can("settings.manage")) && <TopLink to="/stores" icon={<Building2 className="w-4 h-4" />} label="Stores" active={active === "stores"} />}

            </nav>
          </div>
          <div className="flex items-center gap-2">
            {activeShift ? (
              <Link to="/shift" className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Shift open
              </Link>
            ) : (
              <Link to="/shift" className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1.5 rounded-full hover:bg-muted/70">
                Open shift
              </Link>
            )}
            <SyncPill className="hidden sm:inline-flex" />
            <span className={`hidden sm:inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full ${isOnline ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isOnline ? "Online" : `Offline · ${pendingSales.length} queued`}
            </span>
            <button
              onClick={toggleFullscreen}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80"
              title={isFull ? "Exit full screen" : "Enter full screen (kiosk mode)"}
            >
              {isFull ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              {isFull ? "Exit" : "Full Screen"}
            </button>
            <div className="hidden sm:block text-sm text-right">
              <div className="font-semibold leading-tight">{currentUser?.full_name}</div>
              <div className={`text-[10px] uppercase tracking-wider font-bold inline-block px-1.5 py-0.5 rounded ${roleTone}`}>{role}</div>
            </div>
            <button onClick={signOut} className="p-2 rounded-lg hover:bg-muted"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="md:hidden max-w-7xl mx-auto px-4 pb-2 flex gap-1 overflow-x-auto">
          <TopLink to="/staff" icon={<LayoutDashboard className="w-4 h-4" />} label="Orders" active={active === "orders"} />
          <TopLink to="/pos" icon={<Store className="w-4 h-4" />} label="POS" active={active === "pos"} />
          <TopLink to="/shift" icon={<ClipboardCheck className="w-4 h-4" />} label="Shift" active={active === "shift"} />
          <TopLink to="/customers" icon={<Users className="w-4 h-4" />} label="Customers" active={active === "customers"} badge={pendingTopUps} />
          {hasStaffRole("supervisor") && <TopLink to="/inventory" icon={<Package className="w-4 h-4" />} label="Inventory" active={active === "inventory"} />}
          {hasStaffRole("supervisor") && <TopLink to="/finance" icon={<Wallet className="w-4 h-4" />} label="Finance" active={active === "finance"} />}
          {hasStaffRole("supervisor") && <TopLink to="/analytics" icon={<BarChart3 className="w-4 h-4" />} label="Analytics" active={active === "analytics"} />}
          {can("team.view") && <TopLink to="/team" icon={<Users2 className="w-4 h-4" />} label="Team" active={active === "team"} />}
          {can("settings.manage") && <TopLink to="/settings" icon={<Settings className="w-4 h-4" />} label="Settings" active={active === "settings"} />}
        </div>
      </header>
      <SubscriptionBanner daysLeft={subscriptionDaysLeft()} blocked={isSubscriptionBlocked()} status={store?.subscription.status} />
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6">{children}</main>
    </div>
  );
}

function SubscriptionBanner({ daysLeft, blocked, status }: { daysLeft: number; blocked: boolean; status?: string }) {
  if (blocked) {
    return (
      <div className="bg-red-600 text-white px-4 py-3 text-sm text-center font-semibold">
        {status === "suspended" ? "Your BitePay account is suspended." : "Your BitePay subscription has expired."} Contact <Link to="/support" className="underline">support</Link> to reactivate.
      </div>
    );
  }
  if (daysLeft > 0 && daysLeft <= 7) {
    return (
      <div className="bg-amber-100 text-amber-800 px-4 py-2 text-xs text-center font-semibold">
        Subscription expires in {daysLeft} day{daysLeft === 1 ? "" : "s"}. <Link to="/support" className="underline">Renew now</Link>.
      </div>
    );
  }
  return null;
}

function TopLink({ to, icon, label, active, badge }: { to: string; icon: ReactNode; label: string; active?: boolean; badge?: number }) {
  return (
    <Link to={to} className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
      {icon}{label}
      {badge && badge > 0 ? <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-amber-500 text-white">{badge}</span> : null}
    </Link>
  );
}
