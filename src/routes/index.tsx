import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ChefHat, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/")({
  component: AuthPage,
  head: () => ({ meta: [{ title: "Sign in — BitePay" }, { name: "description", content: "Sign in to your BitePay prepaid canteen wallet." }] }),
});

function AuthPage() {
  const { login, signup, hasOwner } = useStore();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hasOwner) navigate({ to: "/setup" });
  }, [hasOwner, navigate]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (mode === "login") {
      const u = login(phone, password);
      if (!u) return setError("Invalid phone or password (or account disabled)");
      navigate({ to: u.role === "staff" ? "/staff" : "/dashboard" });
    } else {
      if (!name || !phone || !password) return setError("All fields required");
      const u = signup(name, phone, password);
      if (!u) return setError("Phone already registered");
      navigate({ to: "/dashboard" });
    }
  };

  const quickFillCustomer = () => { setPhone("0712345678"); setPassword("1234"); setMode("login"); };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Splash header */}
      <div className="relative bg-primary text-white pt-14 pb-20 px-6 rounded-b-[2.5rem] overflow-hidden">
        <div className="absolute -right-12 -top-12 w-56 h-56 rounded-full bg-white/10" />
        <div className="absolute -left-16 top-24 w-40 h-40 rounded-full bg-white/10" />
        <div className="relative flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur grid place-items-center mb-3">
            <ChefHat className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">BitePay</h1>
          <p className="mt-1.5 text-white/85 text-sm max-w-xs">Top-up once, order faster. No cash, no queues.</p>
        </div>
      </div>

      {/* Form card */}
      <div className="flex-1 -mt-10 px-5 pb-8 relative z-10">
        <div className="max-w-md mx-auto bg-surface rounded-3xl shadow-xl shadow-black/5 p-6 sm:p-8 border">
          <h2 className="text-2xl font-bold">
            {mode === "login" ? "Welcome back 👋" : "Create account"}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {mode === "login" ? "Sign in to order and manage your wallet." : "Sign up in seconds — start ordering today."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div>
                <Label htmlFor="name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Full name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" className="mt-1.5 h-12 rounded-xl" />
              </div>
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
              {mode === "login" ? "Sign in" : "Create account"} <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </form>

          <div className="mt-5 text-center">
            <button
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {mode === "login" ? (<>New here? <span className="text-primary font-semibold">Sign up</span></>) : (<>Already have an account? <span className="text-primary font-semibold">Sign in</span></>)}
            </button>
          </div>

          <div className="mt-6 pt-5 border-t">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2.5 text-center">Try demo accounts</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="rounded-xl h-10" onClick={() => quickFill("customer")}>Customer</Button>
              <Button variant="outline" size="sm" className="rounded-xl h-10" onClick={() => quickFill("staff")}>Staff</Button>
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">© BitePay — College Canteen & Hotel</p>
      </div>
    </div>
  );
}
