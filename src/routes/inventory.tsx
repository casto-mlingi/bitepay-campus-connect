import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Package, AlertTriangle, Plus, ChefHat, Calculator, Trash2, Boxes } from "lucide-react";
import { useStore, formatTZS, type BatchIngredient } from "@/lib/store";
import { StaffShell } from "@/components/staff-shell";

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

type Tab = "raw" | "batches";

function InventoryPage() {
  const { currentUser } = useStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("raw");

  useEffect(() => {
    if (!currentUser) navigate({ to: "/" });
    else if (currentUser.role !== "staff") navigate({ to: "/dashboard" });
  }, [currentUser, navigate]);

  if (!currentUser || currentUser.role !== "staff") return null;

  return (
    <StaffShell active="inventory">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2"><Boxes className="w-7 h-7 text-primary" /> Store & Inventory</h1>
        <p className="text-muted-foreground">Raw materials, batch costing, and finished plates.</p>
      </div>

      <div className="flex gap-1 mb-6 border-b">
        <TabBtn active={tab === "raw"} onClick={() => setTab("raw")} icon={<Package className="w-4 h-4" />} label="Raw Materials" />
        <TabBtn active={tab === "batches"} onClick={() => setTab("batches")} icon={<ChefHat className="w-4 h-4" />} label="Daily Cooking Batches" />
      </div>

      {tab === "raw" ? <RawMaterialsPanel /> : <BatchesPanel />}
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
            <input type="number" className="w-full px-3 py-2 rounded-lg border bg-background" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} />
          </label>
          <label className="text-sm">
            <div className="text-muted-foreground mb-1">Cost / Unit (TZS)</div>
            <input type="number" className="w-full px-3 py-2 rounded-lg border bg-background" value={form.avg_cost} onChange={(e) => setForm({ ...form, avg_cost: Number(e.target.value) })} />
          </label>
          <label className="col-span-2 text-sm">
            <div className="text-muted-foreground mb-1">Low Stock Threshold</div>
            <input type="number" className="w-full px-3 py-2 rounded-lg border bg-background" value={form.low_threshold} onChange={(e) => setForm({ ...form, low_threshold: Number(e.target.value) })} />
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

/* ────────────── Cooking Batches ────────────── */
function BatchesPanel() {
  const { rawMaterials, products, batches, createBatch } = useStore();
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [plates, setPlates] = useState(40);
  const [ings, setIngs] = useState<BatchIngredient[]>([]);
  const [flash, setFlash] = useState<string | null>(null);

  const rawCost = useMemo(() => ings.reduce((s, i) => {
    const r = rawMaterials.find((x) => x.id === i.raw_id);
    return s + (r ? r.avg_cost * i.qty : 0);
  }, 0), [ings, rawMaterials]);

  const unitCost = plates > 0 ? Math.round(rawCost / plates) : 0;

  const addIng = () => {
    const avail = rawMaterials.find((r) => !ings.some((i) => i.raw_id === r.id));
    if (avail) setIngs([...ings, { raw_id: avail.id, qty: 1 }]);
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
            <select value={productId} onChange={(e) => setProductId(e.target.value)} className="w-full px-3 py-2 rounded-lg border bg-background">
              {products.map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
            </select>
          </label>
          <label className="text-sm">
            <div className="text-muted-foreground mb-1">Total Plates Produced</div>
            <input type="number" min={1} value={plates} onChange={(e) => setPlates(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border bg-background" />
          </label>
          <label className="text-sm md:col-span-2">
            <div className="text-muted-foreground mb-1">Daily Labor / Overhead Cost (TZS)</div>
            <input type="number" min={0} value={labor} onChange={(e) => setLabor(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border bg-background" />
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
                  <input type="number" min={0} step={0.1} value={ing.qty} onChange={(e) => updateIng(i, { qty: Number(e.target.value) })} className="col-span-3 px-2 py-2 rounded-lg border bg-background text-sm" />
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
            <Row label="Labor / Overhead" value={formatTZS(labor)} />
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
              return (
                <li key={b.id} className="flex items-center justify-between p-2 rounded-lg bg-background border">
                  <div>
                    <div className="text-sm font-semibold">{prod?.emoji} {prod?.name}</div>
                    <div className="text-xs text-muted-foreground">{b.id} · {b.plates_remaining}/{b.plates} plates</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{formatTZS(b.unit_cost)}</div>
                    <div className="text-[10px] text-muted-foreground">per plate</div>
                  </div>
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
