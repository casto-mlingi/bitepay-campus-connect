import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, UserPlus, Wallet, ArrowUpCircle, X, QrCode, Printer, Users, TrendingUp, CheckCircle2, Phone, KeyRound, Hash, Inbox, Clock } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useStore, formatTZS, type Profile, type TopUpRequest } from "@/lib/store";
import { StaffShell } from "@/components/staff-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/customers")({
  component: Customers,
  head: () => ({ meta: [{ title: "Prepaid Customers — BitePay Staff" }, { name: "description", content: "Manage prepaid wallet customers, top-ups and scannable ID cards." }] }),
});

function Customers() {
  const { currentUser, profiles, transactions, addCustomer, staffTopUp, topUpRequests, rejectTopUpRequest, setStaffPin } = useStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showQR, setShowQR] = useState<Profile | null>(null);
  const [topupAmt, setTopupAmt] = useState<number>(10000);
  const [topupTender, setTopupTender] = useState<"cash" | "mobile">("cash");
  const [topupRef, setTopupRef] = useState("");
  const [pinPrompt, setPinPrompt] = useState<null | { title: string; onSubmit: (pin: string) => void }>(null);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!currentUser) navigate({ to: "/" });
    else if (currentUser.role !== "staff") navigate({ to: "/dashboard" });
  }, [currentUser, navigate]);

  const customers = useMemo(() => profiles.filter((p) => p.role === "customer"), [profiles]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => c.full_name.toLowerCase().includes(q) || c.phone.includes(q) || c.id.toLowerCase().includes(q));
  }, [customers, query]);

  const pendingRequests = useMemo(() => topUpRequests.filter((r) => r.status === "pending"), [topUpRequests]);

  const totalLiability = customers.reduce((s, c) => s + c.wallet_balance, 0);
  const activeToday = new Set(
    transactions.filter((t) => Date.now() - t.created_at < 24 * 3600 * 1000).map((t) => t.customer_id)
  ).size;

  const selected = customers.find((c) => c.id === selectedId) ?? null;
  const selectedTx = selected ? transactions.filter((t) => t.customer_id === selected.id).slice(0, 12) : [];

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2500); };

  const requestPin = (title: string, onSubmit: (pin: string) => void) => {
    if (!currentUser?.staff_pin) { setShowPinSetup(true); return; }
    setPinPrompt({ title, onSubmit });
  };

  const doTopUp = () => {
    if (!selected || topupAmt <= 0) return;
    if (topupTender === "mobile" && !topupRef.trim()) { showToast("Enter mobile payment reference"); return; }
    requestPin(`Confirm top-up of ${formatTZS(topupAmt)} for ${selected.full_name}`, (pin) => {
      const res = staffTopUp({ customerId: selected.id, amount: topupAmt, tender: topupTender, reference: topupRef.trim() || undefined, pin });
      if (!res.ok) { showToast(res.reason); return; }
      showToast(`Added ${formatTZS(topupAmt)} to ${selected.full_name}`);
      setTopupAmt(10000); setTopupRef(""); setPinPrompt(null);
    });
  };

  const approveRequest = (r: TopUpRequest) => {
    requestPin(`Approve ${formatTZS(r.amount)} for ${r.customer_name} (ref ${r.reference})`, (pin) => {
      const res = staffTopUp({ customerId: r.customer_id, amount: r.amount, tender: "mobile", reference: r.reference, pin, requestId: r.id });
      if (!res.ok) { showToast(res.reason); return; }
      showToast(`Approved ${formatTZS(r.amount)} for ${r.customer_name}`);
      setPinPrompt(null);
    });
  };

  if (!currentUser || currentUser.role !== "staff") return null;


  return (
    <StaffShell active="customers">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Prepaid Customers</h1>
          <p className="text-muted-foreground text-sm">Manage wallet balances, top-ups and scannable ID cards.</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="bg-primary text-primary-foreground">
          <UserPlus className="w-4 h-4 mr-2" /> Add Customer
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        <StatCard icon={<Users className="w-4 h-4" />} label="Prepaid users" value={String(customers.length)} tone="primary" />
        <StatCard icon={<Wallet className="w-4 h-4" />} label="Wallet liability" value={formatTZS(totalLiability)} tone="success" />
        <StatCard icon={<TrendingUp className="w-4 h-4" />} label="Active (24h)" value={String(activeToday)} tone="amber" />
      </div>

      {pendingRequests.length > 0 && (
        <section className="mb-5 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Inbox className="w-4 h-4 text-amber-700" />
            <h2 className="font-bold text-amber-900">Pending top-up requests</h2>
            <span className="ml-auto text-xs font-bold text-amber-700">{pendingRequests.length}</span>
          </div>
          <ul className="space-y-2">
            {pendingRequests.map((r) => (
              <li key={r.id} className="bg-white border border-amber-200 rounded-xl p-3 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[180px]">
                  <div className="font-semibold">{r.customer_name} <span className="text-xs text-muted-foreground font-normal">· {r.customer_phone}</span></div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                    <Clock className="w-3 h-3" /> {new Date(r.created_at).toLocaleString()}
                    <span className="inline-flex items-center gap-1"><Hash className="w-3 h-3" />{r.reference}</span>
                  </div>
                  {r.note && <div className="text-xs text-muted-foreground mt-1 italic">"{r.note}"</div>}
                </div>
                <div className="text-lg font-bold text-emerald-700">{formatTZS(r.amount)}</div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => approveRequest(r)}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    const reason = window.prompt("Reason for rejection?", "Reference not found");
                    if (reason) { rejectTopUpRequest(r.id, reason); showToast("Request rejected"); }
                  }}>Reject</Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}


      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5">
        <section className="bg-surface border rounded-2xl overflow-hidden">
          <div className="p-4 border-b flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, phone or ID" className="pl-9" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2">Customer</th>
                  <th className="text-left px-4 py-2 hidden sm:table-cell">Phone</th>
                  <th className="text-left px-4 py-2 hidden md:table-cell">ID</th>
                  <th className="text-right px-4 py-2">Balance</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-muted-foreground py-8">No customers match your search.</td></tr>
                )}
                {filtered.map((c) => {
                  const active = selectedId === c.id;
                  return (
                    <tr key={c.id} className={`border-t hover:bg-muted/40 cursor-pointer ${active ? "bg-primary/5" : ""}`} onClick={() => setSelectedId(c.id)}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary grid place-items-center font-semibold text-xs">
                            {c.full_name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                          </div>
                          <div>
                            <div className="font-semibold leading-tight">{c.full_name}</div>
                            <div className="text-xs text-muted-foreground sm:hidden">{c.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 hidden sm:table-cell text-muted-foreground">{c.phone}</td>
                      <td className="px-4 py-2.5 hidden md:table-cell font-mono text-xs text-muted-foreground">{c.id}</td>
                      <td className="px-4 py-2.5 text-right font-bold">{formatTZS(c.wallet_balance)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button onClick={(e) => { e.stopPropagation(); setShowQR(c); }} className="p-1.5 rounded-md hover:bg-muted" title="Show QR / barcode">
                          <QrCode className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="bg-surface border rounded-2xl p-5 h-fit lg:sticky lg:top-24">
          {!selected ? (
            <div className="text-center text-sm text-muted-foreground py-10">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
              Select a customer to top-up or view history.
            </div>
          ) : (
            <>
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary grid place-items-center font-bold">
                  {selected.full_name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{selected.full_name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{selected.phone}</div>
                </div>
                <button onClick={() => setShowQR(selected)} className="p-2 rounded-lg bg-muted hover:bg-muted/70" title="Print ID card"><QrCode className="w-4 h-4" /></button>
              </div>

              <div className="mt-4 rounded-xl bg-gradient-to-br from-success to-emerald-600 text-white p-4">
                <div className="text-xs opacity-80 flex items-center gap-1"><Wallet className="w-3.5 h-3.5" /> Wallet balance</div>
                <div className="text-2xl font-extrabold mt-1">{formatTZS(selected.wallet_balance)}</div>
              </div>

              <div className="mt-4 border rounded-xl p-3">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center justify-between">
                  <span>Top-up wallet</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary"><KeyRound className="w-3 h-3" /> PIN required</span>
                </div>
                <div className="flex gap-1 mb-2">
                  <button onClick={() => setTopupTender("cash")} className={`flex-1 py-1.5 rounded-md text-xs font-semibold border ${topupTender === "cash" ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-transparent"}`}>Cash</button>
                  <button onClick={() => setTopupTender("mobile")} className={`flex-1 py-1.5 rounded-md text-xs font-semibold border ${topupTender === "mobile" ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-transparent"}`}>Mobile Money</button>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center border rounded-lg px-3">
                    <span className="text-xs text-muted-foreground mr-2">TZS</span>
                    <input type="number" value={topupAmt || ""} onChange={(e) => setTopupAmt(Number(e.target.value) || 0)}
                      className="flex-1 py-2 bg-transparent outline-none font-semibold text-sm" />
                  </div>
                  <Button onClick={doTopUp} disabled={topupAmt <= 0}>
                    <ArrowUpCircle className="w-4 h-4 mr-1.5" /> Top-Up
                  </Button>
                </div>
                {topupTender === "mobile" && (
                  <div className="mt-2 flex items-center border rounded-lg px-3">
                    <Hash className="w-3.5 h-3.5 text-muted-foreground mr-1" />
                    <input value={topupRef} onChange={(e) => setTopupRef(e.target.value.toUpperCase())} placeholder="Payment reference"
                      className="flex-1 py-2 bg-transparent outline-none text-sm" />
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[5000, 10000, 20000, 50000].map((v) => (
                    <button key={v} onClick={() => setTopupAmt(v)} className="px-2.5 py-1 rounded-md bg-muted text-xs font-semibold hover:bg-muted/70">
                      +{formatTZS(v)}
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowPinSetup(true)} className="mt-2 text-[11px] text-muted-foreground hover:text-primary underline">
                  {currentUser.staff_pin ? "Change my staff PIN" : "Set my staff PIN"}
                </button>
              </div>


              <div className="mt-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Recent activity</div>
                {selectedTx.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-4 text-center">No transactions yet.</div>
                ) : (
                  <ul className="space-y-1.5 max-h-64 overflow-y-auto">
                    {selectedTx.map((t) => (
                      <li key={t.id} className="flex items-center justify-between text-sm gap-2">
                        <div className="min-w-0">
                          <div className="truncate">{t.description}</div>
                          <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</div>
                        </div>
                        <div className={`font-bold text-sm shrink-0 ${t.type === "topup" ? "text-success" : "text-destructive"}`}>
                          {t.type === "topup" ? "+" : "−"}{formatTZS(t.amount)}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </aside>
      </div>

      {showAdd && (
        <AddCustomerModal
          onClose={() => setShowAdd(false)}
          onCreate={(name, phone, bal) => {
            const u = addCustomer({ full_name: name, phone, initial_balance: bal });
            if (!u) { showToast("Phone already registered"); return; }
            setShowAdd(false);
            setSelectedId(u.id);
            showToast(`Added ${u.full_name}`);
          }}
        />
      )}

      {showQR && <IDCardModal customer={showQR} onClose={() => setShowQR(null)} />}

      {pinPrompt && (
        <PinModal
          title={pinPrompt.title}
          onClose={() => setPinPrompt(null)}
          onSubmit={(pin) => pinPrompt.onSubmit(pin)}
        />
      )}

      {showPinSetup && (
        <PinSetupModal
          hasPin={!!currentUser.staff_pin}
          onClose={() => setShowPinSetup(false)}
          onSave={(cur, next) => {
            const res = setStaffPin(cur || null, next);
            if (!res.ok) { showToast(res.reason); return; }
            showToast("Staff PIN updated");
            setShowPinSetup(false);
          }}
        />
      )}


      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-sm font-medium">
          <CheckCircle2 className="w-4 h-4 text-success" /> {toast}
        </div>
      )}
    </StaffShell>
  );
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "primary" | "success" | "amber" }) {
  const bg = tone === "primary" ? "bg-primary/10 text-primary" : tone === "success" ? "bg-success/10 text-success" : "bg-amber-500/10 text-amber-600";
  return (
    <div className="bg-surface border rounded-2xl p-4">
      <div className={`w-8 h-8 rounded-lg grid place-items-center ${bg}`}>{icon}</div>
      <div className="mt-2 text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}

function AddCustomerModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, phone: string, bal: number) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bal, setBal] = useState<number>(0);
  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-background rounded-2xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg">Add Prepaid Customer</h3>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <label className="block">
            <span className="text-xs text-muted-foreground">Full name</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. John Mwangi" className="mt-1" />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">Phone (used for login & lookup)</span>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712345678" className="mt-1" />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">Opening balance (TZS, optional)</span>
            <Input type="number" value={bal || ""} onChange={(e) => setBal(Number(e.target.value) || 0)} placeholder="0" className="mt-1" />
          </label>
          <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-2">
            Default password is the last 4 digits of the phone number.
          </div>
        </div>
        <div className="mt-4 flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onCreate(name, phone, bal)} disabled={!name.trim() || !phone.trim()}>Create Customer</Button>
        </div>
      </div>
    </div>
  );
}

function IDCardModal({ customer, onClose }: { customer: Profile; onClose: () => void }) {
  const printCard = () => {
    const w = window.open("", "_blank", "width=420,height=560");
    if (!w) return;
    const svg = document.getElementById(`qr-${customer.id}`)?.outerHTML ?? "";
    w.document.write(`<!doctype html><html><head><title>ID ${customer.id}</title>
      <style>body{font-family:ui-sans-serif,system-ui;padding:24px;text-align:center;}
      .card{border:2px dashed #ea580c;border-radius:16px;padding:20px;max-width:320px;margin:auto;}
      h2{margin:8px 0 2px;} .muted{color:#666;font-size:12px;} .id{font-family:ui-monospace;background:#f4f4f5;padding:4px 8px;border-radius:6px;display:inline-block;margin-top:6px;}
      @media print { @page { margin: 8mm; } }
      </style></head><body><div class="card">
      <div style="font-weight:800;color:#ea580c">BitePay Prepaid</div>
      <h2>${customer.full_name}</h2>
      <div class="muted">${customer.phone}</div>
      <div style="margin:14px auto;">${svg}</div>
      <div class="id">${customer.id}</div>
      <div class="muted" style="margin-top:8px">Scan at any BitePay POS</div>
      </div></body></html>`);
    w.document.close(); w.focus();
    setTimeout(() => w.print(), 250);
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-background rounded-2xl w-full max-w-sm p-5 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">ID Card</h3>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded"><X className="w-4 h-4" /></button>
        </div>
        <div className="border-2 border-dashed border-primary rounded-2xl p-5">
          <div className="text-xs font-bold text-primary uppercase tracking-wider">BitePay Prepaid</div>
          <div className="mt-2 font-bold text-lg">{customer.full_name}</div>
          <div className="text-xs text-muted-foreground">{customer.phone}</div>
          <div className="mt-4 grid place-items-center">
            <QRCodeSVG id={`qr-${customer.id}`} value={customer.id} size={160} level="M" />
          </div>
          <div className="mt-3 inline-block font-mono text-xs bg-muted px-2 py-1 rounded">{customer.id}</div>
          <div className="text-xs text-muted-foreground mt-2">Scan at any BitePay POS</div>
        </div>
        <Button onClick={printCard} className="w-full mt-4"><Printer className="w-4 h-4 mr-2" /> Print ID Card</Button>
      </div>
    </div>
  );
}
