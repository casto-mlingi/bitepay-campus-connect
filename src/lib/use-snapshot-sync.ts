/**
 * Offline-first snapshot sync with automatic merging.
 *
 * - Every state change is mirrored to localStorage immediately (works offline).
 * - When online, the snapshot is pushed to Postgres almost immediately.
 * - On boot (and on manual pull) the remote snapshot is fetched.
 * - When this device and the database both changed, the two snapshots are
 *   merged record-by-record (see `mergeSnapshots`) and the result is published.
 *   The user is never asked to choose a winner and nothing is discarded, so the
 *   same device can be shared by many owners without any prompts.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { pushSnapshot, pullSnapshot } from "@/lib/sync.functions";
import { mergeSnapshots } from "@/lib/snapshot-merge";

export const SNAPSHOT_KEY = "bitepay.snapshot.v1";
const DIRTY_KEY = `${SNAPSHOT_KEY}.dirty`;
/** Revision the local snapshot was last known to agree with the server on. */
const BASE_KEY = `${SNAPSHOT_KEY}.base`;
export const DB_PROFILE_KEY = "bitepay.active_db_profile";
export type DbProfileId = "memory" | "postgres";

export function activeDbProfile(): DbProfileId {
  if (typeof window === "undefined") return "postgres";
  return (localStorage.getItem(DB_PROFILE_KEY) as DbProfileId) || "postgres";
}

export type SyncStatus = "idle" | "pulling" | "pushing" | "merging" | "synced" | "offline" | "error";

