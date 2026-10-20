import { RefreshCw, Cloud, CloudOff, AlertTriangle, GitMerge, CheckCircle2 } from "lucide-react";
import { useStore } from "@/lib/store";

/**
 * Compact live-sync indicator: shows whether the local view matches the
 * Contabo Postgres snapshot, and lets the user force a refresh.
 */
export function SyncPill({ className = "" }: { className?: string }) {
  const { sync } = useStore();
  const merging = sync.status === "merging";
  const busy = sync.status === "pulling" || sync.status === "pushing" || merging;

  // Data is always saved on the phone first, so a failed upload is shown as
  // "Saved on phone" (retrying automatically) rather than a red error.
  const tone = sync.status === "error" || sync.status === "offline"
    ? "bg-amber-100 text-amber-700"
    : busy || sync.pendingPush
      ? "bg-slate-100 text-slate-600"
      : "bg-emerald-100 text-emerald-700";

  const label = sync.status === "error" ? "Saved on phone"
    : sync.status === "offline" ? "Offline"
      : merging ? "Merging…"
        : busy ? "Syncing…"
          : sync.pendingPush ? "Pending"
            : sync.lastSyncedAt ? `Synced ${new Date(sync.lastSyncedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Synced";

  const Icon = merging ? GitMerge : sync.status === "error" ? AlertTriangle : sync.status === "offline" ? CloudOff : (!busy && !sync.pendingPush) ? CheckCircle2 : Cloud;

  return (
    <button
      type="button"
      onClick={() => void sync.pullNow()}
      title={sync.error ?? "Refresh data from the database"}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 h-8 text-[11px] font-semibold ${tone} ${className}`}
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="max-[360px]:hidden">{label}</span>
      <RefreshCw className={`w-3 h-3 ${busy ? "animate-spin" : ""}`} />
    </button>
  );
}


