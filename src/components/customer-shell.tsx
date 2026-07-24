import { Link, useNavigate } from "@tanstack/react-router";
import { ChefHat, LogOut, User, Wallet, ShoppingBag, ClipboardList, Home } from "lucide-react";
import { useStore } from "@/lib/store";
import type { ReactNode } from "react";

export function CustomerShell({ children, active }: { children: ReactNode; active?: string }) {
  const { currentUser, logout } = useStore();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate({ to: "/" }); };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-surface border-b">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary grid place-items-center text-white">
              <ChefHat className="w-4 h-4" />
            </div>
            <span className="font-bold text-lg">BitePay</span>
          </Link>
          <div className="flex items-center gap-1">
            <div className="hidden sm:flex items-center gap-2 mr-2 text-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{currentUser?.full_name}</span>
            </div>
            <button onClick={handleLogout} aria-label="Sign out" className="p-2 rounded-lg hover:bg-muted">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-surface border-t">
        <div className="max-w-2xl mx-auto grid grid-cols-4">
          <BottomLink to="/dashboard" icon={<Home className="w-5 h-5" />} label="Home" active={active === "home"} />
          <BottomLink to="/menu" icon={<ShoppingBag className="w-5 h-5" />} label="Order" active={active === "menu"} />
          <BottomLink to="/history" icon={<ClipboardList className="w-5 h-5" />} label="History" active={active === "history"} />
          <BottomLink to="/topup" icon={<Wallet className="w-5 h-5" />} label="Top-Up" active={active === "topup"} />
        </div>
      </nav>
    </div>
  );
}

function BottomLink({ to, icon, label, active }: { to: string; icon: ReactNode; label: string; active?: boolean }) {
  return (
    <Link
      to={to}
      className={`flex flex-col items-center justify-center py-2.5 gap-0.5 text-xs font-medium transition-colors ${
        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
