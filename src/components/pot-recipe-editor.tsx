import { useState } from "react";
import { Plus, Trash2, Pencil, Archive } from "lucide-react";
import { useStore, formatTZS, type CookedPotRecipe } from "@/lib/store";
import { scalePotRecipe, type PotUnit } from "@/lib/pot-recipes";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Draft = Omit<CookedPotRecipe, "id" | "store_id" | "updated_at"> & { id?: string };
const empty = (): Draft => ({ name: "", base_raw_id: "", base_unit: "kg", output_unit: "pcs", yield_per_base_unit: 1, ingredients: [], spice_cost_per_base_unit: 0 });
export function PotRecipeEditor() {
  const { cookedPotRecipes, rawMaterials, saveCookedPotRecipe, currentStoreId, can } = useStore();
  const { t } = useT();
  const [draft, setDraft] = useState<Draft>(empty);
  const [message, setMessage] = useState("");
  const materials = rawMaterials.filter((r) => !r.converted_product_id);
  const preview = scalePotRecipe({ ...draft, id: draft.id ?? "preview", store_id: currentStoreId ?? "", updated_at: 0 }, 1, materials, false);
  if (!can("inventory.edit")) return null;
  const patch = (p: Partial<Draft>) => { setDraft((d) => ({ ...d, ...p })); setMessage(""); };
  return <section className="border-y py-4 space-y-4" aria-label={t("Pot recipes")}>
    <h2 className="font-bold text-lg">{t("Pot recipes")}</h2>
    <div className="flex flex-wrap gap-2">{cookedPotRecipes.filter((r) => !r.archived_at).map((r) => <div className="flex items-center gap-1 border rounded-lg px-2" key={r.id}>
      <span className="text-sm">{r.name}</span>
      <Button size="icon" variant="ghost" aria-label={`${t("Edit recipe")} ${r.name}`} title={t("Edit recipe")} onClick={() => { setDraft({ ...r }); setMessage(""); }}><Pencil /></Button>
      <Button size="icon" variant="ghost" aria-label={`${t("Archive recipe")} ${r.name}`} title={t("Archive recipe")} onClick={() => {
        if (!confirm(t("Archive this recipe?"))) return;
        const result = saveCookedPotRecipe({ ...r, archived_at: Date.now() }); setMessage(t(result.ok ? "Saved" : result.reason));
        if (draft.id === r.id && result.ok) setDraft(empty());
      }}><Archive /></Button>
    </div>)}</div>
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); const result = saveCookedPotRecipe(draft); setMessage(t(result.ok ? "Recipe saved" : result.reason)); if (result.ok) setDraft(empty()); }}>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="grid gap-1 text-sm"><span>{t("Cooked pot name")}</span><Input required value={draft.name} onChange={(e) => patch({ name: e.target.value })} /></label>
        <label className="grid gap-1 text-sm"><span>{t("Main ingredient — base of 1 unit")}</span>
          <select required className="h-10 w-full min-w-0 border rounded-lg bg-background px-2" value={draft.base_raw_id} onChange={(e) => {
            const raw = materials.find((r) => r.id === e.target.value); if (!raw) return;
            patch({ base_raw_id: raw.id, base_unit: raw.unit, ingredients: [{ raw_id: raw.id, unit: raw.unit, qty_per_base_unit: 1 }, ...draft.ingredients.filter((i) => i.raw_id !== draft.base_raw_id && i.raw_id !== raw.id)] });
          }}><option value="">{t("Select…")}</option>{materials.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.unit})</option>)}</select>
        </label>
        <label className="grid gap-1 text-sm"><span>{t("Cooked output per base unit")}</span><Input required type="number" min="0.001" step="any" inputMode="decimal" value={draft.yield_per_base_unit} onChange={(e) => patch({ yield_per_base_unit: Number(e.target.value) })} /></label>
        <label className="grid gap-1 text-sm"><span>{t("Cooked output unit")}</span><select className="h-10 border rounded-lg bg-background px-2" value={draft.output_unit} onChange={(e) => patch({ output_unit: e.target.value as PotUnit })}><option value="pcs">{t("plates / pieces")}</option><option value="kg">kg</option><option value="liters">{t("liters")}</option></select></label>
      </div>
      <h3 className="font-semibold text-sm">{t("Ingredients per base unit")}{draft.base_raw_id ? ` · 1 ${draft.base_unit}` : ""}</h3>
      {draft.ingredients.map((i, index) => <div key={index} className="grid grid-cols-[minmax(0,1fr)_6rem_2.5rem] gap-2 items-center">
        <select aria-label={t("Ingredient")} disabled={i.raw_id === draft.base_raw_id} className="h-10 w-full min-w-0 border rounded-lg bg-background px-2 text-sm" value={i.raw_id} onChange={(e) => {
          const raw = materials.find((r) => r.id === e.target.value); if (raw) patch({ ingredients: draft.ingredients.map((x, n) => n === index ? { ...x, raw_id: raw.id, unit: raw.unit } : x) });
        }}>{materials.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.unit})</option>)}</select>
        <Input aria-label={t("Ingredient quantity")} type="number" required min="0.000001" step="any" inputMode="decimal" disabled={i.raw_id === draft.base_raw_id} value={i.qty_per_base_unit} onChange={(e) => patch({ ingredients: draft.ingredients.map((x, n) => n === index ? { ...x, qty_per_base_unit: Number(e.target.value) } : x) })} />
        <Button type="button" variant="ghost" size="icon" disabled={i.raw_id === draft.base_raw_id} title={t("Remove ingredient")} aria-label={t("Remove ingredient")} onClick={() => patch({ ingredients: draft.ingredients.filter((_, n) => n !== index) })}><Trash2 /></Button>
      </div>)}
      <Button type="button" variant="outline" disabled={!draft.base_raw_id || materials.every((r) => draft.ingredients.some((i) => i.raw_id === r.id))} onClick={() => {
        const raw = materials.find((r) => !draft.ingredients.some((i) => i.raw_id === r.id)); if (raw) patch({ ingredients: [...draft.ingredients, { raw_id: raw.id, unit: raw.unit, qty_per_base_unit: 0.1 }] });
      }}><Plus />{t("Add ingredient")}</Button>
      <label className="grid gap-1 text-sm max-w-sm"><span>{t("Estimated extras per base unit (TZS)")}</span><Input required type="number" min="0" step="any" value={draft.spice_cost_per_base_unit} onChange={(e) => patch({ spice_cost_per_base_unit: Number(e.target.value) })} /></label>
      {preview.ok && <dl className="grid sm:grid-cols-2 gap-2 text-sm">
        <div><dt>{t("Raw cost")}</dt><dd className="font-semibold">{preview.value.raw_cost == null ? t("Cost incomplete") : formatTZS(preview.value.raw_cost)}</dd></div>
        <div><dt>{t("Estimated cost per cooked unit")}</dt><dd className="font-semibold">{preview.value.estimated_unit_cost == null ? t("Cost incomplete") : formatTZS(preview.value.estimated_unit_cost)}</dd></div>
      </dl>}
      <div className="flex flex-wrap gap-2"><Button type="submit" disabled={!preview.ok}>{t("Save recipe")}</Button><Button type="button" variant="ghost" onClick={() => { setDraft(empty()); setMessage(""); }}>{t("New recipe")}</Button></div>
    </form>
    {message && <p role="status" className="text-sm">{message}</p>}
  </section>;
}