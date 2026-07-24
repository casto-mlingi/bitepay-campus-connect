import { Link, useNavigate } from "@tanstack/react-router";
import { ChefHat, LogOut, LayoutDashboard, Store, Package, BarChart3, Maximize2, Minimize2, Wallet } from "lucide-react";
import { useStore } from "@/lib/store";
import { useEffect, useState, type ReactNode } from "react";

export type StaffTab = "orders" | "pos" | "inventory" | "analytics" | "finance";

export function StaffShell({ children, active }: { children: ReactNode; active?: StaffTab }) {
  const { currentUser, logout } = useStore();
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
                <div className="font-bold leading-tight">BitePay</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Staff Console</div>
              </div>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              <TopLink to="/staff" icon={<LayoutDashboard className="w-4 h-4" />} label="Live Orders" active={active === "orders"} />
              <TopLink to="/pos" icon={<Store className="w-4 h-4" />} label="Walk-in POS" active={active === "pos"} />
              <TopLink to="/inventory" icon={<Package className="w-4 h-4" />} label="Store & Inventory" active={active === "inventory"} />
              <TopLink to="/finance" icon={<Wallet className="w-4 h-4" />} label="Finance" active={active === "finance"} />
              <TopLink to="/analytics" icon={<BarChart3 className="w-4 h-4" />} label="Analytics" active={active === "analytics"} />
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80"
              title={isFull ? "Exit full screen" : "Enter full screen (kiosk mode)"}
            >
              {isFull ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              {isFull ? "Exit" : "Full Screen"}
            </button>
            <div className="hidden sm:block text-sm text-right">
              <div className="font-semibold">{currentUser?.full_name}</div>
              <div className="text-xs text-muted-foreground">Cashier</div>
            </div>
            <button onClick={signOut} className="p-2 rounded-lg hover:bg-muted"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="md:hidden max-w-7xl mx-auto px-4 pb-2 flex gap-1 overflow-x-auto">
          <TopLink to="/staff" icon={<LayoutDashboard className="w-4 h-4" />} label="Orders" active={active === "orders"} />
          <TopLink to="/pos" icon={<Store className="w-4 h-4" />} label="POS" active={active === "pos"} />
          <TopLink to="/inventory" icon={<Package className="w-4 h-4" />} label="Inventory" active={active === "inventory"} />
          <TopLink to="/analytics" icon={<BarChart3 className="w-4 h-4" />} label="Analytics" active={active === "analytics"} />
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6">{children}</main>
    </div>
  );
}

function TopLink({ to, icon, label, active }: { to: string; icon: ReactNode; label: string; active?: boolean }) {
  return (
    <Link to={to} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
      {icon}{label}
    </Link>
  );
}
