import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, ShoppingCart, Search, Sparkles, X, Check, Clock, XCircle } from "lucide-react";
import { useStore, formatTZS, type Product } from "@/lib/store";
import { CustomerShell } from "@/components/customer-shell";

export const Route = createFileRoute("/menu")({
  component: MenuPage,
  head: () => ({ meta: [{ title: "Menu — BitePay" }, { name: "description", content: "Browse the canteen menu and order with your BitePay wallet." }] }),
});

function MenuPage() {
  const { currentUser, products, cart, addToCart, setQty, availablePlates } = useStore();
  const navigate = useNavigate();
  const [category, setCategory] = useState<string>("All");
  const [query, setQuery] = useState("");

  useEffect(() => { if (!currentUser) navigate({ to: "/" }); }, [currentUser, navigate]);

  const available = useMemo(() => products.filter((p) => {
    const plates = availablePlates(p.id);
    return plates === null || plates > 0;
  }), [products, availablePlates]);
  const categories = useMemo(() => ["All", ...Array.from(new Set(available.map((p) => p.category)))], [available]);
  const filtered = available.filter((p) =>
    (category === "All" || p.category === category) &&
    (query === "" || p.name.toLowerCase().includes(query.toLowerCase()))
  );
  const cartTotal = cart.reduce((s, c) => s + c.product.price * c.qty, 0);
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  return (
    <CustomerShell active="menu">
      <div>
        <p className="text-sm text-muted-foreground">Our Food</p>
        <h1 className="text-2xl font-bold">Special For You</h1>
      </div>

      {/* Search */}
      <div className="mt-4 flex items-center gap-2 bg-surface border rounded-2xl px-4 h-12">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your menu"
          className="flex-1 bg-transparent outline-none text-sm"
        />
      </div>

      {/* Category chips — Kupa-style underline */}
      <div className="mt-5 -mx-4 px-4 overflow-x-auto">
        <div className="flex gap-6 pb-1 border-b">
          {categories.map((c) => {
            const active = category === c;
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`relative pb-2.5 text-sm font-semibold whitespace-nowrap transition-colors ${
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {c}
                {active && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary rounded-full" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {filtered.map((p) => {
          const qty = cart.find((c) => c.product.id === p.id)?.qty ?? 0;
          return <ProductCard key={p.id} p={p} qty={qty} onAdd={() => addToCart(p)} onQty={(n) => setQty(p.id, n)} />;
        })}
      </div>

      {filtered.length === 0 && (
        <div className="mt-10 text-center text-muted-foreground text-sm">No dishes match your search.</div>
      )}

      {cartCount > 0 && (
        <Link
          to="/cart"
          className="fixed left-1/2 -translate-x-1/2 bottom-20 z-40 w-[calc(100%-2rem)] max-w-lg bg-primary text-primary-foreground rounded-2xl px-5 py-3.5 flex items-center justify-between shadow-xl shadow-orange-500/30"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-2 -right-2 bg-white text-primary text-[10px] font-bold rounded-full w-4 h-4 grid place-items-center">{cartCount}</span>
            </div>
            <span className="font-semibold">View Cart · {cartCount} {cartCount === 1 ? "item" : "items"}</span>
          </div>
          <span className="font-bold">{formatTZS(cartTotal)}</span>
        </Link>
      )}
    </CustomerShell>
  );
}

function ProductCard({ p, qty, onAdd, onQty }: { p: Product; qty: number; onAdd: () => void; onQty: (n: number) => void }) {
  return (
    <div className="bg-surface border rounded-3xl p-3 pt-4 flex flex-col">
      {p.image ? (
        <img src={p.image} alt={p.name} className="aspect-square rounded-2xl w-full object-cover shadow-inner" />
      ) : (
        <div className={`aspect-square rounded-2xl bg-gradient-to-br ${p.gradient} grid place-items-center text-6xl shadow-inner`}>{p.emoji}</div>
      )}
      <div className="mt-3 flex-1">
        <div className="font-semibold text-sm leading-tight line-clamp-1">{p.name}</div>
        <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{p.description}</div>
      </div>
      <div className="mt-2.5 flex items-center justify-between">
        <div className="font-bold text-sm">{formatTZS(p.price)}</div>
        {qty === 0 ? (
          <button
            onClick={onAdd}
            aria-label="Add"
            className="w-8 h-8 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-md shadow-orange-500/30 hover:scale-105 transition"
          >
            <Plus className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex items-center gap-1 bg-muted rounded-full">
            <button onClick={() => onQty(qty - 1)} aria-label="Decrease" className="w-7 h-7 grid place-items-center"><Minus className="w-3.5 h-3.5" /></button>
            <span className="min-w-[1.25rem] text-center font-bold text-xs">{qty}</span>
            <button onClick={() => onQty(qty + 1)} aria-label="Increase" className="w-7 h-7 grid place-items-center rounded-full bg-primary text-primary-foreground"><Plus className="w-3.5 h-3.5" /></button>
          </div>
        )}
      </div>
    </div>
  );
}
