import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { QRCodeSVG } from "qrcode.react";
import { Smartphone, Battery, BatteryCharging, Signal, Download, Zap, Volume2, WifiOff, Search, FileDown, Printer, Timer, ShieldCheck } from "lucide-react";
import { useStore } from "@/lib/store";
import { StaffShell } from "@/components/staff-shell";
import { AccessDenied } from "@/components/access-denied";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PROVIDER_LABEL, normalizeReference, editDistance, type Provider } from "@/lib/sms-parser";
import {
  pairGatewayDevice, revokeGatewayDevice, getGatewayOverview, simulateGatewaySms, markGatewaySms,
  createGatewayCheckout, getGatewayCheckout, cancelGatewayCheckout, submitCheckoutReference,
} from "@/lib/gateway.functions";

export const Route = createFileRoute("/gateway")({
  component: GatewayPage,
  head: () => ({ meta: [
    { title: "BytePay Gateway — automatic mobile money checks" },
    { name: "description", content: "Pair a counter phone to verify M-Pesa, Mixx, Airtel and HaloPesa payments automatically." },
    { property: "og:title", content: "BytePay Gateway — automatic mobile money checks" },
    { property: "og:description", content: "Pair a counter phone to verify mobile money payments automatically." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

type Overview = Awaited<ReturnType<typeof getGatewayOverview>>;
const APK_URL = import.meta.env.VITE_GATEWAY_APK_URL as string | undefined;
const fmt = (n: number) => n.toLocaleString("en-US");

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    matched: "bg-primary/15 text-primary", paid: "bg-primary/15 text-primary",
    review: "bg-accent text-accent-foreground", pending: "bg-muted text-muted-foreground", unmatched: "bg-muted text-muted-foreground",
    flagged: "bg-destructive/15 text-destructive", expired: "bg-destructive/15 text-destructive", cancelled: "bg-destructive/15 text-destructive",
  };
  const label: Record<string, string> = { matched: "Paid", paid: "Paid", review: "Check", unmatched: "Pending", pending: "Pending", flagged: "Flagged", expired: "Expired", cancelled: "Invalid" };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${map[status] ?? "bg-muted"}`}>{label[status] ?? status}</span>;
}

function GatewayPage() {
  const { store, can } = useStore();
  if (!store) return <StaffShell active="settings"><p className="p-6">Loading…</p></StaffShell>;
  if (!can("pos.sell")) return <AccessDenied />;
  return (
    <StaffShell active="settings">
      <div className="mx-auto max-w-5xl space-y-6 p-4">
        <Promo />
        <Checkout storeId={store.id} />
        <Dashboard storeId={store.id} manager={can("settings.manage") || can("settings.credit")} />
      </div>
    </StaffShell>
  );
}

function Promo() {
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h1 className="text-2xl font-bold">Automate your store with BytePay Gateway</h1>
      <p className="mt-1 text-muted-foreground">A counter phone reads payment SMS and confirms payments for you — no more checking messages by hand.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        {[[Zap, "Instant check"], [Volume2, "Voice announcement"], [WifiOff, "Works offline, sends later"], [Search, "Find any receipt"]].map(([I, t]) => {
          const Icon = I as typeof Zap;
          return <div key={t as string} className="flex items-center gap-2 rounded-xl bg-muted p-3 text-sm"><Icon className="h-4 w-4 text-primary" />{t as string}</div>;
        })}
      </div>
      <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm">
        <li>Download and install the app on the phone that receives payment SMS.</li>
        <li>Below, tap <b>Pair a phone</b> and scan the QR code with the app.</li>
        <li>Allow SMS access and keep the phone charging at the counter.</li>
      </ol>
      <div className="mt-4">
        {APK_URL ? <Button asChild><a href={APK_URL}><Download className="mr-2 h-4 w-4" />Download Android app</a></Button>
          : <Button disabled><Download className="mr-2 h-4 w-4" />Android app coming soon</Button>}
      </div>
    </section>
  );
}

function Countdown({ until }: { until: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const left = Math.max(0, Math.floor((until - now) / 1000));
  return <span className="font-mono">{String(Math.floor(left / 60)).padStart(2, "0")}:{String(left % 60).padStart(2, "0")}</span>;
}

function Checkout({ storeId }: { storeId: string }) {
  const create = useServerFn(createGatewayCheckout), get = useServerFn(getGatewayCheckout);
  const cancel = useServerFn(cancelGatewayCheckout), submit = useServerFn(submitCheckoutReference);
  const [amount, setAmount] = useState("");
  const [co, setCo] = useState<{ id: string; amount: number; expires_at: number; status: string } | null>(null);
  const [ref, setRef] = useState(""); const [msg, setMsg] = useState("");
  useEffect(() => {
    if (!co || co.status !== "pending") return;
    const t = setInterval(() => get({ data: { store_id: storeId, id: co.id } }).then((r) => r && setCo((c) => c && { ...c, status: r.status })).catch(() => {}), 3000);
    return () => clearInterval(t);
  }, [co, storeId, get]);
  const start = async () => {
    const n = Math.round(Number(amount)); setMsg("");
    if (!(n >= 100)) return setMsg("Enter an amount of at least 100.");
    try { const r = await create({ data: { store_id: storeId, amount: n, minutes: 10 } }); setCo({ id: r.id, amount: n, expires_at: r.expires_at, status: "pending" }); setRef(""); }
    catch (e) { setMsg((e as Error).message); }
  };
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><Timer className="h-5 w-5" />Wait for a mobile money payment</h2>
      {!co || co.status !== "pending" ? (
        <div className="mt-3 space-y-2">
          {co && <p className="flex items-center gap-2 text-sm">Last payment of {fmt(co.amount)}: <StatusBadge status={co.status} /></p>}
          <div className="flex gap-2"><Input inputMode="numeric" placeholder="Amount e.g. 5000" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} />
            <Button onClick={start}>Start (10 min)</Button></div>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="text-3xl font-bold">{fmt(co.amount)}</p>
          <p className="text-sm text-muted-foreground">Waiting for the payment SMS… time left <Countdown until={co.expires_at} /></p>
          <div className="flex gap-2"><Input placeholder="Receipt number (optional)" value={ref} onChange={(e) => setRef(e.target.value)} />
            <Button variant="secondary" onClick={async () => { const r = await submit({ data: { store_id: storeId, id: co.id, reference: ref } }).catch((e: Error) => ({ status: "pending", message: e.message })); setMsg("message" in r ? r.message ?? "" : ""); if (r.status !== "pending") setCo({ ...co, status: r.status }); }}>Check</Button></div>
          <Button variant="outline" onClick={() => cancel({ data: { store_id: storeId, id: co.id } }).then(() => setCo({ ...co, status: "cancelled" }))}>Cancel</Button>
        </div>
      )}
      {msg && <p className="mt-2 text-sm text-muted-foreground">{msg}</p>}
    </section>
  );
}

function Dashboard({ storeId, manager }: { storeId: string; manager: boolean }) {
  const overview = useServerFn(getGatewayOverview);
  const [data, setData] = useState<Overview | null>(null); const [err, setErr] = useState("");
  const load = () => overview({ data: { store_id: storeId } }).then(setData).catch((e: Error) => setErr(e.message));
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [storeId]);
  if (err) return <p className="text-sm text-destructive">{err}</p>;
  return (
    <>
      {manager && <Devices storeId={storeId} devices={data?.devices ?? []} reload={load} />}
      {manager && <Simulator storeId={storeId} reload={load} />}
      <Log storeId={storeId} rows={data?.sms ?? []} manager={manager} reload={load} />
    </>
  );
}

function Devices({ storeId, devices, reload }: { storeId: string; devices: Overview["devices"]; reload: () => void }) {
  const pair = useServerFn(pairGatewayDevice), revoke = useServerFn(revokeGatewayDevice);
  const [name, setName] = useState("Counter phone");
  const [pairing, setPairing] = useState<{ device_id: string; secret: string } | null>(null);
  const server = typeof window !== "undefined" ? window.location.origin : "";
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><Smartphone className="h-5 w-5" />Counter phones</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {devices.length === 0 && <p className="text-sm text-muted-foreground">No phone paired yet.</p>}
        {devices.map((d) => {
          const online = d.last_ping != null && Date.now() - d.last_ping < 5 * 60_000;
          return (
            <div key={d.id} className="rounded-xl border p-3 text-sm">
              <div className="flex items-center justify-between"><b>{d.name}</b>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${online ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}`}>{online ? "Online" : "Offline"}</span></div>
              <p className="text-muted-foreground">{d.id}{d.app_version ? ` · v${d.app_version}` : ""}</p>
              <div className="mt-2 flex flex-wrap gap-3">
                <span className="flex items-center gap-1">{d.charging ? <BatteryCharging className="h-4 w-4" /> : <Battery className="h-4 w-4" />}{d.battery ?? "—"}%</span>
                <span className="flex items-center gap-1"><Signal className="h-4 w-4" />{d.signal ?? "—"}/5 {d.network ?? ""}</span>
                <span>Last seen: {d.last_ping ? new Date(d.last_ping).toLocaleString() : "never"}</span>
              </div>
              <Button size="sm" variant="ghost" className="mt-2" onClick={() => confirm("Unpair this phone?") && revoke({ data: { store_id: storeId, device_id: d.id } }).then(reload)}>Unpair</Button>
            </div>
          );
        })}
      </div>
      {pairing ? (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-xl bg-muted p-4 text-center">
          <div className="rounded-lg bg-card p-3"><QRCodeSVG value={JSON.stringify({ server, device_id: pairing.device_id, secret: pairing.secret })} size={200} /></div>
          <p className="text-sm">Scan with the BytePay Gateway app. This code is shown only once.</p>
          <p className="break-all font-mono text-xs">ID: {pairing.device_id}<br />Secret: {pairing.secret}</p>
          <Button variant="outline" onClick={() => { setPairing(null); reload(); }}>Done</Button>
        </div>
      ) : (
        <div className="mt-4 flex gap-2"><Input value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={() => pair({ data: { store_id: storeId, name } }).then(setPairing).catch((e: Error) => alert(e.message))}>Pair a phone</Button></div>
      )}
    </section>
  );
}

