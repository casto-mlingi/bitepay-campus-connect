import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, Wallet, ClipboardList, ShieldCheck, LifeBuoy, Store as StoreIcon, Utensils, BarChart3,
  Sparkles, Check, Smartphone, RefreshCw, ShoppingBasket, Hammer, Warehouse, BedDouble, Wine, Coffee,
  Package, Truck, HandCoins, ScanBarcode, Users, Receipt,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useT } from "@/lib/i18n";
import { PLAN_PRICE, STORE_LIMIT } from "@/lib/subscription-rules";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({ meta: [
    { title: "BitePay — POS for Shops, Wholesale & Hospitality" },
    { name: "description", content: "BitePay runs sales, stock, customer credit, suppliers and accounts for shops, hardware, supermarkets, wholesale, restaurants, bars, hotels and canteens." },
    { property: "og:title", content: "BitePay — POS for Shops, Wholesale & Hospitality" },
    { property: "og:description", content: "One simple app for selling, stock, madeni, suppliers and clear money reports — for every kind of business." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

const fmt = (n: number) => n.toLocaleString("en-US");

function HomePage() {
  const { hasOwner } = useStore();
  const { t } = useT();
  const startHref = hasOwner ? "/login" : "/setup";

  const businesses = [
    { icon: <StoreIcon className="w-5 h-5" />, name: "Retail shop / Duka" },
    { icon: <ShoppingBasket className="w-5 h-5" />, name: "Supermarket" },
    { icon: <Hammer className="w-5 h-5" />, name: "Hardware store" },
    { icon: <Warehouse className="w-5 h-5" />, name: "Wholesale / Jumla" },
    { icon: <Utensils className="w-5 h-5" />, name: "Restaurant" },
    { icon: <Wine className="w-5 h-5" />, name: "Bar & lounge" },
    { icon: <BedDouble className="w-5 h-5" />, name: "Hotel" },
    { icon: <Coffee className="w-5 h-5" />, name: "Canteen" },
  ];

  const features = [
    { icon: <ScanBarcode className="w-5 h-5" />, title: t("Fast checkout (POS)"), body: "Sell by tap, search or barcode. Cash, Lipa Namba and wallet with change handled for you." },
    { icon: <Package className="w-5 h-5" />, title: t("Stock that never lies"), body: "Every sale and purchase updates stock. Low-stock alerts and units like pcs, kg, bags, cartons." },
    { icon: <HandCoins className="w-5 h-5" />, title: t("Customer credit (madeni)"), body: "Set a debt limit, track who owes what and for how long, and collect easily." },
    { icon: <Truck className="w-5 h-5" />, title: t("Suppliers & bills"), body: "Record deliveries, pay now or later, and see what you owe each supplier." },
    { icon: <Wallet className="w-5 h-5" />, title: "Customer wallets", body: "Customers pre-pay or save their change, then pay with a QR scan next time." },
    { icon: <BarChart3 className="w-5 h-5" />, title: "Clear money reports", body: "Profit, cash, bank and balance sheet in plain words — no accountant needed." },
    { icon: <ClipboardList className="w-5 h-5" />, title: "Shifts & handovers", body: "Blind cash counts with a witness and a printed shift report stop missing money." },
    { icon: <Users className="w-5 h-5" />, title: "Staff roles", body: "Owner, manager, cashier and waiter each see only what they should." },
    { icon: <RefreshCw className="w-5 h-5" />, title: "Works offline", body: "Keep selling without internet. Everything saves on the phone and syncs later." },
  ];

  const plans = [
    { key: "starter" as const, name: "Starter", body: "Sales, stock, madeni & supplier bills." },
    { key: "growth" as const, name: "Growth", body: "Multi-store, staff roles, wallets & recipes.", highlight: true },
    { key: "pro" as const, name: "Business Pro", body: "Tables, waiters, open bills, kitchen & shifts." },
    { key: "enterprise" as const, name: "Enterprise", body: "Everything, unlimited stores." },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandLogo className="w-8 h-8" />
            <span className="font-extrabold tracking-tight">BitePay</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#businesses" className="hover:text-foreground">Businesses</a>
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#pricing" className="hover:text-foreground">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link to="/login" className="text-sm font-semibold px-3 py-2 rounded-lg hover:bg-muted">{t("Sign in")}</Link>
            <Link to="/setup" className="text-sm font-semibold px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">Create store</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-primary/5" />
        <div className="relative max-w-6xl mx-auto px-5 pt-14 pb-16 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-full">
              <Sparkles className="w-3.5 h-3.5" /> For shops, wholesale & hospitality
            </span>
            <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.05]">
              Sell, track stock &amp; know your profit — <span className="text-primary">in one simple app.</span>
            </h1>
            <p className="mt-4 text-muted-foreground text-lg max-w-lg">
              Whether you run a duka, hardware store, supermarket, wholesale, bar, hotel or canteen — BitePay handles sales, stock, customer credit, suppliers and your money reports.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to={startHref}>
                <Button className="h-12 px-6 rounded-xl text-base font-semibold">
                  {t(hasOwner ? "Sign in" : "Create your store")} <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <a href="#features">
                <Button variant="outline" className="h-12 px-6 rounded-xl text-base font-semibold border-2">See features</Button>
              </a>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Check className="w-3.5 h-3.5 text-primary" /> 14-day free trial</span>
              <span className="inline-flex items-center gap-1"><Check className="w-3.5 h-3.5 text-primary" /> Works offline</span>
              <span className="inline-flex items-center gap-1"><Check className="w-3.5 h-3.5 text-primary" /> Pay by mobile money</span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 bg-primary/20 blur-3xl rounded-[3rem]" />
            <div className="relative bg-surface border rounded-3xl shadow-2xl p-6">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Today's sales</p>
              <p className="text-3xl font-extrabold mt-1">485,000</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[{ k: "Profit", v: "92,400" }, { k: "Madeni", v: "35,000" }, { k: "Low stock", v: "3 items" }].map((s) => (
                  <div key={s.k} className="py-3 rounded-xl bg-muted">
                    <p className="text-[11px] text-muted-foreground">{s.k}</p>
                    <p className="text-sm font-bold">{s.v}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-1">
                {[
                  { name: "Cement 50kg × 4", amt: "+76,000" },
                  { name: "Sugar 1kg × 10", amt: "+30,000" },
                  { name: "Supplier bill — Azam", amt: "-120,000" },
                ].map((r) => (
                  <div key={r.name} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                    <span className="font-semibold flex items-center gap-2"><Receipt className="w-4 h-4 text-primary" />{r.name}</span>
                    <span className="font-bold">{r.amt}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Businesses */}
      <section id="businesses" className="max-w-6xl mx-auto px-5 py-14">
        <h2 className="text-3xl font-extrabold tracking-tight text-center">Built for your type of business.</h2>
        <p className="text-center text-muted-foreground mt-2 max-w-xl mx-auto">Pick your business when you sign up — BitePay shows only the tools you need.</p>
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {businesses.map((b) => (
            <div key={b.name} className="p-4 rounded-2xl border bg-surface flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">{b.icon}</span>
              <span className="font-semibold text-sm">{b.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-muted/40 border-y">
        <div className="max-w-6xl mx-auto px-5 py-16">
          <h2 className="text-3xl font-extrabold tracking-tight text-center">Everything to run your business.</h2>
          <p className="text-center text-muted-foreground mt-2 max-w-xl mx-auto">Replace notebooks, cash tins and spreadsheets with one easy screen.</p>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <div key={f.title} className="p-5 rounded-2xl border bg-surface">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary grid place-items-center">{f.icon}</div>
                <h3 className="mt-3 font-bold">{f.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{f.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 p-5 rounded-2xl border bg-surface">
            <h3 className="font-bold flex items-center gap-2"><Utensils className="w-5 h-5 text-primary" /> Extra for restaurants, bars, hotels & canteens</h3>
            <ul className="mt-3 grid sm:grid-cols-2 gap-2 text-sm">
              {["Tables with assigned waiters", "Open bills / saved tabs", "Kitchen order board with alerts", "Raw materials & plate costing"].map((t) => (
                <li key={t} className="flex items-start gap-2"><Check className="w-4 h-4 text-primary mt-0.5" /> {t}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-5 py-16 text-center">
        <h2 className="text-3xl font-extrabold tracking-tight">Simple monthly pricing (TZS).</h2>
        <p className="text-muted-foreground mt-2">Start with a 14-day free trial. Upgrade with mobile money — no card, no paperwork.</p>
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
          {plans.map((p) => {
            const limit = STORE_LIMIT[p.key];
            return (
              <div key={p.key} className={`p-6 rounded-2xl border bg-surface ${p.highlight ? "border-primary shadow-lg ring-2 ring-primary/20" : ""}`}>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{p.name}</p>
                <p className="text-2xl font-extrabold mt-2">{fmt(PLAN_PRICE[p.key])}<span className="text-sm font-medium text-muted-foreground"> / mo</span></p>
                <p className="text-xs font-semibold text-primary mt-1">{limit === Infinity ? "Unlimited stores" : `${limit} store${limit > 1 ? "s" : ""}`}</p>
                <p className="text-sm text-muted-foreground mt-2">{p.body}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-8 p-6 rounded-2xl border bg-surface text-left">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary grid place-items-center"><Smartphone className="w-4 h-4" /></div>
            <h3 className="font-bold">Pay by mobile money, activated after review</h3>
          </div>
          <div className="mt-4 grid sm:grid-cols-3 gap-4 text-sm">
            {[
              { n: "1", t: "Pick your plan", b: "Open Settings → Subscription and tap Upgrade now." },
              { n: "2", t: "Send the payment", b: "TTCL Lipa number 30030336 — name: Computerized Africa." },
              { n: "3", t: "Submit the receipt", b: "Paste the receipt number; approval activates the plan for 30 days." },
            ].map((s) => (
              <div key={s.n} className="p-4 rounded-xl bg-muted/50">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold grid place-items-center">{s.n}</span>
                <p className="font-semibold mt-2">{s.t}</p>
                <p className="text-muted-foreground mt-1">{s.b}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link to={startHref}><Button className="h-11 rounded-xl font-semibold">{t(hasOwner ? "Sign in" : "Create your store")} <ArrowRight className="ml-2 w-4 h-4" /></Button></Link>
          <Link to="/support"><Button variant="outline" className="h-11 rounded-xl font-semibold border-2">Talk to us</Button></Link>
        </div>
      </section>

      <footer className="border-t bg-surface">
        <div className="max-w-6xl mx-auto px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <BrandLogo className="w-7 h-7" />
            <span className="font-semibold text-foreground">BitePay</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/admin" className="inline-flex items-center gap-1 hover:text-foreground"><ShieldCheck className="w-3.5 h-3.5" /> Admin</Link>
            <Link to="/support" className="inline-flex items-center gap-1 hover:text-foreground"><LifeBuoy className="w-3.5 h-3.5" /> Support</Link>
            <Link to="/privacy" className="inline-flex items-center gap-1 hover:text-foreground">Privacy</Link>
            <Link to="/login" className="inline-flex items-center gap-1 hover:text-foreground">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
