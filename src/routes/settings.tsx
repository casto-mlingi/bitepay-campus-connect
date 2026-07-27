import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Settings as SettingsIcon, Save, Store as StoreIcon } from "lucide-react";
import { useStore } from "@/lib/store";
import { StaffShell } from "@/components/staff-shell";
import { AccessDenied } from "@/components/access-denied";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({ meta: [
    { title: "Store settings — BitePay Staff" },
    { name: "description", content: "Configure your BitePay store profile and feature toggles." },
  ] }),
});

function SettingsPage() {
  const { currentUser, store, can, updateStore } = useStore();
  const navigate = useNavigate();
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!currentUser) navigate({ to: "/" });
    else if (currentUser.role !== "staff") navigate({ to: "/dashboard" });
  }, [currentUser, navigate]);

  const [name, setName] = useState(store?.name ?? "");
  const [location, setLocation] = useState(store?.location ?? "");
  const [contact, setContact] = useState(store?.contact_phone ?? "");
  const [currency, setCurrency] = useState(store?.currency ?? "TZS");
  const [low, setLow] = useState<number>(store?.low_balance_threshold ?? 3000);
  const [mobile, setMobile] = useState<boolean>(store?.enable_mobile_tender ?? true);

  useEffect(() => {
    if (!store) return;
    setName(store.name); setLocation(store.location); setContact(store.contact_phone);
    setCurrency(store.currency); setLow(store.low_balance_threshold); setMobile(store.enable_mobile_tender);
  }, [store]);

  if (!currentUser || currentUser.role !== "staff") return null;
  if (!can("settings.manage")) return <StaffShell><AccessDenied feature="Store settings" /></StaffShell>;

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    updateStore({ name, location, contact_phone: contact, currency, low_balance_threshold: low, enable_mobile_tender: mobile });
    setToast("Settings saved");
    setTimeout(() => setToast(""), 1800);
  };

  return (
    <StaffShell>
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2"><SettingsIcon className="w-7 h-7 text-primary" /> Store settings</h1>
        <p className="text-muted-foreground">Only the owner can change these.</p>
      </div>

      <form onSubmit={save} className="max-w-2xl bg-surface border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1"><StoreIcon className="w-5 h-5 text-primary" /><h2 className="font-bold">Profile</h2></div>
        <Row label="Store name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Row>
        <Row label="Location"><Input value={location} onChange={(e) => setLocation(e.target.value)} /></Row>
        <Row label="Contact phone"><Input value={contact} onChange={(e) => setContact(e.target.value)} /></Row>
        <div className="grid grid-cols-2 gap-3">
          <Row label="Currency"><Input value={currency} onChange={(e) => setCurrency(e.target.value)} /></Row>
          <Row label="Low-balance nudge (TZS)"><Input type="number" value={low} onChange={(e) => setLow(Number(e.target.value) || 0)} /></Row>
        </div>
        <label className="flex items-center justify-between p-3 rounded-lg border cursor-pointer">
          <div>
            <div className="font-semibold text-sm">Mobile Money (Lipa Namba) tender</div>
            <div className="text-xs text-muted-foreground">Enable mobile-money as a POS tender option.</div>
          </div>
          <input type="checkbox" checked={mobile} onChange={(e) => setMobile(e.target.checked)} className="w-5 h-5 accent-primary" />
        </label>
        <Button type="submit" className="w-full h-11 rounded-xl"><Save className="w-4 h-4 mr-2" /> Save settings</Button>
      </form>

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-sm px-4 py-2 rounded-lg shadow-lg">{toast}</div>}
    </StaffShell>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
