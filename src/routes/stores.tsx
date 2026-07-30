import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, Plus, ArrowRight, Check, Clock, ShieldAlert } from "lucide-react";
import { useStore, duplicateStoreReason, PLAN_LABEL, PLAN_PRICE, type SubscriptionPlan } from "@/lib/store";
import { StaffShell } from "@/components/staff-shell";
import { AccessDenied } from "@/components/access-denied";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/stores")({
  component: StoresPage,
  head: () => ({
    meta: [
      { title: "My stores — BitePay Staff" },
      { name: "description", content: "Switch between the canteens you manage and open a new store on its own subscription." },
      { property: "og:title", content: "My stores — BitePay Staff" },
      { property: "og:description", content: "Switch between the canteens you manage and open a new store on its own subscription." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function daysLeft(expires: number) {
  return Math.max(0, Math.ceil((expires - Date.now()) / 86400000));
}

function StoresPage() {
  const { currentUser, myStores, myRoleAt, currentStoreId, switchStore, createStore } = useStore();
  const navigate = useNavigate();
  const [toast, setToast] = useState("");
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    if (!currentUser) navigate({ to: "/" });
    else if (currentUser.role !== "staff") navigate({ to: "/dashboard" });
  }, [currentUser, navigate]);

  if (!currentUser || currentUser.role !== "staff") return null;

  const isOwnerSomewhere = myStores.some((s) => myRoleAt(s.id) === "owner");

  const open = (id: string) => {
    const r = switchStore(id);
    if (!r.ok) { setToast(r.reason); setTimeout(() => setToast(""), 2200); return; }
    navigate({ to: "/staff" });
  };

  return (
    <StaffShell>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Building2 className="w-7 h-7 text-primary" /> My stores</h1>
          <p className="text-muted-foreground">Each store keeps its own data, staff and subscription.</p>
        </div>
        {isOwnerSomewhere && (
          <Button onClick={() => setShowNew((v) => !v)} className="h-11 rounded-xl">
            <Plus className="w-4 h-4 mr-1.5" /> New store
          </Button>
        )}
      </div>

      {showNew && isOwnerSomewhere && (
        <NewStoreForm
          onCancel={() => setShowNew(false)}
          onCreate={(input) => {
            const r = createStore(input);
            if (!r.ok) { setToast(r.reason); setTimeout(() => setToast(""), 2600); return; }
            setShowNew(false);
            setToast("Store created — you're now working in it");
            setTimeout(() => setToast(""), 2200);
            navigate({ to: "/staff" });
          }}
        />
      )}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {myStores.map((s) => {
          const active = s.id === currentStoreId;
          const left = daysLeft(s.subscription.expires_at);
          const suspended = s.subscription.status !== "active" || left === 0;
          return (
            <div key={s.id} className={`bg-surface border rounded-2xl p-5 ${active ? "ring-2 ring-primary" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-lg leading-tight">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.location || "No location set"}</div>
                </div>
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full bg-primary/10 text-primary">
                  {myRoleAt(s.id) ?? "member"}
                </span>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs">
                <span className="font-semibold px-2 py-1 rounded-full bg-muted">{PLAN_LABEL[s.subscription.plan]}</span>
                <span className={`inline-flex items-center gap-1 ${suspended ? "text-red-600" : "text-muted-foreground"}`}>
                  {suspended ? <ShieldAlert className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                  {suspended ? "Needs renewal" : `${left} day${left === 1 ? "" : "s"} left`}
                </span>
              </div>
              <Button
                onClick={() => open(s.id)}
                disabled={active}
                variant={active ? "secondary" : "default"}
                className="w-full mt-4 h-10 rounded-xl"
              >
                {active ? <><Check className="w-4 h-4 mr-1.5" /> Currently open</> : <>Open store <ArrowRight className="w-4 h-4 ml-1.5" /></>}
              </Button>
            </div>
          );
        })}
        {myStores.length === 0 && (
          <div className="col-span-full"><AccessDenied feature="Stores" /></div>
        )}
      </div>

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-sm px-4 py-2 rounded-lg shadow-lg">{toast}</div>}
    </StaffShell>
  );
}

function NewStoreForm({
  onCreate,
  onCancel,
}: {
  onCreate: (input: {
    store: { name: string; location: string; contact_phone: string; admin_email: string; currency: string; low_balance_threshold: number; enable_mobile_tender: boolean };
    plan: SubscriptionPlan;
    opening_cash: number;
    opening_bank: number;
  }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [contact, setContact] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [currency, setCurrency] = useState("TZS");
  const [low, setLow] = useState(3000);
  const [cash, setCash] = useState(0);
  const [bank, setBank] = useState(0);
  const [plan, setPlan] = useState<SubscriptionPlan>("starter");
  const [error, setError] = useState("");
  const { stores } = useStore();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        if (!/^\S+@\S+\.\S+$/.test(adminEmail.trim())) return setError("Enter a valid admin email");
        const dup = duplicateStoreReason(stores, { contact_phone: contact, admin_email: adminEmail });
        if (dup) return setError(dup);
        onCreate({
          store: { name, location, contact_phone: contact, admin_email: adminEmail.trim().toLowerCase(), currency, low_balance_threshold: low, enable_mobile_tender: true },
          plan, opening_cash: cash, opening_bank: bank,
        });
      }}
      className="bg-surface border rounded-2xl p-6 mb-6 space-y-4 max-w-3xl"
    >
      <div>
        <h2 className="font-bold text-lg">Open another store</h2>
        <p className="text-sm text-muted-foreground">
          Each canteen you open is a separate store with its own data and its own monthly subscription — the free trial only applies to your first store. Phone and admin email must be unique across all stores.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Store name"><Input value={name} onChange={(e) => setName(e.target.value)} required /></Field>
        <Field label="Location"><Input value={location} onChange={(e) => setLocation(e.target.value)} /></Field>
        <Field label="Contact phone"><Input value={contact} onChange={(e) => setContact(e.target.value)} required /></Field>
        <Field label="Admin email"><Input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required /></Field>
        <Field label="Currency"><Input value={currency} onChange={(e) => setCurrency(e.target.value)} /></Field>
        <Field label="Low-balance nudge"><Input type="number" value={low} onChange={(e) => setLow(Number(e.target.value) || 0)} /></Field>
        <Field label="Opening cash"><Input type="number" value={cash} onChange={(e) => setCash(Number(e.target.value) || 0)} /></Field>
        <Field label="Opening bank"><Input type="number" value={bank} onChange={(e) => setBank(Number(e.target.value) || 0)} /></Field>
      </div>
      <div>
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Subscription plan</Label>
        <div className="mt-2 grid sm:grid-cols-3 gap-3">
          {(["starter", "pro", "enterprise"] as SubscriptionPlan[]).map((p) => (
            <button type="button" key={p} onClick={() => setPlan(p)}
              className={`text-left border rounded-xl p-3 hover:bg-muted/50 ${plan === p ? "ring-2 ring-primary border-primary" : ""}`}>
              <div className="font-bold text-sm">{PLAN_LABEL[p]}</div>
              <div className="text-xs text-muted-foreground">TZS {PLAN_PRICE[p].toLocaleString()} / month</div>
            </button>
          ))}
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" className="h-11 rounded-xl flex-1">Create store</Button>
        <Button type="button" variant="secondary" onClick={onCancel} className="h-11 rounded-xl">Cancel</Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
