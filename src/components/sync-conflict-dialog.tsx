import { useMemo, useState } from "react";
import { AlertTriangle, Cloud, Laptop, Loader2, ChevronDown } from "lucide-react";
import { useStore } from "@/lib/store";
import type { SnapshotConflict } from "@/lib/use-snapshot-sync";

/** Human labels for the snapshot slices we compare. */
const LABELS: Record<string, string> = {
  stores: "Canteens",
  profiles: "People",
  products: "Menu items",
  orders: "Orders",
  transactions: "Transactions",
  rawMaterials: "Raw materials",
  batches: "Cooking batches",
  wastage: "Wastage logs",
  purchases: "Purchases",
  expenses: "Expenses",
  shifts: "Shifts",
  pendingSales: "Queued sales",
  topUpRequests: "Top-up requests",
  customDishRequests: "Custom dish requests",
  notifications: "Notifications",
  tickets: "Support tickets",
  smsLogs: "Message logs",
};

type Row = { key: string; label: string; mine: number; theirs: number };

function countRows(payload: string): Record<string, number> {
  try {
    const obj = JSON.parse(payload) as Record<string, unknown>;
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(obj)) if (Array.isArray(v)) out[k] = v.length;
    return out;
  } catch {
    return {};
  }
}

function buildRows(c: SnapshotConflict): Row[] {
  const mine = countRows(c.localPayload);
  const theirs = countRows(c.remotePayload);
  const keys = Array.from(new Set([...Object.keys(mine), ...Object.keys(theirs)]));
  return keys
    .map((key) => ({ key, label: LABELS[key] ?? key, mine: mine[key] ?? 0, theirs: theirs[key] ?? 0 }))
    .sort((a, b) => {
      const da = a.mine !== a.theirs ? 0 : 1;
      const db = b.mine !== b.theirs ? 0 : 1;
      return da - db || a.label.localeCompare(b.label);
    });
}

/**
 * Shown whenever the sync engine detects that this device and the database
 * both changed since they last agreed. Nothing is overwritten until the user
 * picks a winner here.
 */
export function SyncConflictDialog() {
  const { sync } = useStore();
  const conflict = sync.conflict;
  const [busy, setBusy] = useState<"local" | "remote" | null>(null);
  const [showAll, setShowAll] = useState(false);

  const rows = useMemo(() => (conflict ? buildRows(conflict) : []), [conflict]);
  if (!conflict) return null;

  const differing = rows.filter((r) => r.mine !== r.theirs);
  const visible = showAll ? rows : differing.length ? differing : rows.slice(0, 5);

  const choose = async (choice: "local" | "remote") => {
    setBusy(choice);
    try { await sync.resolveConflict(choice); } finally { setBusy(null); }
  };

  const sizeKb = (s: string) => `${Math.max(1, Math.round(s.length / 1024))} KB`;

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm grid place-items-center p-4 overflow-y-auto">
      <div className="bg-surface w-full max-w-2xl rounded-2xl border shadow-xl my-6">
        <div className="p-5 border-b flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 grid place-items-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-lg leading-tight">Sync conflict — choose which version to keep</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              This device and the database both changed since they last agreed. Nothing has been
              overwritten. Review the differences and pick the version to keep.
            </p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <VersionCard
              icon={<Laptop className="w-4 h-4" />}
              title="This device"
              tone="border-primary/40 bg-primary/5"
              lines={[
                `Revision ${conflict.localRevision}`,
                `Edited ${new Date(conflict.detectedAt).toLocaleTimeString()}`,
                sizeKb(conflict.localPayload),
              ]}
            />
            <VersionCard
              icon={<Cloud className="w-4 h-4" />}
              title="Database (Contabo)"
              tone="border-emerald-500/40 bg-emerald-50"
              lines={[
                `Revision ${conflict.remoteRevision}`,
                conflict.remoteUpdatedAt ? `Saved ${new Date(conflict.remoteUpdatedAt).toLocaleString()}` : "Saved by another device",
                sizeKb(conflict.remotePayload),
              ]}
            />
          </div>

          <div className="rounded-xl border overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-2 bg-muted text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <span>Records</span><span className="w-16 text-right">This device</span><span className="w-16 text-right">Database</span>
            </div>
            <div className="max-h-64 overflow-y-auto divide-y">
              {visible.length === 0 && (
                <div className="px-3 py-4 text-sm text-muted-foreground">Record counts match — the versions differ only in details.</div>
              )}
              {visible.map((r) => {
                const diff = r.mine !== r.theirs;
                return (
                  <div key={r.key} className={`grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-2 text-sm ${diff ? "bg-amber-50/60" : ""}`}>
                    <span className="truncate">{r.label}</span>
                    <span className={`w-16 text-right tabular-nums font-semibold ${diff && r.mine > r.theirs ? "text-primary" : ""}`}>{r.mine}</span>
                    <span className={`w-16 text-right tabular-nums font-semibold ${diff && r.theirs > r.mine ? "text-emerald-700" : ""}`}>{r.theirs}</span>
                  </div>
                );
              })}
            </div>
            {rows.length > visible.length || showAll ? (
              <button onClick={() => setShowAll((v) => !v)} className="w-full py-2 text-xs font-semibold text-muted-foreground hover:bg-muted inline-flex items-center justify-center gap-1 border-t">
                {showAll ? "Show only differences" : `Show all ${rows.length} record types`}
                <ChevronDown className={`w-3.5 h-3.5 transition ${showAll ? "rotate-180" : ""}`} />
              </button>
            ) : null}
          </div>

          <p className="text-xs text-muted-foreground">
            Keeping one version discards the other — the losing changes are not merged. If both sides
            hold work you need, keep the database version, then re-enter the missing records here.
          </p>
        </div>

        <div className="p-5 border-t flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => void choose("local")}
            disabled={busy !== null}
            className="flex-1 h-11 rounded-xl bg-primary text-white font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {busy === "local" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Laptop className="w-4 h-4" />}
            Keep this device&apos;s version
          </button>
          <button
            onClick={() => void choose("remote")}
            disabled={busy !== null}
            className="flex-1 h-11 rounded-xl border font-semibold inline-flex items-center justify-center gap-2 hover:bg-muted disabled:opacity-60"
          >
            {busy === "remote" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
            Keep the database version
          </button>
        </div>
      </div>
    </div>
  );
}

function VersionCard({ icon, title, lines, tone }: { icon: React.ReactNode; title: string; lines: string[]; tone: string }) {
  return (
    <div className={`rounded-xl border p-3 ${tone}`}>
      <div className="flex items-center gap-1.5 font-semibold text-sm">{icon}{title}</div>
      <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
        {lines.map((l) => <li key={l}>{l}</li>)}
      </ul>
    </div>
  );
}