export type SyncState = {
  status: SyncStatus;
  revision: number;
  lastSyncedAt: number | null;
  pendingPush: boolean;
  error: string | null;
  /** Kept for API compatibility — conflicts are merged automatically now. */
  conflict: null;
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
    conflict: null,
  });
  const revisionRef = useRef(0);
  const dirtyRef = useRef(false);
  const applyRef = useRef(apply);
  applyRef.current = apply;
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressRef = useRef(false);
  const busyRef = useRef(false);

  const markClean = useCallback((rev: number) => {
    revisionRef.current = rev;
    dirtyRef.current = false;
    try {
      localStorage.setItem(`${SNAPSHOT_KEY}.rev`, String(rev));
      localStorage.setItem(BASE_KEY, String(rev));
      localStorage.setItem(DIRTY_KEY, "0");
    } catch { /* ignore */ }
  }, []);

  /** Adopt a payload as the new local truth without re-triggering a push. */
  const adopt = useCallback((payload: string, revision: number) => {
    suppressRef.current = true;
    applyRef.current(JSON.parse(payload) as T);
    try { localStorage.setItem(SNAPSHOT_KEY, payload); } catch { /* ignore */ }
    markClean(revision);
  }, [markClean]);

  /** Merge the remote payload with local edits, adopt it and publish the result. */
  const mergeAndPublish = useCallback(async (remotePayload: string, remoteRevision: number) => {
    setState((s) => ({ ...s, status: "merging" }));
    let merged: T;
    try {
      merged = mergeSnapshots(snapshotRef.current, JSON.parse(remotePayload) as T);
    } catch {
      merged = snapshotRef.current;
    }
    const payload = JSON.stringify(merged);
    const revision = remoteRevision + 1;
    suppressRef.current = true;
    applyRef.current(merged);
    try { localStorage.setItem(SNAPSHOT_KEY, payload); } catch { /* ignore */ }
    try {
      const res = await pushSnapshot({ data: { key, revision, payload } });
      if (res.ok) {
        markClean(res.revision ?? revision);
        setState((s) => ({ ...s, status: "synced", pendingPush: false, revision: revisionRef.current, lastSyncedAt: Date.now(), error: null }));
        return;
      }
    } catch (err) {
      setState((s) => ({ ...s, status: "error", pendingPush: true, error: err instanceof Error ? err.message : String(err) }));
      return;
    }
    // Someone published again mid-merge — the next tick will merge that too.
    revisionRef.current = revision;
    dirtyRef.current = true;
    setState((s) => ({ ...s, status: "pushing", pendingPush: true, revision }));
  }, [key, markClean]);

  const remotePull = useCallback(async (force = false) => {
    if (activeDbProfile() !== "postgres") return;
    if (busyRef.current) return;
    busyRef.current = true;
    setState((s) => ({ ...s, status: "pulling", error: null }));
    try {
      const res = await pullSnapshot({ data: { key } });
      if (res.found && (force || res.revision > revisionRef.current)) {
        if (dirtyRef.current && !force) {
          await mergeAndPublish(res.payload, res.revision);
          return;
        }
        adopt(res.payload, res.revision);
      }
      setState((s) => ({
        ...s,
        status: "synced",
        pendingPush: dirtyRef.current,
        revision: revisionRef.current,
        lastSyncedAt: Date.now(),
      }));
    } catch (err) {
      setState((s) => ({ ...s, status: "error", error: err instanceof Error ? err.message : String(err) }));
    } finally {
      busyRef.current = false;
    }
  }, [key, adopt, mergeAndPublish]);

  const remotePush = useCallback(async () => {
    if (activeDbProfile() !== "postgres") return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setState((s) => ({ ...s, status: "offline", pendingPush: true }));
      return;
    }
    if (busyRef.current) return;
    busyRef.current = true;
    setState((s) => ({ ...s, status: "pushing", error: null }));
    try {
      const payload = JSON.stringify(snapshotRef.current);
      const revision = revisionRef.current;
      const res = await pushSnapshot({ data: { key, revision, payload } });
      if (!res.ok && res.stale) {
        // The server holds a newer snapshot — merge both sides, then republish.
        const remote = await pullSnapshot({ data: { key } });
        if (remote.found) await mergeAndPublish(remote.payload, remote.revision);
        return;
      }
      markClean(res.revision ?? revision);
      setState((s) => ({ ...s, status: "synced", pendingPush: false, revision: revisionRef.current, lastSyncedAt: Date.now() }));
    } catch (err) {
      setState((s) => ({ ...s, status: "error", pendingPush: true, error: err instanceof Error ? err.message : String(err) }));
    } finally {
      busyRef.current = false;
    }
  }, [key, markClean, mergeAndPublish]);

  /** Retained for API compatibility: merging happens automatically. */
  const resolveConflict = useCallback(async (_choice: "local" | "remote") => {
    await remotePull(false);
  }, [remotePull]);

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
      dirtyRef.current = localStorage.getItem(DIRTY_KEY) === "1";
    } catch {
      /* corrupt snapshot — start fresh */
    }
    setHydrated(true);
    setState((s) => ({ ...s, revision: revisionRef.current, pendingPush: dirtyRef.current }));
    // No unpushed local edits → the database is the source of truth.
    void remotePull(!dirtyRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist locally on every change + push almost immediately.
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    if (suppressRef.current) {
      suppressRef.current = false;
      return;
    }
    revisionRef.current += 1;
    const rev = revisionRef.current;
    dirtyRef.current = true;
    try {
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
      localStorage.setItem(`${SNAPSHOT_KEY}.rev`, String(rev));
      localStorage.setItem(DIRTY_KEY, "1");
    } catch {
      /* quota exceeded — remote push still carries the data */
    }
    setState((s) => ({ ...s, revision: rev, pendingPush: true }));
    // The 250ms window only coalesces the burst of updates a single user
    // action produces, so every data injection lands in Postgres right away.
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { void remotePush(); }, 250);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [snapshot, hydrated, remotePush]);

  // Flush the queue as soon as connectivity returns.
  useEffect(() => {
    if (isOnline && hydrated && state.pendingPush) void remotePush();
    if (!isOnline) setState((s) => ({ ...s, status: "offline" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, hydrated]);

  // Keep dashboards live: poll for newer revisions and retry queued uploads.
  const pendingRef = useRef(state.pendingPush);
  pendingRef.current = state.pendingPush;
  useEffect(() => {
    if (!hydrated) return;
    const id = setInterval(() => {
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      if (pendingRef.current) { void remotePush(); return; }
      void remotePull(false);
    }, 5000);
    return () => clearInterval(id);
  }, [hydrated, remotePull, remotePush]);

  // Refresh when the tab regains focus / becomes visible; flush before it hides.
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    const refresh = () => {
      if (pendingRef.current) void remotePush(); else void remotePull(false);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
      else if (pendingRef.current) void remotePush();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onVisibility);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onVisibility);
    };
  }, [hydrated, remotePull, remotePush]);

  return useMemo(() => ({
    ...state,
    hydrated,
    pushNow: () => remotePush(),
    pullNow: () => remotePull(true),
    resolveConflict,
  }), [state, hydrated, remotePush, remotePull, resolveConflict]);
}
