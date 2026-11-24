import { useRef, useState } from "react";
import { ChefHat } from "lucide-react";
import { useStore, formatTZS } from "@/lib/store";
import { scalePotRecipe } from "@/lib/pot-recipes";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PotRecipeCook() {
  const { cookedPotRecipes, rawMaterials, cookPotRecipe, can } = useStore();
  const { t } = useT();
  const [selected, setSelected] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const operation = useRef<string | null>(null);
  const busy = useRef(false);
  const recipes = cookedPotRecipes.filter((r) => !r.archived_at);
  const recipe = recipes.find((r) => r.id === selected);
  const plan = recipe ? scalePotRecipe(recipe, Number(quantity), rawMaterials) : null;
  const manager = can("inventory.edit");
  const reset = () => { operation.current = null; setDone(false); setMessage(""); };
  if (!recipes.length) return null;
  return <section className="border-y py-4 space-y-3" aria-label={t("Recipe cooking")}>
    <h2 className="font-bold text-lg">{t("Quick cook")}</h2>
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      {recipes.map((r) => <Button key={r.id} type="button" variant={selected === r.id ? "default" : "outline"}
        className="h-auto min-h-14 whitespace-normal justify-start" aria-pressed={selected === r.id}
        onClick={() => { reset(); setSelected(r.id); }}><ChefHat className="shrink-0" /><span className="break-words min-w-0">{r.name}</span></Button>)}
    </div>
    {recipe && <form className="space-y-3" onSubmit={(e) => {
      e.preventDefault(); if (busy.current || done || !plan?.ok) return;
      busy.current = true; operation.current ??= crypto.randomUUID();
      try { const result = cookPotRecipe(recipe.id, Number(quantity), operation.current);
        setMessage(t(result.ok ? "Pot added" : result.reason)); if (result.ok) setDone(true);
      } finally { busy.current = false; }
    }}>
      <label className="grid gap-1 text-sm max-w-sm"><span>{t("Cooking quantity")} · {recipe.base_unit}</span>
        <Input required type="number" inputMode="decimal" min="0.001" step="any" value={quantity}
          onChange={(e) => { reset(); setQuantity(e.target.value); }} /></label>
      {plan?.ok ? <>
        <ul className="grid sm:grid-cols-2 gap-1 text-sm">{plan.value.ingredients.map((i) => <li key={i.raw_id} className="flex justify-between gap-3 border-b py-1"><span>{i.name}</span><span className="tabular-nums shrink-0">{i.qty} {i.unit}</span></li>)}</ul>
        <p className="font-semibold">{t("Cooked output")}: {plan.value.output} {recipe.output_unit}</p>
        {manager && <p className="text-sm">{t("Raw cost")}: {plan.value.raw_cost == null ? t("Cost incomplete") : formatTZS(plan.value.raw_cost)} · {t("Estimated extras")}: {formatTZS(plan.value.estimated_extra)}</p>}
      </> : !done && <p role="alert" className="text-sm text-destructive">{t(plan?.reason ?? "Enter a valid recipe and cooking quantity")}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={done || !plan?.ok} className="min-h-12"><ChefHat />{t("Confirm and cook")}</Button>
        {done && <Button type="button" variant="outline" onClick={reset}>{t("Cook another pot")}</Button>}
      </div>
    </form>}
    {message && <p role="status" className="text-sm">{message}</p>}
  </section>;
}