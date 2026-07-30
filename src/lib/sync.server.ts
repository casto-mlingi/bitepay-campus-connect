import type { Sql } from "postgres";

/** Creates the snapshot table on first use so no manual migration is needed. */
export async function ensureSnapshotTable(sql: Sql): Promise<void> {
  await sql`
    create table if not exists app_snapshots (
      key text primary key,
      revision bigint not null default 0,
      payload jsonb not null,
      updated_at timestamptz not null default now()
    )
  `;
}
