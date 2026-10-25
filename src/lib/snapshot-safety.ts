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
export function scopedSnapshotUpdate(previous: SnapshotData, incoming: SnapshotData, userId: string, storeIds: Set<string>, role = "staff"): SnapshotData {
  const result = { ...previous };
  for (const [field, value] of Object.entries(incoming)) {
    if (Array.isArray(value)) {
      const old = Array.isArray(previous[field]) ? previous[field] : [];
      const rows = new Map(old.map((row) => [row.id, row]));
      for (const row of value) {
        if (!row || typeof row !== "object" || typeof row.id !== "string") throw new Error("Invalid snapshot record");
        const existing = rows.get(row.id);
        if (field === "stores" && storeIds.has(row.id) && existing && row.customer_debt_limit != null && row.customer_debt_limit !== existing.customer_debt_limit && role !== "customer") {
          const actor = (previous.profiles as Record<string, unknown>[] | undefined)?.find((p) => p.id === userId);
          const memberships = actor?.memberships as { store_id: string; staff_role: string }[] | undefined;
          const staffRole = memberships?.find((m) => m.store_id === row.id)?.staff_role ?? (actor?.store_id === row.id ? actor?.staff_role : undefined);
          if (staffRole !== "owner" && staffRole !== "supervisor") throw new Error("Only the store owner or manager may change the customer debt limit");
          if (!Number.isSafeInteger(row.customer_debt_limit) || Number(row.customer_debt_limit) < 0) throw new Error("Invalid customer debt limit");
        }
        const allowed = (r: Record<string, unknown>) => role === "customer"
          ? field === "profiles" ? r.id === userId : ["orders", "topUpRequests", "notifications", "payLaterRequests"].includes(field) && (r.customer_id === userId || r.user_id === userId)
          : field === "stores" ? storeIds.has(String(r.id))
          : field === "profiles" ? r.id === userId || storeIds.has(String(r.store_id))
          : storeIds.has(String(r.store_id));
        if (allowed(row) && (!existing || allowed(existing))) {
          const next = field === "stores" && existing && row.customer_debt_limit == null
            ? { ...row, customer_debt_limit: existing.customer_debt_limit }
            : field === "profiles" && existing
            ? { ...row, role: existing.role, store_id: existing.store_id, memberships: existing.memberships, staff_role: existing.staff_role }
            : row;
          rows.set(row.id, next);
        }
      }
      result[field] = [...rows.values()];
    } else if (field === "treasuries" && role !== "customer" && value && typeof value === "object") {
      const treasury = { ...(previous.treasuries as Record<string, unknown> ?? {}) };
      for (const [id, balance] of Object.entries(value)) if (storeIds.has(id)) treasury[id] = balance;
      result.treasuries = treasury;
    }
    // Device-specific scalars (active shift, receipt counters) are not shared authority.
  }
  assertPreservesRecords(previous, result);
  return result;
}

/**
 * Platform admin uploads: only subscription/billing fields on stores plus the
 * admin log, billing payments and support tickets. Store business data
 * (sales, wallets, stock, treasuries) is never taken from an admin device.
 */
export function adminSnapshotUpdate(previous: SnapshotData, incoming: SnapshotData): SnapshotData {
  const result = { ...previous };
  const merge = (field: string, pick?: (oldRow: Record<string, unknown>, row: Record<string, unknown>) => Record<string, unknown> | null) => {
    const value = incoming[field];
    if (!Array.isArray(value)) return;
    const old = Array.isArray(previous[field]) ? previous[field] as Record<string, unknown>[] : [];
    const rows = new Map(old.map((row) => [row.id, row]));
    for (const row of value) {
      if (!row || typeof row !== "object" || typeof row.id !== "string") throw new Error("Invalid snapshot record");
      const existing = rows.get(row.id);
      const next = pick ? (existing ? pick(existing, row) : null) : row;
      if (next) rows.set(row.id, next);
    }
    result[field] = [...rows.values()];
  };
  merge("stores", (oldRow, row) => ({ ...oldRow, subscription: row.subscription ?? oldRow.subscription }));
  merge("adminAuditLog");
  merge("subscriptionPayments");
  merge("tickets");
  assertPreservesRecords(previous, result);
  return result;
}