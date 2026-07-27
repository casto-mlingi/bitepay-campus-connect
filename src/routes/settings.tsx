import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Settings as SettingsIcon, Save, Store as StoreIcon, Sparkles, ArrowUpRight, Clock } from "lucide-react";
import { useStore, PLAN_LABEL, PLAN_PRICE, PLAN_FEATURES, type SubscriptionPlan } from "@/lib/store";
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
  const { currentUser, store, can, updateStore, subscriptionDaysLeft, changePlan } = useStore();
  const navigate = useNavigate();
  const [toast, setToast] = useState("");
  const [showPlans, setShowPlans] = useState(false);


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

  const daysLeft = subscriptionDaysLeft();
  const sub = store?.subscription;
  const expiresOn = sub ? new Date(sub.expires_at).toLocaleDateString() : "";

  const pickPlan = (p: SubscriptionPlan) => {
    changePlan(p);
    setShowPlans(false);
    setToast(`Switched to ${PLAN_LABEL[p]} plan`);
    setTimeout(() => setToast(""), 1800);
  };

  return (
    <StaffShell>
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2"><SettingsIcon className="w-7 h-7 text-primary" /> Store settings</h1>
        <p className="text-muted-foreground">Only the owner can change these.</p>
      </div>

      {sub && (
        <div className="max-w-2xl mb-6 bg-gradient-to-br from-primary to-orange-500 text-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-90"><Sparkles className="w-4 h-4" /> Subscription</div>
          <div className="mt-2 flex items-end justify-between gap-4 flex-wrap">
            <div>
              <div className="text-3xl font-extrabold">{PLAN_LABEL[sub.plan]}</div>
              <div className="text-sm opacity-90 flex items-center gap-1.5 mt-1"><Clock className="w-3.5 h-3.5" />
                {sub.status === "suspended" ? "Suspended — contact support" :
                 daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left · renews ${expiresOn}` : `Expired on ${expiresOn}`}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowPlans((v) => !v)} className="h-10 rounded-xl bg-white text-primary hover:bg-white/90 font-semibold">
                Upgrade now <ArrowUpRight className="w-4 h-4 ml-1" />
              </Button>
              <Link to="/support" className="inline-flex items-center h-10 px-4 rounded-xl bg-white/15 hover:bg-white/25 text-sm font-semibold">Contact billing</Link>
            </div>
          </div>
          {showPlans && (
            <div className="mt-5 grid sm:grid-cols-3 gap-3">
              {(["starter", "pro", "enterprise"] as SubscriptionPlan[]).map((p) => (
                <button key={p} onClick={() => pickPlan(p)} disabled={sub.plan === p}
                  className={`text-left bg-white/10 hover:bg-white/20 disabled:opacity-60 rounded-xl p-4 border border-white/20 ${sub.plan === p ? "ring-2 ring-white" : ""}`}>
                  <div className="font-bold">{PLAN_LABEL[p]}</div>
                  <div className="text-xs opacity-90 mt-0.5">TZS {PLAN_PRICE[p].toLocaleString()} / month</div>
                  <ul className="mt-2 space-y-1 text-xs opacity-90">
                    {PLAN_FEATURES[p].map((f) => <li key={f}>· {f}</li>)}
                  </ul>
                  <div className="mt-2 text-xs font-semibold">{sub.plan === p ? "Current plan" : "Choose"}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <form onSubmit={save} className="max-w-2xl bg-surface border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1"><StoreIcon className="w-5 h-5 text-primary" /><h2 className="font-bold">Profile</h2></div>
        <Row label="Store name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Row>
        <Row label="Location"><Input value={location} onChange={(e) => setLocation(e.target.value)} /></Row>
        <Row label="Contact phone"><Input value={contact} onChange={(e) => setContact(e.target.value)} /></Row>
        <div className="grid grid-cols-2 gap-3">
          <Row label="Currency"><Input value={currency} onChange={(e) => setCurrency(e.target.value)} /></Row>
          <Row label="Low-balance nudge"><Input type="number" value={low} onChange={(e) => setLow(Number(e.target.value) || 0)} /></Row>
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
