import { createFileRoute, Link } from "@tanstack/react-router";
import { ChefHat, ArrowRight, Wallet, QrCode, ClipboardList, ShieldCheck, LifeBuoy, Store as StoreIcon, Utensils, BarChart3, Sparkles, Check, Smartphone, RefreshCw } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({ meta: [
    { title: "BitePay — Prepaid Wallets for Canteens & Hotels" },
    { name: "description", content: "BitePay is the all-in-one prepaid wallet, POS and kitchen-costing platform for college canteens, hostels and small hotels." },
    { property: "og:title", content: "BitePay — Prepaid Wallets for Canteens & Hotels" },
    { property: "og:description", content: "Top-up once, order in seconds. Full POS, inventory, batch costing and treasury for operators." },
    { property: "og:type", content: "website" },
  ] }),
});

function HomePage() {
  const { store, hasOwner } = useStore();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary grid place-items-center text-white">
              <ChefHat className="w-4 h-4" />
            </div>
            <span className="font-extrabold tracking-tight">BitePay</span>
          </div>
          <nav className="hidden sm:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#operators" className="hover:text-foreground">For operators</a>
            <a href="#pricing" className="hover:text-foreground">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="text-sm font-semibold px-3 py-2 rounded-lg hover:bg-muted">Sign in</Link>
            <Link to={hasOwner ? "/login" : "/setup"} className="text-sm font-semibold px-3 py-2 rounded-lg bg-primary text-white hover:bg-primary/90">
              {hasOwner ? "Get started" : "Create store"}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-emerald-500/10" />
        <div className="relative max-w-6xl mx-auto px-5 pt-16 pb-20 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-full">
              <Sparkles className="w-3.5 h-3.5" /> Trusted by campus canteens
            </span>
            <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.05]">
              Prepaid wallets, POS &amp; kitchen costing — <span className="text-primary">in one app.</span>
            </h1>
            <p className="mt-4 text-muted-foreground text-lg max-w-lg">
              {store?.name ? `Welcome to ${store.name}.` : "Skip the queue at the till."} Customers top-up once and order in seconds. Operators get real POS, inventory, batch costing and treasury out of the box.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/login">
                <Button className="h-12 px-6 rounded-xl text-base font-semibold bg-primary hover:bg-primary/90">
                  Sign in <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link to={hasOwner ? "/login" : "/setup"}>
                <Button variant="outline" className="h-12 px-6 rounded-xl text-base font-semibold border-2">
                  <StoreIcon className="mr-2 w-4 h-4" /> {hasOwner ? "Operator sign in" : "Create your store"}
                </Button>
              </Link>
            </div>
            <div className="mt-5 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Check className="w-3.5 h-3.5 text-emerald-600" /> 14-day free trial</span>
              <span className="inline-flex items-center gap-1"><Check className="w-3.5 h-3.5 text-emerald-600" /> No card required</span>
            </div>
          </div>

          {/* Preview card */}
          <div className="relative">
            <div className="absolute -inset-4 bg-primary/20 blur-3xl rounded-[3rem]" />
            <div className="relative bg-surface border rounded-3xl shadow-2xl shadow-black/10 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Wallet balance</p>
                  <p className="text-3xl font-extrabold mt-1">TZS 12,500</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-primary/10 grid place-items-center text-primary">
                  <Wallet className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2">
                {[
                  { icon: <Utensils className="w-4 h-4" />, label: "Order" },
                  { icon: <QrCode className="w-4 h-4" />, label: "Scan" },
                  { icon: <ClipboardList className="w-4 h-4" />, label: "History" },
                ].map((a) => (
                  <div key={a.label} className="flex flex-col items-center gap-1 py-3 rounded-xl bg-muted">
                    <span className="text-primary">{a.icon}</span>
                    <span className="text-xs font-semibold">{a.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 space-y-2">
                {[
                  { name: "Chapati & Beans", when: "12:04", amt: "-1,500" },
                  { name: "Top-up via M-Pesa", when: "09:22", amt: "+10,000", green: true },
                  { name: "Chai + Mandazi", when: "08:11", amt: "-1,000" },
                ].map((r) => (
                  <div key={r.name} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                    <div>
                      <p className="font-semibold">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.when}</p>
                    </div>
                    <span className={`font-bold ${r.green ? "text-emerald-600" : "text-foreground"}`}>{r.amt}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-5 py-16">
        <h2 className="text-3xl font-extrabold tracking-tight text-center">Everything a canteen needs.</h2>
        <p className="text-center text-muted-foreground mt-2 max-w-xl mx-auto">From student wallets to kitchen batch costing, BitePay replaces spreadsheets, cash tins and receipt books.</p>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: <Wallet className="w-5 h-5" />, title: "Prepaid wallets", body: "Customers top-up once via mobile money and pay at the till in one tap or QR scan." },
            { icon: <StoreIcon className="w-5 h-5" />, title: "Walk-in POS", body: "Cash, mobile money and wallet payments with split-tender and printable receipts." },
            { icon: <Utensils className="w-5 h-5" />, title: "Kitchen batch costing", body: "Log raw materials, cook a batch and BitePay auto-computes cost per plate." },
            { icon: <BarChart3 className="w-5 h-5" />, title: "Treasury & P&L", body: "Working capital, wallet liabilities, COGS and net profit — updated in real time." },
            { icon: <ClipboardList className="w-5 h-5" />, title: "Shifts & Z-reports", body: "Open and close shifts per cashier with a settlement journal at end of day." },
            { icon: <ShieldCheck className="w-5 h-5" />, title: "Role-based access", body: "Owner, supervisor and cashier permissions — each sees only what they should." },
          ].map((f) => (
            <div key={f.title} className="p-5 rounded-2xl border bg-surface hover:shadow-lg transition">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary grid place-items-center">{f.icon}</div>
              <h3 className="mt-3 font-bold">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Operators band */}
      <section id="operators" className="bg-muted/40 border-y">
        <div className="max-w-6xl mx-auto px-5 py-16 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight">Run the whole canteen from one screen.</h2>
            <p className="mt-3 text-muted-foreground">Live Kanban orders, walk-in POS, inventory, cooking batches, procurement and payroll-ready expense logs. Owners see full financials; cashiers see just their till.</p>
            <ul className="mt-5 space-y-2 text-sm">
              {["Live order board with prep-time tracking", "PIN-protected wallet top-ups", "Offline-first POS with sync queue", "Daily settlement journal for accountants"].map((t) => (
                <li key={t} className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-600 mt-0.5" /> {t}</li>
              ))}
            </ul>
            <div className="mt-6 flex gap-3">
              <Link to={hasOwner ? "/login" : "/setup"}>
                <Button className="h-11 rounded-xl bg-primary hover:bg-primary/90 font-semibold">
                  {hasOwner ? "Operator sign in" : "Create your store"} <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link to="/support">
                <Button variant="outline" className="h-11 rounded-xl font-semibold border-2">Talk to us</Button>
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { k: "1,200+", v: "Meals served / day" },
              { k: "< 3s", v: "Average checkout" },
              { k: "98%", v: "Wallet adoption" },
              { k: "0", v: "Cash reconciliation errors" },
            ].map((s) => (
              <div key={s.v} className="p-5 rounded-2xl bg-surface border">
                <p className="text-3xl font-extrabold text-primary">{s.k}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section id="pricing" className="max-w-4xl mx-auto px-5 py-16 text-center">
        <h2 className="text-3xl font-extrabold tracking-tight">Simple pricing.</h2>
        <p className="text-muted-foreground mt-2">Start with a 14-day free trial. Upgrade with mobile money — no card, no paperwork.</p>
        <div className="mt-8 grid sm:grid-cols-3 gap-4 text-left">
          {[
            { name: "Trial", price: "Free", body: "14 days, all features, one store." },
            { name: "Starter", price: "TZS 50k / mo", body: "1 outlet, up to 500 wallets.", highlight: true },
            { name: "Pro", price: "TZS 120k / mo", body: "Multi-outlet, unlimited wallets." },
          ].map((p) => (
            <div key={p.name} className={`p-6 rounded-2xl border bg-surface ${p.highlight ? "border-primary shadow-lg ring-2 ring-primary/20" : ""}`}>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{p.name}</p>
              <p className="text-2xl font-extrabold mt-2">{p.price}</p>
              <p className="text-sm text-muted-foreground mt-2">{p.body}</p>
            </div>
          ))}
        </div>

        {/* How upgrading works — mobile money + receipt approval */}
        <div className="mt-8 p-6 rounded-2xl border bg-surface text-left">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 grid place-items-center">
              <Smartphone className="w-4.5 h-4.5" />
            </div>
            <h3 className="font-bold">Pay by mobile money, activated after review</h3>
          </div>
          <div className="mt-4 grid sm:grid-cols-3 gap-4 text-sm">
            {[
              { n: "1", t: "Pick your plan", b: "Open Settings → Subscription and tap Upgrade now." },
              { n: "2", t: "Send the payment", b: "TTCL Lipa number 30030336 — name: Computerized Africa." },
              { n: "3", t: "Submit the receipt", b: "Paste the receipt number; approval activates the plan for 30 days." },
            ].map((s) => (
              <div key={s.n} className="p-4 rounded-xl bg-muted/50">
                <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold grid place-items-center">{s.n}</span>
                <p className="font-semibold mt-2">{s.t}</p>
                <p className="text-muted-foreground mt-1">{s.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* Footer */}
      <footer className="border-t bg-surface">
        <div className="max-w-6xl mx-auto px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary grid place-items-center text-white">
              <ChefHat className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-foreground">BitePay</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/admin" className="inline-flex items-center gap-1 hover:text-foreground"><ShieldCheck className="w-3.5 h-3.5" /> Admin</Link>
            <Link to="/support" className="inline-flex items-center gap-1 hover:text-foreground"><LifeBuoy className="w-3.5 h-3.5" /> Support</Link>
            <Link to="/login" className="inline-flex items-center gap-1 hover:text-foreground">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
