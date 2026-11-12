import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Smartphone, KeyRound, CheckCircle2 } from "lucide-react";
import { getSelcomStatus, saveSelcomSettings } from "@/lib/selcom.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SelcomSettingsCard({ storeId }: { storeId: string }) {
  const fetchStatus = useServerFn(getSelcomStatus);
  const save = useServerFn(saveSelcomSettings);
  const [status, setStatus] = useState<{ configured: boolean; vendor?: string; api_key_hint?: string; fee_percent?: number; fee_flat?: number } | null>(null);
  const [baseUrl, setBaseUrl] = useState<"sandbox" | "live">("sandbox");
  const [vendor, setVendor] = useState("");
  const [feePercent, setFeePercent] = useState("0");
  const [feeFlat, setFeeFlat] = useState("0");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [xApiKey, setXApiKey] = useState("");
  const [currentKey, setCurrentKey] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => fetchStatus({ data: { store_id: storeId } }).then((s) => {
    setStatus(s);
    if (s.configured) { setVendor(s.vendor ?? ""); setBaseUrl(s.base_url === "live" ? "live" : "sandbox"); setFeePercent(String(s.fee_percent ?? 0)); setFeeFlat(String(s.fee_flat ?? 0)); }
  }).catch(() => setStatus({ configured: false }));
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [storeId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg("");
    try {
      const r = await save({ data: { store_id: storeId, base_url: baseUrl, vendor, api_key: apiKey, api_secret: apiSecret, x_api_key: xApiKey || undefined, fee_percent: Number(feePercent) || 0, fee_flat: Math.round(Number(feeFlat) || 0), current_api_key: currentKey || undefined } });
      if (!r.ok) setMsg(r.reason);
      else { setMsg("Saved. Customers can now top up with mobile money."); setApiKey(""); setApiSecret(""); setXApiKey(""); setCurrentKey(""); load(); }
    } catch { setMsg("Could not save. Check the details and try again."); }
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="max-w-2xl mt-6 bg-surface border rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-2"><Smartphone className="w-5 h-5 text-primary" /><h2 className="font-bold">Mobile money self top-up (AzamPay)</h2></div>
      <p className="text-xs text-muted-foreground">Paste the app details from your AzamPay developer portal (Apps → your app). Use Sandbox for testing and Live after AzamPay approves your business. Customers then top up their wallet from M-Pesa, Yas Pesa, Airtel Money or HaloPesa and the money lands instantly. The client secret is kept on the server and never shown again.</p>
      {status?.configured && (
        <div className="flex items-center gap-2 text-sm rounded-lg bg-success/10 text-success p-3"><CheckCircle2 className="w-4 h-4" /> Connected · app {status.vendor} · client ID {status.api_key_hint}</div>
      )}
      <div><Label className="text-xs font-semibold text-muted-foreground uppercase">App name</Label><Input className="mt-1.5" value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Exactly as registered on AzamPay" required /></div>
      <div><Label className="text-xs font-semibold text-muted-foreground uppercase">Client ID</Label><Input className="mt-1.5" value={apiKey} onChange={(e) => setApiKey(e.target.value)} required autoComplete="off" /></div>
      <div><Label className="text-xs font-semibold text-muted-foreground uppercase">Client secret</Label><Input className="mt-1.5" type="password" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} required autoComplete="new-password" /></div>
      <div><Label className="text-xs font-semibold text-muted-foreground uppercase">X-API-Key (if AzamPay gave you one)</Label><Input className="mt-1.5" value={xApiKey} onChange={(e) => setXApiKey(e.target.value)} autoComplete="off" /></div>
      <div><Label className="text-xs font-semibold text-muted-foreground uppercase">Mode</Label>
        <div className="mt-1.5 grid grid-cols-2 gap-2">{(["sandbox", "live"] as const).map((m) => (
          <Button key={m} type="button" variant={baseUrl === m ? "default" : "outline"} onClick={() => setBaseUrl(m)}>{m === "sandbox" ? "Sandbox (testing)" : "Live (real money)"}</Button>
        ))}</div>
      </div>
      <p className="text-xs text-muted-foreground">Callback URL to give AzamPay: <span className="font-mono break-all">{typeof window !== "undefined" ? window.location.origin : ""}/api/public/azampay/webhook</span></p>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs font-semibold text-muted-foreground uppercase">Transaction fee % (customer pays)</Label><Input className="mt-1.5" type="number" min="0" max="20" step="0.1" value={feePercent} onChange={(e) => setFeePercent(e.target.value)} /></div>
        <div><Label className="text-xs font-semibold text-muted-foreground uppercase">Flat fee (TZS)</Label><Input className="mt-1.5" type="number" min="0" step="50" value={feeFlat} onChange={(e) => setFeeFlat(e.target.value)} /></div>
      </div>
      <p className="text-xs text-muted-foreground">Set these to what AzamPay charges you per transaction. The fee is added on top of the top-up, so the customer pays it and your till receives the full top-up amount. Leave both at 0 to absorb the cost yourself.</p>
      {status?.configured && (
        <div><Label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1"><KeyRound className="w-3 h-3" /> Old client ID (only if changing client ID)</Label><Input className="mt-1.5" value={currentKey} onChange={(e) => setCurrentKey(e.target.value)} autoComplete="off" /></div>
      )}
      {msg && <div className="text-sm font-medium">{msg}</div>}
      <Button type="submit" disabled={busy} className="w-full h-11 rounded-xl">{busy ? "Saving…" : status?.configured ? "Replace keys" : "Save keys"}</Button>
    </form>
  );
}
