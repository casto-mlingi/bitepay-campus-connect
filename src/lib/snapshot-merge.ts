/**
 * Automatic snapshot merging.
 *
 * The app syncs one JSON snapshot per deployment. Two devices editing at the
 * same time used to raise a "which version do you keep?" prompt — confusing,
 * and destructive because one side was thrown away. Instead we merge record
 * by record: every row lives in exactly one array keyed by `id`, so a union
 * keyed by id (newest timestamp wins per row) reconstructs a snapshot that
 * contains everybody's work with no user decision required.
 */

type Row = Record<string, unknown> & { id?: unknown };

const TIME_FIELDS = [
  "updated_at", "updatedAt", "created_at", "createdAt",
  "timestamp", "ts", "date", "at", "closed_at", "opened_at",
];

function stamp(row: Row): number {
  for (const f of TIME_FIELDS) {
    const v = row?.[f];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const t = Date.parse(v);
      if (!Number.isNaN(t)) return t;
    }
  }
  return 0;
}

/** Newest row wins; ties fall back to the remote copy (server is the shared truth). */
function pick(local: Row, remote: Row): Row {
  return stamp(local) > stamp(remote) ? local : remote;
}

function mergeArrays(local: unknown[], remote: unknown[]): unknown[] {
  const keyed = local.every((r) => r && typeof r === "object" && "id" in (r as Row))
    && remote.every((r) => r && typeof r === "object" && "id" in (r as Row));
  if (!keyed) return local.length >= remote.length ? local : remote;

  const out = new Map<unknown, Row>();
  for (const r of remote as Row[]) out.set(r.id, r);
  for (const r of local as Row[]) {
    const existing = out.get(r.id);
    out.set(r.id, existing ? pick(r, existing) : r);
  }
  return Array.from(out.values());
}

/**
 * Merge the local snapshot into the remote one. Arrays of records are unioned
 * by id, counters take the higher value, and any other scalar keeps the local
 * value when it is set (this device is the one the user is looking at).
 */
export function mergeSnapshots<T>(local: T, remote: T): T {
  if (!local || typeof local !== "object") return remote;
  if (!remote || typeof remote !== "object") return local;

  const out: Record<string, unknown> = { ...(remote as Record<string, unknown>) };
  for (const [k, lv] of Object.entries(local as Record<string, unknown>)) {
    const rv = out[k];
    if (Array.isArray(lv) && Array.isArray(rv)) out[k] = mergeArrays(lv, rv);
    else if (typeof lv === "number" && typeof rv === "number") out[k] = Math.max(lv, rv);
    else if (lv !== undefined && lv !== null) out[k] = lv;
  }
  return out as T;
}
