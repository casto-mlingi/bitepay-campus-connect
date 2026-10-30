import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Rocket } from "lucide-react";
import { useStore } from "@/lib/store";
import { launchSteps } from "@/lib/launch-guide";

/** Owner-only launch checklist; disappears once every step is done. */
export function LaunchGuide() {
  const { currentUser, rawMaterials, products, profiles, cash, bank, orders } = useStore();
  const [open, setOpen] = useState(true);
  useEffect(() => { setOpen(localStorage.getItem("bp-launch-guide") !== "min"); }, []);
  if (currentUser?.role !== "staff" || currentUser.staff_role !== "owner") return null;

  const steps = launchSteps({
    rawCount: rawMaterials.length,
    productCount: products.length,
    staffCount: profiles.filter((p) => p.role === "staff" && p.staff_role !== "owner").length,
    cash, bank,
    salesCount: orders.length,
  });
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;
  const toggle = () => { const v = !open; setOpen(v); localStorage.setItem("bp-launch-guide", v ? "open" : "min"); };

  return (
    <section className="mb-4 rounded-2xl border-2 border-primary/30 bg-primary/5 p-4">
      <button type="button" onClick={toggle} className="w-full flex items-center gap-3 text-left">
        <Rocket className="w-5 h-5 text-primary shrink-0" />
        <div className="flex-1">
          <div className="font-bold">Get your store running</div>
          <div className="text-xs text-muted-foreground">{done} of {steps.length} done</div>
        </div>
        {open ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>
      <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${(done / steps.length) * 100}%` }} /></div>
      {open && (
        <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((s, i) => (
            <li key={s.id}>
              <Link to={s.to} className={`flex items-start gap-2 p-3 rounded-xl border bg-surface h-full ${s.done ? "opacity-60" : "hover:border-primary"}`}>
                {s.done ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> : <Circle className="w-5 h-5 text-muted-foreground shrink-0" />}
                <span><span className="font-semibold block text-sm">{i + 1}. {s.label}</span><span className="text-xs text-muted-foreground">{s.hint}</span></span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
