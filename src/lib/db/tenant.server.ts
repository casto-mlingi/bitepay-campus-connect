/**
 * Tenant-scoping helpers.
 *
 * The database uses `current_setting('app.current_store_id', true)::uuid`
 * inside RLS policies (see schema.sql). All server-side DB access should
 * flow through `withTenant()` so every query in the callback runs with the
 * tenant GUC set on the connection — postgres.js `reserve()` gives us an
 * exclusive connection so the SET LOCAL is safe from pool reuse.
 */
import type { Sql } from "postgres";
import { getSql } from "@/lib/db.server";
import { drizzle } from "drizzle-orm/postgres-js";

export type Tenant = { storeId: string; actorId?: string | null };

/**
 * Run `fn` with a dedicated connection that has the tenant + actor GUCs set
 * for the duration of a transaction. Automatically releases the connection.
 */
export async function withTenant<T>(
  tenant: Tenant,
  fn: (ctx: { sql: Sql; db: ReturnType<typeof drizzle> }) => Promise<T>,
): Promise<T> {
  const pool = getSql();
  const reserved = await pool.reserve();
  try {
    return await reserved.begin(async (tx) => {
      await tx.unsafe(
        `SELECT set_config('app.current_store_id', $1, true),
                set_config('app.current_actor_id',  $2, true)`,
        [tenant.storeId, tenant.actorId ?? ""],
      );
      const db = drizzle(tx as unknown as Sql);
      return fn({ sql: tx as unknown as Sql, db });
    });
  } finally {
    reserved.release();
  }
}

/**
 * Escape hatch for privileged jobs (super-admin, cron) — sets no tenant GUC.
 * RLS will still apply; only tables without tenant policies (e.g. stores
 * lookup during login) are accessible without a tenant context.
 */
export async function withoutTenant<T>(
  fn: (ctx: { sql: Sql; db: ReturnType<typeof drizzle> }) => Promise<T>,
): Promise<T> {
  const sql = getSql();
  return fn({ sql, db: drizzle(sql) });
}
