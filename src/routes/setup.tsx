import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChefHat, Store as StoreIcon, User, ArrowRight, ArrowLeft, CheckCircle2, Eye, EyeOff, Wallet, Info, Loader2 } from "lucide-react";
import { useStore, duplicateStoreReason } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useServerFn } from "@tanstack/react-start";
import { registerOwnerAndStore } from "@/lib/auth.functions";
import { saveSessionToken } from "@/lib/session-token";
import { STARTER_GOODS, STARTER_RAW, type StarterGood, type StarterRaw } from "@/lib/starter-pack";
import type { BusinessType } from "@/lib/business-rules";
import { Package, Settings2, UtensilsCrossed, Plus, Trash2 } from "lucide-react";

const STEP_LABELS = ["Store", "Service", "Credit", "Cash", "Stock", "Menu", "Owner"];
const TYPES: { id: BusinessType; label: string; emoji: string }[] = [
  { id: "canteen", label: "Canteen", emoji: "🍛" }, { id: "restaurant", label: "Restaurant", emoji: "🍽️" },
  { id: "bar", label: "Bar", emoji: "🍺" }, { id: "hotel", label: "Hotel", emoji: "🏨" },
];

export const Route = createFileRoute("/setup")({
  component: SetupWizard,
  head: () => ({ meta: [
    { title: "Set up your store — BitePay" },
    { name: "description", content: "First-run setup for the BitePay store owner. Create your store profile and manager account." },
  
      { property: "og:title", content: "Set up your store — BitePay" },
      { property: "og:description", content: "First-run setup for the BitePay store owner. Create your store profile and manager account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },] }),
});

function SetupWizard() {
  const { completeSetup, stores, allProfiles, currentUser } = useStore();
  const registerFn = useServerFn(registerOwnerAndStore);
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [businessType, setBusinessType] = useState<BusinessType>("canteen");
  const [waiterMode, setWaiterMode] = useState<"none" | "wallet" | "all">("none");
  const [tables, setTables] = useState(false);
  const [mobileTender, setMobileTender] = useState(true);
  const [debtLimit, setDebtLimit] = useState(0);
  const [loyalty, setLoyalty] = useState(0);
  const [raws, setRaws] = useState<(StarterRaw & { on: boolean })[]>([]);
  const [goods, setGoods] = useState<(StarterGood & { on: boolean })[]>([]);
  const [newRaw, setNewRaw] = useState("");
  const [newGood, setNewGood] = useState({ name: "", price: 0 });
  useEffect(() => {
    setRaws(STARTER_RAW[businessType].map((r) => ({ ...r, on: true })));
    setGoods(STARTER_GOODS[businessType].map((g) => ({ ...g, on: true })));
    setTables(businessType !== "canteen");
  }, [businessType]);
  const next = (e?: React.FormEvent) => { e?.preventDefault(); setError(""); setStep((n) => n + 1); };
  const back = () => { setError(""); setStep((n) => n - 1); };
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [storeName, setStoreName] = useState("");
  const [location, setLocation] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [adminEmail, setAdminEmail] = useState("");

  const [currency, setCurrency] = useState("TZS");
  const [lowThreshold, setLowThreshold] = useState<number>(3000);

  const [openingCash, setOpeningCash] = useState<number>(0);
  const [openingBank, setOpeningBank] = useState<number>(0);

  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [ownerPin, setOwnerPin] = useState("");

  useEffect(() => {
    if (currentUser?.role === "staff") navigate({ to: "/staff" });
  }, [currentUser, navigate]);

  const goStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!storeName.trim() || !contactPhone.trim()) return setError("Store name and contact phone are required");
    if (!/^\S+@\S+\.\S+$/.test(adminEmail.trim())) return setError("Enter a valid admin email");
    const dup = duplicateStoreReason(stores, { contact_phone: contactPhone, admin_email: adminEmail });
    if (dup) return setError(dup);

    setStep(2);
  };

  const goCash = (e: React.FormEvent) => {
    e.preventDefault();
    if (debtLimit < 0 || loyalty < 0 || loyalty > 100) return setError("Check the debt limit and loyalty %");
    next();
  };

  const goStep3 = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (openingCash < 0 || openingBank < 0) return setError("Opening balances cannot be negative");
    setStep(5);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (ownerName.trim().length < 2 || ownerPhone.trim().length < 4 || ownerPassword.length < 4) return setError("Enter your name, phone and a password of at least 4 characters.");
    if (!/^\d{4,6}$/.test(ownerPin)) return setError("Staff PIN must be 4–6 digits.");
    if (allProfiles.some((p) => p.phone.replace(/\D/g, "") === ownerPhone.replace(/\D/g, ""))) return setError("That owner phone is already registered. Sign in instead.");
    const duplicate = duplicateStoreReason(stores, { contact_phone: contactPhone, admin_email: adminEmail });
    if (duplicate) return setError(duplicate);
    setSubmitting(true);
    let canonicalIds;
    try {
      canonicalIds = await registerFn({ data: {
        store: { name: storeName.trim(), location: location.trim(), contact_phone: contactPhone.trim(), admin_email: adminEmail.trim().toLowerCase(), currency, low_balance_threshold: lowThreshold },
        owner: { full_name: ownerName.trim(), phone: ownerPhone.trim(), password: ownerPassword, staff_pin: ownerPin },
        opening_cash: openingCash, opening_bank: openingBank,
      }});
      saveSessionToken(canonicalIds.token);
    } catch (err) {
      setSubmitting(false);
      return setError(err instanceof Error && err.message.includes("already exists") ? err.message : "Could not confirm your store. Check your connection and retry with the same details.");
    }
    const res = completeSetup({
      store: { name: storeName, location, contact_phone: contactPhone, admin_email: adminEmail.trim().toLowerCase(), currency, low_balance_threshold: lowThreshold, enable_mobile_tender: mobileTender,
        business_type: businessType, waiter_payment_mode: waiterMode, allow_waiter_payments: waiterMode !== "none", enable_waiter_tables: tables,
        customer_debt_limit: debtLimit, loyalty_percentage: loyalty },
      starter: {
        raw: raws.filter((r) => r.on).map((r) => ({ name: r.name, category: r.category, unit: r.unit, stock: 0, avg_cost: 0, low_threshold: 0 })),
        products: goods.filter((g) => g.on && g.price > 0).map((g, i) => ({ name: g.name, category: g.category, price: g.price, emoji: g.emoji, description: "", gradient: GRAD[i % GRAD.length] })),
      },
      owner: { full_name: ownerName, phone: ownerPhone, password: ownerPassword, staff_pin: ownerPin },
      opening_cash: openingCash,
      opening_bank: openingBank,
      canonicalIds,
    });
    if (!res.ok) { setSubmitting(false); return setError(res.reason); }
    setSubmitting(false);
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="relative bg-primary text-white pt-14 pb-16 px-6 rounded-b-[2.5rem] overflow-hidden">
        <div className="absolute -right-12 -top-12 w-56 h-56 rounded-full bg-white/10" />
        <div className="absolute -left-16 top-24 w-40 h-40 rounded-full bg-white/10" />
        <div className="relative flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur grid place-items-center mb-3">
            <ChefHat className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Set up BitePay</h1>
          <p className="mt-1.5 text-white/85 text-sm max-w-xs">A few easy steps — you can change everything later in Settings.</p>
          <div className="flex items-center gap-1.5 mt-5 flex-wrap justify-center">
            {STEP_LABELS.map((l, i) => <StepDot key={l} n={i + 1} active={step === i + 1} done={step > i + 1} label={l} />)}
          </div>
        </div>
      </div>

      <div className="flex-1 -mt-8 px-5 pb-8 relative z-10">
        <div className="max-w-md mx-auto bg-surface rounded-3xl shadow-xl shadow-black/5 p-6 sm:p-8 border">
          {step === 1 && (
            <form onSubmit={goStep2} className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <StoreIcon className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">Store details</h2>
              </div>
              <FormRow label="Store name" required>
                <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Campus Bites Canteen" className="h-11 rounded-xl" />
              </FormRow>
              <FormRow label="Location">
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Main Campus, Block C" className="h-11 rounded-xl" />
              </FormRow>
              <FormRow label="WhatsApp number" required>
                <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="0712 000 000" className="h-11 rounded-xl" />
              </FormRow>
              <FormRow label="Admin email" required>
                <Input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="owner@canteen.co.tz" className="h-11 rounded-xl" />
              </FormRow>

              <FormRow label="Type of business" required>
                <div className="grid grid-cols-2 gap-2">
                  {TYPES.map((t) => (
                    <button key={t.id} type="button" onClick={() => setBusinessType(t.id)} className={`h-14 rounded-xl border-2 font-semibold ${businessType === t.id ? "border-primary bg-primary/10" : "border-border"}`}>{t.emoji} {t.label}</button>
                  ))}
                </div>
              </FormRow>
              <div className="grid grid-cols-2 gap-3">
                <FormRow label="Currency">
                  <Input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="TZS" className="h-11 rounded-xl" />
                </FormRow>
                <FormRow label="Low-balance nudge">
                  <Input type="number" value={lowThreshold} onChange={(e) => setLowThreshold(Number(e.target.value) || 0)} className="h-11 rounded-xl" />
                </FormRow>
              </div>
              <p className="text-xs text-muted-foreground flex items-start gap-1.5 -mt-1">
                <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span><strong>Low-balance nudge</strong> is the wallet balance at which BitePay sends the customer an in-app push notification. When their balance drops below this amount after a purchase, they'll see a pop-up reminder next time they open the app so they can top up before their next order.</span>
              </p>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full h-12 rounded-xl text-base font-semibold">Continue <ArrowRight className="ml-2 w-4 h-4" /></Button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={next} className="space-y-4">
              <StepTitle icon={<Settings2 className="w-5 h-5 text-primary" />} title="How you serve" />
              <FormRow label="Can waiters receive payments?">
                <div className="grid gap-2">
                  {([["none", "No — save bill only", "Cashier collects all money"], ["wallet", "Wallet only", "Waiters scan customer QR, no cash"], ["all", "All payments", "Waiters take cash, mobile and wallet"]] as const).map(([id, l, d]) => (
                    <button key={id} type="button" onClick={() => setWaiterMode(id)} className={`text-left p-3 rounded-xl border-2 ${waiterMode === id ? "border-primary bg-primary/10" : "border-border"}`}><div className="font-semibold">{l}</div><div className="text-xs text-muted-foreground">{d}</div></button>
                  ))}
                </div>
              </FormRow>
              <Toggle label="Use table numbers" hint="Pick tables on bills and link them to waiters" on={tables} set={setTables} />
              <Toggle label="Accept mobile money (Lipa Namba)" hint="Shows a Mobile option at the till" on={mobileTender} set={setMobileTender} />
              <NavButtons back={back} />
            </form>
          )}

          {step === 3 && (
            <form onSubmit={goCash} className="space-y-4">
              <StepTitle icon={<Wallet className="w-5 h-5 text-primary" />} title="Customer credit & rewards" />
              <FormRow label="Most a customer can owe (debt limit)">
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[0, 20000, 50000, 100000].map((v) => <button key={v} type="button" onClick={() => setDebtLimit(v)} className={`h-11 rounded-xl border-2 text-sm font-semibold ${debtLimit === v ? "border-primary bg-primary/10" : "border-border"}`}>{v === 0 ? "None" : `${v / 1000}k`}</button>)}
                </div>
                <Input type="number" min={0} value={debtLimit} onChange={(e) => setDebtLimit(Math.max(0, Math.round(Number(e.target.value) || 0)))} className="h-11 rounded-xl" />
              </FormRow>
              <p className="text-xs text-muted-foreground -mt-2">0 means customers must always pay in full.</p>
              <FormRow label="Loyalty reward % on wallet purchases">
                <div className="grid grid-cols-4 gap-2">
                  {[0, 1, 2, 5].map((v) => <button key={v} type="button" onClick={() => setLoyalty(v)} className={`h-11 rounded-xl border-2 text-sm font-semibold ${loyalty === v ? "border-primary bg-primary/10" : "border-border"}`}>{v === 0 ? "Off" : `${v}%`}</button>)}
                </div>
              </FormRow>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <NavButtons back={back} />
            </form>
          )}

          {step === 5 && (
            <form onSubmit={next} className="space-y-4">
              <StepTitle icon={<Package className="w-5 h-5 text-primary" />} title="Raw materials (kitchen stock)" />
              <p className="text-sm text-muted-foreground -mt-1">Tick what you use. Quantities start at 0 — record your first purchase in Inventory to add stock.</p>
              <ul className="space-y-1.5 max-h-72 overflow-y-auto">
                {raws.map((r, i) => (
                  <li key={r.name + i}><label className="flex items-center gap-3 p-2.5 rounded-xl border"><input type="checkbox" className="w-5 h-5" checked={r.on} onChange={(e) => setRaws((p) => p.map((x, j) => j === i ? { ...x, on: e.target.checked } : x))} /><span className="flex-1">{r.name}</span><span className="text-xs text-muted-foreground">{r.unit}</span></label></li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Input value={newRaw} onChange={(e) => setNewRaw(e.target.value)} placeholder="Add your own, e.g. Flour" className="h-11 rounded-xl" />
                <Button type="button" variant="outline" className="h-11" onClick={() => { if (newRaw.trim()) { setRaws((p) => [...p, { name: newRaw.trim(), category: "Other", unit: "kg", on: true }]); setNewRaw(""); } }}><Plus className="w-4 h-4" /></Button>
              </div>
              <NavButtons back={back} skip={() => { setRaws((p) => p.map((x) => ({ ...x, on: false }))); next(); }} />
            </form>
          )}

          {step === 6 && (
            <form onSubmit={next} className="space-y-4">
              <StepTitle icon={<UtensilsCrossed className="w-5 h-5 text-primary" />} title="What you sell (POS menu)" />
              <p className="text-sm text-muted-foreground -mt-1">These appear on the till. Set your prices — you can edit, add photos or delete them later in Inventory.</p>
              <ul className="space-y-1.5 max-h-72 overflow-y-auto">
                {goods.map((g, i) => (
                  <li key={g.name + i} className="flex items-center gap-2 p-2 rounded-xl border">
                    <input type="checkbox" className="w-5 h-5" checked={g.on} onChange={(e) => setGoods((p) => p.map((x, j) => j === i ? { ...x, on: e.target.checked } : x))} />
                    <span className="flex-1 truncate">{g.emoji} {g.name}</span>
                    <Input type="number" min={0} value={g.price} onChange={(e) => setGoods((p) => p.map((x, j) => j === i ? { ...x, price: Math.max(0, Math.round(Number(e.target.value) || 0)) } : x))} className="h-10 w-24 rounded-lg" />
                    <button type="button" aria-label="Remove" onClick={() => setGoods((p) => p.filter((_, j) => j !== i))} className="p-2 text-destructive"><Trash2 className="w-4 h-4" /></button>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Input value={newGood.name} onChange={(e) => setNewGood({ ...newGood, name: e.target.value })} placeholder="Item name" className="h-11 rounded-xl" />
                <Input type="number" min={0} value={newGood.price || ""} onChange={(e) => setNewGood({ ...newGood, price: Math.max(0, Math.round(Number(e.target.value) || 0)) })} placeholder="Price" className="h-11 w-24 rounded-xl" />
                <Button type="button" variant="outline" className="h-11" onClick={() => { if (newGood.name.trim() && newGood.price > 0) { setGoods((p) => [...p, { name: newGood.name.trim(), category: "Other", price: newGood.price, emoji: "🍽️", on: true }]); setNewGood({ name: "", price: 0 }); } }}><Plus className="w-4 h-4" /></Button>
              </div>
              <NavButtons back={back} skip={() => { setGoods((p) => p.map((x) => ({ ...x, on: false }))); next(); }} />
            </form>
          )}

          {step === 4 && (
            <form onSubmit={goStep3} className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">Liquidity accounts</h2>
              </div>
              <p className="text-sm text-muted-foreground -mt-1">Opening balances for your treasury. These fund purchases and expenses, and receive sales & top-ups.</p>
              <FormRow label="Cash on hand (till float)">
                <Input type="number" min={0} value={openingCash} onChange={(e) => setOpeningCash(Number(e.target.value) || 0)} placeholder="0" className="h-11 rounded-xl" />
              </FormRow>
              <p className="text-xs text-muted-foreground -mt-2">Physical cash in the till at the start. Cash sales add to this; cash purchases/expenses reduce it.</p>
              <FormRow label="Bank / mobile-money balance">
                <Input type="number" min={0} value={openingBank} onChange={(e) => setOpeningBank(Number(e.target.value) || 0)} placeholder="0" className="h-11 rounded-xl" />
              </FormRow>
              <p className="text-xs text-muted-foreground -mt-2">Money in your bank account or Lipa Namba wallet. Mobile-money top-ups & sales settle here.</p>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={back} className="h-12 rounded-xl"><ArrowLeft className="w-4 h-4" /></Button>
                <Button type="submit" className="flex-1 h-12 rounded-xl text-base font-semibold">Continue <ArrowRight className="ml-2 w-4 h-4" /></Button>
              </div>
            </form>
          )}

          {step === 7 && (
            <form onSubmit={submit} className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">Owner account</h2>
              </div>
              <p className="text-sm text-muted-foreground -mt-1">This account has full control. You can add supervisors and cashiers later.</p>
              <FormRow label="Full name" required>
                <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Jane Doe" className="h-11 rounded-xl" />
              </FormRow>
              <FormRow label="Phone (used to sign in)" required>
                <Input value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} placeholder="0712 000 000" className="h-11 rounded-xl" />
              </FormRow>
              <FormRow label="Password" required>
                <div className="relative">
                  <Input type={showPw ? "text" : "password"} value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} placeholder="At least 4 characters" className="h-11 rounded-xl pr-11" />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </FormRow>
              <FormRow label="Staff PIN (4–6 digits, used to authorise top-ups)" required>
                <Input inputMode="numeric" value={ownerPin} onChange={(e) => setOwnerPin(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="1234" className="h-11 rounded-xl tracking-widest" />
              </FormRow>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={back} className="h-12 rounded-xl" disabled={submitting}><ArrowLeft className="w-4 h-4" /></Button>
                <Button type="submit" disabled={submitting} className="flex-1 h-12 rounded-xl text-base font-semibold">
                  {submitting ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating…</>) : (<>Create store <CheckCircle2 className="ml-2 w-4 h-4" /></>)}
                </Button>
              </div>
            </form>
          )}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">© BitePay — first-run setup</p>
      </div>
    </div>
  );
}

const GRAD = ["from-orange-400 to-red-500", "from-emerald-400 to-teal-500", "from-sky-400 to-indigo-500"];

function StepTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return <div className="flex items-center gap-2 mb-1">{icon}<h2 className="text-xl font-bold">{title}</h2></div>;
}

function Toggle({ label, hint, on, set }: { label: string; hint: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer">
      <input type="checkbox" className="w-5 h-5" checked={on} onChange={(e) => set(e.target.checked)} />
      <span><span className="font-semibold block">{label}</span><span className="text-xs text-muted-foreground">{hint}</span></span>
    </label>
  );
}

function NavButtons({ back, skip }: { back: () => void; skip?: () => void }) {
  return (
    <div className="flex gap-2">
      <Button type="button" variant="outline" onClick={back} className="h-12 rounded-xl"><ArrowLeft className="w-4 h-4" /></Button>
      {skip && <Button type="button" variant="ghost" onClick={skip} className="h-12 rounded-xl">Skip</Button>}
      <Button type="submit" className="flex-1 h-12 rounded-xl text-base font-semibold">Continue <ArrowRight className="ml-2 w-4 h-4" /></Button>
    </div>
  );
}

function StepDot({ n, active, done, label }: { n: number; active: boolean; done: boolean; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-8 h-8 rounded-full grid place-items-center text-sm font-bold ${active ? "bg-white text-primary" : done ? "bg-white/80 text-primary" : "bg-white/20 text-white"}`}>
        {done ? <CheckCircle2 className="w-4 h-4" /> : n}
      </div>
      <span className="text-[10px] uppercase tracking-wider">{label}</span>
    </div>
  );
}

function FormRow({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {label}{required && <span className="text-destructive"> *</span>}
      </Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