function Simulator({ storeId, reload }: { storeId: string; reload: () => void }) {
  const sim = useServerFn(simulateGatewaySms);
  const [text, setText] = useState(""); const [out, setOut] = useState<Awaited<ReturnType<typeof simulateGatewaySms>> | null>(null);
  const run = (record: boolean) => sim({ data: { store_id: storeId, sms: text, record } }).then((r) => { setOut(r); if (record) reload(); }).catch((e: Error) => alert(e.message));
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck className="h-5 w-5" />Test a payment SMS</h2>
      <Label className="mt-3 block">Paste a payment message</Label>
      <textarea className="mt-1 min-h-24 w-full rounded-md border bg-background p-2 text-sm" value={text} onChange={(e) => setText(e.target.value)} placeholder="DK5J93A97U Imethibitishwa. Umepokea Tsh10,000.00 kutoka …" />
      <div className="mt-2 flex gap-2"><Button variant="secondary" onClick={() => run(false)} disabled={text.length < 5}>Read message</Button>
        <Button onClick={() => run(true)} disabled={text.length < 5}>Send as test payment</Button></div>
      {out && (out.parsed ? (
        <div className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
          <span>Network: <b>{PROVIDER_LABEL[out.parsed.provider]}</b></span><span>Receipt: <b>{out.parsed.reference}</b></span>
          <span>Amount: <b>{fmt(out.parsed.amount)}</b></span><span>From: <b>{out.parsed.sender_name ?? out.parsed.sender_phone ?? "—"}</b></span>
          {out.result && <span className="sm:col-span-2 flex items-center gap-2">Result: <StatusBadge status={out.result.status} /> {out.result.duplicate ? "Already received" : out.result.reason}</span>}
        </div>
      ) : <p className="mt-3 text-sm text-destructive">This is not an incoming payment message.</p>)}
    </section>
  );
}

