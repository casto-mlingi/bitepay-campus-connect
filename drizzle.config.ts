import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit config — used for `drizzle-kit introspect` / `generate`.
 * The canonical schema lives in the DB (applied manually); this file lets
 * us diff and generate additive migrations against it.
 */
export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
