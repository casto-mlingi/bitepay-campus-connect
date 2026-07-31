import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Package, AlertTriangle, Plus, ChefHat, Calculator, Trash2, Utensils, UtensilsCrossed, ClipboardList, Phone, User, Pencil } from "lucide-react";
import { useStore, formatTZS, type BatchIngredient, type Product, type CustomDishRequest } from "@/lib/store";
import { StaffShell } from "@/components/staff-shell";
import { DishImagePicker } from "@/components/dish-image-picker";




export const Route = createFileRoute("/inventory")({
  component: InventoryPage,
  head: () => ({
    meta: [
      { title: "Store & Inventory — BitePay Staff" },
      { name: "description", content: "Manage raw materials, log cooking batches, and auto-cost every plate." },
      { property: "og:title", content: "Store & Inventory — BitePay Staff" },
      { property: "og:description", content: "Raw material stock, batch costing, and finished goods for the canteen." },
    ],
  }),
});

type Tab = "raw" | "menu" | "batches" | "requests";

function InventoryPage() {
  const { currentUser, customDishRequests } = useStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("raw");
  const pendingRequests = customDishRequests.filter((r) => r.status === "confirmed").length;

  useEffect(() => {
    if (!currentUser) navigate({ to: "/" });
    else if (currentUser.role !== "staff") navigate({ to: "/dashboard" });
  }, [currentUser, navigate]);

  if (!currentUser || currentUser.role !== "staff") return null;

  return (
    <StaffShell active="inventory">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2"><UtensilsCrossed className="w-7 h-7 text-primary" /> Store & Inventory</h1>
        <p className="text-muted-foreground">Raw materials, finished dishes, and batch costing.</p>
      </div>

      <div className="flex gap-1 mb-6 border-b overflow-x-auto">
        <TabBtn active={tab === "raw"} onClick={() => setTab("raw")} icon={<Package className="w-4 h-4" />} label="Raw Materials" />
        <TabBtn active={tab === "menu"} onClick={() => setTab("menu")} icon={<Utensils className="w-4 h-4" />} label="Menu / Dishes" />
        <TabBtn active={tab === "batches"} onClick={() => setTab("batches")} icon={<ChefHat className="w-4 h-4" />} label="Daily Cooking Batches" />
        <TabBtn active={tab === "requests"} onClick={() => setTab("requests")} icon={<ClipboardList className="w-4 h-4" />} label={`Menu Requests${pendingRequests ? ` (${pendingRequests})` : ""}`} />
      </div>

      {tab === "raw" && <RawMaterialsPanel />}
      {tab === "menu" && <MenuPanel />}
      {tab === "batches" && <BatchesPanel />}
      {tab === "requests" && <MenuRequestsPanel />}
    </StaffShell>
  );
}


function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 -mb-px ${active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
    >
      {icon}{label}
    </button>
  );
}

