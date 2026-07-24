import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { useStore, formatTZS, type Product } from "@/lib/store";
import { CustomerShell } from "@/components/customer-shell";

export const Route = createFileRoute("/menu")({
  component: MenuPage,
  head: () => ({ meta: [{ title: "Menu — BitePay" }, { name: "description", content: "Browse the canteen menu and order with your BitePay wallet." }] }),
});

function MenuPage() {
  const { currentUser, products, cart, addToCart, setQty } = useStore();
  const navigate = useNavigate();
  const [category, setCategory] = useState<string>("All");

  useEffect(() => { if (!currentUser) navigate({ to: "/" }); }, [currentUser, navigate]);

  const categories = useMemo(() => ["All", ...Array.from(new Set(products.map((p) => p.category)))], [products]);
  const filtered = category === "All" ? products : products.filter((p) => p.category === category);
  const cartTotal = cart.reduce((s, c) => s + c.product.price * c.qty, 0);
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  return (
    <CustomerShell active="menu">
      <div>
        <h1 className="text-2xl font-bold">Menu</h1>
        <p className="text-muted-foreground text-sm">Fresh today — pay with your wallet</p>
      </div>

      <div className="mt-4 -mx-4 px-4 overflow-x-auto">
        <div className="flex gap-2 pb-1">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-colors ${
                category === c ? "bg-foreground text-background border-foreground" : "bg-surface text-foreground border-border hover:border-foreground/30"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map((p) => {
          const qty = cart.find((c) => c.product.id === p.id)?.qty ?? 0;
          return <ProductCard key={p.id} p={p} qty={qty} onAdd={() => addToCart(p)} onQty={(n) => setQty(p.id, n)} />;
        })}
      </div>

      {cartCount > 0 && (
        <Link
          to="/cart"
          className="fixed left-1/2 -translate-x-1/2 bottom-20 z-40 w-[calc(100%-2rem)] max-w-lg bg-foreground text-background rounded-2xl px-4 py-3 flex items-center justify-between shadow-xl shadow-black/20"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-4 h-4 grid place-items-center">{cartCount}</span>
            </div>
            <span className="font-semibold">View Cart</span>
          </div>
          <span className="font-bold">{formatTZS(cartTotal)}</span>
        </Link>
      )}
    </CustomerShell>
  );
}

function ProductCard({ p, qty, onAdd, onQty }: { p: Product; qty: number; onAdd: () => void; onQty: (n: number) => void }) {
  return (
    <div className="bg-surface border rounded-2xl overflow-hidden flex flex-col">
      <div className={`h-28 bg-gradient-to-br ${p.gradient} grid place-items-center text-5xl`}>{p.emoji}</div>
      <div className="p-3 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-semibold leading-tight">{p.name}</div>
            <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{p.description}</div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="font-bold text-primary">{formatTZS(p.price)}</div>
          {qty === 0 ? (
            <button onClick={onAdd} className="bg-primary text-primary-foreground text-sm font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1">
              <Plus className="w-4 h-4" /> Add
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-muted rounded-lg">
              <button onClick={() => onQty(qty - 1)} className="w-8 h-8 grid place-items-center"><Minus className="w-4 h-4" /></button>
              <span className="min-w-[1.25rem] text-center font-semibold text-sm">{qty}</span>
              <button onClick={() => onQty(qty + 1)} className="w-8 h-8 grid place-items-center"><Plus className="w-4 h-4" /></button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