function Log({ storeId, rows, manager, reload }: { storeId: string; rows: Overview["sms"]; manager: boolean; reload: () => void }) {
  const mark = useServerFn(markGatewaySms);
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const n = normalizeReference(q);
    if (!n) return rows;
    return rows.filter((r) => {
      const ref = normalizeReference(r.reference);
      return ref.includes(n) || (n.length >= 8 && editDistance(n, ref) <= 1) || String(r.amount) === n || (r.sender_name ?? "").toUpperCase().includes(q.toUpperCase().trim()) || (r.sender_phone ?? "").includes(q.replace(/\s/g, ""));
    });
  }, [rows, q]);
  const csv = () => {
    const head = ["time", "network", "receipt", "amount", "sender", "phone", "status", "note"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const body = list.map((r) => [new Date(r.received_at).toISOString(), PROVIDER_LABEL[r.provider as Provider] ?? r.provider, r.reference, r.amount, r.sender_name, r.sender_phone, r.status, r.reason].map(esc).join(","));
    const url = URL.createObjectURL(new Blob([[head.join(","), ...body].join("\n")], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `bytepay-payments-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };
  return (
    <section className="rounded-2xl border bg-card p-5 print:border-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Received payments</h2>
        <div className="flex gap-2 print:hidden"><Button size="sm" variant="outline" onClick={csv}><FileDown className="mr-1 h-4 w-4" />CSV</Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="mr-1 h-4 w-4" />PDF</Button></div>
      </div>
      <Input className="mt-3 print:hidden" placeholder="Search receipt, amount, name or phone (typos allowed)" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-muted-foreground"><th className="p-2">Time</th><th className="p-2">Network</th><th className="p-2">Receipt</th><th className="p-2 text-right">Amount</th><th className="p-2">From</th><th className="p-2">Status</th><th className="p-2 print:hidden" /></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">No payments yet.</td></tr>}
            {list.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2 whitespace-nowrap">{new Date(r.received_at).toLocaleString()}</td>
                <td className="p-2">{PROVIDER_LABEL[r.provider as Provider] ?? r.provider}{r.is_test ? " (test)" : ""}</td>
                <td className="p-2 font-mono">{r.reference}</td>
                <td className="p-2 text-right font-semibold">{fmt(r.amount)}</td>
                <td className="p-2">{r.sender_name ?? r.sender_phone ?? "—"}</td>
                <td className="p-2" title={r.reason ?? ""}><StatusBadge status={r.status} /></td>
                <td className="p-2 print:hidden">{manager && r.status !== "matched" && (
                  <Button size="sm" variant="ghost" onClick={() => mark({ data: { store_id: storeId, sms_id: r.id, status: r.status === "flagged" ? "unmatched" : "flagged" } }).then(reload)}>{r.status === "flagged" ? "Unflag" : "Flag"}</Button>)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
