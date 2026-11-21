import { disposalSummary } from "@/lib/pot-closure";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";

export function KitchenDisposalSummary({ from = 0, until = Infinity }: { from?: number; until?: number }) {
  const { cookedCommodityBatches, cookedCommodityUsages } = useStore();
  const { t } = useT();
  const summary = disposalSummary(cookedCommodityBatches, cookedCommodityUsages, from, until);
  if (!summary.length) return null;
  return <section className="border-t pt-3 mb-4"><h3 className="text-sm font-semibold">{t("Kitchen closure summary")}</h3>
    {summary.map((s) => <p key={s.unit} className="text-sm text-muted-foreground">{t("Wastage")}: {+s.waste.toFixed(3)} {s.unit} · {t("Safe Carry-Over")}: {+s.carry.toFixed(3)} {s.unit}</p>)}
  </section>;
}