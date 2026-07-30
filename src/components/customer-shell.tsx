import { Link, useNavigate } from "@tanstack/react-router";
import { ChefHat, LogOut, User, Wallet, ShoppingBag, ClipboardList, Home, Store as StoreIcon, ChevronDown, Check } from "lucide-react";
import { useStore } from "@/lib/store";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { SyncPill } from "@/components/sync-pill";

export function CustomerShell({ children, active }: { children: ReactNode; active?: string }) {
  const { currentUser, logout, availableCanteens, selectedCanteenId, setSelectedCanteen, store } = useStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const handleLogout = () => { logout(); navigate({ to: "/" }); };
  const activeCanteen = availableCanteens.find((s) => s.id === selectedCanteenId) ?? store;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-surface border-b">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <Link to="/dashboard" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary grid place-items-center text-white">
              <ChefHat className="w-4 h-4" />
            </div>
            <span className="font-bold text-lg hidden xs:inline">BitePay</span>
          </Link>

          {/* Canteen switcher */}
          <div ref={ref} className="relative flex-1 min-w-0 max-w-[240px]">
            <button
              onClick={() => setOpen((v) => !v)}
              className="w-full flex items-center gap-1.5 rounded-full border bg-background px-3 h-9 text-sm font-medium hover:bg-muted transition"
            >
              <StoreIcon className="w-4 h-4 text-primary shrink-0" />
              <span className="truncate">{activeCanteen?.name ?? "Choose canteen"}</span>
              <ChevronDown className={`w-4 h-4 ml-auto shrink-0 transition ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
              <div className="absolute left-0 right-0 mt-1 bg-surface border rounded-xl shadow-lg overflow-hidden z-50 max-h-72 overflow-y-auto">
                {availableCanteens.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-muted-foreground">No canteens available yet.</div>
                ) : availableCanteens.map((c) => {
                  const selected = c.id === selectedCanteenId;
                  return (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedCanteen(c.id); setOpen(false); }}
                      className={`w-full text-left px-3 py-2.5 flex items-center gap-2 text-sm hover:bg-muted ${selected ? "bg-primary/5" : ""}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{c.name}</div>
                        {c.location && <div className="text-[11px] text-muted-foreground truncate">{c.location}</div>}
                      </div>
                      {selected && <Check className="w-4 h-4 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <div className="hidden sm:flex items-center gap-2 mr-1 text-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{currentUser?.full_name}</span>
            </div>
            <SyncPill />
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
