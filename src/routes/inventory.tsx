import { DEFAULT_FOOD_MARGIN, DEFAULT_FOOD_FLOOR, marginStatus } from "@/lib/costing-rules";
import { isRetail } from "@/lib/business-rules";
import { TRADE_UNITS } from "@/lib/retail-stock";
import { PACK_UNITS, normalizePack, packLabel, packSize, productDepartment, DEPARTMENT_LABELS, type Department } from "@/lib/pack-units";
import { retailUnitCost } from "@/lib/retail-stock";
import { Link } from "@tanstack/react-router";
import { BarcodeField } from "@/components/barcode-field";
import { Button } from "@/components/ui/button";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Package, AlertTriangle, Plus, ChefHat, Calculator, Trash2, Utensils, UtensilsCrossed, ClipboardList, Phone, User, Pencil, Eye, History, Check, X, Ban, Boxes } from "lucide-react";
import { useStore, formatTZS, type BatchIngredient, type Product, type CustomDishRequest, type StandardPortion, type RawMaterial } from "@/lib/store";
import { StaffShell } from "@/components/staff-shell";
import { DishImagePicker } from "@/components/dish-image-picker";
import { ListFilter, useListFilter } from "@/components/list-filter";
import { ItemBulkTools, Pager } from "@/components/item-bulk-tools";




export const Route = createFileRoute("/inventory")({
  component: InventoryPage,
  head: () => ({
    meta: [
      { title: "Store & Inventory — BitePay Staff" },
      { name: "description", content: "Manage raw materials, log cooking batches, and auto-cost every plate." },
      { property: "og:title", content: "Store & Inventory — BitePay Staff" },
      { property: "og:description", content: "Raw material stock, batch costing, and finished goods for your business." },
    
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },],
  }),
});

type Tab = "raw" | "finished" | "menu" | "batches" | "requests";

function InventoryPage() {
  const { currentUser, sessionReady, customDishRequests, store } = useStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("raw");
  const retail = isRetail(store?.business_type);
  const currentTab = retail ? "menu" : tab;
  const pendingRequests = customDishRequests.filter((r) => r.status === "confirmed").length;

  useEffect(() => {
    if (sessionReady && !currentUser) navigate({ to: "/" });
    else if (currentUser && currentUser.role !== "staff") navigate({ to: "/dashboard" });
  }, [currentUser, navigate]);

  if (!currentUser || currentUser.role !== "staff") return null;

  return (
    <StaffShell active="inventory">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2"><UtensilsCrossed className="w-7 h-7 text-primary" /> Store & Inventory</h1>
        <p className="text-muted-foreground">{retail ? "Products, stock and purchase records." : "Raw materials, finished dishes, and batch costing."}</p>
      </div>

      <div className="flex gap-1 mb-6 border-b overflow-x-auto">
        {!retail && <TabBtn active={currentTab === "raw"} onClick={() => setTab("raw")} icon={<Package className="w-4 h-4" />} label="Raw Materials" />}
        {!retail && <TabBtn active={currentTab === "finished"} onClick={() => setTab("finished")} icon={<Boxes className="w-4 h-4" />} label="Finished Goods" />}
        <TabBtn active={currentTab === "menu"} onClick={() => setTab("menu")} icon={<Utensils className="w-4 h-4" />} label={retail ? "Products" : "Menu / Dishes"} />
        {!retail && <><TabBtn active={currentTab === "batches"} onClick={() => setTab("batches")} icon={<ChefHat className="w-4 h-4" />} label="Daily Cooking Batches" />
        <TabBtn active={currentTab === "requests"} onClick={() => setTab("requests")} icon={<ClipboardList className="w-4 h-4" />} label={`Menu Requests${pendingRequests ? ` (${pendingRequests})` : ""}`} /></>}
      </div>

      {currentTab === "raw" && <RawMaterialsPanel />}
      {currentTab === "finished" && <FinishedGoodsPanel />}
      {currentTab === "menu" && <MenuPanel />}
      {currentTab === "batches" && <BatchesPanel />}
      {currentTab === "requests" && <MenuRequestsPanel />}
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
type RawUnit = "kg" | "liters" | "pcs";
const RAW_UNITS: RawUnit[] = ["kg", "liters", "pcs"];
const blankRaw = () => ({ name: "", category: "", unit: "kg" as RawUnit, stock: 0, avg_cost: 0, low_threshold: 10, pack_unit: "", pack_size: "" });
const qty = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });

function StatTile({ label, value, tone }: { label: string; value: string; tone?: "ok" | "low" | "out" }) {
  const toneCls = tone === "low" ? "text-warning" : tone === "out" ? "text-destructive" : "";
  return (
    <div className="bg-surface border rounded-2xl p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className={`mt-1 font-mono font-bold text-lg ${toneCls}`}>{value}</div>
    </div>
  );
}

function RawStatusPill({ status }: { status: "ok" | "low" | "out" }) {
  if (status === "out") return <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-destructive/10 text-destructive px-2 py-1 rounded-full"><AlertTriangle className="w-3 h-3" /> Out of stock</span>;
  if (status === "low") return <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-warning/15 text-warning px-2 py-1 rounded-full"><AlertTriangle className="w-3 h-3" /> Low stock</span>;
  return <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-success/10 text-success px-2 py-1 rounded-full">In stock</span>;
}

