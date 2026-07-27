import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

// Singleton — one pool per worker/node process.
declare global {
  // eslint-disable-next-line no-var
  var __bitepay_pg__: ReturnType<typeof postgres> | undefined;
}

function getClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  if (!globalThis.__bitepay_pg__) {
    globalThis.__bitepay_pg__ = postgres(url, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    });
  }
  return globalThis.__bitepay_pg__;
}

export function getSql() {
  return getClient();
}

export function getDb() {
  return drizzle(getClient());
}
