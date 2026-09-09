import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Grid2X2, Trash2, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { StaffShell } from "@/components/staff-shell";
import { AccessDenied } from "@/components/access-denied";

export const Route = createFileRoute("/tables")({
  component: TablesPage,
  head: () => ({ meta: [
    { title: "Tables & sections — BitePay Staff" },
    { name: "description", content: "Assign waiters to tables and sections so every order is credited to the right person." },
    { property: "og:title", content: "Tables & sections — BitePay Staff" },
    { property: "og:description", content: "Assign waiters to tables and sections for accurate commission attribution." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function TablesPage() {
  const { currentUser, can, profiles, tableAssignments, assignTable, removeTableAssignment, waiterTablesEnabled } = useStore();
  const navigate = useNavigate();
  const [section, setSection] = useState("Main hall");
  const [tableNo, setTableNo] = useState("");
  const [waiterId, setWaiterId] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!currentUser) navigate({ to: "/" });
    else if (currentUser.role !== "staff") navigate({ to: "/dashboard" });
  }, [currentUser, navigate]);

  if (!currentUser || currentUser.role !== "staff") return null;
  if (!can("team.view")) return <StaffShell><AccessDenied feature="Tables & sections" /></StaffShell>;

  const waiters = profiles.filter((p) => p.role === "staff" && (p.staff_role === "waiter" || p.staff_role === "cashier"));
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2600); };
  const grouped = Object.entries(
    tableAssignments.reduce<Record<string, typeof tableAssignments>>((acc, t) => {
      (acc[t.section] ||= []).push(t);
      return acc;
    }, {}),
  );

  return (
    <StaffShell active="tables">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2"><Grid2X2 className="w-7 h-7 text-primary" /> Tables &amp; sections</h1>
        <p className="text-muted-foreground text-sm">Each sale rung up for a table is credited to that table's waiter.</p>
      </div>

      {!waiterTablesEnabled && (
        <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 text-sm px-4 py-3">
          Table attribution is switched off. Turn on <b>Waiter tables &amp; sections</b> in Settings for these assignments to count.
        </div>
      )}

      <section className="bg-surface border rounded-2xl p-4 mb-6 flex flex-wrap items-end gap-3">
        <label className="text-xs font-semibold text-muted-foreground">
          Section
          <input value={section} onChange={(e) => setSection(e.target.value)} placeholder="Main hall"
            className="mt-1 block h-10 w-40 rounded-xl border bg-background px-3 text-sm text-foreground" />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Table
          <input value={tableNo} onChange={(e) => setTableNo(e.target.value)} placeholder="T1"
            className="mt-1 block h-10 w-28 rounded-xl border bg-background px-3 text-sm text-foreground" />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Waiter
          <select value={waiterId} onChange={(e) => setWaiterId(e.target.value)}
            className="mt-1 block h-10 w-52 rounded-xl border bg-background px-3 text-sm text-foreground">
            <option value="">Choose a member…</option>
            {waiters.map((w) => <option key={w.id} value={w.id}>{w.full_name} · {w.staff_role}</option>)}
          </select>
        </label>
        <button
          onClick={() => {
            const res = assignTable({ section: section.trim(), table_no: tableNo.trim(), waiter_id: waiterId });
            flash(res.ok ? `Table ${tableNo} assigned` : res.reason);
            if (res.ok) setTableNo("");
          }}
          disabled={!tableNo.trim() || !waiterId}
          className="h-10 px-4 rounded-xl bg-primary text-white text-sm font-bold inline-flex items-center gap-1 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Assign
        </button>
      </section>

      {grouped.length === 0 && (
        <div className="bg-surface border rounded-2xl p-10 text-center text-sm text-muted-foreground">No tables assigned yet.</div>
      )}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {grouped.map(([sec, items]) => (
          <div key={sec} className="bg-surface border rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b font-bold">{sec}</div>
            <ul className="divide-y">
              {items.map((t) => (
                <li key={t.id} className="px-4 py-3 flex items-center justify-between gap-2 text-sm">
                  <div>
                    <div className="font-semibold">Table {t.table_no}</div>
                    <div className="text-xs text-muted-foreground">{t.waiter_name}</div>
                  </div>
                  <button onClick={() => { const r = removeTableAssignment(t.id); flash(r.ok ? "Assignment removed" : r.reason); }}
                    className="p-2 rounded-lg hover:bg-rose-50 text-rose-600" title="Remove">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background px-4 py-2.5 rounded-xl shadow-xl text-sm">{toast}</div>}
    </StaffShell>
  );
}
