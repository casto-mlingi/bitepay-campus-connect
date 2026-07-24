import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Wallet, ChefHat, Users, ArrowRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/")({
  component: AuthPage,
  head: () => ({ meta: [{ title: "Sign in — BitePay" }, { name: "description", content: "Sign in to your BitePay prepaid canteen wallet." }] }),
});

function AuthPage() {
  const { login, signup } = useStore();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (mode === "login") {
      const u = login(phone, password);
      if (!u) return setError("Invalid phone or password");
      navigate({ to: u.role === "staff" ? "/staff" : "/dashboard" });
    } else {
      if (!name || !phone || !password) return setError("All fields required");
      const u = signup(name, phone, password);
      if (!u) return setError("Phone already registered");
      navigate({ to: "/dashboard" });
    }
  };

  const quickFill = (role: "customer" | "staff") => {
    if (role === "customer") { setPhone("0712345678"); setPassword("1234"); }
    else { setPhone("0700000000"); setPassword("staff"); }
    setMode("login");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-primary via-orange-500 to-orange-600 text-white">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur grid place-items-center">
            <ChefHat className="w-6 h-6" />
          </div>
          <span className="text-2xl font-bold">BitePay</span>
        </div>
        <div>
          <h1 className="text-5xl font-extrabold leading-tight">Prepaid canteen wallet, done right.</h1>
          <p className="mt-4 text-white/90 text-lg max-w-md">Top-up once, order faster. No cash, no queues — just tap, eat, and go.</p>
          <div className="mt-10 grid grid-cols-2 gap-4 max-w-md">
            <Stat icon={<Wallet className="w-5 h-5" />} label="Wallet-first" value="Instant pay" />
            <Stat icon={<Users className="w-5 h-5" />} label="Live orders" value="Kanban board" />
          </div>
        </div>
        <p className="text-sm text-white/70">© BitePay — College Canteen & Hotel</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 lg:p-12 bg-surface">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary grid place-items-center text-white">
              <ChefHat className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold">BitePay</span>
          </div>

          <h2 className="text-3xl font-bold">{mode === "login" ? "Welcome back" : "Create account"}</h2>
          <p className="text-muted-foreground mt-1">
            {mode === "login" ? "Sign in to order and manage your wallet." : "Sign up in seconds — start ordering today."}
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            {mode === "signup" && (
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" className="mt-1.5" />
              </div>
            )}
            <div>
              <Label htmlFor="phone">Phone number</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="pw">Password</Label>
              <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="mt-1.5" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full h-11 text-base font-semibold">
              {mode === "login" ? "Sign in" : "Create account"} <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </form>

          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="mt-6 text-sm text-muted-foreground hover:text-foreground"
          >
            {mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}
          </button>

          <div className="mt-8 border-t pt-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Try demo accounts</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => quickFill("customer")}>Customer</Button>
              <Button variant="outline" size="sm" onClick={() => quickFill("staff")}>Staff</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/10 backdrop-blur p-4 border border-white/20">
      <div className="flex items-center gap-2 text-white/80 text-sm">{icon}{label}</div>
      <div className="mt-1 font-semibold text-lg">{value}</div>
    </div>
  );
}
