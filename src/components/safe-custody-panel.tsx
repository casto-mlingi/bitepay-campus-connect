import { useMemo, useState } from "react";
import { Vault, HandCoins, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore, formatTZS } from "@/lib/store";
import { safeBalance } from "@/lib/safe-custody";

export function SafeCustodyPanel() {
  const { shifts, expenses, safeMovements, recordSafeMovement, profiles, currentStoreId, currentUser } = useStore();
  const bal = useMemo(() => safeBalance(shifts, expenses, safeMovements), [shifts, expenses, safeMovements]);
  const owners = profiles.filter((p) => p.role === "staff" && !p.disabled && p.id !== currentUser?.id &&
    (p.memberships?.find((m) => m.store_id === currentStoreId)?.staff_role ?? (p.store_id === currentStoreId ? p.staff_role : undefined)) === "owner");
  const [kind, setKind] = useState<"owner" | "bank" | null>(null);
  const [amount, setAmount] = useState(0);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = () => {
    if (!kind) return;
    const r = recordSafeMovement({ kind, amount, reference, note, owner_id: ownerId, owner_pin: pin });
    if (!r.ok) return setMsg({ ok: false, text: r.reason });
    setMsg({ ok: true, text: kind === "owner" ? "Cash handed to owner and recorded." : "Bank deposit recorded." });
    setKind(null); setAmount(0); setReference(""); setNote(""); setPin("");
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-card p-5">
        <h2 className="font-bold text-lg flex items-center gap-2 mb-4"><Vault className="w-5 h-5 text-primary" /> Safe & Owner Handover</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt>Cash received from shift closes</dt><dd className="font-semibold">{formatTZS(bal.drops)}</dd></div>
          <div className="flex justify-between"><dt>Less: cash expenses paid outside shifts</dt><dd>− {formatTZS(bal.safeExpenses)}</dd></div>
          <div className="flex justify-between"><dt>Less: bank / wakala deposits</dt><dd>− {formatTZS(bal.deposits)}</dd></div>
          <div className="flex justify-between"><dt>Less: cash handed to owner</dt><dd>− {formatTZS(bal.toOwner)}</dd></div>
          <div className="flex justify-between border-t pt-2 text-base"><dt className="font-bold">Cash that must be in the safe now</dt><dd className={`font-bold ${bal.expected < 0 ? "text-destructive" : "text-primary"}`}>{formatTZS(bal.expected)}</dd></div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => { setKind("owner"); setMsg(null); }} variant={kind === "owner" ? "default" : "outline"}><HandCoins /> Hand cash to owner</Button>
          <Button onClick={() => { setKind("bank"); setMsg(null); }} variant={kind === "bank" ? "default" : "outline"}><Landmark /> Deposit to bank / wakala</Button>
        </div>
        {kind && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">Amount (TZS)
              <input type="number" inputMode="numeric" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} className="mt-1 h-11 w-full rounded-lg border bg-background px-3" />
            </label>
            {kind === "bank" ? (
              <label className="text-sm">Deposit slip / reference
                <input value={reference} onChange={(e) => setReference(e.target.value)} className="mt-1 h-11 w-full rounded-lg border bg-background px-3" />
              </label>
            ) : (
              <>
                <label className="text-sm">Owner receiving
                  <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className="mt-1 h-11 w-full rounded-lg border bg-background px-3">
                    <option value="">Choose owner</option>
                    {owners.map((o) => <option key={o.id} value={o.id}>{o.full_name}</option>)}
                  </select>
                </label>
                <label className="text-sm">Owner PIN
                  <input type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} className="mt-1 h-11 w-full rounded-lg border bg-background px-3" />
                </label>
              </>
            )}
            <label className="text-sm sm:col-span-2">Note (optional)
              <input value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 h-11 w-full rounded-lg border bg-background px-3" />
            </label>
            <Button className="sm:col-span-2 h-11" onClick={submit}>Confirm</Button>
          </div>
        )}
        {kind === "owner" && owners.length === 0 && <p className="mt-2 text-sm text-muted-foreground">No other owner account found. The owner must sign off with their own PIN.</p>}
        {msg && <p role="status" className={`mt-3 text-sm ${msg.ok ? "text-primary" : "text-destructive"}`}>{msg.text}</p>}
      </section>
      <section className="rounded-2xl border bg-card p-5">
        <h2 className="font-bold mb-3">Safe history</h2>
        {safeMovements.length === 0 ? <p className="text-sm text-muted-foreground">No handovers or deposits yet.</p> : (
          <ul className="divide-y text-sm">
            {safeMovements.map((m) => (
              <li key={m.id} className="py-2 flex justify-between gap-3">
                <div>
                  <p className="font-semibold">{m.kind === "owner" ? `Handed to ${m.confirmed_by}` : `Bank deposit ${m.reference ?? ""}`}</p>
                  <p className="text-muted-foreground">{new Date(m.created_at).toLocaleString()} · by {m.recorded_by}{m.note ? ` · ${m.note}` : ""}</p>
                </div>
                <span className="font-semibold whitespace-nowrap">{formatTZS(m.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
