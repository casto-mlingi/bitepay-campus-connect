import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/health/db")({
  server: {
    handlers: {
      GET: async () => {
        const started = Date.now();
        try {
          const { getSql } = await import("@/lib/db.server");
          const sql = getSql();
          const [meta] = await sql<
            { version: string; now: Date }[]
          >`select version() as version, now() as now`;
          const tables = await sql<{ table_name: string }[]>`
            select table_name
            from information_schema.tables
            where table_schema = 'public'
            order by table_name
          `;
          return Response.json({
            ok: true,
            latency_ms: Date.now() - started,
            version: meta.version,
            server_time: meta.now,
            table_count: tables.length,
            tables: tables.map((t) => t.table_name),
          });
        } catch (err) {
          return Response.json(
            {
              ok: false,
              latency_ms: Date.now() - started,
              error: err instanceof Error ? err.message : String(err),
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
