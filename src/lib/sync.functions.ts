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
import { getRequest } from "@tanstack/react-start/server";
import { isLocalSyncHost, scopedSnapshotUpdate } from "@/lib/snapshot-safety";

const PushInput = z.object({
  key: z.string().min(1).max(120),
  revision: z.number().int().nonnegative(),
  baseRevision: z.number().int().nonnegative(),
  payload: z.string().max(20_000_000),
});
type PushInputT = z.infer<typeof PushInput>;

const PullInput = z.object({ key: z.string().min(1).max(120) });
type PullInputT = z.infer<typeof PullInput>;

export const pushSnapshot = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown): PushInputT => PushInput.parse(raw))
  .handler(async ({ data }) => {
    if (isLocalSyncHost(new URL(getRequest().url).host)) throw new Error("Local testing cannot upload to shared customer data");
    if (data.key !== "global") throw new Error("Invalid sync key");
    const { readSessionCookie } = await import("@/lib/auth/session.server");
    const session = readSessionCookie();
    if (!session) throw new Error("Sign in again before uploading changes");
    const { getSql } = await import("@/lib/db.server");
    const { ensureSnapshotTable, withRetry } = await import("@/lib/sync.server");
    const sql = getSql();
    await ensureSnapshotTable(sql);

    return withRetry(() => sql.begin(async (tx) => {
      const [current] = await tx`select revision, payload, updated_at from app_snapshots where key = ${data.key} for update`;
      if (!current || Number(current.revision) !== data.baseRevision) return { ok: false as const, stale: true as const, revision: Number(current?.revision ?? 0), updated_at: current?.updated_at?.toISOString() ?? null };
      const previous = JSON.parse(String(current.payload));
      let profile = previous.profiles?.find((p: { id: string; disabled?: boolean }) => p.id === session.uid && !p.disabled);
      if (!profile) {
        const [registered] = await tx`select id, home_store_id, staff_role from profiles where id::text=${session.uid} and is_disabled=false`;
        if (registered) profile = { id: registered.id, store_id: registered.home_store_id, memberships: [] };
      }
      if (!profile) throw new Error("Account is unavailable; please sign in again");
      const storeIds = new Set<string>();
      if (profile.store_id) storeIds.add(profile.store_id);
      for (const m of profile.memberships ?? []) storeIds.add(m.store_id);
      const payload = JSON.stringify(scopedSnapshotUpdate(previous, JSON.parse(data.payload), session.uid, storeIds));
      const revision = Number(current.revision) + 1;
      const [row] = await tx`update app_snapshots set revision=${revision}, payload=${payload}, updated_at=now() where key=${data.key} returning updated_at`;
      return { ok: true as const, stale: false as const, revision, updated_at: row.updated_at.toISOString(), payload };
    }));
  });

export const pullSnapshot = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown): PullInputT => PullInput.parse(raw))
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db.server");
    const { ensureSnapshotTable, withRetry } = await import("@/lib/sync.server");
    const sql = getSql();
    await ensureSnapshotTable(sql);

    const [row] = await withRetry(() => sql<{ revision: number; payload: string; updated_at: Date }[]>`
      select revision, payload, updated_at from app_snapshots where key = ${data.key} limit 1
    `);
    if (!row) return { ok: true as const, found: false as const };
    return { ok: true as const, found: true as const, revision: Number(row.revision), payload: String(row.payload), updated_at: row.updated_at.toISOString() };
  });
