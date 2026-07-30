/**
 * Snapshot synchronisation between the client store and Postgres.
 *
 * The app keeps its working set in memory (and mirrors it to localStorage so
 * it survives reloads and offline usage). Whenever the device is online the
 * snapshot is pushed to Postgres; on boot it is pulled back. Conflicts are
 * resolved last-write-wins using the client `revision` counter.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const PushInput = z.object({
  key: z.string().min(1).max(120),
  revision: z.number().int().nonnegative(),
  payload: z.unknown(),
});
type PushInputT = z.infer<typeof PushInput>;

const PullInput = z.object({ key: z.string().min(1).max(120) });
type PullInputT = z.infer<typeof PullInput>;

export const pushSnapshot = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown): PushInputT => PushInput.parse(raw))
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db.server");
    const { ensureSnapshotTable } = await import("@/lib/sync.server");
    const sql = getSql();
    await ensureSnapshotTable(sql);

    const [row] = await sql<{ revision: number; updated_at: Date }[]>`
      insert into app_snapshots (key, revision, payload, updated_at)
      values (${data.key}, ${data.revision}, ${JSON.stringify(data.payload)}::jsonb, now())
      on conflict (key) do update
        set revision = excluded.revision,
            payload = excluded.payload,
            updated_at = now()
        where app_snapshots.revision <= excluded.revision
      returning revision, updated_at
    `;

    if (!row) {
      // A newer revision already exists on the server — tell the client to pull.
      const [current] = await sql<{ revision: number; updated_at: Date }[]>`
        select revision, updated_at from app_snapshots where key = ${data.key}
      `;
      return { ok: false as const, stale: true as const, revision: current?.revision ?? 0, updated_at: current?.updated_at ?? null };
    }

    return { ok: true as const, stale: false as const, revision: row.revision, updated_at: row.updated_at };
  });

export const pullSnapshot = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown): PullInputT => PullInput.parse(raw))
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db.server");
    const { ensureSnapshotTable } = await import("@/lib/sync.server");
    const sql = getSql();
    await ensureSnapshotTable(sql);

    const [row] = await sql<{ revision: number; payload: unknown; updated_at: Date }[]>`
      select revision, payload, updated_at from app_snapshots where key = ${data.key} limit 1
    `;
    if (!row) return { ok: true as const, found: false as const };
    return { ok: true as const, found: true as const, revision: row.revision, payload: row.payload, updated_at: row.updated_at };
  });
