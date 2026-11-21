import { useState } from "react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { potRemaining } from "@/lib/cooked-availability";
import type { DisposalMode } from "@/lib/pot-closure";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function PotCloseDialog({ batchId, onClose }: { batchId: string; onClose: () => void }) {
  const { cookedCommodityBatches, cookedCommodityUsages, store, closeAndDisposeCookedBatch } = useStore();
  const batch = cookedCommodityBatches.find((b) => b.id === batchId);
  const remaining = batch ? potRemaining(batch, cookedCommodityUsages) : 0;
  const [quantity, setQuantity] = useState(String(remaining));
  const [mode, setMode] = useState<DisposalMode>("waste");
  const [reason, setReason] = useState("Unsold / End of Day");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const { t } = useT();
  if (!batch) return null;
  const carry = store?.allow_safe_carry_over === true;
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="w-[calc(100%-2rem)] max-h-[90dvh] overflow-y-auto rounded-lg">
    <DialogHeader><DialogTitle>{t("Close / Waste")} · {batch.name}</DialogTitle><DialogDescription>{t("Remaining portions")}: {remaining} {batch.unit}</DialogDescription></DialogHeader>
    <form className="grid gap-4" onSubmit={(e) => {
      e.preventDefault();
      const result = closeAndDisposeCookedBatch(batchId, Number(quantity), carry ? mode : "waste", `${reason}${note.trim() ? ` · ${note.trim()}` : ""}`);
      if (!result.ok) setError(t(result.reason)); else onClose();
    }}>
      <label className="grid gap-1 text-sm">{t("Physical remaining count")}<Input aria-label={t("Physical remaining count")} type="number" inputMode="decimal" min={0} max={remaining} step="any" required value={quantity} onChange={(e) => setQuantity(e.target.value)} /></label>
      {carry && <div className="grid grid-cols-2 gap-2" role="group" aria-label={t("Closure mode")}>
        <Button type="button" variant={mode === "waste" ? "default" : "outline"} onClick={() => { setMode("waste"); setReason("Unsold / End of Day"); }}>{t("Wastage")}</Button>
        <Button type="button" variant={mode === "carry_over" ? "default" : "outline"} onClick={() => { setMode("carry_over"); setReason("Safely stored overnight"); }}>{t("Safe Carry-Over")}</Button>
      </div>}
      <label className="grid gap-1 text-sm">{t("Reason")}<select aria-label={t("Reason")} className="h-11 border rounded-lg bg-background px-3" value={reason} onChange={(e) => setReason(e.target.value)}>
        {(mode === "carry_over" && carry ? ["Safely stored overnight"] : ["Spoiled", "Burnt", "Spilled", "Unsold / End of Day"]).map((r) => <option key={r} value={r}>{t(r)}</option>)}
      </select></label>
      <label className="grid gap-1 text-sm">{t("Notes (optional)")}<Input value={note} maxLength={180} onChange={(e) => setNote(e.target.value)} /></label>
      {Number(quantity) < remaining && <p className="text-sm text-destructive">{t("Physical count shortage")}: {+(remaining - Number(quantity)).toFixed(3)} {batch.unit} · {t("Wastage")}</p>}
      {mode === "carry_over" && carry && <p className="text-sm text-muted-foreground">{t("Keep safely chilled. Check food safety before returning it to sale tomorrow.")}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2"><Button type="button" variant="outline" className="flex-1" onClick={onClose}>{t("Cancel")}</Button><Button type="submit" className="flex-1">{t("Confirm closure")}</Button></div>
    </form>
  </DialogContent></Dialog>;
}