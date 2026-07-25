import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Wallet, Banknote, Package, Users, TrendingUp, TrendingDown,
  ShoppingCart, Receipt, FileBarChart, Plus, ArrowDownRight, ArrowUpRight, ArrowLeftRight, X,
} from "lucide-react";
import { useStore, formatTZS, type PaymentMethod, type ExpenseCategory } from "@/lib/store";
import { StaffShell } from "@/components/staff-shell";

export const Route = createFileRoute("/finance")({
  component: FinancePage,
  head: () => ({
    meta: [
      { title: "Finance & Treasury — BitePay Staff" },
      { name: "description", content: "Treasury dashboard, procurement, expenses, and P&L for BitePay canteen." },
      { property: "og:title", content: "Finance & Treasury — BitePay Staff" },
      { property: "og:description", content: "Double-entry style treasury and P&L for the canteen." },
    ],
  }),
});

type Tab = "treasury" | "procurement" | "expenses" | "pnl";

function FinancePage() {
  const {
    currentUser, cash, bank, rawMaterials, batches, profiles, orders, purchases, expenses,
    recordPurchase, recordExpense,
  } = useStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("treasury");

  useEffect(() => {
    if (!currentUser) navigate({ to: "/" });
    else if (currentUser.role !== "staff") navigate({ to: "/dashboard" });
  }, [currentUser, navigate]);

  // Financial metrics
  const rawInventoryValue = useMemo(
    () => rawMaterials.reduce((s, r) => s + r.stock * r.avg_cost, 0),
    [rawMaterials]
  );
  const finishedGoodsValue = useMemo(
    () => batches.reduce((s, b) => s + b.plates_remaining * b.unit_cost, 0),
    [batches]
  );
  const totalInventoryValue = rawInventoryValue + finishedGoodsValue;
  const walletLiabilities = useMemo(
    () => profiles.filter((p) => p.role === "customer").reduce((s, p) => s + p.wallet_balance, 0),
    [profiles]
  );

  const grossRevenue = orders.reduce((s, o) => s + o.total_amount, 0);
  const cogs = batches.reduce((s, b) => s + b.raw_cost + b.labor_cost, 0);
  const grossProfit = grossRevenue - cogs;
  const opex = expenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = grossProfit - opex;

  if (!currentUser || currentUser.role !== "staff") return null;

  return (
    <StaffShell active="finance">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Wallet className="w-7 h-7 text-primary" /> Finance & Treasury
        </h1>
        <p className="text-muted-foreground">Cash, inventory, liabilities, and profitability at a glance.</p>
      </div>

      <div className="flex gap-1 mb-6 border-b overflow-x-auto">
        <TabBtn active={tab === "treasury"} onClick={() => setTab("treasury")} icon={<Wallet className="w-4 h-4" />} label="Treasury" />
        <TabBtn active={tab === "procurement"} onClick={() => setTab("procurement")} icon={<ShoppingCart className="w-4 h-4" />} label="Procurement" />
        <TabBtn active={tab === "expenses"} onClick={() => setTab("expenses")} icon={<Receipt className="w-4 h-4" />} label="Expenses" />
        <TabBtn active={tab === "pnl"} onClick={() => setTab("pnl")} icon={<FileBarChart className="w-4 h-4" />} label="Income Statement" />
      </div>

      {tab === "treasury" && (
        <Treasury
          cash={cash}
          bank={bank}
          totalInventoryValue={totalInventoryValue}
          rawInventoryValue={rawInventoryValue}
          finishedGoodsValue={finishedGoodsValue}
          walletLiabilities={walletLiabilities}
          netProfit={netProfit}
          grossRevenue={grossRevenue}
          cogs={cogs}
          opex={opex}
        />
      )}
      {tab === "procurement" && <Procurement onSubmit={recordPurchase} />}
      {tab === "expenses" && <Expenses onSubmit={recordExpense} />}
      {tab === "pnl" && (
        <IncomeStatement
          grossRevenue={grossRevenue}
          cogs={cogs}
          grossProfit={grossProfit}
          opex={opex}
          netProfit={netProfit}
          purchases={purchases}
          expenses={expenses}
        />
      )}
    </StaffShell>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px ${
        active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}{label}
    </button>
  );
}