function RawMaterialsPanel() {
  const { rawMaterials, addRawMaterial, updateRawMaterial, convertRawToFinished } = useStore();
  const moveToFinished = (r: RawMaterial) => {
    const v = window.prompt(`Move "${r.name}" to Finished Goods so it sells directly on POS.\nEnter selling price per piece (TZS):`);
    if (v == null) return;
    const price = Math.round(Number(v.replace(/[, ]/g, "")));
    if (!Number.isSafeInteger(price) || price <= 0) { window.alert("Enter a valid selling price."); return; }
    const drink = /beer|lager|soda|juice|water|wine|drink|cola|pepsi|fanta|malt|energy|whisk|vodka|gin/i.test(`${r.name} ${r.category}`);
    if (!convertRawToFinished(r.id, { price, department: drink ? "drinks" : "resale" })) window.alert("Could not move this item.");
  };
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(blankRaw());
  const { filter, setFilter, match } = useListFilter();

  const rows = useMemo(() => rawMaterials.filter((r) => !r.converted_product_id).map((r) => {
    const value = Math.round(r.stock * r.avg_cost);
    const out = r.stock <= 0;
    const low = !out && r.stock <= r.low_threshold;
    return { r, value, status: (out ? "out" : low ? "low" : "ok") as "ok" | "low" | "out" };
  }), [rawMaterials]);

  const totals = useMemo(() => ({
    value: rows.reduce((s, x) => s + x.value, 0),
    low: rows.filter((x) => x.status === "low").length,
    out: rows.filter((x) => x.status === "out").length,
  }), [rows]);

  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [catF, setCatF] = useState("all");
  const cats = useMemo(() => [...new Set(rows.map((x) => x.r.category).filter(Boolean))].sort(), [rows]);
  const filtered = rows.filter((x) => (catF === "all" || x.r.category === catF) && match({ text: `${x.r.name} ${x.r.category}`, status: x.status }));
  const pageCount = Math.max(1, Math.ceil(filtered.length / size));
  const shown = filtered.slice((Math.min(page, pageCount) - 1) * size, Math.min(page, pageCount) * size);
  const rawCols = [
    { key: "name", label: "Name", example: "Rice" }, { key: "category", label: "Category", example: "Grains" },
    { key: "unit", label: "Unit (kg/liters/pcs)", example: "kg" }, { key: "stock", label: "Stock", example: 50 },
    { key: "avg_cost", label: "Cost per unit", example: 2500 }, { key: "low_threshold", label: "Low stock alert", example: 10 },
    { key: "pack_unit", label: "Pack type", example: "" }, { key: "pack_size", label: "Pieces per pack", example: "" },
  ];
  const importRaw = (list: Record<string, string>[]) => {
    const names = new Set(rawMaterials.map((r) => r.name.trim().toLowerCase()));
    let added = 0, skipped = 0;
    for (const x of list) {
      const name = (x.name ?? "").trim();
      if (!name || names.has(name.toLowerCase())) { skipped++; continue; }
      const unit = (RAW_UNITS as string[]).includes((x.unit ?? "").toLowerCase()) ? (x.unit.toLowerCase() as RawUnit) : "kg";
      const pk = normalizePack(x.pack_unit ?? "", Number(x.pack_size) || 0);
      addRawMaterial({ name, category: x.category ?? "", unit, stock: Math.max(0, Number(x.stock) || 0), avg_cost: Math.max(0, Number(x.avg_cost) || 0), low_threshold: Math.max(0, Number(x.low_threshold) || 0), pack_unit: pk.pack_unit, pack_size: pk.pack_size });
      names.add(name.toLowerCase()); added++;
    }
    return { added, skipped };
  };

  const pack = normalizePack(form.pack_unit, Number(form.pack_size) || 0);
  const packMissing = !!form.pack_unit && !pack.pack_size;

  const reset = () => { setForm(blankRaw()); setEditingId(null); };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const again = ((e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value === "new";
    if (!form.name.trim() || packMissing) return;
    const data = { name: form.name, category: form.category, unit: form.unit, stock: Number(form.stock) || 0, avg_cost: Number(form.avg_cost) || 0, low_threshold: Number(form.low_threshold) || 0, pack_unit: pack.pack_unit, pack_size: pack.pack_size };
    if (editingId) updateRawMaterial(editingId, data); else addRawMaterial(data);
    reset();
    if (again) { setForm({ ...blankRaw(), category: form.category, unit: form.unit }); window.scrollTo({ top: 0, behavior: "smooth" }); }
    else setShowForm(false);
  };
  const startEdit = (r: RawMaterial) => {
    setForm({ name: r.name, category: r.category, unit: r.unit, stock: r.stock, avg_cost: r.avg_cost, low_threshold: r.low_threshold, pack_unit: r.pack_unit ?? "", pack_size: r.pack_size ? String(r.pack_size) : "" });
    setEditingId(r.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Items tracked" value={String(rows.length)} />
        <StatTile label="Stock value" value={formatTZS(totals.value)} />
        <StatTile label="Low stock" value={String(totals.low)} tone={totals.low ? "low" : undefined} />
        <StatTile label="Out of stock" value={String(totals.out)} tone={totals.out ? "out" : undefined} />
      </div>

      <ListFilter
        filter={filter}
        onChange={setFilter}
        showPeriod={false}
        placeholder="Search items or categories…"
        statuses={[{ value: "ok", label: "In stock" }, { value: "low", label: "Low stock" }, { value: "out", label: "Out of stock" }]}
        right={<>
          <select aria-label="Filter by category" value={catF} onChange={(e) => { setCatF(e.target.value); setPage(1); }} className="h-10 rounded-xl border bg-background px-3 text-sm">
            <option value="all">All categories</option>{cats.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={() => { reset(); setShowForm((v) => !v); }} className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 h-10 rounded-xl text-sm font-semibold hover:opacity-90">
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </>}
      />
      <ItemBulkTools cols={rawCols} fileBase="raw-materials" rows={filtered.map(({ r }) => ({ ...r, pack_unit: r.pack_unit ?? "", pack_size: r.pack_size ?? "" }))} onImport={importRaw} />

      {showForm && (
        <form onSubmit={submit} className="bg-surface border rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm">{editingId ? "Edit raw material" : "New raw material"}</h2>
            <button type="button" onClick={() => { reset(); setShowForm(false); }} aria-label="Close form" className="p-2 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <label className="col-span-2 text-sm">
              <div className="text-muted-foreground mb-1">Item Name</div>
              <input required placeholder="e.g. Rice" className="w-full h-11 px-3 rounded-lg border bg-background" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="col-span-2 md:col-span-2 text-sm">
              <div className="text-muted-foreground mb-1">Category</div>
              <input placeholder="e.g. Grains" className="w-full h-11 px-3 rounded-lg border bg-background" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </label>
            <label className="col-span-2 md:col-span-2 text-sm">
              <div className="text-muted-foreground mb-1">Stocking unit</div>
              <select className="w-full h-11 px-3 rounded-lg border bg-background" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value as RawUnit })}>
                {RAW_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </label>
          </div>

          <div className="border-t pt-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Stock &amp; cost</div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <label className="text-sm">
                <div className="text-muted-foreground mb-1">Stock ({form.unit})</div>
                <input type="number" step="any" inputMode="decimal" className="w-full h-11 px-3 rounded-lg border bg-background" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} />
              </label>
              <label className="text-sm">
                <div className="text-muted-foreground mb-1">Cost / {form.unit} (TZS)</div>
                <input type="number" inputMode="numeric" className="w-full h-11 px-3 rounded-lg border bg-background" value={form.avg_cost} onChange={(e) => setForm({ ...form, avg_cost: Number(e.target.value) })} />
              </label>
              <label className="col-span-2 text-sm">
                <div className="text-muted-foreground mb-1">Low stock alert at</div>
                <input type="number" step="any" inputMode="decimal" className="w-full h-11 px-3 rounded-lg border bg-background" value={form.low_threshold} onChange={(e) => setForm({ ...form, low_threshold: Number(e.target.value) })} />
              </label>
            </div>
          </div>

          <div className="border-t pt-3">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Supplier pack <span className="normal-case font-normal">(optional — buy by the crate, sell by the piece)</span></div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <label className="col-span-2 text-sm">
                <div className="text-muted-foreground mb-1">Pack type</div>
                <select aria-label="Supplier pack" className="w-full h-11 px-3 rounded-lg border bg-background" value={form.pack_unit} onChange={(e) => setForm({ ...form, pack_unit: e.target.value })}>
                  <option value="">None — bought loose</option>
                  {PACK_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </label>
              <label className="col-span-2 text-sm">
                <div className="text-muted-foreground mb-1">Pieces per {form.pack_unit || "pack"}</div>
                <input aria-label="Pieces per pack" type="number" min={0} inputMode="numeric" placeholder="e.g. 25" disabled={!form.pack_unit} className="w-full h-11 px-3 rounded-lg border bg-background disabled:opacity-50" value={form.pack_size} onChange={(e) => setForm({ ...form, pack_size: e.target.value })} />
              </label>
              <div className="col-span-2 text-xs text-muted-foreground self-end pb-3">
                {pack.pack_size
                  ? <span className="inline-flex items-center gap-1 font-semibold text-primary"><Boxes className="w-3.5 h-3.5" /> 1 {pack.pack_unit} = {pack.pack_size} {form.unit} · buying 2 adds {pack.pack_size * 2} {form.unit}</span>
                  : packMissing
                    ? <span className="text-destructive font-semibold">Enter how many pieces are inside one {form.pack_unit}.</span>
                    : <span>Leave empty if this item is bought loose (e.g. rice by the kg).</span>}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { reset(); setShowForm(false); }} className="px-4 h-10 rounded-lg border text-sm font-semibold">Cancel</button>
            <button type="submit" className="px-4 h-10 bg-foreground text-background rounded-lg font-semibold text-sm">{editingId ? "Save changes" : "Save item"}</button>
            {!editingId && <button type="submit" value="new" className="px-4 h-10 bg-primary text-primary-foreground rounded-lg font-semibold text-sm">Save & new</button>}
          </div>
        </form>
      )}

      {rows.length === 0 ? (
        <div className="bg-surface border rounded-2xl p-10 text-center text-sm text-muted-foreground">
          No raw materials yet. Add your first item — you can buy it loose, or by the crate, carton or box.
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface border rounded-2xl p-10 text-center text-sm text-muted-foreground">No items match this filter.</div>
      ) : (
        <>
          {/* Desktop ledger */}
          <div className="hidden md:block bg-surface border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3">Bought as</th>
                    <th className="px-4 py-3 text-right">Stock</th>
                    <th className="px-4 py-3 text-right">Avg cost / unit</th>
                    <th className="px-4 py-3 text-right">Stock value</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map(({ r, value, status }) => (
                    <tr key={r.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="font-semibold">{r.name}</div>
                        <div className="text-xs text-muted-foreground">{r.category || "Uncategorised"}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{packLabel(r)}</td>
                      <td className="px-4 py-3 text-right font-mono">{qty(r.stock)} {r.unit}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatTZS(r.avg_cost)}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">{formatTZS(value)}</td>
                      <td className="px-4 py-3"><RawStatusPill status={status} /></td>
                      <td className="px-4 py-3 text-right">
                        <button type="button" onClick={() => startEdit(r)} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-xs font-semibold hover:bg-muted"><Pencil className="w-3.5 h-3.5" /> Edit</button>
<button type="button" onClick={() => moveToFinished(r)} title="Sell directly on POS" className="inline-flex items-center gap-1.5 h-9 px-3 text-xs rounded-lg border font-semibold hover:bg-muted ml-1"><Boxes className="w-3.5 h-3.5" /> To Finished Goods</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/40 font-semibold">
                    <td className="px-4 py-3" colSpan={4}>{filtered.length} of {rows.length} items</td>
                    <td className="px-4 py-3 text-right font-mono">{formatTZS(filtered.reduce((s, x) => s + x.value, 0))}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Phone ledger */}
          <div className="md:hidden space-y-3">
            {shown.map(({ r, value, status }) => (
              <div key={r.id} className="bg-surface border rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold truncate">{r.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{r.category || "Uncategorised"}</div>
                  </div>
                  <RawStatusPill status={status} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-muted/50 rounded-lg p-2">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Stock</div>
                    <div className="font-mono font-bold text-sm">{qty(r.stock)} {r.unit}</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Avg cost</div>
                    <div className="font-mono font-bold text-sm">{formatTZS(r.avg_cost)}</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Value</div>
                    <div className="font-mono font-bold text-sm">{formatTZS(value)}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground inline-flex items-center gap-1"><Boxes className="w-3.5 h-3.5" /> {packLabel(r)}</span>
                  <button type="button" onClick={() => startEdit(r)} className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg border text-sm font-semibold"><Pencil className="w-3.5 h-3.5" /> Edit</button>
<button type="button" onClick={() => moveToFinished(r)} title="Sell directly on POS" className="inline-flex items-center gap-1.5 h-10 px-4 text-sm rounded-lg border font-semibold hover:bg-muted ml-1"><Boxes className="w-3.5 h-3.5" /> To Finished Goods</button>
                </div>
              </div>
            ))}
          </div>
          <Pager total={filtered.length} page={page} size={size} onPage={setPage} onSize={setSize} />
        </>
      )}
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

/* ────────────── Finished Goods (sold as bought, straight to POS) ────────────── */
const blankFG = () => ({ barcode: "", name: "", category: "", department: "drinks" as Department, price: "", unit_cost: "", qty: "", pack_unit: "", pack_size: "", image: undefined as string | undefined });
function FinishedGoodsPanel() {
  const { products, addFinishedGood, updateProduct, setProductArchived, availablePlates, batches, can } = useStore();
  const [form, setForm] = useState(blankFG());
  const [show, setShow] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [uploading, setUploading] = useState(false);
  const rows = products.filter((p) => p.direct_sale).map((p) => {
    const stock = availablePlates(p.id) ?? 0;
    const latest = batches.filter((b) => b.product_id === p.id).sort((a, b) => b.created_at - a.created_at)[0];
    const cost = latest?.unit_cost ?? p.cost_price ?? 0;
    return { p, stock, cost, margin: cost > 0 ? ((p.price - cost) / p.price) * 100 : null };
  }).filter((x) => !q.trim() || `${x.p.name} ${x.p.category} ${x.p.barcode ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()));
  const value = rows.reduce((s, x) => s + Math.max(0, x.stock) * x.cost, 0);
  const pack = normalizePack(form.pack_unit, Number(form.pack_size) || 0);
  const close = () => { setForm(blankFG()); setEditingId(null); setShow(false); };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = Math.round(Number(form.price));
    if (uploading || !form.name.trim() || !(price > 0)) return;
    const base = { barcode: form.barcode.trim() || undefined, name: form.name.trim(), category: form.category.trim(), department: form.department, price, pack_unit: pack.pack_unit, pack_size: pack.pack_size, image: form.image };
    if (editingId) updateProduct(editingId, base);
    else addFinishedGood({ ...base, description: "", emoji: form.department === "drinks" ? "🥤" : "📦", gradient: GRADIENTS[0], unit: "pcs" }, { qty: Number(form.qty) || 0, unit_cost: Number(form.unit_cost) || 0 });
    close();
  };
  const edit = (p: Product) => { setEditingId(p.id); setForm({ ...blankFG(), barcode: p.barcode ?? "", name: p.name, category: p.category, department: productDepartment(p), price: String(p.price), pack_unit: p.pack_unit ?? "", pack_size: p.pack_size ? String(p.pack_size) : "", image: p.image }); setShow(true); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const inp = "w-full px-3 py-2 rounded-lg border bg-background";
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatTile label="Items" value={String(rows.length)} />
        <StatTile label="Stock value" value={formatTZS(Math.round(value))} />
        <StatTile label="Out of stock" value={String(rows.filter((x) => x.stock <= 0).length)} tone={rows.some((x) => x.stock <= 0) ? "out" : undefined} />
      </div>
      <p className="text-sm text-muted-foreground">Items you buy and sell as they are (beer, soda, water, cigarettes). They appear on POS immediately; supplier purchases in Finance add stock, sales reduce it.</p>
      <div className="flex gap-2">
        <input placeholder="Search finished goods" className={inp} value={q} onChange={(e) => setQ(e.target.value)} />
        {can("inventory.edit") && <Button type="button" onClick={() => (show ? close() : setShow(true))}><Plus className="w-4 h-4" /> Add</Button>}
      </div>
      {show && (
        <form onSubmit={submit} className="bg-surface border rounded-2xl p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="col-span-2 md:col-span-1 md:row-span-2"><DishImagePicker value={form.image} onChange={(image) => setForm((f) => ({ ...f, image }))} onBusyChange={setUploading} /></div>
          <label className="col-span-2 text-sm"><div className="text-muted-foreground mb-1">Item name</div><input required placeholder="e.g. Safari Lager" className={inp} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label className="text-sm"><div className="text-muted-foreground mb-1">POS section</div><select className={inp} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value as Department })}>{(["drinks", "resale", "food"] as Department[]).map((d) => <option key={d} value={d}>{DEPARTMENT_LABELS[d]}</option>)}</select></label>
          <label className="text-sm"><div className="text-muted-foreground mb-1">Category</div><input placeholder="e.g. Beer" className={inp} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></label>
          <div className="col-span-2 text-sm"><div className="text-muted-foreground mb-1">Barcode (optional)</div><BarcodeField value={form.barcode} onChange={(v) => setForm({ ...form, barcode: v })} /></div>
          <label className="text-sm"><div className="text-muted-foreground mb-1">Selling price / pc</div><input required type="number" min={1} className={inp} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label>
          {!editingId && <><label className="text-sm"><div className="text-muted-foreground mb-1">Cost / pc</div><input type="number" min={0} className={inp} value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: e.target.value })} /></label>
          <label className="text-sm"><div className="text-muted-foreground mb-1">Opening stock (pcs)</div><input type="number" min={0} className={inp} value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} /></label></>}
          <label className="text-sm"><div className="text-muted-foreground mb-1">Supplier pack</div><select className={inp} value={form.pack_unit} onChange={(e) => setForm({ ...form, pack_unit: e.target.value })}><option value="">None</option>{PACK_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}</select></label>
          <label className="text-sm"><div className="text-muted-foreground mb-1">Pieces per pack</div><input type="number" min={2} className={inp} value={form.pack_size} onChange={(e) => setForm({ ...form, pack_size: e.target.value })} /></label>
          <div className="col-span-2 md:col-span-4 flex gap-2 justify-end"><Button type="button" variant="outline" onClick={close}>Cancel</Button><Button type="submit" disabled={uploading}>{editingId ? "Save" : "Add to POS"}</Button></div>
        </form>
      )}
      {rows.length === 0 ? <div className="text-center text-sm text-muted-foreground border rounded-2xl p-8">No finished goods yet. Add one, or tap "To Finished Goods" on a Raw Materials item.</div> : (
        <div className="grid gap-2">
          {rows.map(({ p, stock, cost, margin }) => (
            <div key={p.id} className="bg-surface border rounded-xl p-3 flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex items-center justify-center text-xl shrink-0">{p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : p.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{p.name}</div>
                <div className="text-xs text-muted-foreground">{DEPARTMENT_LABELS[productDepartment(p)]} · {formatTZS(p.price)}{cost ? ` · cost ${formatTZS(cost)}` : ""}{margin != null ? ` · ${margin.toFixed(0)}%` : ""} · {packLabel(p)}</div>
              </div>
              <div className={`font-mono font-bold text-sm ${stock <= 0 ? "text-destructive" : ""}`}>{qty(stock)} pcs</div>
              {can("inventory.edit") && <><button type="button" onClick={() => edit(p)} className="h-9 px-2 rounded-lg border" aria-label="Edit"><Pencil className="w-4 h-4" /></button>
              <button type="button" onClick={() => window.confirm(`Remove ${p.name} from POS? Past sales are kept.`) && setProductArchived(p.id, true)} className="h-9 px-2 rounded-lg border text-destructive" aria-label="Remove"><Trash2 className="w-4 h-4" /></button></>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MenuPanel() {
  const { products, archivedProducts, addProduct, updateProduct, setProductArchived, store, availablePlates, can } = useStore();
  const retail = isRetail(store?.business_type);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Product, "id" | "store_id">>({
    name: "", description: "", price: 0, category: "", emoji: "🍽️", gradient: GRADIENTS[0], image: undefined,
  });
  const [uploading, setUploading] = useState(false);
  const { batches, purchases } = useStore();
  const [menuQ, setMenuQ] = useState("");
  const [dept, setDept] = useState<"all" | Department>("all");
  const menuRows = useMemo(() => products.filter((p) => retail || !p.direct_sale).map((p) => {
    const stock = availablePlates(p.id);
    const latest = batches.filter((b) => b.product_id === p.id && b.plates > 0).sort((a, b) => b.created_at - a.created_at)[0];
    const cost = retail ? (retailUnitCost(p, purchases.filter((x) => x.store_id === p.store_id)) || p.cost_price || 0) : latest?.unit_cost ?? 0;
    const margin = cost > 0 && p.price > 0 ? ((p.price - cost) / p.price) * 100 : null;
    const low = retail ? p.low_stock_threshold ?? 0 : 3;
    const status = (stock == null ? "none" : stock <= 0 ? "out" : stock <= low ? "low" : "ok") as "none" | "ok" | "low" | "out";
    return { p, stock, cost, margin, status, dep: productDepartment(p), value: Math.round(Math.max(0, stock ?? 0) * cost) };
  }), [products, batches, purchases, availablePlates, retail]);
  const [mPage, setMPage] = useState(1);
  const [mSize, setMSize] = useState(10);
  const filteredMenu = menuRows.filter((x) => (dept === "all" || x.dep === dept) && (!menuQ.trim() || `${x.p.name} ${x.p.category} ${x.p.sku ?? ""} ${x.p.barcode ?? ""}`.toLowerCase().includes(menuQ.trim().toLowerCase())));
  const mPages = Math.max(1, Math.ceil(filteredMenu.length / mSize));
  const shownMenu = filteredMenu.slice((Math.min(mPage, mPages) - 1) * mSize, Math.min(mPage, mPages) * mSize);
  const menuCols = [
    { key: "name", label: "Name", example: retail ? "Sugar 1kg" : "Pilau" }, { key: "category", label: "Category", example: retail ? "Groceries" : "Main Course" },
    { key: "price", label: "Price (TZS)", example: 3000 }, { key: "description", label: "Description", example: "" },
    ...(retail ? [{ key: "unit", label: "Sale unit", example: "pcs" }, { key: "sku", label: "SKU", example: "" }, { key: "barcode", label: "Barcode", example: "" }, { key: "cost_price", label: "Cost per unit", example: 2400 }, { key: "opening_stock", label: "Opening stock", example: 20 }, { key: "low_stock_threshold", label: "Low-stock alert", example: 5 }] : []),
  ];
  const importMenu = (list: Record<string, string>[]) => {
    const names = new Set(products.map((p) => p.name.trim().toLowerCase()));
    let added = 0, skipped = 0;
    for (const x of list) {
      const name = (x.name ?? "").trim(); const price = Math.round(Number(x.price) || 0);
      if (!name || price <= 0 || names.has(name.toLowerCase())) { skipped++; continue; }
      const n = (v?: string) => Math.max(0, Number(v) || 0);
      addProduct({ name, description: x.description ?? "", price, category: x.category ?? "", emoji: "🍽️", gradient: GRADIENTS[0], image: undefined,
        ...(retail ? { unit: ((TRADE_UNITS as readonly string[]).includes(x.unit) ? x.unit : "pcs") as Product["unit"], sku: x.sku || undefined, barcode: x.barcode || undefined, cost_price: Math.round(n(x.cost_price)), opening_stock: n(x.opening_stock), low_stock_threshold: n(x.low_stock_threshold) } : {}) });
      names.add(name.toLowerCase()); added++;
    }
    return { added, skipped };
  };

  const reset = () => { setEditingId(null);
    setForm({ name: "", description: "", price: 0, category: "", emoji: "🍽️", gradient: GRADIENTS[0], image: undefined }); };

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({ name: p.name, description: p.description, price: p.price, category: p.category, emoji: p.emoji, gradient: p.gradient, image: p.image, unit: p.unit, pack_unit: p.pack_unit, pack_size: p.pack_size, department: p.department, sku: p.sku, barcode: p.barcode, cost_price: p.cost_price, opening_stock: p.opening_stock, low_stock_threshold: p.low_stock_threshold });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const again = ((e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value === "new";
    if (uploading) return;
    if (!form.name.trim() || form.price <= 0) return;
    if (editingId) updateProduct(editingId, form); else addProduct(form);
    const keep = { category: form.category, department: form.department, unit: form.unit };
    reset();
    if (again) { setForm((f) => ({ ...f, ...keep })); window.scrollTo({ top: 0, behavior: "smooth" }); }
    else setShowForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{products.length} {retail ? "products" : "dishes on the menu"}</div>
        <button onClick={() => setShowForm((v) => !v)} className="flex items-center gap-1.5 bg-primary text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90">
          <Plus className="w-4 h-4" /> {retail ? "Add product" : "Add Dish"}
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
            <div className="text-muted-foreground mb-1">{retail ? "Product name" : "Dish Name"}</div>
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
          <label className="col-span-2 text-sm">POS section<select aria-label="POS section" value={form.department ?? ""} onChange={(e) => setForm({ ...form, department: (e.target.value || undefined) as Product["department"] })} className="w-full h-11 border rounded-md bg-background px-3"><option value="">Automatic (from category)</option><option value="food">Food</option><option value="drinks">Drinks</option><option value="resale">Resale (cigarettes, snacks…)</option></select></label>
          <label className="col-span-1 text-sm">Supplier pack<select aria-label="Supplier pack" value={form.pack_unit ?? ""} onChange={(e) => setForm({ ...form, pack_unit: (e.target.value || undefined) as Product["pack_unit"] })} className="w-full h-11 border rounded-md bg-background px-3"><option value="">None</option>{TRADE_UNITS.filter((u) => ["crate", "carton", "box", "bale", "packet", "bag"].includes(u)).map((u) => <option key={u}>{u}</option>)}</select></label>
          <label className="col-span-1 text-sm">Pieces per pack<input aria-label="Pieces per pack" type="number" min={0} inputMode="numeric" value={form.pack_size ?? ""} onChange={(e) => setForm({ ...form, pack_size: Math.max(0, Math.round(Number(e.target.value) || 0)) || undefined })} placeholder="e.g. 25" className="w-full h-11 border rounded-md px-3 bg-background" /></label>
          {retail && <><label className="col-span-2 text-sm">Sale unit<select aria-label="Sale unit" value={form.unit ?? "pcs"} onChange={(e) => setForm({ ...form, unit: e.target.value as Product["unit"] })} className="w-full h-11 border rounded-md bg-background px-3">{TRADE_UNITS.map((u) => <option key={u}>{u}</option>)}</select></label><label className="col-span-2 text-sm">SKU<input aria-label="SKU" value={form.sku ?? ""} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="w-full h-11 border rounded-md px-3 bg-background" /></label><div className="col-span-2 text-sm">Barcode<BarcodeField value={form.barcode ?? ""} onChange={(v) => setForm({ ...form, barcode: v })} /></div><label className="col-span-2 text-sm">Cost per unit<input aria-label="Cost per unit" type="number" min={0} value={form.cost_price ?? 0} onChange={(e) => setForm({ ...form, cost_price: Math.max(0, Math.round(Number(e.target.value) || 0)) })} className="w-full h-11 border rounded-md px-3 bg-background" /></label><label className="col-span-2 text-sm">Opening stock<input aria-label="Opening stock" disabled={!!editingId} type="number" min={0} value={form.opening_stock ?? 0} onChange={(e) => setForm({ ...form, opening_stock: Math.max(0, Number(e.target.value) || 0) })} className="w-full h-11 border rounded-md px-3 bg-background" /></label><label className="col-span-2 text-sm">Low-stock alert<input aria-label="Low-stock alert" type="number" min={0} value={form.low_stock_threshold ?? 0} onChange={(e) => setForm({ ...form, low_stock_threshold: Math.max(0, Number(e.target.value) || 0) })} className="w-full h-11 border rounded-md px-3 bg-background" /></label></>}
          <div className="col-span-2 md:col-span-6 flex justify-end gap-2">
            <button type="button" onClick={() => { reset(); setShowForm(false); }} className="px-4 py-2 rounded-lg border text-sm font-semibold">Cancel</button>
            <button
              type="submit"
              disabled={uploading}
              className="px-4 py-2 bg-foreground text-background rounded-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              title={uploading ? "Finish the photo step before saving" : ""}
            >
              {uploading ? "Processing photo…" : editingId ? "Save changes" : retail ? "Save product" : "Save Dish"}
            </button>
            {!editingId && <button type="submit" value="new" disabled={uploading} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold text-sm disabled:opacity-50">Save & new</button>}
          </div>

        </form>
      )}

      <ItemBulkTools cols={menuCols} fileBase={retail ? "products" : "menu"} rows={filteredMenu.map(({ p }) => ({ ...p }))} onImport={importMenu} />
      {retail && <Button asChild variant="outline"><Link to="/finance">Record stock purchase</Link></Button>}
      {products.length === 0 ? (
        <div className="bg-surface border rounded-2xl p-10 text-center text-sm text-muted-foreground">
          {retail ? "No products yet" : "No dishes yet. Add your first finished product — it will show up in the POS, customer menu, and the cooking batch dropdown."}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile label={retail ? "Products" : "Menu items"} value={String(menuRows.length)} />
            <StatTile label="Stock value" value={formatTZS(menuRows.reduce((s, x) => s + x.value, 0))} />
            <StatTile label="Low stock" value={String(menuRows.filter((x) => x.status === "low").length)} tone="low" />
            <StatTile label="Out of stock" value={String(menuRows.filter((x) => x.status === "out").length)} tone="out" />
          </div>
          <div className="flex flex-wrap gap-2">
            <input aria-label="Search items" placeholder="Search items or category" value={menuQ} onChange={(e) => { setMenuQ(e.target.value); setMPage(1); }} className="flex-1 min-w-[160px] h-11 px-3 rounded-xl border bg-background" />
            {!retail && <select aria-label="POS section filter" value={dept} onChange={(e) => { setDept(e.target.value as typeof dept); setMPage(1); }} className="h-11 px-3 rounded-xl border bg-background">
              <option value="all">All sections</option><option value="food">Food</option><option value="drinks">Drinks</option><option value="resale">Resale</option>
            </select>}
          </div>
          <div className="space-y-2">
            {shownMenu.map(({ p, stock, cost, margin, status, dep }) => (
              <div key={p.id} className="bg-surface border rounded-2xl p-3 flex gap-3">
                {p.image ? <img src={p.image} alt={p.name} className="w-16 h-16 rounded-xl object-cover shrink-0 bg-muted" /> : <div className={`w-16 h-16 rounded-xl shrink-0 bg-gradient-to-br ${p.gradient} flex items-center justify-center text-2xl`}>{p.emoji}</div>}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold truncate">{p.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{p.category || "Uncategorized"}{!retail ? ` · ${DEPARTMENT_LABELS[dep]}` : ""}{packSize(p) ? ` · ${packLabel(p)}` : ""}{p.sku ? ` · ${p.sku}` : ""}</div>
                    </div>
                    {status === "none" ? <span className="text-[11px] font-semibold bg-muted text-muted-foreground px-2 py-1 rounded-full whitespace-nowrap">No stock yet</span> : <RawStatusPill status={status} />}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    <div className="bg-muted/50 rounded-lg p-1.5"><div className="text-[10px] uppercase text-muted-foreground">Stock</div><div className="font-mono font-bold text-sm">{stock == null ? "—" : `${qty(stock)} ${retail ? p.unit ?? "pcs" : dep === "food" ? "plates" : "pcs"}`}</div></div>
                    <div className="bg-muted/50 rounded-lg p-1.5"><div className="text-[10px] uppercase text-muted-foreground">Cost</div><div className="font-mono font-bold text-sm">{cost ? formatTZS(Math.round(cost)) : "—"}</div></div>
                    <div className="bg-muted/50 rounded-lg p-1.5"><div className="text-[10px] uppercase text-muted-foreground">Price</div><div className="font-mono font-bold text-sm text-primary">{formatTZS(p.price)}</div></div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-semibold ${margin == null ? "text-muted-foreground" : margin < 10 ? "text-destructive" : "text-success"}`}>{margin == null ? "Margin: —" : `Margin ${margin.toFixed(1)}%`}</span>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => startEdit(p)} className="h-9 px-3 rounded-lg border text-sm font-semibold inline-flex items-center gap-1"><Pencil className="w-3.5 h-3.5" /> Edit</button>
                      <button type="button" aria-label={`Delete ${p.name}`} onClick={() => { if (window.confirm(`Remove ${p.name} from the POS? Past sales stay saved and you can restore it later.`)) setProductArchived(p.id, true); }} className="h-9 px-3 rounded-lg border border-destructive/40 text-destructive"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {filteredMenu.length === 0 && <div className="bg-surface border rounded-2xl p-6 text-center text-sm text-muted-foreground">No items match this search.</div>}
          </div>
          <Pager total={filteredMenu.length} page={mPage} size={mSize} onPage={setMPage} onSize={setMSize} />
        </>
      )}

      {archivedProducts.length > 0 && (
        <div className="bg-surface border rounded-2xl p-4">
          <div className="font-semibold mb-2">Removed items ({archivedProducts.length})</div>
          <ul className="divide-y">
            {archivedProducts.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2 gap-2">
                <span className="truncate">{p.emoji} {p.name} · {formatTZS(p.price)}</span>
                <button type="button" onClick={() => setProductArchived(p.id, false)} className="h-9 px-3 rounded-lg border text-sm font-semibold">Restore</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}



/* ────────────── Cooking Batches ────────────── */
function BatchesPanel() {
  const {
    rawMaterials, products, batches, cookedCommodityBatches, menuPortionMappings, cookedCommodityUsages,
    createBatch, updateBatch, deleteBatch, createCookedCommodityBatch,
    setProductPortionMappings, closeCookedCommodityBatch, logCookedCommodityWaste, store,
  } = useStore();
  const target = store?.food_margin_percentage ?? DEFAULT_FOOD_MARGIN;
  const floor = store?.food_margin_floor_percentage ?? DEFAULT_FOOD_FLOOR;
  // Evidence only: cost per plate comes from each dish's most recent cooking batch.
  const dishMargins = products.filter((p) => !p.archived_at).flatMap((p) => {
    const latest = batches.filter((b) => b.product_id === p.id && b.plates > 0).sort((a, b) => b.created_at - a.created_at)[0];
    return latest ? [{ product: p, cost: latest.unit_cost, ...marginStatus(p.price, latest.unit_cost, target, floor) }] : [];
  });
  const [wasteFor, setWasteFor] = useState<string | null>(null);
  const [wasteQty, setWasteQty] = useState("");
  const [wasteReason, setWasteReason] = useState("Spoiled");
  const [wasteErr, setWasteErr] = useState("");
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [plates, setPlates] = useState(40);
  const [ings, setIngs] = useState<BatchIngredient[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const [editErr, setEditErr] = useState("");
  const [form, setForm] = useState<{ plates: number; remaining: number; labor: number; ings: BatchIngredient[] }>({ plates: 0, remaining: 0, labor: 0, ings: [] });
  const [commodity, setCommodity] = useState({ rawId: "", name: "", unit: "kg" as "kg" | "liters" | "pcs", quantity: 10 });
  const [portion, setPortion] = useState({ productId: products[0]?.id ?? "", commodityName: "", portion: "full" as StandardPortion, quantity: 0.25, unit: "kg" as "kg" | "liters" | "pcs" });
  const [commodityMessage, setCommodityMessage] = useState("");

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
      <section className="lg:col-span-5 border bg-surface rounded-xl p-5 space-y-3">
        <div>
          <h2 className="font-bold text-lg">Dish margins</h2>
          <p className="text-sm text-muted-foreground">Cost per plate from the latest cooking batch. Target {target}%, safety floor {floor}%.</p>
        </div>
        {dishMargins.length === 0 ? <p className="text-sm text-muted-foreground">Log a cooking batch to see the cost and margin of each dish.</p> : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {dishMargins.map((d) => (
              <div key={d.product.id} className={`rounded-xl border p-3 ${d.status === "critical" ? "border-destructive bg-destructive/5" : d.status === "squeezed" ? "border-warning bg-warning/10" : "border-primary/30 bg-primary/5"}`}>
                <div className="flex justify-between gap-2 font-semibold"><span>{d.product.emoji} {d.product.name}</span><span>{d.percent}%</span></div>
                <div className="text-xs text-muted-foreground mt-1">Cost {formatTZS(d.cost)} · Price {formatTZS(d.product.price)} · Profit {formatTZS(d.profit)}</div>
                <div className="text-xs mt-2 font-medium">{d.status === "healthy" ? "Healthy — at or above target." : d.status === "squeezed" ? "Squeezed — below target but above the safety floor. Fine to keep the price to keep plates moving." : `Below the ${floor}% safety floor — review portion size or price.`}</div>
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="lg:col-span-5 border bg-surface rounded-xl p-5 space-y-4">
        <div>
          <h2 className="font-bold text-lg">Shared Cooked Stock</h2>
          <p className="text-sm text-muted-foreground">Track one cooked item across several dishes using standard full, half, or side portions.</p>
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <form className="border rounded-lg p-4 space-y-3" onSubmit={(e) => {
            e.preventDefault();
            const result = createCookedCommodityBatch({ raw_material_id: commodity.rawId || undefined, name: commodity.name, unit: commodity.unit, quantity: commodity.quantity });
            setCommodityMessage(result.ok ? `${commodity.name} batch is ready` : result.reason);
            if (result.ok) setCommodity({ ...commodity, name: "" });
          }}>
            <div className="font-semibold">Start cooked batch</div>
            <div className="grid sm:grid-cols-2 gap-2">
              <input required placeholder="Cooked item, e.g. Beans" value={commodity.name} onChange={(e) => setCommodity({ ...commodity, name: e.target.value })} className="h-10 rounded-lg border bg-background px-3 text-sm" />
              <select value={commodity.rawId} onChange={(e) => {
                const raw = rawMaterials.find((r) => r.id === e.target.value);
                setCommodity({ ...commodity, rawId: e.target.value, unit: raw?.unit ?? commodity.unit });
              }} className="h-10 rounded-lg border bg-background px-3 text-sm">
                <option value="">No raw-stock deduction</option>
                {rawMaterials.filter((r) => r.unit === "kg" || r.unit === "liters" || r.unit === "pcs").map((r) => <option key={r.id} value={r.id}>{r.name} · {r.stock.toFixed(3)} {r.unit}</option>)}
              </select>
              <input type="number" min={0.00001} step="any" inputMode="decimal" value={commodity.quantity} onChange={(e) => setCommodity({ ...commodity, quantity: Number(e.target.value) })} className="h-10 rounded-lg border bg-background px-3 text-sm" />
              <select value={commodity.unit} onChange={(e) => setCommodity({ ...commodity, unit: e.target.value as typeof commodity.unit })} className="h-10 rounded-lg border bg-background px-3 text-sm" disabled={Boolean(commodity.rawId)}>
                <option value="kg">kg</option><option value="liters">liters</option><option value="pcs">pieces</option>
              </select>
            </div>
            <button className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">Start batch</button>
          </form>

          <form className="border rounded-lg p-4 space-y-3" onSubmit={(e) => {
            e.preventDefault();
            const existing = menuPortionMappings.filter((m) => m.product_id === portion.productId && m.commodity_name.toLowerCase() !== portion.commodityName.trim().toLowerCase());
            const result = setProductPortionMappings(portion.productId, [...existing.map(({ commodity_name, portion: size, quantity, unit }) => ({ commodity_name, portion: size, quantity, unit })), { commodity_name: portion.commodityName, portion: portion.portion, quantity: portion.quantity, unit: portion.unit }]);
            setCommodityMessage(result.ok ? "Dish portion saved" : result.reason);
          }}>
            <div className="font-semibold">Dish portion recipe</div>
            <div className="grid sm:grid-cols-2 gap-2">
              <select value={portion.productId} onChange={(e) => setPortion({ ...portion, productId: e.target.value })} className="h-10 rounded-lg border bg-background px-3 text-sm">
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select required value={portion.commodityName} onChange={(e) => {
                const batch = cookedCommodityBatches.find((b) => b.name === e.target.value);
                setPortion({ ...portion, commodityName: e.target.value, unit: batch?.unit ?? portion.unit });
              }} className="h-10 rounded-lg border bg-background px-3 text-sm">
                <option value="">Choose cooked item</option>
                {[...new Set(cookedCommodityBatches.map((b) => b.name))].map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
              <select value={portion.portion} onChange={(e) => setPortion({ ...portion, portion: e.target.value as StandardPortion })} className="h-10 rounded-lg border bg-background px-3 text-sm">
                <option value="full">Full</option><option value="half">Half</option><option value="side">Side</option><option value="custom">Custom</option>
              </select>
              <div className="flex items-center gap-2">
                <input type="number" min={0.00001} step="any" inputMode="decimal" value={portion.quantity} onChange={(e) => setPortion({ ...portion, quantity: Number(e.target.value) })} className="h-10 min-w-0 flex-1 rounded-lg border bg-background px-3 text-sm" />
                <span className="text-sm text-muted-foreground">{portion.unit} / plate</span>
              </div>
            </div>
            <button className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">Save portion</button>
          </form>
        </div>
        {commodityMessage && <div className="text-sm rounded-lg bg-muted px-3 py-2">{commodityMessage}</div>}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {cookedCommodityBatches.map((batch) => {
            const rows = cookedCommodityUsages.filter((u) => u.batch_id === batch.id);
            const sold = rows.filter((u) => u.kind !== "waste").reduce((sum, u) => sum + u.quantity, 0);
            const wasted = rows.filter((u) => u.kind === "waste").reduce((sum, u) => sum + u.quantity, 0);
            const remaining = Math.max(0, batch.initial_quantity - sold - wasted);
            const percent = batch.initial_quantity > 0 ? Math.min(100, ((sold + wasted) / batch.initial_quantity) * 100) : 0;
            const wasteRows = rows.filter((u) => u.kind === "waste");
            return <div key={batch.id} className="border rounded-lg p-3">
              <div className="flex justify-between gap-3"><span className="font-semibold">{batch.name}</span><span className="text-xs text-muted-foreground">{batch.active ? "Active" : "Closed"}</span></div>
              <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${percent}%` }} /></div>
              <div className="mt-2 text-xs text-muted-foreground">{batch.initial_quantity.toFixed(3)} − {sold.toFixed(3)} sold − {wasted.toFixed(3)} wasted = <strong className="text-foreground">{remaining.toFixed(3)} {batch.unit}</strong></div>
              {wasteRows.length > 0 && <ul className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                {wasteRows.slice(0, 4).map((w) => <li key={w.id}>🗑 {w.quantity} {batch.unit} · {w.reason}{w.by_name ? ` · ${w.by_name}` : ""} · {new Date(w.created_at).toLocaleString()}</li>)}
              </ul>}
              {wasteFor === batch.id ? (
                <form className="mt-3 space-y-2" onSubmit={(e) => {
                  e.preventDefault();
                  const r = logCookedCommodityWaste(batch.id, Number(wasteQty), wasteReason);
                  if (!r.ok) { setWasteErr(r.reason); return; }
                  setWasteFor(null); setWasteQty(""); setWasteErr("");
                }}>
                  <div className="flex gap-2">
                    <input type="number" min={0.00001} step="any" inputMode="decimal" required placeholder={`Qty (${batch.unit})`} value={wasteQty} onChange={(e) => setWasteQty(e.target.value)} className="h-9 w-24 rounded-lg border bg-background px-2 text-sm" />
                    <select value={wasteReason} onChange={(e) => setWasteReason(e.target.value)} className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-2 text-sm">
                      <option>Spoiled</option><option>Burnt</option><option>Dropped / spilled</option><option>Leftover discarded</option><option>Expired</option>
                    </select>
                  </div>
                  {wasteErr && <div className="text-xs text-destructive">{wasteErr}</div>}
                  <div className="flex gap-2">
                    <button className="h-8 px-3 rounded-lg bg-destructive text-destructive-foreground text-xs font-semibold">Record waste</button>
                    <button type="button" onClick={() => { setWasteFor(null); setWasteErr(""); }} className="h-8 px-3 rounded-lg bg-muted text-xs font-semibold">Cancel</button>
                  </div>
                </form>
              ) : (
                <div className="mt-3 flex gap-4">
                  {remaining > 0 && <button type="button" onClick={() => { setWasteFor(batch.id); setWasteErr(""); }} className="text-xs font-semibold text-primary">Log waste</button>}
                  {batch.active && <button type="button" onClick={() => closeCookedCommodityBatch(batch.id)} className="text-xs font-semibold text-destructive">Close batch</button>}
                </div>
              )}
            </div>;
          })}
          {cookedCommodityBatches.length === 0 && <div className="text-sm text-muted-foreground">No shared cooked batches yet.</div>}
        </div>
      </section>
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
  const { customDishRequests, orders, can } = useStore();
  const [newOpen, setNewOpen] = useState(false);
  const [detail, setDetail] = useState<CustomDishRequest | null>(null);
  const { filter, setFilter, range } = useListFilter();
  const awaiting = customDishRequests.filter((r) => r.status === "accepted");
  const confirmed = customDishRequests.filter((r) => r.status === "confirmed");
  const processing = customDishRequests.filter((r) => r.status === "in_kitchen" || r.status === "fulfilled");
  const unpaid = customDishRequests.filter((r) => r.payment_mode === "on_delivery" && !r.settled_at);
  const q = filter.q.trim().toLowerCase();
  const all = customDishRequests.filter((r) => {
    if (q && !(r.dish_name.toLowerCase().includes(q) || r.customer_name.toLowerCase().includes(q) || r.customer_phone.includes(q))) return false;
    if (filter.status !== "all" && r.status !== filter.status) return false;
    if (r.created_at < range.from || r.created_at > range.to) return false;
    return true;
  });
  const awaitingApproval = customDishRequests.filter((r) => r.status === "awaiting_approval");

  return (
    <div className="space-y-6">
      <div className="bg-surface border rounded-2xl p-4 text-sm text-muted-foreground flex flex-wrap items-center justify-between gap-3">
        <div>
          Funnel: <span className="font-semibold text-foreground">Quote sent</span> → <span className="font-semibold text-foreground">Budget confirmed (wallet debited)</span> → <span className="font-semibold text-foreground">Stock assigned</span> → live order board.
        </div>
        {can("inventory.edit") && (
          <button onClick={() => setNewOpen(true)} className="shrink-0 inline-flex items-center gap-1.5 bg-primary text-white text-sm font-bold px-3 py-2 rounded-xl">
            <Plus className="w-4 h-4" /> New request
          </button>
        )}
      </div>

      {newOpen && <StaffRequestModal onClose={() => setNewOpen(false)} />}

      {unpaid.length > 0 && (
        <section>
          <h2 className="font-bold mb-2">Pay on delivery — awaiting payment ({unpaid.length})</h2>
          <div className="space-y-2">
            {unpaid.map((r) => {
              const order = orders.find((o) => o.id === r.order_id);
              return <CollectPaymentCard key={r.id} req={r} paid={order?.payment_status === "paid"} />;
            })}
          </div>
        </section>
      )}

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

      {awaitingApproval.length > 0 && (
        <section>
          <h2 className="font-bold mb-2">Awaiting owner approval ({awaitingApproval.length})</h2>
          <div className="space-y-2">
            {awaitingApproval.map((r) => <ApprovalCard key={r.id} req={r} onOpen={() => setDetail(r)} />)}
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

      <section>
        <h2 className="font-bold mb-2 flex items-center gap-2"><History className="w-4 h-4 text-primary" /> All menu requests</h2>
        <div className="bg-surface border rounded-2xl overflow-hidden">
          <div className="p-4 border-b">
            <ListFilter
              filter={filter}
              onChange={setFilter}
              placeholder="Search dish, client or phone"
              statuses={["pending", "accepted", "confirmed", "awaiting_approval", "in_kitchen", "fulfilled", "rejected", "cancelled"].map((v) => ({ value: v, label: v.replace(/_/g, " ") }))}
            />
          </div>
          <div className="divide-y">
            {all.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No menu requests match this filter.</div>}
            {all.map((r) => (
              <button key={r.id} onClick={() => setDetail(r)} className="w-full text-left px-4 py-3 flex flex-wrap items-center gap-3 hover:bg-muted/40">
                <div className="flex-1 min-w-[180px]">
                  <div className="font-semibold text-sm">{r.dish_name}</div>
                  <div className="text-xs text-muted-foreground">{r.customer_name} · {r.customer_phone} · {new Date(r.created_at).toLocaleString()}</div>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-muted capitalize">{r.status.replace(/_/g, " ")}</span>
                <span className="text-xs font-semibold">{r.payment_mode === "on_delivery" ? "Pay on delivery" : "Wallet"}</span>
                <span className="font-bold text-sm">{formatTZS(r.staff_price ?? r.suggested_price ?? 0)}</span>
                <Eye className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      </section>

      {detail && <RequestDetailModal req={customDishRequests.find((x) => x.id === detail.id) ?? detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function ApprovalCard({ req, onOpen }: { req: CustomDishRequest; onOpen: () => void }) {
  const { approveMenuRequest } = useStore();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-wrap items-center gap-3">
      <div className="flex-1 min-w-[200px]">
        <div className="font-semibold">{req.dish_name} <span className="text-xs font-normal text-muted-foreground">· {req.customer_name}</span></div>
        <div className="text-xs text-muted-foreground">{formatTZS(req.staff_price ?? 0)} · above the approval threshold</div>
        {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
      </div>
      <button onClick={onOpen} className="h-9 px-3 rounded-lg border text-xs font-semibold bg-white">Details</button>
      <button onClick={() => { const r = approveMenuRequest(req.id, "approve"); if (!r.ok) setError(r.reason); }} className="h-9 px-3 rounded-lg bg-emerald-600 text-white text-xs font-bold inline-flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Approve</button>
      <button onClick={() => { const reason = window.prompt("Reason?", "Not approved"); if (!reason) return; const r = approveMenuRequest(req.id, "reject", reason); if (!r.ok) setError(r.reason); }} className="h-9 px-3 rounded-lg bg-red-600 text-white text-xs font-bold inline-flex items-center gap-1"><X className="w-3.5 h-3.5" /> Reject</button>
    </div>
  );
}

function RequestDetailModal({ req, onClose }: { req: CustomDishRequest; onClose: () => void }) {
  const { auditsFor, rawMaterials, orders, cancelMenuRequest, hasStaffRole } = useStore();
  const audits = auditsFor(req.id);
  const order = orders.find((o) => o.id === req.order_id);
  const [error, setError] = useState<string | null>(null);
  const canCancel = hasStaffRole("supervisor") && !["fulfilled", "cancelled", "rejected"].includes(req.status);

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 grid place-items-center p-4 overflow-y-auto" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-background rounded-3xl w-full max-w-2xl p-6 my-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-xl">{req.dish_name}</h3>
            <p className="text-sm text-muted-foreground">{req.customer_name} · {req.customer_phone}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mt-4 text-sm">
          <Info label="Status" value={req.status.replace(/_/g, " ")} />
          <Info label="Raised by" value={req.created_by === "staff" ? `Staff${req.assigned_by ? ` · ${req.assigned_by}` : ""}` : "Customer"} />
          <Info label="Payment mode" value={req.payment_mode === "on_delivery" ? "Pay on delivery" : "Wallet"} />
          <Info label="Agreed price" value={formatTZS(req.staff_price ?? req.suggested_price ?? 0)} />
          <Info label="Raw cost" value={formatTZS(req.raw_cost ?? 0)} />
          <Info label="Labour" value={formatTZS(req.labor_cost ?? 0)} />
          <Info label="Total cost" value={formatTZS(req.total_cost ?? 0)} />
          <Info label="Paid so far" value={formatTZS(order?.amount_paid ?? req.paid_amount ?? 0)} />
        </div>

        {req.description && <p className="mt-4 text-sm text-foreground/80">{req.description}</p>}

        <div className="mt-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Raw materials assigned {req.stock_reserved ? "(reserved from stock)" : ""}</div>
          {(req.cost_ingredients ?? []).length === 0 ? (
            <div className="text-sm text-muted-foreground">No raw materials assigned yet.</div>
          ) : (
            <ul className="text-sm space-y-1">
              {(req.cost_ingredients ?? []).map((i) => {
                const raw = rawMaterials.find((x) => x.id === i.raw_id);
                return (
                  <li key={i.raw_id} className="flex justify-between border-b last:border-0 py-1">
                    <span>{raw?.name ?? i.raw_id}</span>
                    <span className="text-muted-foreground">{i.qty} {raw?.unit ?? ""} · {formatTZS(Math.round((raw?.avg_cost ?? 0) * i.qty))}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="mt-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1"><History className="w-3.5 h-3.5" /> Audit timeline</div>
          {audits.length === 0 ? (
            <div className="text-sm text-muted-foreground">No audit entries recorded for this request.</div>
          ) : (
            <ol className="relative border-l pl-4 space-y-3">
              {audits.map((a) => (
                <li key={a.id}>
                  <span className="absolute -left-[5px] w-2.5 h-2.5 rounded-full bg-primary" />
                  <div className="text-sm font-semibold capitalize">{a.action.replace(/_/g, " ")}</div>
                  <div className="text-xs text-muted-foreground">{a.detail}</div>
                  <div className="text-[11px] text-muted-foreground">{a.actor_name} · {new Date(a.created_at).toLocaleString()}{a.order_id ? ` · ${a.order_id}` : ""}</div>
                </li>
              ))}
            </ol>
          )}
        </div>

        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}

        {canCancel && (
          <button
            onClick={() => {
              const reason = window.prompt("Cancel this request? Reserved stock is returned and any wallet charge refunded.", "Client cancelled");
              if (!reason) return;
              const r = cancelMenuRequest(req.id, reason);
              if (!r.ok) setError(r.reason); else onClose();
            }}
            className="mt-5 w-full h-11 rounded-xl border border-red-200 text-red-700 font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-red-50"
          >
            <Ban className="w-4 h-4" /> Cancel request & return stock
          </button>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-2.5">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-semibold capitalize">{value}</div>
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

/* ────────────── Staff-raised menu request ────────────── */
function StaffRequestModal({ onClose }: { onClose: () => void }) {
  const { profiles, rawMaterials, staffCreateMenuRequest } = useStore();
  const customers = profiles.filter((p) => p.role === "customer");
  const [mode, setMode] = useState<"wallet" | "on_delivery">("wallet");
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dish, setDish] = useState("");
  const [notes, setNotes] = useState("");
  const [price, setPrice] = useState(0);
  const [delivery, setDelivery] = useState<"pickup" | "delivery">("pickup");
  const [ings, setIngs] = useState<BatchIngredient[]>([]);
  const [labor, setLabor] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const rawCost = useMemo(() => ings.reduce((s, i) => {
    const r = rawMaterials.find((x) => x.id === i.raw_id);
    return s + (r ? r.avg_cost * i.qty : 0);
  }, 0), [ings, rawMaterials]);
  const totalCost = Math.round(rawCost + labor);
  const selected = customers.find((c) => c.id === customerId);

  const addIng = () => {
    if (rawMaterials.length === 0) return;
    const avail = rawMaterials.find((r) => !ings.some((i) => i.raw_id === r.id)) ?? rawMaterials[0];
    setIngs([...ings, { raw_id: avail.id, qty: 1 }]);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = staffCreateMenuRequest({
      payment_mode: mode,
      customer_id: mode === "wallet" ? customerId : undefined,
      customer_name: mode === "wallet" ? undefined : name,
      customer_phone: mode === "wallet" ? undefined : phone,
      dish_name: dish, description: notes, price,
      ingredients: ings, labor_cost: labor, delivery_type: delivery,
    });
    if (!res.ok) { setError(res.reason); return; }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 grid place-items-center p-4 overflow-y-auto" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="bg-background rounded-3xl w-full max-w-lg p-6 my-8 space-y-4">
        <div>
          <h3 className="font-bold text-lg">New menu request</h3>
          <p className="text-xs text-muted-foreground">Raise a custom dish for a client, assign stock and post it straight to the kitchen board.</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(["wallet", "on_delivery"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)}
              className={`px-3 py-2.5 rounded-xl text-sm font-semibold border ${mode === m ? "border-primary bg-primary/10 text-primary" : "bg-surface"}`}>
              {m === "wallet" ? "Wallet client" : "Pay on delivery"}
            </button>
          ))}
        </div>

        {mode === "wallet" ? (
          <label className="block text-sm">
            <div className="text-muted-foreground mb-1">Wallet client</div>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="w-full px-3 py-2 rounded-lg border bg-background">
              {customers.length === 0 && <option value="">No registered wallet clients</option>}
              {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name} · {c.phone} · {formatTZS(c.wallet_balance)}</option>)}
            </select>
            {selected && <div className="text-xs text-muted-foreground mt-1">Balance {formatTZS(selected.wallet_balance)} — charged immediately.</div>}
          </label>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Client name" className="px-3 py-2 rounded-lg border bg-background text-sm" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" inputMode="tel" className="px-3 py-2 rounded-lg border bg-background text-sm" />
            <div className="col-span-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Unpaid order — collect cash or mobile money on hand-over from the “Pay on delivery” list.
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <input value={dish} onChange={(e) => setDish(e.target.value)} placeholder="Dish name" className="px-3 py-2 rounded-lg border bg-background text-sm" />
          <input type="number" min={0} value={price || ""} onChange={(e) => setPrice(Number(e.target.value) || 0)} placeholder="Agreed price (TZS)" className="px-3 py-2 rounded-lg border bg-background text-sm" />
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes / preparation details" rows={2} className="col-span-2 px-3 py-2 rounded-lg border bg-background text-sm" />
          <select value={delivery} onChange={(e) => setDelivery(e.target.value as "pickup" | "delivery")} className="col-span-2 px-3 py-2 rounded-lg border bg-background text-sm">
            <option value="pickup">Pickup at counter</option>
            <option value="delivery">Delivery</option>
          </select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Raw materials</div>
            <button type="button" onClick={addIng} className="text-xs font-semibold text-primary flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button>
          </div>
          {ings.length === 0 && <div className="text-xs text-muted-foreground border border-dashed rounded-lg py-4 text-center">No raw materials selected</div>}
          {ings.map((ing, i) => {
            const raw = rawMaterials.find((r) => r.id === ing.raw_id);
            return (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <select value={ing.raw_id} onChange={(e) => setIngs(ings.map((x, idx) => idx === i ? { ...x, raw_id: e.target.value } : x))} className="col-span-6 px-2 py-2 rounded-lg border bg-background text-sm">
                  {rawMaterials.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.stock.toFixed(1)} {r.unit})</option>)}
                </select>
                <input type="number" min={0} step="any" inputMode="decimal" value={ing.qty} onChange={(e) => setIngs(ings.map((x, idx) => idx === i ? { ...x, qty: Number(e.target.value) } : x))} className="col-span-3 px-2 py-2 rounded-lg border bg-background text-sm" />
                <div className="col-span-2 text-xs text-muted-foreground">{raw ? formatTZS(raw.avg_cost * ing.qty) : ""}</div>
                <button type="button" onClick={() => setIngs(ings.filter((_, idx) => idx !== i))} className="col-span-1 text-muted-foreground hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            );
          })}
          <label className="block text-sm">
            <div className="text-muted-foreground mb-1">Labour / gas cost (TZS)</div>
            <input type="number" min={0} value={labor} onChange={(e) => setLabor(Number(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg border bg-background" />
          </label>
        </div>

        <div className="bg-muted rounded-xl p-3 text-sm flex items-center justify-between">
          <span className="text-muted-foreground flex items-center gap-1"><Calculator className="w-3.5 h-3.5" /> Cost {formatTZS(totalCost)}</span>
          <span className={`font-bold ${price - totalCost < 0 ? "text-red-600" : "text-emerald-600"}`}>Margin {formatTZS(price - totalCost)}</span>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 border font-semibold py-3 rounded-xl">Cancel</button>
          <button className="flex-1 bg-primary text-white font-bold py-3 rounded-xl">Post to kitchen</button>
        </div>
      </form>
    </div>
  );
}

function CollectPaymentCard({ req, paid }: { req: CustomDishRequest; paid: boolean }) {
  const { settleOnDeliveryOrder } = useStore();
  const [tender, setTender] = useState<"cash" | "mobile">("cash");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);

  const collect = () => {
    const res = settleOnDeliveryOrder(req.order_id ?? "", { tender, reference });
    if (!res.ok) { setError(res.reason); return; }
    setError(null);
  };

  return (
    <div className="bg-surface border rounded-2xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold">{req.dish_name} <span className="text-xs font-normal text-muted-foreground">· {req.customer_name} · {req.customer_phone}</span></div>
          <div className="text-xs text-muted-foreground mt-0.5">Order {req.order_id} · cost {formatTZS(req.total_cost ?? 0)} · due {formatTZS(req.staff_price ?? 0)}</div>
        </div>
        <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">{paid ? "Paid" : "Unpaid"}</span>
      </div>
      {!paid && (
        <div className="flex flex-wrap items-center gap-2">
          <select value={tender} onChange={(e) => setTender(e.target.value as "cash" | "mobile")} className="px-3 py-2 rounded-lg border bg-background text-sm">
            <option value="cash">Cash</option>
            <option value="mobile">Mobile money</option>
          </select>
          {tender === "mobile" && (
            <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Reference" className="px-3 py-2 rounded-lg border bg-background text-sm" />
          )}
          <button onClick={collect} className="bg-primary text-white text-sm font-bold px-4 py-2 rounded-lg">Collect payment</button>
        </div>
      )}
      {error && <div className="text-sm text-red-600">{error}</div>}
    </div>
  );
}
