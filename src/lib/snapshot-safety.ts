export type SnapshotData = Record<string, unknown>;

export function isLocalSyncHost(host: string): boolean {
  const hostname = host.toLowerCase().replace(/:\d+$/, "").replace(/^\[|\]$/g, "");
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname.endsWith(".localhost");
}

/** Updates may change records, but an ordinary sync must never erase a row. */
export function assertPreservesRecords(previous: SnapshotData, next: SnapshotData): void {
  for (const [field, rows] of Object.entries(previous)) {
    if (!Array.isArray(rows)) continue;
    const incoming = next[field];
    if (!Array.isArray(incoming)) throw new Error(`Data protection: missing ${field}`);
    const ids = new Set(incoming.map((row) => row?.id));
    for (const row of rows) {
      if (row?.id != null && !ids.has(row.id)) throw new Error(`Data protection: ${field} records cannot be removed by sync`);
    }
  }
  const treasury = previous.treasuries;
  if (treasury && typeof treasury === "object") {
    const incoming = next.treasuries;
    for (const id of Object.keys(treasury)) {
      if (!incoming || typeof incoming !== "object" || !(id in incoming)) throw new Error("Data protection: treasury cannot be removed");
    }
  }
}

/** Ignore stale copies belonging to other stores; clients cannot replace them. */
export function scopedSnapshotUpdate(previous: SnapshotData, incoming: SnapshotData, userId: string, storeIds: Set<string>): SnapshotData {
  const result = { ...previous };
  for (const [field, value] of Object.entries(incoming)) {
    if (Array.isArray(value)) {
      const old = Array.isArray(previous[field]) ? previous[field] : [];
      const rows = new Map(old.map((row) => [row.id, row]));
      for (const row of value) {
        if (!row || typeof row !== "object" || typeof row.id !== "string") throw new Error("Invalid snapshot record");
        const existing = rows.get(row.id);
        const allowed = (r: Record<string, unknown>) => field === "stores" ? storeIds.has(String(r.id))
          : field === "profiles" ? r.id === userId || storeIds.has(String(r.store_id))
          : storeIds.has(String(r.store_id));
        if (allowed(row) && (!existing || allowed(existing))) rows.set(row.id, row);
      }
      result[field] = [...rows.values()];
    } else if (field === "treasuries" && value && typeof value === "object") {
      const treasury = { ...(previous.treasuries as Record<string, unknown> ?? {}) };
      for (const [id, balance] of Object.entries(value)) if (storeIds.has(id)) treasury[id] = balance;
      result.treasuries = treasury;
    }
    // Device-specific scalars (active shift, receipt counters) are not shared authority.
  }
  assertPreservesRecords(previous, result);
  return result;
}