function Treasury({
  cash, bank, totalInventoryValue, rawInventoryValue, finishedGoodsValue, walletLiabilities,
  netProfit, grossRevenue, cogs, opex,
}: {
  cash: number; bank: number; totalInventoryValue: number; rawInventoryValue: number; finishedGoodsValue: number;
  walletLiabilities: number; netProfit: number; grossRevenue: number; cogs: number; opex: number;
}) {
  const { transferFunds } = useStore();
  const totalAssets = cash + bank + totalInventoryValue;
  const [transferOpen, setTransferOpen] = useState(false);
  return (
    <>
      <div className="flex items-center justify-end mb-4">
        <button
          onClick={() => setTransferOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-semibold text-sm hover:opacity-90"
        >
          <ArrowLeftRight className="w-4 h-4" /> Transfer Funds
        </button>
      </div>
      {transferOpen && (
        <TransferModal
          cash={cash}
          bank={bank}
          onClose={() => setTransferOpen(false)}
          onTransfer={transferFunds}
        />
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">

        <MetricCard
          label="Cash on Hand"
          sublabel="Working capital (cash)"
          value={formatTZS(cash)}
          icon={<Banknote className="w-5 h-5" />}
          tone="primary"
        />
        <MetricCard
          label="Bank Balance"
          sublabel="Funds in bank account"
          value={formatTZS(bank)}
          icon={<Wallet className="w-5 h-5" />}
          tone="success"
        />
        <MetricCard
          label="Total Liquidity"
          sublabel="Cash + Bank"
          value={formatTZS(cash + bank)}
          icon={<TrendingUp className="w-5 h-5" />}
          tone="neutral"
        />
        <MetricCard
          label="Total Inventory Value"
          sublabel={`Raw ${formatTZS(rawInventoryValue)} · Finished ${formatTZS(finishedGoodsValue)}`}
          value={formatTZS(totalInventoryValue)}
          icon={<Package className="w-5 h-5" />}
          tone="neutral"
        />
        <MetricCard
          label="Wallet Liabilities"
          sublabel="Owed to customers as food"
          value={formatTZS(walletLiabilities)}
          icon={<Users className="w-5 h-5" />}
          tone="warning"
        />
        <MetricCard
          label="Net Profit"
          sublabel="Revenue − COGS − OpEx"
          value={formatTZS(netProfit)}
          icon={netProfit >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
          tone={netProfit >= 0 ? "success" : "danger"}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-surface border rounded-2xl p-5">
          <h2 className="font-bold mb-4 flex items-center gap-2"><FileBarChart className="w-5 h-5 text-primary" /> Cash-Flow Snapshot</h2>
          <ul className="space-y-3 text-sm">
            <Row label="Gross Sales Revenue" value={formatTZS(grossRevenue)} tone="success" icon={<ArrowUpRight className="w-4 h-4" />} />
            <Row label="Cost of Goods Sold" value={`− ${formatTZS(cogs)}`} tone="danger" icon={<ArrowDownRight className="w-4 h-4" />} />
            <Row label="Operational Expenses" value={`− ${formatTZS(opex)}`} tone="danger" icon={<ArrowDownRight className="w-4 h-4" />} />
            <li className="border-t pt-3 flex justify-between font-bold">
              <span>Net Profit</span>
              <span className={netProfit >= 0 ? "text-emerald-600" : "text-red-500"}>{formatTZS(netProfit)}</span>
            </li>
          </ul>
        </div>

        <div className="bg-surface border rounded-2xl p-5">
          <h2 className="font-bold mb-4 flex items-center gap-2"><Package className="w-5 h-5 text-primary" /> Balance Composition</h2>
          <div className="space-y-3 text-sm">
            <Bar label="Cash" value={cash} total={totalAssets} color="bg-primary" />
            <Bar label="Bank" value={bank} total={totalAssets} color="bg-emerald-500" />
            <Bar label="Raw Materials" value={rawInventoryValue} total={totalAssets} color="bg-amber-500" />
            <Bar label="Finished Goods" value={finishedGoodsValue} total={totalAssets} color="bg-sky-500" />
            <div className="border-t pt-3 flex justify-between font-semibold">
              <span>Total Assets</span>
              <span>{formatTZS(totalAssets)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground text-xs">
              <span>Less: Wallet Liabilities</span>
              <span>− {formatTZS(walletLiabilities)}</span>
            </div>
            <div className="flex justify-between font-bold text-sm">
              <span>Net Equity</span>
              <span>{formatTZS(totalAssets - walletLiabilities)}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function TransferModal({
  cash, bank, onClose, onTransfer,
}: {
  cash: number; bank: number; onClose: () => void;
  onTransfer: (from: PaymentMethod, amount: number) => boolean;
}) {
  const [from, setFrom] = useState<PaymentMethod>("cash");
  const [amount, setAmount] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const to: PaymentMethod = from === "cash" ? "bank" : "cash";
  const available = from === "cash" ? cash : bank;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (amount <= 0) { setErr("Enter an amount greater than 0."); return; }
    if (amount > available) { setErr("Amount exceeds available balance."); return; }
    const ok = onTransfer(from, amount);
    if (!ok) { setErr("Transfer failed."); return; }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="bg-surface rounded-2xl border shadow-xl w-full max-w-md p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-primary" /> Transfer Funds
          </h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setFrom("cash")}
            className={`p-3 rounded-xl border text-left ${from === "cash" ? "border-primary bg-primary/5" : ""}`}>
            <div className="text-[10px] uppercase text-muted-foreground font-semibold">From</div>
            <div className="font-bold">Cash on Hand</div>
            <div className="text-xs text-muted-foreground">{formatTZS(cash)}</div>
          </button>
          <button type="button" onClick={() => setFrom("bank")}
            className={`p-3 rounded-xl border text-left ${from === "bank" ? "border-primary bg-primary/5" : ""}`}>
            <div className="text-[10px] uppercase text-muted-foreground font-semibold">From</div>
            <div className="font-bold">Bank Account</div>
            <div className="text-xs text-muted-foreground">{formatTZS(bank)}</div>
          </button>
        </div>
        <div className="text-center text-xs text-muted-foreground">
          Sending to <span className="font-semibold capitalize text-foreground">{to === "bank" ? "Bank Account" : "Cash on Hand"}</span>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground">Amount (TZS)</label>
          <input
            type="number" min={0} value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            placeholder="0"
            className="w-full px-3 py-2 rounded-lg border bg-background mt-1"
          />
          <div className="text-[11px] text-muted-foreground mt-1">Available: {formatTZS(available)}</div>
        </div>
        {err && <div className="text-xs text-red-500 font-semibold">{err}</div>}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border font-semibold text-sm">Cancel</button>
          <button className="flex-1 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm">Confirm Transfer</button>
        </div>
      </form>
    </div>
  );
}


function MetricCard({
  label, sublabel, value, icon, tone,
}: {
  label: string; sublabel: string; value: string; icon: React.ReactNode;
  tone: "primary" | "success" | "warning" | "danger" | "neutral";
}) {
  const toneClass = {
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-600",
    warning: "bg-amber-500/10 text-amber-600",
    danger: "bg-red-500/10 text-red-600",
    neutral: "bg-muted text-foreground",
  }[tone];
  return (
    <div className="bg-surface border rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
        <div className={`w-9 h-9 rounded-xl grid place-items-center ${toneClass}`}>{icon}</div>
      </div>
      <div className="text-2xl font-black mt-3">{value}</div>
      <div className="text-xs text-muted-foreground mt-1 line-clamp-1">{sublabel}</div>
    </div>
  );
}

function Row({ label, value, tone, icon }: { label: string; value: string; tone: "success" | "danger"; icon: React.ReactNode }) {
  return (
    <li className="flex justify-between items-center">
      <span className="flex items-center gap-2 text-muted-foreground">{icon} {label}</span>
      <span className={`font-mono ${tone === "success" ? "text-emerald-600" : "text-red-500"}`}>{value}</span>
    </li>
  );
}

function Bar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{formatTZS(value)}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Procurement({ onSubmit }: { onSubmit: ReturnType<typeof useStore>["recordPurchase"] }) {
  const { rawMaterials, purchases, cash, bank } = useStore();
  const [supplier, setSupplier] = useState("");
  const [rawId, setRawId] = useState("");
  const [qty, setQty] = useState(1);
  const [totalCost, setTotalCost] = useState(0);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [msg, setMsg] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = onSubmit({ supplier, raw_id: rawId, qty, total_cost: totalCost, payment_method: method });
    if (res) {
      setMsg(`✓ ${res.id} recorded — cash reduced by ${formatTZS(totalCost)}`);
      setSupplier(""); setRawId(""); setQty(1); setTotalCost(0); setMethod("cash");
    } else {
      setMsg("Could not record purchase. Check inputs.");
    }
    setTimeout(() => setMsg(null), 3500);
  };

  const perUnit = qty > 0 ? Math.round(totalCost / qty) : 0;

  return (
    <div className="grid lg:grid-cols-5 gap-4">
      <form onSubmit={submit} className="lg:col-span-2 bg-surface border rounded-2xl p-5 space-y-4">
        <div>
          <h2 className="font-bold text-lg flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-primary" /> New Stock Purchase</h2>
          <p className="text-xs text-muted-foreground">Deducts cash and adds to inventory value.</p>
        </div>
        <Field label="Supplier">
          <input required value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="e.g. Kilimanjaro Supplies"
            className="w-full px-3 py-2 rounded-lg border bg-background" />
        </Field>
        <Field label="Raw Material">
          <select required value={rawId} onChange={(e) => setRawId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border bg-background">
            <option value="">Select material…</option>
            {rawMaterials.map((r) => (
              <option key={r.id} value={r.id}>{r.name} ({r.unit}) — current avg {formatTZS(r.avg_cost)}</option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantity">
            <input required type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border bg-background" />
          </Field>
          <Field label="Total Cost (TZS)">
            <input required type="number" min={0} value={totalCost} onChange={(e) => setTotalCost(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border bg-background" />
          </Field>
        </div>
        <Field label="Payment Method">
          <div className="grid grid-cols-2 gap-2">
            {(["cash", "bank"] as PaymentMethod[]).map((m) => (
              <button key={m} type="button" onClick={() => setMethod(m)}
                className={`py-2 rounded-lg border text-sm font-semibold capitalize ${method === m ? "bg-foreground text-background border-foreground" : "bg-background"}`}>
                {m}
              </button>
            ))}
          </div>
        </Field>
        <div className="bg-muted rounded-xl p-3 text-xs space-y-1">
          <div className="flex justify-between"><span className="text-muted-foreground">Per unit</span><span className="font-mono font-semibold">{formatTZS(perUnit)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">{method === "bank" ? "Bank" : "Cash"} balance after</span><span className="font-mono font-semibold">{formatTZS((method === "bank" ? bank : cash) - totalCost)}</span></div>
        </div>
        <button className="w-full bg-primary text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:opacity-90">
          <Plus className="w-4 h-4" /> Record Purchase
        </button>
        {msg && <div className="text-xs text-center font-semibold text-primary">{msg}</div>}
      </form>

      <div className="lg:col-span-3 bg-surface border rounded-2xl p-5">
        <h2 className="font-bold mb-4">Recent Purchases</h2>
        {purchases.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-10">No purchases yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr className="text-left">
                  <th className="py-2 pr-3">Date</th>
                  <th className="pr-3">PO</th>
                  <th className="pr-3">Supplier</th>
                  <th className="pr-3">Material</th>
                  <th className="pr-3 text-right">Qty</th>
                  <th className="pr-3 text-right">Total</th>
                  <th className="pr-3">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {purchases.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2 pr-3 text-muted-foreground">{new Date(p.date).toLocaleDateString()}</td>
                    <td className="pr-3 font-mono text-xs">{p.id}</td>
                    <td className="pr-3">{p.supplier}</td>
                    <td className="pr-3">{p.raw_name}</td>
                    <td className="pr-3 text-right">{p.qty}</td>
                    <td className="pr-3 text-right font-semibold">{formatTZS(p.total_cost)}</td>
                    <td className="pr-3 capitalize"><span className="px-2 py-0.5 rounded-full bg-muted text-xs">{p.payment_method}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const expenseCategories: ExpenseCategory[] = ["Labor", "Utilities", "Transport", "Maintenance", "Other"];

function Expenses({ onSubmit }: { onSubmit: ReturnType<typeof useStore>["recordExpense"] }) {
  const { expenses, cash } = useStore();
  const [category, setCategory] = useState<ExpenseCategory>("Labor");
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [msg, setMsg] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = onSubmit({ category, amount, description, payment_method: method });
    if (res) {
      setMsg(`✓ ${res.id} logged — net profit reduced by ${formatTZS(amount)}`);
      setAmount(0); setDescription(""); setCategory("Labor"); setMethod("cash");
    } else {
      setMsg("Amount must be greater than 0.");
    }
    setTimeout(() => setMsg(null), 3500);
  };

  return (
    <div className="grid lg:grid-cols-5 gap-4">
      <form onSubmit={submit} className="lg:col-span-2 bg-surface border rounded-2xl p-5 space-y-4">
        <div>
          <h2 className="font-bold text-lg flex items-center gap-2"><Receipt className="w-5 h-5 text-primary" /> Log Expense</h2>
          <p className="text-xs text-muted-foreground">Deducts cash and directly reduces net profit.</p>
        </div>
        <Field label="Category">
          <div className="grid grid-cols-3 gap-2">
            {expenseCategories.map((c) => (
              <button key={c} type="button" onClick={() => setCategory(c)}
                className={`py-2 rounded-lg border text-xs font-semibold ${category === c ? "bg-primary text-white border-primary" : "bg-background"}`}>
                {c}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Amount (TZS)">
          <input required type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg border bg-background" />
        </Field>
        <Field label="Description">
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Weekly cleaner wages"
            className="w-full px-3 py-2 rounded-lg border bg-background" />
        </Field>
        <Field label="Payment Method">
          <div className="grid grid-cols-2 gap-2">
            {(["cash", "bank"] as PaymentMethod[]).map((m) => (
              <button key={m} type="button" onClick={() => setMethod(m)}
                className={`py-2 rounded-lg border text-sm font-semibold capitalize ${method === m ? "bg-foreground text-background border-foreground" : "bg-background"}`}>
                {m}
              </button>
            ))}
          </div>
        </Field>
        <div className="bg-muted rounded-xl p-3 text-xs">
          <div className="flex justify-between"><span className="text-muted-foreground">Working capital after</span><span className="font-mono font-semibold">{formatTZS(cash - amount)}</span></div>
        </div>
        <button className="w-full bg-primary text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:opacity-90">
          <Plus className="w-4 h-4" /> Record Expense
        </button>
        {msg && <div className="text-xs text-center font-semibold text-primary">{msg}</div>}
      </form>

      <div className="lg:col-span-3 bg-surface border rounded-2xl p-5">
        <h2 className="font-bold mb-4">Expense Log</h2>
        {expenses.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-10">No expenses logged yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr className="text-left">
                  <th className="py-2 pr-3">Date</th>
                  <th className="pr-3">ID</th>
                  <th className="pr-3">Category</th>
                  <th className="pr-3">Description</th>
                  <th className="pr-3">Method</th>
                  <th className="pr-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td className="py-2 pr-3 text-muted-foreground">{new Date(e.date).toLocaleDateString()}</td>
                    <td className="pr-3 font-mono text-xs">{e.id}</td>
                    <td className="pr-3"><span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 text-xs font-semibold">{e.category}</span></td>
                    <td className="pr-3 text-muted-foreground">{e.description || "—"}</td>
                    <td className="pr-3 capitalize text-xs">{e.payment_method}</td>
                    <td className="pr-3 text-right font-semibold text-red-500">− {formatTZS(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <div className="text-muted-foreground mb-1 font-medium">{label}</div>
      {children}
    </label>
  );
}

function IncomeStatement({
  grossRevenue, cogs, grossProfit, opex, netProfit, purchases, expenses,
}: {
  grossRevenue: number; cogs: number; grossProfit: number; opex: number; netProfit: number;
  purchases: ReturnType<typeof useStore>["purchases"];
  expenses: ReturnType<typeof useStore>["expenses"];
}) {
  const margin = grossRevenue > 0 ? Math.round((netProfit / grossRevenue) * 100) : 0;

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 bg-surface border rounded-2xl p-6">
        <h2 className="font-bold text-lg flex items-center gap-2 mb-1"><FileBarChart className="w-5 h-5 text-primary" /> Profit & Loss Statement</h2>
        <p className="text-xs text-muted-foreground mb-5">All-time summary of revenue and expenses.</p>

        <table className="w-full text-sm">
          <tbody>
            <PLRow label="Gross Revenue" note="Wallet deductions for food orders" value={formatTZS(grossRevenue)} tone="success" bold />
            <PLRow label="Less: Cost of Goods Sold" note="Raw materials + labor from batch costing" value={`(${formatTZS(cogs)})`} tone="danger" />
            <tr className="border-t"><td className="py-3 font-bold">Gross Profit</td><td /><td className={`py-3 text-right font-bold ${grossProfit >= 0 ? "text-emerald-600" : "text-red-500"}`}>{formatTZS(grossProfit)}</td></tr>
            <PLRow label="Less: Operational Expenses" note="Labor, utilities, transport, maintenance" value={`(${formatTZS(opex)})`} tone="danger" />
            <tr className="border-t-2 border-foreground">
              <td className="py-4 font-black text-base">Net Profit</td>
              <td />
              <td className={`py-4 text-right font-black text-base ${netProfit >= 0 ? "text-emerald-600" : "text-red-500"}`}>{formatTZS(netProfit)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-5 grid grid-cols-3 gap-3 text-center">
          <Kpi label="Revenue" value={formatTZS(grossRevenue)} />
          <Kpi label="Net Margin" value={`${margin}%`} tone={netProfit >= 0 ? "success" : "danger"} />
          <Kpi label="OpEx Ratio" value={`${grossRevenue > 0 ? Math.round((opex / grossRevenue) * 100) : 0}%`} />
        </div>
      </div>

      <div className="bg-surface border rounded-2xl p-5">
        <h3 className="font-bold mb-3">Ledger Notes</h3>
        <ul className="text-xs text-muted-foreground space-y-2">
          <li>• Purchases move value from <b>Cash</b> to <b>Inventory</b> — Net Profit is unchanged.</li>
          <li>• Expenses reduce <b>Cash</b> and <b>Net Profit</b> immediately.</li>
          <li>• Wallet top-ups increase <b>Cash</b> and <b>Wallet Liabilities</b> equally.</li>
          <li>• Food orders convert <b>Liabilities</b> into <b>Revenue</b>.</li>
        </ul>
        <div className="mt-4 border-t pt-3 text-xs">
          <div className="flex justify-between"><span className="text-muted-foreground">Purchases recorded</span><span className="font-semibold">{purchases.length}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Expenses logged</span><span className="font-semibold">{expenses.length}</span></div>
        </div>
      </div>
    </div>
  );
}

function PLRow({ label, note, value, tone, bold }: { label: string; note: string; value: string; tone: "success" | "danger"; bold?: boolean }) {
  return (
    <tr>
      <td className={`py-2 ${bold ? "font-semibold" : ""}`}>{label}<div className="text-xs text-muted-foreground font-normal">{note}</div></td>
      <td />
      <td className={`py-2 text-right font-mono ${tone === "success" ? "text-emerald-600" : "text-red-500"}`}>{value}</td>
    </tr>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "success" | "danger" }) {
  const color = tone === "success" ? "text-emerald-600" : tone === "danger" ? "text-red-500" : "text-foreground";
  return (
    <div className="bg-muted rounded-xl p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-lg font-black mt-1 ${color}`}>{value}</div>
    </div>
  );
}
