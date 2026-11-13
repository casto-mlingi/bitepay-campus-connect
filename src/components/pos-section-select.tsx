import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { BASE_DEPARTMENTS, deptLabel, productDepartment } from "@/lib/pack-units";

/** POS section picker: built-in Food/Drinks/Resale plus owner-created sections, with a + to add one. */
export function PosSectionSelect({ value, onChange, allowAuto }: { value: string; onChange: (v: string) => void; allowAuto?: boolean }) {
  const { products } = useStore();
  const [extra, setExtra] = useState<string[]>([]);
  const options = useMemo(() => Array.from(new Set([...BASE_DEPARTMENTS, ...products.map(productDepartment), ...extra, ...(value ? [value] : [])])), [products, extra, value]);
  const add = () => {
    const name = window.prompt("New POS section name (you can start with an emoji, e.g. 🥐 Bakery):")?.trim().slice(0, 40);
    if (!name) return;
    const key = name.toLowerCase();
    const existing = options.find((o) => o.toLowerCase() === key || deptLabel(o).toLowerCase().replace(/^\W+/, "").trim() === key);
    const v = existing ?? name;
    if (!existing) setExtra((x) => [...x, v]);
    onChange(v);
  };
  return (
    <div className="flex gap-2 mt-1">
      <select aria-label="POS section" value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 min-w-0 h-11 border rounded-md bg-background px-3">
        {allowAuto && <option value="">Automatic (from category)</option>}
        {options.map((d) => <option key={d} value={d}>{deptLabel(d)}</option>)}
      </select>
      <button type="button" onClick={add} aria-label="Add POS section" title="Add POS section" className="h-11 w-11 shrink-0 grid place-items-center rounded-md border hover:bg-muted"><Plus className="w-5 h-5" /></button>
    </div>
  );
}
