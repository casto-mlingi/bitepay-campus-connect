import { useState } from "react";
import { Copy, Plus, Trash2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LIPA_PROVIDERS, activeLipaNumbers, cleanLipaNumbers, type LipaNumber, type LipaProvider } from "@/lib/lipa-numbers";

export function LipaNumbersManager({ value, onSave }: { value: unknown; onSave: (list: LipaNumber[]) => void }) {
  const [list, setList] = useState<LipaNumber[]>(cleanLipaNumbers(value));
  const [provider, setProvider] = useState<LipaProvider>("mpesa");
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const commit = (next: LipaNumber[]) => { const c = cleanLipaNumbers(next); setList(c); onSave(c); };
  const add = () => {
    const next = cleanLipaNumbers([...list, { id: crypto.randomUUID(), provider, number, account_name: name, active: true }]);
    if (next.length === list.length) return toast.error("Enter a valid Lipa number and its registered name.");
    commit(next); setNumber(""); setName(""); toast.success("Lipa number saved");
  };
  return (
    <div className="mt-4 rounded-2xl border bg-surface p-4 space-y-3">
      <div className="flex items-center gap-2 font-semibold"><Smartphone className="w-4 h-4 text-primary" /> Lipa Numbers</div>
      <p className="text-xs text-muted-foreground">Customers see these numbers on Top-up and the cashier sees them on POS.</p>
      {list.map((l) => (
        <div key={l.id} className="flex items-center gap-2 rounded-lg border p-2.5">
          <div className="flex-1 min-w-0"><div className="text-sm font-semibold">{LIPA_PROVIDERS[l.provider]} · <span className="font-mono">{l.number}</span></div><div className="text-xs text-muted-foreground truncate">{l.account_name}</div></div>
          <label className="text-xs flex items-center gap-1"><input type="checkbox" checked={l.active} onChange={(e) => commit(list.map((x) => x.id === l.id ? { ...x, active: e.target.checked } : x))} className="w-4 h-4 accent-primary" />Show</label>
          <Button size="icon" variant="ghost" aria-label="Remove Lipa number" onClick={() => commit(list.filter((x) => x.id !== l.id))}><Trash2 className="w-4 h-4" /></Button>
        </div>
      ))}
      <div className="grid gap-2 sm:grid-cols-3">
        <select aria-label="Network" value={provider} onChange={(e) => setProvider(e.target.value as LipaProvider)} className="h-11 rounded-md border bg-background px-2 text-sm">
          {Object.entries(LIPA_PROVIDERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <Input aria-label="Lipa number" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Lipa number" inputMode="numeric" className="h-11" />
        <Input aria-label="Registered name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Registered name" className="h-11" />
      </div>
      <Button type="button" variant="outline" onClick={add} className="w-full h-11"><Plus className="w-4 h-4 mr-1" /> Add Lipa number</Button>
    </div>
  );
}

export function LipaNumbersList({ value, compact }: { value: unknown; compact?: boolean }) {
  const list = activeLipaNumbers(value);
  if (!list.length) return null;
  return (
    <div className={compact ? "space-y-1.5" : "mt-4 rounded-2xl border bg-surface p-4 space-y-2"}>
      {!compact && <div className="text-sm font-semibold">Pay to one of these Lipa numbers</div>}
      {list.map((l) => (
        <div key={l.id} className="flex items-center gap-2 rounded-lg border bg-background p-2.5">
          <div className="flex-1 min-w-0"><div className="text-xs text-muted-foreground">{LIPA_PROVIDERS[l.provider]}</div><div className="font-mono font-bold text-lg leading-tight">{l.number}</div><div className="text-xs">Name: <b>{l.account_name}</b></div></div>
          <Button type="button" size="sm" variant="secondary" onClick={() => { navigator.clipboard?.writeText(l.number); toast.success("Number copied"); }}><Copy className="w-4 h-4 mr-1" />Copy</Button>
        </div>
      ))}
      {!compact && <p className="text-xs text-muted-foreground">Check the name on your phone matches before entering your PIN, then paste the SMS reference below.</p>}
    </div>
  );
}
