/**
 * Offline-first snapshot sync.
 *
 * - Every state change is mirrored to localStorage immediately (works offline).
 * - When online, the snapshot is debounce-pushed to Postgres.
 * - On boot (and on manual pull) the remote snapshot is fetched; the higher
 *   revision wins.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { pushSnapshot, pullSnapshot } from "@/lib/sync.functions";

export const SNAPSHOT_KEY = "bitepay.snapshot.v1";
export const DB_PROFILE_KEY = "bitepay.active_db_profile";
export type DbProfileId = "memory" | "postgres";

export function activeDbProfile(): DbProfileId {
  if (typeof window === "undefined") return "postgres";
  return (localStorage.getItem(DB_PROFILE_KEY) as DbProfileId) || "postgres";
}

export type SyncStatus = "idle" | "pulling" | "pushing" | "synced" | "offline" | "error";
export type SyncState = {
  status: SyncStatus;
  revision: number;
  lastSyncedAt: number | null;
  pendingPush: boolean;
  error: string | null;
};

type Options<T> = {
  /** Serializable snapshot of everything we want to persist. */
  snapshot: T;
  /** Applies a snapshot coming from localStorage or the remote database. */
  apply: (snapshot: T) => void;
  /** Sync key (one row per deployment). */
  key?: string;
  isOnline: boolean;
};

export function useSnapshotSync<T>({ snapshot, apply, key = "global", isOnline }: Options<T>) {
  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState<SyncState>({
    status: "idle",
    revision: 0,
    lastSyncedAt: null,
    pendingPush: false,
    error: null,
  });
  const revisionRef = useRef(0);
  const applyRef = useRef(apply);
  applyRef.current = apply;
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressRef = useRef(false);

  const remotePull = useCallback(async (force = false) => {
    if (activeDbProfile() !== "postgres") return;
    setState((s) => ({ ...s, status: "pulling", error: null }));
    try {
      const res = await pullSnapshot({ data: { key } });
      if (res.found && (force || res.revision > revisionRef.current)) {
        suppressRef.current = true;
        revisionRef.current = res.revision;
        applyRef.current(JSON.parse(res.payload) as T);
        localStorage.setItem(SNAPSHOT_KEY, res.payload);
      }
      setState((s) => ({
        ...s,
        status: "synced",
        revision: revisionRef.current,
        lastSyncedAt: Date.now(),
      }));
    } catch (err) {
      setState((s) => ({ ...s, status: "error", error: err instanceof Error ? err.message : String(err) }));
    }
  }, [key]);

  const remotePush = useCallback(async () => {
    if (activeDbProfile() !== "postgres") return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setState((s) => ({ ...s, status: "offline", pendingPush: true }));
      return;
    }
    setState((s) => ({ ...s, status: "pushing", error: null }));
    try {
      const payload = JSON.stringify(snapshotRef.current);
      const res = await pushSnapshot({ data: { key, revision: revisionRef.current, payload } });
      if (!res.ok && res.stale) {
        await remotePull(true);
        return;
      }
      setState((s) => ({ ...s, status: "synced", pendingPush: false, revision: revisionRef.current, lastSyncedAt: Date.now() }));
    } catch (err) {
      setState((s) => ({ ...s, status: "error", pendingPush: true, error: err instanceof Error ? err.message : String(err) }));
    }
  }, [key, remotePull]);

  // Boot: local first (instant + offline safe), then remote.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(SNAPSHOT_KEY);
      if (raw) {
        suppressRef.current = true;
        applyRef.current(JSON.parse(raw) as T);
      }
      revisionRef.current = Number(localStorage.getItem(`${SNAPSHOT_KEY}.rev`) ?? 0);
    } catch {
      /* corrupt snapshot — start fresh */
    }
    setHydrated(true);
    void remotePull();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist locally on every change + debounce a remote push.
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    if (suppressRef.current) {
      suppressRef.current = false;
      return;
    }
    revisionRef.current += 1;
    const rev = revisionRef.current;
    try {
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
      localStorage.setItem(`${SNAPSHOT_KEY}.rev`, String(rev));
    } catch {
      /* quota exceeded — remote push still carries the data */
    }
    setState((s) => ({ ...s, revision: rev, pendingPush: true }));
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { void remotePush(); }, 1200);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [snapshot, hydrated, remotePush]);

  // Flush the queue as soon as connectivity returns.
  useEffect(() => {
    if (isOnline && hydrated && state.pendingPush) void remotePush();
    if (!isOnline) setState((s) => ({ ...s, status: "offline" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, hydrated]);

  return {
    ...state,
    hydrated,
    pushNow: remotePush,
    pullNow: () => remotePull(true),
  };
}
