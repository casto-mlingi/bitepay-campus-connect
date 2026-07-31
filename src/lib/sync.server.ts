import type { Sql } from "postgres";

/** Creates the snapshot table on first use so no manual migration is needed. */
export async function ensureSnapshotTable(sql: Sql): Promise<void> {
  await sql`
    create table if not exists app_snapshots (
      key text primary key,
      revision bigint not null default 0,
      payload text not null,
      updated_at timestamptz not null default now()
    )
  `;
}

/**
 * Pooled Postgres connections are occasionally closed by the network in front
 * of the database ("write CONNECTION_CLOSED"). Those are transient: retrying
 * once or twice succeeds, so sync should never surface them as an error.
 */
export function isTransient(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /CONNECTION_CLOSED|CONNECTION_ENDED|ECONNRESET|ETIMEDOUT|EPIPE|Connection terminated|socket hang up/i.test(msg);
}

export async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      if (!isTransient(err)) throw err;
      await new Promise((r) => setTimeout(r, 150 * (i + 1)));
    }
  }
  throw last;
}

