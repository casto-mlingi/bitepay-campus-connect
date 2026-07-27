import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChefHat, Store as StoreIcon, User, ArrowRight, ArrowLeft, CheckCircle2, Eye, EyeOff, Wallet, Info, Loader2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useServerFn } from "@tanstack/react-start";
import { registerOwnerAndStore } from "@/lib/auth.functions";

export const Route = createFileRoute("/setup")({
  component: SetupWizard,
  head: () => ({ meta: [
    { title: "Set up your store — BitePay" },
    { name: "description", content: "First-run setup for the BitePay store owner. Create your store profile and manager account." },
  ] }),
});

function SetupWizard() {
  const { hasOwner, completeSetup } = useStore();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [storeName, setStoreName] = useState("");
  const [location, setLocation] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [currency, setCurrency] = useState("TZS");
  const [lowThreshold, setLowThreshold] = useState<number>(3000);

  const [openingCash, setOpeningCash] = useState<number>(0);
  const [openingBank, setOpeningBank] = useState<number>(0);

  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [ownerPin, setOwnerPin] = useState("");

  useEffect(() => {
    if (hasOwner) navigate({ to: "/" });
  }, [hasOwner, navigate]);

  const goStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!storeName.trim() || !contactPhone.trim()) return setError("Store name and contact phone are required");
    setStep(2);
  };

  const goStep3 = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (openingCash < 0 || openingBank < 0) return setError("Opening balances cannot be negative");
    setStep(3);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = completeSetup({
      store: { name: storeName, location, contact_phone: contactPhone, currency, low_balance_threshold: lowThreshold, enable_mobile_tender: true },
      owner: { full_name: ownerName, phone: ownerPhone, password: ownerPassword, staff_pin: ownerPin },
      opening_cash: openingCash,
      opening_bank: openingBank,
    });
    if (!res.ok) return setError(res.reason);
    navigate({ to: "/staff" });
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
          <p className="mt-1.5 text-white/85 text-sm max-w-xs">Three quick steps to get your store running.</p>
          <div className="flex items-center gap-2 mt-5">
            <StepDot n={1} active={step === 1} done={step > 1} label="Store" />
            <div className="w-6 h-px bg-white/40" />
            <StepDot n={2} active={step === 2} done={step > 2} label="Liquidity" />
            <div className="w-6 h-px bg-white/40" />
            <StepDot n={3} active={step === 3} done={false} label="Owner" />
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
              <FormRow label="Contact phone" required>
                <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="0712 000 000" className="h-11 rounded-xl" />
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
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="h-12 rounded-xl"><ArrowLeft className="w-4 h-4" /></Button>
                <Button type="submit" className="flex-1 h-12 rounded-xl text-base font-semibold">Continue <ArrowRight className="ml-2 w-4 h-4" /></Button>
              </div>
            </form>
          )}

          {step === 3 && (
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
                <Button type="button" variant="outline" onClick={() => setStep(2)} className="h-12 rounded-xl"><ArrowLeft className="w-4 h-4" /></Button>
                <Button type="submit" className="flex-1 h-12 rounded-xl text-base font-semibold">Create store <CheckCircle2 className="ml-2 w-4 h-4" /></Button>
              </div>
            </form>
          )}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">© BitePay — first-run setup</p>
      </div>
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