/* ────────────── Raw Materials ────────────── */
function RawMaterialsPanel() {
  const { rawMaterials, addRawMaterial } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", category: "", unit: "kg" as "kg" | "liters" | "pcs", stock: 0, avg_cost: 0, low_threshold: 10 });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    addRawMaterial(form);
    setForm({ name: "", category: "", unit: "kg", stock: 0, avg_cost: 0, low_threshold: 10 });
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{rawMaterials.length} items tracked</div>
        <button onClick={() => setShowForm((v) => !v)} className="flex items-center gap-1.5 bg-primary text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-surface border rounded-2xl p-4 grid grid-cols-2 md:grid-cols-6 gap-3">
          <label className="col-span-2 text-sm">
            <div className="text-muted-foreground mb-1">Item Name</div>
            <input required placeholder="e.g. Rice" className="w-full px-3 py-2 rounded-lg border bg-background" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="text-sm">
            <div className="text-muted-foreground mb-1">Category</div>
            <input placeholder="e.g. Grains" className="w-full px-3 py-2 rounded-lg border bg-background" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </label>
          <label className="text-sm">
            <div className="text-muted-foreground mb-1">Unit</div>
            <select className="w-full px-3 py-2 rounded-lg border bg-background" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value as "kg" | "liters" | "pcs" })}>
              <option value="kg">kg</option>
              <option value="liters">liters</option>
              <option value="pcs">pcs</option>
            </select>
          </label>
          <label className="text-sm">
            <div className="text-muted-foreground mb-1">Stock</div>
            <input type="number" step="any" inputMode="decimal" className="w-full px-3 py-2 rounded-lg border bg-background" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} />
          </label>
          <label className="text-sm">
            <div className="text-muted-foreground mb-1">Cost / Unit (TZS)</div>
            <input type="number" className="w-full px-3 py-2 rounded-lg border bg-background" value={form.avg_cost} onChange={(e) => setForm({ ...form, avg_cost: Number(e.target.value) })} />
          </label>
          <label className="col-span-2 text-sm">
            <div className="text-muted-foreground mb-1">Low Stock Threshold</div>
            <input type="number" step="any" inputMode="decimal" className="w-full px-3 py-2 rounded-lg border bg-background" value={form.low_threshold} onChange={(e) => setForm({ ...form, low_threshold: Number(e.target.value) })} />
          </label>
          <button className="col-span-2 md:col-span-1 bg-foreground text-background rounded-lg font-semibold text-sm py-2 self-end">Save</button>
        </form>
      )}

      <div className="bg-surface border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Avg Cost/Unit</th>
                <th className="px-4 py-3">Stock Value</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rawMaterials.map((r) => {
                const low = r.stock <= r.low_threshold;
                return (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-3 font-semibold">{r.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.category}</td>
                    <td className="px-4 py-3">{r.unit}</td>
                    <td className="px-4 py-3 font-mono">{r.stock.toFixed(1)} {r.unit}</td>
                    <td className="px-4 py-3 font-mono">{formatTZS(r.avg_cost)}</td>
                    <td className="px-4 py-3 font-mono">{formatTZS(Math.round(r.stock * r.avg_cost))}</td>
                    <td className="px-4 py-3">
                      {low ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold bg-red-100 text-red-700 px-2 py-1 rounded-full">
                          <AlertTriangle className="w-3 h-3" /> Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">In Stock</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ────────────── Menu / Finished Dishes ────────────── */
const GRADIENTS = [
  "from-orange-400 to-red-500",
  "from-emerald-400 to-teal-500",
  "from-sky-400 to-indigo-500",
  "from-fuchsia-400 to-pink-500",
  "from-amber-400 to-orange-500",
  "from-lime-400 to-emerald-500",
];

function MenuPanel() {
  const { products, addProduct } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<Product, "id" | "store_id">>({
    name: "", description: "", price: 0, category: "", emoji: "🍽️", gradient: GRADIENTS[0], image: undefined,
  });
  const [uploading, setUploading] = useState(false);

  const reset = () =>
    setForm({ name: "", description: "", price: 0, category: "", emoji: "🍽️", gradient: GRADIENTS[0], image: undefined });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (uploading) return;
    if (!form.name.trim() || form.price <= 0) return;
    addProduct(form);
    reset();
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{products.length} dishes on the menu</div>
        <button onClick={() => setShowForm((v) => !v)} className="flex items-center gap-1.5 bg-primary text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Add Dish
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-surface border rounded-2xl p-4 grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="col-span-2 md:col-span-2 md:row-span-3">
            <DishImagePicker
              value={form.image}
              onChange={(image) => setForm((f) => ({ ...f, image }))}
              onBusyChange={setUploading}
            />
          </div>


          <label className="col-span-2 md:col-span-4 text-sm">
            <div className="text-muted-foreground mb-1">Dish Name</div>
            <input required placeholder="e.g. Pilau" className="w-full px-3 py-2 rounded-lg border bg-background" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="col-span-2 md:col-span-2 text-sm">
            <div className="text-muted-foreground mb-1">Category</div>
            <input placeholder="e.g. Main Course" className="w-full px-3 py-2 rounded-lg border bg-background" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </label>
          <label className="col-span-2 md:col-span-2 text-sm">
            <div className="text-muted-foreground mb-1">Price (TZS)</div>
            <input type="number" min={0} className="w-full px-3 py-2 rounded-lg border bg-background" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
          </label>
          <label className="col-span-2 md:col-span-4 text-sm">
            <div className="text-muted-foreground mb-1">Description</div>
            <input placeholder="Short menu blurb" className="w-full px-3 py-2 rounded-lg border bg-background" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
          <label className="col-span-2 md:col-span-2 text-sm">
            <div className="text-muted-foreground mb-1">Fallback Color (no photo)</div>
            <div className="flex gap-2 flex-wrap">
              {GRADIENTS.map((g) => (
                <button key={g} type="button" onClick={() => setForm({ ...form, gradient: g })} className={`w-8 h-8 rounded-full bg-gradient-to-br ${g} ${form.gradient === g ? "ring-2 ring-offset-2 ring-primary" : ""}`} />
              ))}
            </div>
          </label>
          <div className="col-span-2 md:col-span-6 flex justify-end gap-2">
            <button type="button" onClick={() => { reset(); setShowForm(false); }} className="px-4 py-2 rounded-lg border text-sm font-semibold">Cancel</button>
            <button
              type="submit"
              disabled={uploading}
              className="px-4 py-2 bg-foreground text-background rounded-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              title={uploading ? "Finish the photo step before saving" : ""}
            >
              {uploading ? "Processing photo…" : "Save Dish"}
            </button>
          </div>

        </form>
      )}

      {products.length === 0 ? (
        <div className="bg-surface border rounded-2xl p-10 text-center text-sm text-muted-foreground">
          No dishes yet. Add your first finished product — it will show up in the POS, customer menu, and the cooking batch dropdown.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {products.map((p) => (
            <div key={p.id} className="bg-surface border rounded-2xl overflow-hidden">
              {p.image ? (
                <img src={p.image} alt={p.name} className="aspect-square w-full object-cover" />
              ) : (
                <div className={`aspect-square bg-gradient-to-br ${p.gradient} flex items-center justify-center text-5xl`}>{p.emoji}</div>
              )}
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.category || "Uncategorized"}</div>
                  </div>
                  <div className="text-sm font-mono font-bold text-primary">{formatTZS(p.price)}</div>
                </div>
                {p.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}



/* ────────────── Cooking Batches ────────────── */
function BatchesPanel() {
  const { rawMaterials, products, batches, createBatch, updateBatch } = useStore();
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [plates, setPlates] = useState(40);
  const [ings, setIngs] = useState<BatchIngredient[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editErr, setEditErr] = useState("");
  const [form, setForm] = useState({ plates: 0, remaining: 0, labor: 0 });

  useEffect(() => {
    if (!productId && products[0]) setProductId(products[0].id);
  }, [products, productId]);



  const rawCost = useMemo(() => ings.reduce((s, i) => {
    const r = rawMaterials.find((x) => x.id === i.raw_id);
    return s + (r ? r.avg_cost * i.qty : 0);
  }, 0), [ings, rawMaterials]);

  const unitCost = plates > 0 ? Math.round(rawCost / plates) : 0;

  const addIng = () => {
    if (rawMaterials.length === 0) return;
    const avail = rawMaterials.find((r) => !ings.some((i) => i.raw_id === r.id)) ?? rawMaterials[0];
    setIngs([...ings, { raw_id: avail.id, qty: 1 }]);
  };
  const updateIng = (i: number, patch: Partial<BatchIngredient>) => setIngs(ings.map((x, idx) => idx === i ? { ...x, ...patch } : x));
  const removeIng = (i: number) => setIngs(ings.filter((_, idx) => idx !== i));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const b = createBatch({ product_id: productId, ingredients: ings, labor_cost: 0, plates });
    if (!b) { setFlash("⚠️ Not enough stock or invalid input"); return; }
    setFlash(`✅ Batch ${b.id} created — cost ${formatTZS(b.unit_cost)} / plate`);
    setIngs([]);
    setTimeout(() => setFlash(null), 4000);
  };

  return (
    <div className="grid lg:grid-cols-5 gap-4">
      <form onSubmit={submit} className="lg:col-span-3 bg-surface border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ChefHat className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-lg">Log New Cooking Batch</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <label className="text-sm">
            <div className="text-muted-foreground mb-1">Finished Dish</div>
            <select value={productId} onChange={(e) => setProductId(e.target.value)} className="w-full px-3 py-2 rounded-lg border bg-background" disabled={products.length === 0}>
              {products.length === 0 && <option value="">No dishes yet — add one in Menu / Dishes</option>}
              {products.map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
            </select>
          </label>

          <label className="text-sm">
            <div className="text-muted-foreground mb-1">Total Plates Produced</div>
            <input type="number" min={1} value={plates} onChange={(e) => setPlates(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border bg-background" />
          </label>
        </div>


        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">Raw Materials Used</div>
            <button type="button" onClick={addIng} className="text-xs font-semibold text-primary flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button>
          </div>
          <div className="space-y-2">
            {ings.length === 0 && <div className="text-xs text-muted-foreground border border-dashed rounded-lg py-4 text-center">No raw materials selected</div>}
            {ings.map((ing, i) => {
              const raw = rawMaterials.find((r) => r.id === ing.raw_id);
              return (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <select value={ing.raw_id} onChange={(e) => updateIng(i, { raw_id: e.target.value })} className="col-span-6 px-2 py-2 rounded-lg border bg-background text-sm">
                    {rawMaterials.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.stock.toFixed(1)} {r.unit})</option>)}
                  </select>
                  <input type="number" min={0} step="any" inputMode="decimal" value={ing.qty} onChange={(e) => updateIng(i, { qty: Number(e.target.value) })} className="col-span-3 px-2 py-2 rounded-lg border bg-background text-sm" />
                  <div className="col-span-2 text-xs text-muted-foreground">{raw ? formatTZS(raw.avg_cost * ing.qty) : ""}</div>
                  <button type="button" onClick={() => removeIng(i)} className="col-span-1 text-muted-foreground hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              );
            })}
          </div>
        </div>

        {flash && <div className="text-sm px-3 py-2 rounded-lg bg-muted">{flash}</div>}

        <button className="w-full bg-primary text-white font-bold py-3 rounded-xl">Create Batch & Compute Cost</button>
      </form>

      <div className="lg:col-span-2 space-y-4">
        <div className="bg-gradient-to-br from-primary to-primary/70 text-white rounded-2xl p-5">
          <div className="text-xs uppercase tracking-wider opacity-80 flex items-center gap-1"><Calculator className="w-3 h-3" /> Live Cost Preview</div>
          <div className="mt-4 space-y-1 text-sm opacity-90">
            <Row label="Raw Materials" value={formatTZS(rawCost)} />
            <Row label="Plates" value={String(plates)} />

          </div>
          <div className="mt-4 pt-4 border-t border-white/30">
            <div className="text-xs uppercase opacity-80">Unit Cost per Plate</div>
            <div className="text-4xl font-black mt-1">{formatTZS(unitCost)}</div>
          </div>
        </div>

        <div className="bg-surface border rounded-2xl p-4">
          <div className="font-bold mb-3">Active Batches (Finished Goods)</div>
          {batches.length === 0 && <div className="text-xs text-muted-foreground py-6 text-center">No batches yet</div>}
          <ul className="space-y-2">
            {batches.map((b) => {
              const prod = products.find((p) => p.id === b.product_id);
              const editing = editId === b.id;
              const sold = Math.max(0, b.plates - b.plates_remaining);
              const editRawCost = form.ings.reduce((s, i) => {
                const r = rawMaterials.find((x) => x.id === i.raw_id);
                return s + (r ? r.avg_cost * i.qty : 0);
              }, 0);
              const editUnit = form.plates > 0 ? Math.round((editRawCost + form.labor) / form.plates) : 0;
              return (
                <li key={b.id} className="p-2 rounded-lg bg-background border">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{prod?.emoji} {prod?.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{b.id} · {b.plates_remaining}/{b.plates} plates</div>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-1">
                      <div className="mr-1">
                        <div className="text-sm font-bold">{formatTZS(b.unit_cost)}</div>
                        <div className="text-[10px] text-muted-foreground">per plate</div>
                      </div>
                      <button
                        type="button"
                        title="Edit batch"
                        aria-label="Edit batch"
                        onClick={() => {
                          setEditErr("");
                          setDelId(null);
                          if (editing) { setEditId(null); return; }
                          setEditId(b.id);
                          setForm({ plates: b.plates, remaining: b.plates_remaining, labor: b.labor_cost, ings: b.ingredients.map((i) => ({ ...i })) });
                        }}
                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        title="Delete batch"
                        aria-label="Delete batch"
                        onClick={() => { setEditId(null); setEditErr(""); setDelId(delId === b.id ? null : b.id); }}
                        className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {delId === b.id && (
                    <div className="mt-3 border-t pt-3 space-y-2">
                      <div className="text-[11px] text-muted-foreground">
                        {sold > 0
                          ? `${sold} plate(s) already sold. Deleting returns only the unused share of raw materials and dumps the remaining ${b.plates_remaining} plate(s) as wastage.`
                          : "Nothing sold yet — all raw materials go back to inventory and the dish leaves POS and orders."}
                      </div>
                      {editErr && <div className="text-[11px] text-destructive font-medium">{editErr}</div>}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const res = deleteBatch(b.id);
                            if (!res.ok) { setEditErr(res.reason ?? "Could not delete"); return; }
                            setDelId(null);
                          }}
                          className="h-9 px-4 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold"
                        >
                          Delete batch
                        </button>
                        <button type="button" onClick={() => setDelId(null)} className="h-9 px-4 rounded-lg border text-sm font-semibold">Cancel</button>
                      </div>
                    </div>
                  )}

                  {editing && (
                    <div className="mt-3 border-t pt-3 space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        <label className="text-[11px] text-muted-foreground">
                          Plates made
                          <input type="number" min={1} step="any" inputMode="decimal" value={form.plates}
                            onChange={(e) => setForm({ ...form, plates: Number(e.target.value) })}
                            className="mt-1 w-full h-9 rounded-lg border px-2 text-sm text-foreground" />
                        </label>
                        <label className="text-[11px] text-muted-foreground">
                          Plates left
                          <input type="number" min={0} step="any" inputMode="decimal" value={form.remaining}
                            onChange={(e) => setForm({ ...form, remaining: Number(e.target.value) })}
                            className="mt-1 w-full h-9 rounded-lg border px-2 text-sm text-foreground" />
                        </label>
                        <label className="text-[11px] text-muted-foreground">
                          Labour/gas
                          <input type="number" min={0} step="any" inputMode="decimal" value={form.labor}
                            onChange={(e) => setForm({ ...form, labor: Number(e.target.value) })}
                            className="mt-1 w-full h-9 rounded-lg border px-2 text-sm text-foreground" />
                        </label>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-[11px] font-semibold">Raw materials used</div>
                          <button
                            type="button"
                            onClick={() => {
                              const avail = rawMaterials.find((r) => !form.ings.some((i) => i.raw_id === r.id)) ?? rawMaterials[0];
                              if (!avail) return;
                              setForm({ ...form, ings: [...form.ings, { raw_id: avail.id, qty: 1 }] });
                            }}
                            className="text-[11px] font-semibold text-primary flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Add
                          </button>
                        </div>
                        {form.ings.length === 0 && <div className="text-[11px] text-muted-foreground border border-dashed rounded-lg py-3 text-center">No raw materials</div>}
                        <div className="space-y-2">
                          {form.ings.map((ing, i) => {
                            const raw = rawMaterials.find((r) => r.id === ing.raw_id);
                            return (
                              <div key={i} className="grid grid-cols-12 gap-1 items-center">
                                <select
                                  value={ing.raw_id}
                                  onChange={(e) => setForm({ ...form, ings: form.ings.map((x, idx) => idx === i ? { ...x, raw_id: e.target.value } : x) })}
                                  className="col-span-6 h-9 px-2 rounded-lg border bg-background text-xs"
                                >
                                  {rawMaterials.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.stock.toFixed(2)} {r.unit})</option>)}
                                </select>
                                <input
                                  type="number" min={0} step="any" inputMode="decimal" value={ing.qty}
                                  onChange={(e) => setForm({ ...form, ings: form.ings.map((x, idx) => idx === i ? { ...x, qty: Number(e.target.value) } : x) })}
                                  className="col-span-3 h-9 px-2 rounded-lg border bg-background text-xs"
                                />
                                <div className="col-span-2 text-[10px] text-muted-foreground truncate">{raw ? formatTZS(raw.avg_cost * ing.qty) : ""}</div>
                                <button
                                  type="button"
                                  onClick={() => setForm({ ...form, ings: form.ings.filter((_, idx) => idx !== i) })}
                                  className="col-span-1 text-muted-foreground hover:text-red-500"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="text-[11px] text-muted-foreground">
                        New cost: <span className="font-semibold text-foreground">{formatTZS(editUnit)}</span> / plate
                      </div>

                      {editErr && <div className="text-[11px] text-destructive font-medium">{editErr}</div>}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const res = updateBatch(b.id, { plates: form.plates, plates_remaining: form.remaining, labor_cost: form.labor, ingredients: form.ings });
                            if (!res.ok) { setEditErr(res.reason ?? "Could not save"); return; }
                            setEditId(null);
                          }}
                          className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
                        >
                          Save
                        </button>
                        <button type="button" onClick={() => setEditId(null)} className="h-9 px-4 rounded-lg border text-sm font-semibold">Cancel</button>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Changing raw materials returns or deducts stock automatically. Plates left is what customers see as “x left”.
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>


      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className="font-mono font-semibold">{value}</span>
    </div>
  );
}

/* ────────────── Menu Requests (custom dishes) ────────────── */
function MenuRequestsPanel() {
  const { customDishRequests } = useStore();
  const awaiting = customDishRequests.filter((r) => r.status === "accepted");
  const confirmed = customDishRequests.filter((r) => r.status === "confirmed");
  const processing = customDishRequests.filter((r) => r.status === "in_kitchen" || r.status === "fulfilled");

  return (
    <div className="space-y-6">
      <div className="bg-surface border rounded-2xl p-4 text-sm text-muted-foreground">
        Funnel: <span className="font-semibold text-foreground">Quote sent</span> → <span className="font-semibold text-foreground">Budget confirmed (wallet debited)</span> → <span className="font-semibold text-foreground">Stock assigned</span> → live order board.
      </div>

      <section>
        <h2 className="font-bold mb-2 flex items-center gap-2"><ClipboardList className="w-4 h-4 text-primary" /> Ready to cost ({confirmed.length})</h2>
        {confirmed.length === 0
          ? <div className="bg-surface border rounded-2xl p-8 text-center text-sm text-muted-foreground">No confirmed menu requests yet. They appear here the moment a client accepts your quote and their wallet is charged.</div>
          : <div className="space-y-3">{confirmed.map((r) => <RequestCostCard key={r.id} req={r} />)}</div>}
      </section>

      {awaiting.length > 0 && (
        <section>
          <h2 className="font-bold mb-2">Awaiting client confirmation ({awaiting.length})</h2>
          <div className="space-y-2">
            {awaiting.map((r) => (
              <div key={r.id} className="bg-surface border rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold">{r.dish_name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{r.customer_name}</span>
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{r.customer_phone}</span>
                  </div>
                </div>
                <div className="text-sm font-mono font-bold text-primary shrink-0">{formatTZS(r.staff_price ?? 0)}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {processing.length > 0 && (
        <section>
          <h2 className="font-bold mb-2">Processing orders ({processing.length})</h2>
          <div className="space-y-2">
            {processing.map((r) => (
              <div key={r.id} className="bg-surface border rounded-2xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold">{r.dish_name} <span className="text-xs font-normal text-muted-foreground">· {r.customer_name} · {r.customer_phone}</span></div>
                    <div className="text-xs text-muted-foreground mt-0.5">Order {r.order_id} · cost {formatTZS(r.total_cost ?? 0)} · paid {formatTZS(r.paid_amount ?? 0)}</div>
                  </div>
                  <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                    {r.status === "in_kitchen" ? "In kitchen" : "Fulfilled"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function RequestCostCard({ req }: { req: CustomDishRequest }) {
  const { rawMaterials, assignCustomDishStock } = useStore();
  const [open, setOpen] = useState(false);
  const [ings, setIngs] = useState<BatchIngredient[]>([]);
  const [labor, setLabor] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const rawCost = useMemo(() => ings.reduce((s, i) => {
    const r = rawMaterials.find((x) => x.id === i.raw_id);
    return s + (r ? r.avg_cost * i.qty : 0);
  }, 0), [ings, rawMaterials]);
  const totalCost = Math.round(rawCost + labor);
  const paid = req.paid_amount ?? req.staff_price ?? 0;
  const margin = paid - totalCost;

  const addIng = () => {
    if (rawMaterials.length === 0) return;
    const avail = rawMaterials.find((r) => !ings.some((i) => i.raw_id === r.id)) ?? rawMaterials[0];
    setIngs([...ings, { raw_id: avail.id, qty: 1 }]);
  };
  const updateIng = (i: number, patch: Partial<BatchIngredient>) => setIngs(ings.map((x, idx) => idx === i ? { ...x, ...patch } : x));
  const removeIng = (i: number) => setIngs(ings.filter((_, idx) => idx !== i));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = assignCustomDishStock(req.id, { ingredients: ings, labor_cost: labor });
    if (!res.ok) { setError(res.reason); return; }
    setError(null);
  };

  return (
    <div className="bg-surface border rounded-2xl overflow-hidden">
      <button onClick={() => setOpen((v) => !v)} className="w-full text-left p-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-bold">{req.dish_name}</div>
          <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-3 mt-1">
            <span className="flex items-center gap-1"><User className="w-3 h-3" />{req.customer_name}</span>
            <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{req.customer_phone}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{req.description}</div>
          {req.ingredients.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {req.ingredients.map((v) => <span key={v} className="text-[11px] bg-muted rounded-full px-2 py-0.5">{v}</span>)}
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-mono font-bold text-emerald-600">{formatTZS(paid)}</div>
          <div className="text-[11px] text-muted-foreground">paid from wallet</div>
        </div>
      </button>

      {open && (
        <form onSubmit={submit} className="border-t p-4 grid lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Assign Raw Materials</div>
              <button type="button" onClick={addIng} className="text-xs font-semibold text-primary flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button>
            </div>
            {ings.length === 0 && <div className="text-xs text-muted-foreground border border-dashed rounded-lg py-4 text-center">No raw materials selected</div>}
            {ings.map((ing, i) => {
              const raw = rawMaterials.find((r) => r.id === ing.raw_id);
              return (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <select value={ing.raw_id} onChange={(e) => updateIng(i, { raw_id: e.target.value })} className="col-span-6 px-2 py-2 rounded-lg border bg-background text-sm">
                    {rawMaterials.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.stock.toFixed(1)} {r.unit})</option>)}
                  </select>
                  <input type="number" min={0} step="any" inputMode="decimal" value={ing.qty} onChange={(e) => updateIng(i, { qty: Number(e.target.value) })} className="col-span-3 px-2 py-2 rounded-lg border bg-background text-sm" />
                  <div className="col-span-2 text-xs text-muted-foreground">{raw ? formatTZS(raw.avg_cost * ing.qty) : ""}</div>
                  <button type="button" onClick={() => removeIng(i)} className="col-span-1 text-muted-foreground hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              );
            })}
            <label className="block text-sm">
              <div className="text-muted-foreground mb-1">Labour / gas cost (TZS)</div>
              <input type="number" min={0} value={labor} onChange={(e) => setLabor(Number(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg border bg-background" />
            </label>
            {error && <div className="text-sm text-red-600">{error}</div>}
            <button className="w-full bg-primary text-white font-bold py-3 rounded-xl">Assign Stock & Send to Kitchen</button>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-primary to-primary/70 text-white rounded-2xl p-5">
              <div className="text-xs uppercase tracking-wider opacity-80 flex items-center gap-1"><Calculator className="w-3 h-3" /> Live Cost Preview</div>
              <div className="mt-4 space-y-1 text-sm opacity-90">
                <Row label="Raw materials" value={formatTZS(rawCost)} />
                <Row label="Labour" value={formatTZS(labor)} />
                <Row label="Client paid" value={formatTZS(paid)} />
              </div>
              <div className="mt-4 pt-4 border-t border-white/30">
                <div className="text-xs uppercase opacity-80">Total cost</div>
                <div className="text-4xl font-black mt-1">{formatTZS(totalCost)}</div>
                <div className={`text-sm font-semibold mt-2 ${margin < 0 ? "text-red-100" : "opacity-90"}`}>
                  Margin {formatTZS(margin)}
                </div>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
