import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChefHat, ArrowRight, Eye, EyeOff, Store as StoreIcon, User, ShieldCheck, LifeBuoy, ArrowLeft } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useServerFn } from "@tanstack/react-start";
import { loginUser } from "@/lib/auth.functions";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [
    { title: "Sign in — BitePay" },
    { name: "description", content: "Sign in to your BitePay wallet or staff console." },
    { property: "og:title", content: "Sign in — BitePay" },
    { property: "og:description", content: "Access your BitePay customer wallet or staff console." },
  ] }),
});

type Tab = "customer" | "staff";

function LoginPage() {
  const { login, signup, hasOwner, store, stores } = useStore();
  const loginFn = useServerFn(loginUser);
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("customer");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [signupStoreId, setSignupStoreId] = useState<string>("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");


  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (tab === "staff") {
      const u = login(phone, password);
      if (!u) return setError("Invalid phone or password (or account disabled)");
      if (u.role !== "staff") return setError("This account is a customer account. Use the Customer tab.");
      try { await loginFn({ data: { phone, password } }); } catch (err) { console.warn("[login] db mirror failed", err); }
      navigate({ to: "/staff" });
      return;
    }
    if (mode === "login") {
      const u = login(phone, password);
      if (!u) return setError("Invalid phone or password");
      if (u.role !== "customer") return setError("This account is a staff account. Use the Staff tab.");
      try { await loginFn({ data: { phone, password } }); } catch (err) { console.warn("[login] db mirror failed", err); }
      navigate({ to: "/dashboard" });
    } else {
      if (!name || !phone || !password) return setError("All fields required");
      const targetStore = stores.length === 1 ? stores[0].id : signupStoreId;
      if (!targetStore) return setError("Choose which store to sign up for");
      const u = signup(name, phone, password, targetStore);
      if (!u) return setError("Phone already registered");
      navigate({ to: "/dashboard" });
    }
  };


  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="relative bg-primary text-white pt-14 pb-20 px-6 rounded-b-[2.5rem] overflow-hidden">
        <Link to="/" className="absolute top-4 left-4 inline-flex items-center gap-1 text-white/85 hover:text-white text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Home
        </Link>
        <div className="absolute -right-12 -top-12 w-56 h-56 rounded-full bg-white/10" />
        <div className="absolute -left-16 top-24 w-40 h-40 rounded-full bg-white/10" />
        <div className="relative flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur grid place-items-center mb-3">
            <ChefHat className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">BitePay</h1>
          <p className="mt-1.5 text-white/85 text-sm max-w-xs">{store?.name ? `${store.name} • Prepaid canteen wallet` : "Top-up once, order faster. No cash, no queues."}</p>
        </div>
      </div>

      <div className="flex-1 -mt-10 px-5 pb-8 relative z-10">
        <div className="max-w-md mx-auto bg-surface rounded-3xl shadow-xl shadow-black/5 p-5 sm:p-7 border">
          <div className="grid grid-cols-2 gap-1 bg-muted p-1 rounded-xl mb-5">
            <button
              onClick={() => { setTab("customer"); setError(""); }}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition ${tab === "customer" ? "bg-white shadow text-foreground" : "text-muted-foreground"}`}
            >
              <User className="w-4 h-4" /> Customer
            </button>
            <button
              onClick={() => { setTab("staff"); setMode("login"); setError(""); }}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition ${tab === "staff" ? "bg-white shadow text-foreground" : "text-muted-foreground"}`}
            >
              <StoreIcon className="w-4 h-4" /> Staff
            </button>
          </div>

          <h2 className="text-xl font-bold">
            {tab === "staff" ? "Staff sign in" : mode === "login" ? "Welcome back 👋" : "Create your wallet"}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {tab === "staff" ? "Cashiers, supervisors and owners sign in here." : mode === "login" ? "Sign in to order and manage your wallet." : "Sign up in seconds — start ordering today."}
          </p>

          <form onSubmit={submit} className="mt-5 space-y-3">
            {tab === "customer" && mode === "signup" && (
              <>
                <div>
                  <Label htmlFor="name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Full name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" className="mt-1.5 h-12 rounded-xl" />
                </div>
                {canteenGroups.length > 1 && (
                  <div>
                    <Label htmlFor="store" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Choose your store</Label>
                    <select id="store" value={signupStoreId} onChange={(e) => setSignupStoreId(e.target.value)} className="mt-1.5 h-12 w-full rounded-xl border bg-background px-3 text-sm">
                      <option value="">Select a store…</option>
                      {canteenGroups.map((g) => (
                        <option key={g.orgId} value={g.orgId}>
                          {g.name}{g.canteens.length > 1 ? ` — ${g.canteens.length} canteens` : g.canteens[0]?.location ? ` — ${g.canteens[0].location}` : ""}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      One wallet works at every canteen in the store you pick. You can shop at other stores later — each keeps its own balance.
                    </p>
                  </div>
                )}

              </>
            )}

            <div>
              <Label htmlFor="phone" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Phone number</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678" className="mt-1.5 h-12 rounded-xl" />
            </div>
            <div>
              <Label htmlFor="pw" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Password</Label>
              <div className="relative mt-1.5">
                <Input id="pw" type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-12 rounded-xl pr-11" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full h-12 rounded-xl text-base font-semibold bg-primary hover:bg-primary/90">
              {tab === "customer" && mode === "signup" ? "Create account" : "Sign in"} <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </form>

          {tab === "customer" && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {mode === "login" ? (<>New here? <span className="text-primary font-semibold">Sign up</span></>) : (<>Already have an account? <span className="text-primary font-semibold">Sign in</span></>)}
              </button>
            </div>
          )}

          <div className="mt-6 pt-5 border-t space-y-2">
            <Button
              onClick={() => navigate({ to: "/setup" })}
              className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              <StoreIcon className="w-4 h-4 mr-2" /> {hasOwner ? "Create a new store account" : "Create your store (first time)"}
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">
              Any owner can open a new canteen on this device — data stays separate per store.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <Link to="/admin" className="flex items-center justify-center gap-1.5 h-10 rounded-xl border text-xs font-semibold hover:bg-muted">
                <ShieldCheck className="w-3.5 h-3.5" /> Admin console
              </Link>
              <Link to="/support" className="flex items-center justify-center gap-1.5 h-10 rounded-xl border text-xs font-semibold hover:bg-muted">
                <LifeBuoy className="w-3.5 h-3.5" /> Support
              </Link>
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">© BitePay — SaaS for Canteens & Hotels</p>
      </div>
    </div>
  );
}
