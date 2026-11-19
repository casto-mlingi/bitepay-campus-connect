import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChefHat, Plus, Trash2, Lock, ClipboardList } from "lucide-react";
import { useStore } from "@/lib/store";
import { StaffShell } from "@/components/staff-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { potRemaining } from "@/lib/cooked-availability";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/kitchen")({
  component: KitchenPage,
  head: () => ({ meta: [
    { title: "Kitchen Production — BitePay Staff" },
    { name: "description", content: "Log cooked pots in seconds, watch portions left live and record leftovers at closing." },
    { property: "og:title", content: "Kitchen Production — BitePay Staff" },
    { property: "og:description", content: "Log cooked pots in seconds, watch portions left live and record leftovers at closing." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
});

type Unit = "kg" | "liters" | "pcs";

function KitchenPage() {
  const { currentUser, sessionReady, can, cookedCommodityBatches, cookedCommodityUsages, rawMaterials, orders,
    createCookedCommodityBatch, logCookedCommodityWaste, closeCookedCommodityBatch } = useStore();
  const { t } = useT();
  const navigate = useNavigate();
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({ name: "", portions: 50, unit: "pcs" as Unit, rawId: "", rawQty: 0 });
  const [waste, setWaste] = useState<{ id: string; qty: string; reason: string } | null>(null);

  useEffect(() => {
    if (sessionReady && !currentUser) navigate({ to: "/" });
    else if (currentUser && currentUser.role !== "staff") navigate({ to: "/dashboard" });
  }, [sessionReady, currentUser, navigate]);

  const pots = useMemo(() => {
    const groups = new Map<string, { name: string; unit: Unit; made: number; left: number; ids: string[]; oldest: string }>();
    for (const b of cookedCommodityBatches.filter((x) => x.active).sort((a, c) => a.created_at - c.created_at)) {
      const key = `${b.name.toLowerCase()}|${b.unit}`;
      const g = groups.get(key) ?? { name: b.name, unit: b.unit, made: 0, left: 0, ids: [], oldest: b.id };
      g.made += b.initial_quantity; g.left += potRemaining(b, cookedCommodityUsages); g.ids.push(b.id);
      groups.set(key, g);
    }
    return [...groups.values()];
  }, [cookedCommodityBatches, cookedCommodityUsages]);

  // Device-side presets: last portions + raw usage per pot name, so repeat cooks are 2 taps.
  const [presets, setPresets] = useState<Record<string, { portions: number; unit: Unit; rawId: string; rawQty: number }>>({});
  useEffect(() => { try { setPresets(JSON.parse(localStorage.getItem("bp-pot-presets") || "{}")); } catch { /* ignore */ } }, []);
  const savePreset = (name: string, v: { portions: number; unit: Unit; rawId: string; rawQty: number }) => {
    const next = { ...presets, [name.toLowerCase()]: v }; setPresets(next);
    try { localStorage.setItem("bp-pot-presets", JSON.stringify(next)); } catch { /* ignore */ }
  };
  const knownPots = useMemo(() => {
    const m = new Map<string, { name: string; unit: Unit }>();
    for (const b of [...cookedCommodityBatches].sort((a, c) => c.created_at - a.created_at)) if (!m.has(b.name.toLowerCase())) m.set(b.name.toLowerCase(), { name: b.name, unit: b.unit });
    return [...m.values()];
  }, [cookedCommodityBatches]);
  const pickPreset = (name: string, unit: Unit) => {
    const pr = presets[name.toLowerCase()];
    setForm({ name, unit: pr?.unit ?? unit, portions: pr?.portions ?? 50, rawId: pr?.rawId ?? "", rawQty: pr?.rawQty ?? 0 });
    document.getElementById("log-pot")?.scrollIntoView({ behavior: "smooth" });
  };

  const queue = orders.filter((o) => o.status === "new" || o.status === "in-progress").length;
  if (!currentUser || currentUser.role !== "staff") return null;
  if (!can("kitchen.produce")) return <StaffShell active="kitchen"><p className="text-sm text-muted-foreground">{t("Only kitchen staff, a supervisor or owner can open this page.")}</p></StaffShell>;

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 3500); };
  const addPot = (name: string, unit: Unit, portions: number, rawId?: string, rawQty?: number) => {
    const r = createCookedCommodityBatch({ name, unit, quantity: portions, raw_material_id: rawId || undefined, raw_quantity: rawId ? rawQty : undefined });
    flash(r.ok ? `${t("Added")} ${portions} ${unit} · ${name}` : r.reason);
    return r.ok;
  };

  return (
    <StaffShell active="kitchen">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2"><ChefHat className="w-6 h-6 text-primary" /><h1 className="text-xl font-bold">{t("Kitchen production")}</h1></div>
        <Link to="/staff" className="inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm font-semibold"><ClipboardList className="w-4 h-4" />{t("Live orders")} <span className="rounded-full bg-primary px-2 text-xs text-primary-foreground">{queue}</span></Link>
      </div>
      {msg && <div role="status" className="mb-3 rounded-lg bg-muted px-3 py-2 text-sm">{msg}</div>}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-6">
        {pots.length === 0 && <p className="text-sm text-muted-foreground">{t("No pots cooked yet. Log the first pot below.")}</p>}
        {pots.map((g) => {
          const pct = g.made ? g.left / g.made : 0;
          const tone = g.left <= 0 ? "border-destructive bg-destructive/5" : pct < 0.2 ? "border-amber-500 bg-amber-500/5" : "border-border bg-card";
          return (
            <div key={g.name + g.unit} className={`rounded-xl border-2 p-4 ${tone}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="font-bold text-lg">{g.name}</div>
                {g.left <= 0 ? <span className="text-xs font-bold text-destructive">{t("Sold out")}</span> : pct < 0.2 ? <span className="text-xs font-bold text-amber-600">{t("Running low")}</span> : null}
              </div>
              <div className="text-3xl font-black tabular-nums my-1">{+g.left.toFixed(2)} <span className="text-sm font-medium text-muted-foreground">/ {+g.made.toFixed(2)} {g.unit}</span></div>
              <div className="h-2 rounded-full bg-muted overflow-hidden mb-3"><div className="h-full bg-primary" style={{ width: `${Math.round(pct * 100)}%` }} /></div>
              <div className="grid grid-cols-3 gap-2">
                {[10, 20, 50].map((n) => <Button key={n} type="button" variant="outline" className="min-h-12 text-base font-bold" onClick={() => addPot(g.name, g.unit, n)}>+{n}</Button>)}
              </div>
              <div className="mt-2 flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setWaste({ id: g.ids[0], qty: "", reason: "Leftover" })}><Trash2 className="w-4 h-4" />{t("Leftover / waste")}</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => { if (confirm(t("Close this pot? It will stop selling."))) g.ids.forEach((id) => closeCookedCommodityBatch(id)); }}><Lock className="w-4 h-4" />{t("Close pot")}</Button>
              </div>
              {waste && g.ids.includes(waste.id) && (
                <form className="mt-2 grid gap-2" onSubmit={(e) => {
                  e.preventDefault();
                  let qty = Number(waste.qty);
                  // Spread across this item's open pots, oldest first.
                  for (const id of g.ids) {
                    if (qty <= 0) break;
                    const b = cookedCommodityBatches.find((x) => x.id === id);
                    const left = b ? potRemaining(b, cookedCommodityUsages) : 0;
                    const take = Math.min(left, qty);
                    if (take > 0) { const r = logCookedCommodityWaste(id, take, waste.reason); if (!r.ok) { flash(r.reason); return; } qty -= take; }
                  }
                  flash(t("Recorded")); setWaste(null);
                }}>
                  <Input required type="number" min={0.01} step="any" max={g.left} inputMode="decimal" placeholder={`${t("Quantity")} (${g.unit})`} value={waste.qty} onChange={(e) => setWaste({ ...waste, qty: e.target.value })} />
                  <select aria-label={t("Reason")} className="h-10 rounded-lg border bg-background px-3 text-sm" value={waste.reason} onChange={(e) => setWaste({ ...waste, reason: e.target.value })}>
                    {["Leftover", "Spoiled", "Burnt", "Dropped", "Staff meal"].map((r) => <option key={r} value={r}>{t(r)}</option>)}
                  </select>
                  <div className="flex gap-2"><Button type="submit" size="sm">{t("Save")}</Button><Button type="button" size="sm" variant="ghost" onClick={() => setWaste(null)}>{t("Cancel")}</Button></div>
                </form>
              )}
            </div>
          );
        })}
      </section>

      {knownPots.length > 0 && <section className="mb-4">
        <h2 className="font-bold mb-2">{t("Quick cook")}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {knownPots.map((k) => { const pr = presets[k.name.toLowerCase()]; return (
            <button key={k.name} type="button" onClick={() => pickPreset(k.name, k.unit)} className="min-h-16 rounded-xl border-2 border-primary/30 bg-primary/5 px-3 py-2 text-left active:scale-95 transition">
              <div className="font-bold">+ {k.name}</div>
              <div className="text-xs text-muted-foreground">{pr ? `${pr.portions} ${pr.unit}` : t("Tap to cook")}</div>
            </button>); })}
        </div>
      </section>}

      <section id="log-pot" className="rounded-xl border bg-card p-4">
        <h2 className="font-bold mb-1">{t("Log a cooked pot")}</h2>
        <p className="text-xs text-muted-foreground mb-3">{t("It goes on sale at the counter immediately. Raw stock used is deducted now.")}</p>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => {
          e.preventDefault();
          if (addPot(form.name.trim(), form.unit, form.portions, form.rawId, form.rawQty)) savePreset(form.name.trim(), { portions: form.portions, unit: form.unit, rawId: form.rawId, rawQty: form.rawQty }), setForm({ ...form, name: "", rawId: "", rawQty: 0 });
        }}>
          <label className="grid gap-1 text-sm"><span>{t("Cooked item, e.g. Beans")}</span>
            <Input required list="pot-names" value={form.name} onChange={(e) => {
              const existing = pots.find((p) => p.name.toLowerCase() === e.target.value.trim().toLowerCase());
              setForm({ ...form, name: e.target.value, unit: existing?.unit ?? form.unit });
            }} />
            <datalist id="pot-names">{[...new Set(cookedCommodityBatches.map((b) => b.name))].map((n) => <option key={n} value={n} />)}</datalist>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-sm"><span>{t("Portions cooked")}</span><Input required type="number" min={0.01} step="any" inputMode="decimal" value={form.portions} onChange={(e) => setForm({ ...form, portions: Number(e.target.value) })} /></label>
            <label className="grid gap-1 text-sm"><span>{t("Unit")}</span>
              <select className="h-10 rounded-lg border bg-background px-3 text-sm" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value as Unit })}>
                <option value="pcs">{t("plates / pieces")}</option><option value="kg">kg</option><option value="liters">{t("liters")}</option>
              </select></label>
          </div>
          <label className="grid gap-1 text-sm"><span>{t("Raw material used (optional)")}</span>
            <select className="h-10 rounded-lg border bg-background px-3 text-sm" value={form.rawId} onChange={(e) => setForm({ ...form, rawId: e.target.value })}>
              <option value="">{t("No raw-stock deduction")}</option>
              {rawMaterials.map((r) => <option key={r.id} value={r.id}>{r.name} · {+r.stock.toFixed(2)} {r.unit}</option>)}
            </select></label>
          {form.rawId && <label className="grid gap-1 text-sm"><span>{t("Raw quantity used")} ({rawMaterials.find((r) => r.id === form.rawId)?.unit})</span>
            <Input required type="number" min={0.001} step="any" inputMode="decimal" value={form.rawQty || ""} onChange={(e) => setForm({ ...form, rawQty: Number(e.target.value) })} /></label>}
          <Button type="submit" className="sm:col-span-2 min-h-12 text-base"><Plus className="w-5 h-5" />{t("Add pot — sell now")}</Button>
        </form>
      </section>
    </StaffShell>
  );
}
