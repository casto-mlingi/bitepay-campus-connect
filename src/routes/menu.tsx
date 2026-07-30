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

      <RequestDishSection />


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

function RequestDishSection() {
  const { customDishRequests, submitCustomDishRequest, store } = useStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [suggested, setSuggested] = useState<number>(0);
  const [ing, setIng] = useState("");
  const [ings, setIngs] = useState<string[]>([]);
  const [toast, setToast] = useState("");

  const mine = customDishRequests.slice(0, 5);

  const addIng = () => {
    const v = ing.trim();
    if (!v) return;
    setIngs((prev) => Array.from(new Set([...prev, v])));
    setIng("");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !desc.trim()) return;
    const req = submitCustomDishRequest({ dish_name: name, description: desc, ingredients: ings, suggested_price: suggested });
    if (req) {
      setName(""); setDesc(""); setSuggested(0); setIngs([]); setIng("");
      setOpen(false);
      setToast("Sent to the kitchen — you'll get a notification when they respond.");
      setTimeout(() => setToast(""), 3200);
    }
  };

  return (
    <section className="mt-8">
      <div className="bg-gradient-to-br from-primary/10 to-orange-100 border border-primary/20 rounded-3xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-primary uppercase tracking-wider">
              <Sparkles className="w-4 h-4" /> Build your own dish
            </div>
            <h2 className="text-lg font-bold mt-1">Craving something not on the menu?</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Tell {store?.name ?? "the kitchen"} what you'd like and which ingredients to use. The chef reviews it and quotes a price.
            </p>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="shrink-0 bg-primary text-white rounded-full h-11 px-4 text-sm font-bold shadow-md shadow-orange-500/30"
          >
            Request
          </button>
        </div>

        {mine.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Your requests</div>
            {mine.map((r) => (
              <div key={r.id} className="bg-surface border rounded-2xl p-3 flex items-start gap-3">
                <StatusChip status={r.status} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{r.dish_name}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{r.description}</div>
                  {r.status === "accepted" && r.staff_price != null && (
                    <div className="mt-1.5">
                      <div className="text-xs text-emerald-700 font-semibold">Quoted at {formatTZS(r.staff_price)}{r.staff_note ? ` · ${r.staff_note}` : ""}</div>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => {
                            const res = confirmCustomDishQuote(r.id);
                            setToast(res.ok ? "Budget confirmed — amount held from your wallet." : res.reason);
                            setTimeout(() => setToast(""), 3600);
                          }}
                          className="flex-1 bg-primary text-white rounded-lg h-9 text-xs font-bold"
                        >
                          Confirm & pay {formatTZS(r.staff_price)}
                        </button>
                        <button
                          onClick={() => declineCustomDishQuote(r.id)}
                          className="px-3 rounded-lg border text-xs font-semibold"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  )}
                  {r.status === "confirmed" && (
                    <div className="text-xs text-emerald-700 font-semibold mt-0.5">Paid {formatTZS(r.paid_amount ?? 0)} · waiting for the kitchen to assign stock</div>
                  )}
                  {r.status === "in_kitchen" && (
                    <div className="text-xs text-primary font-semibold mt-0.5">Being prepared now 👨‍🍳</div>
                  )}
                  {(r.status === "rejected" || r.status === "cancelled") && r.reject_reason && (
                    <div className="text-xs text-red-600 mt-0.5">{r.reject_reason}</div>
                  )}

                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-[70] bg-black/60 grid place-items-end sm:place-items-center p-0 sm:p-4">
          <form onSubmit={submit} className="w-full sm:max-w-md bg-background rounded-t-3xl sm:rounded-3xl p-5 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Request a dish</h3>
              <button type="button" onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>

            <label className="block text-sm">
              <div className="text-muted-foreground mb-1">Dish name</div>
              <input required placeholder="e.g. Chicken Biryani" className="w-full px-3 py-2.5 rounded-lg border bg-background" value={name} onChange={(e) => setName(e.target.value)} />
            </label>

            <label className="block text-sm">
              <div className="text-muted-foreground mb-1">What do you want?</div>
              <textarea required rows={3} placeholder="Describe how you'd like it prepared, spice level, sides…" className="w-full px-3 py-2.5 rounded-lg border bg-background resize-none" value={desc} onChange={(e) => setDesc(e.target.value)} />
            </label>

            <div className="text-sm">
              <div className="text-muted-foreground mb-1">Ingredients (optional)</div>
              <div className="flex gap-2">
                <input placeholder="e.g. basmati rice" className="flex-1 px-3 py-2 rounded-lg border bg-background" value={ing} onChange={(e) => setIng(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addIng(); } }} />
                <button type="button" onClick={addIng} className="px-3 rounded-lg border font-semibold text-sm">Add</button>
              </div>
              {ings.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {ings.map((v) => (
                    <span key={v} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-semibold rounded-full px-2.5 py-1">
                      {v}
                      <button type="button" onClick={() => setIngs((prev) => prev.filter((x) => x !== v))} aria-label={`Remove ${v}`}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <label className="block text-sm">
              <div className="text-muted-foreground mb-1">Your budget (TZS, optional)</div>
              <input type="number" min={0} placeholder="e.g. 6000" className="w-full px-3 py-2.5 rounded-lg border bg-background" value={suggested || ""} onChange={(e) => setSuggested(Number(e.target.value) || 0)} />
            </label>

            <button className="w-full bg-primary text-white rounded-xl h-12 font-bold">Send to kitchen</button>
          </form>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background text-sm px-4 py-2 rounded-lg shadow-lg">{toast}</div>
      )}
    </section>
  );
}

function StatusChip({ status }: { status: "pending" | "accepted" | "rejected" }) {
  if (status === "accepted") return <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center shrink-0"><Check className="w-4 h-4" /></div>;
  if (status === "rejected") return <div className="w-9 h-9 rounded-full bg-red-100 text-red-600 grid place-items-center shrink-0"><XCircle className="w-4 h-4" /></div>;
  return <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 grid place-items-center shrink-0"><Clock className="w-4 h-4" /></div>;
}
