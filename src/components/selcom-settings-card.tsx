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
  const [status, setStatus] = useState<{ configured: boolean; vendor?: string; api_key_hint?: string } | null>(null);
  const [baseUrl, setBaseUrl] = useState("https://apigw.selcommobile.com");
  const [vendor, setVendor] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [currentKey, setCurrentKey] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => fetchStatus({ data: { store_id: storeId } }).then((s) => {
    setStatus(s);
    if (s.configured) { setVendor(s.vendor ?? ""); setBaseUrl(s.base_url ?? baseUrl); }
  }).catch(() => setStatus({ configured: false }));
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [storeId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg("");
    try {
      const r = await save({ data: { store_id: storeId, base_url: baseUrl, vendor, api_key: apiKey, api_secret: apiSecret, current_api_key: currentKey || undefined } });
      if (!r.ok) setMsg(r.reason);
      else { setMsg("Saved. Customers can now top up with mobile money."); setApiKey(""); setApiSecret(""); setCurrentKey(""); load(); }
    } catch { setMsg("Could not save. Check the details and try again."); }
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="max-w-2xl mt-6 bg-surface border rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-2"><Smartphone className="w-5 h-5 text-primary" /><h2 className="font-bold">Mobile money self top-up (Selcom)</h2></div>
      <p className="text-xs text-muted-foreground">Paste the keys from your Selcom merchant account. Customers then top up their wallet from M-Pesa, Yas Pesa, Airtel Money or Halotel Money and the money lands instantly. The secret key is kept on the server and never shown again.</p>
      {status?.configured && (
        <div className="flex items-center gap-2 text-sm rounded-lg bg-success/10 text-success p-3"><CheckCircle2 className="w-4 h-4" /> Connected · till {status.vendor} · key {status.api_key_hint}</div>
      )}
      <div><Label className="text-xs font-semibold text-muted-foreground uppercase">Vendor / Till number</Label><Input className="mt-1.5" value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="e.g. TILL61012345" required /></div>
      <div><Label className="text-xs font-semibold text-muted-foreground uppercase">API key</Label><Input className="mt-1.5" value={apiKey} onChange={(e) => setApiKey(e.target.value)} required autoComplete="off" /></div>
      <div><Label className="text-xs font-semibold text-muted-foreground uppercase">API secret</Label><Input className="mt-1.5" type="password" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} required autoComplete="new-password" /></div>
      <div><Label className="text-xs font-semibold text-muted-foreground uppercase">Selcom server address</Label><Input className="mt-1.5" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} required /></div>
      {status?.configured && (
        <div><Label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1"><KeyRound className="w-3 h-3" /> Current API key (needed to replace)</Label><Input className="mt-1.5" value={currentKey} onChange={(e) => setCurrentKey(e.target.value)} autoComplete="off" /></div>
      )}
      {msg && <div className="text-sm font-medium">{msg}</div>}
      <Button type="submit" disabled={busy} className="w-full h-11 rounded-xl">{busy ? "Saving…" : status?.configured ? "Replace keys" : "Save keys"}</Button>
    </form>
  );
}
