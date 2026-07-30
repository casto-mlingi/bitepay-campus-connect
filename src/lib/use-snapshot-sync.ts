/**
 * Offline-first snapshot sync with explicit conflict resolution.
 *
 * - Every state change is mirrored to localStorage immediately (works offline).
 * - When online, the snapshot is pushed to Postgres almost immediately.
 * - On boot (and on manual pull) the remote snapshot is fetched.
 * - Last-write-wins is only applied when it is SAFE (one side has no unsynced
 *   edits). When both sides changed, the sync engine stops, raises a
 *   `conflict` and lets the user review and pick a winner.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { pushSnapshot, pullSnapshot } from "@/lib/sync.functions";

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

export type SyncStatus = "idle" | "pulling" | "pushing" | "synced" | "offline" | "error" | "conflict";

/** A detected last-write-wins collision awaiting a human decision. */
export type SnapshotConflict = {
  detectedAt: number;
  localRevision: number;
  remoteRevision: number;
  localPayload: string;
  remotePayload: string;
  remoteUpdatedAt: string | null;
};

export type SyncState = {
  status: SyncStatus;
  revision: number;
  lastSyncedAt: number | null;
  pendingPush: boolean;
  error: string | null;
  conflict: SnapshotConflict | null;
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
  const baseRef = useRef(0);
  const dirtyRef = useRef(false);
  const conflictRef = useRef<SnapshotConflict | null>(null);
  const applyRef = useRef(apply);
  applyRef.current = apply;
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressRef = useRef(false);

  const markClean = useCallback((rev: number) => {
    revisionRef.current = rev;
    baseRef.current = rev;
    dirtyRef.current = false;
    try {
      localStorage.setItem(`${SNAPSHOT_KEY}.rev`, String(rev));
      localStorage.setItem(BASE_KEY, String(rev));
      localStorage.setItem(DIRTY_KEY, "0");
    } catch { /* ignore */ }
  }, []);

  const raiseConflict = useCallback((c: SnapshotConflict) => {
    conflictRef.current = c;
    setState((s) => ({ ...s, status: "conflict", conflict: c, pendingPush: true }));
  }, []);

  /** Adopt a remote payload as the new local truth. */
  const adoptRemote = useCallback((payload: string, revision: number) => {
    suppressRef.current = true;
    applyRef.current(JSON.parse(payload) as T);
    try { localStorage.setItem(SNAPSHOT_KEY, payload); } catch { /* ignore */ }
    markClean(revision);
  }, [markClean]);

  const remotePull = useCallback(async (force = false) => {
    if (activeDbProfile() !== "postgres") return;
    if (conflictRef.current && !force) return; // wait for the human decision
    setState((s) => ({ ...s, status: "pulling", error: null }));
    try {
      const res = await pullSnapshot({ data: { key } });
      if (res.found && res.revision > revisionRef.current) {
        if (dirtyRef.current && !force) {
          // Both sides moved since the last agreed revision → collision.
          raiseConflict({
            detectedAt: Date.now(),
            localRevision: revisionRef.current,
            remoteRevision: res.revision,
            localPayload: JSON.stringify(snapshotRef.current),
            remotePayload: res.payload,
            remoteUpdatedAt: res.updated_at,
          });
          return;
        }
        adoptRemote(res.payload, res.revision);
      } else if (res.found && force) {
        adoptRemote(res.payload, res.revision);
      }
      setState((s) => ({
        ...s,
        status: "synced",
        conflict: null,
        pendingPush: dirtyRef.current,
        revision: revisionRef.current,
        lastSyncedAt: Date.now(),
      }));
    } catch (err) {
      setState((s) => ({ ...s, status: "error", error: err instanceof Error ? err.message : String(err) }));
    }
  }, [key, adoptRemote, raiseConflict]);

  const remotePush = useCallback(async (overrideRevision?: number) => {
    if (activeDbProfile() !== "postgres") return;
    if (conflictRef.current && overrideRevision === undefined) return; // frozen until resolved
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setState((s) => ({ ...s, status: "offline", pendingPush: true }));
      return;
    }
    setState((s) => ({ ...s, status: "pushing", error: null }));
    try {
      const payload = JSON.stringify(snapshotRef.current);
      const revision = overrideRevision ?? revisionRef.current;
      const res = await pushSnapshot({ data: { key, revision, payload } });
      if (!res.ok && res.stale) {
        // The server holds a newer snapshot than ours — fetch it and let the
        // user decide instead of silently discarding either side.
        const remote = await pullSnapshot({ data: { key } });
        if (remote.found) {
          raiseConflict({
            detectedAt: Date.now(),
            localRevision: revision,
            remoteRevision: remote.revision,
            localPayload: payload,
            remotePayload: remote.payload,
            remoteUpdatedAt: remote.updated_at,
          });
        }
        return;
      }
      conflictRef.current = null;
      markClean(res.revision ?? revision);
      setState((s) => ({ ...s, status: "synced", conflict: null, pendingPush: false, revision: revisionRef.current, lastSyncedAt: Date.now() }));
    } catch (err) {
      setState((s) => ({ ...s, status: "error", pendingPush: true, error: err instanceof Error ? err.message : String(err) }));
    }
  }, [key, markClean, raiseConflict]);

  /** User decision: keep this device's version, or the database version. */
  const resolveConflict = useCallback(async (choice: "local" | "remote") => {
    const c = conflictRef.current;
    if (!c) return;
    if (choice === "remote") {
      conflictRef.current = null;
      adoptRemote(c.remotePayload, c.remoteRevision);
      setState((s) => ({ ...s, status: "synced", conflict: null, pendingPush: false, revision: c.remoteRevision, lastSyncedAt: Date.now() }));
      return;
    }
    // Keep local: republish it on top of the remote revision so it wins.
    conflictRef.current = null;
    setState((s) => ({ ...s, conflict: null }));
    await remotePush(c.remoteRevision + 1);
  }, [adoptRemote, remotePush]);

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
      baseRef.current = Number(localStorage.getItem(BASE_KEY) ?? revisionRef.current);
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
    if (conflictRef.current) return; // don't push while awaiting a decision
    // The 250ms window only coalesces the burst of updates a single user
    // action produces, so every data injection lands in Postgres right away.
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { void remotePush(); }, 250);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [snapshot, hydrated, remotePush]);

  // Flush the queue as soon as connectivity returns.
  useEffect(() => {
    if (isOnline && hydrated && state.pendingPush && !conflictRef.current) void remotePush();
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
      if (conflictRef.current) return;
      if (pendingRef.current) { void remotePush(); return; }
      void remotePull(false);
    }, 5000);
    return () => clearInterval(id);
  }, [hydrated, remotePull, remotePush]);

  // Refresh when the tab regains focus / becomes visible; flush before it hides.
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    const refresh = () => {
      if (conflictRef.current) return;
      if (pendingRef.current) void remotePush(); else void remotePull(false);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
      else if (pendingRef.current && !conflictRef.current) void remotePush();
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
