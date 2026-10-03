import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/images/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!/^[a-f0-9]{32}$/.test(params.id)) return new Response("Not found", { status: 404 });
        const { getSql } = await import("@/lib/db.server");
        const { ensureImageTable } = await import("@/lib/images.server");
        const sql = getSql();
        await ensureImageTable(sql);
        const [row] = await sql<{ mime: string; bytes: Buffer }[]>`
          select mime, bytes from app_images where id = ${params.id} limit 1
        `;
        if (!row) return new Response("Not found", { status: 404 });
        return new Response(new Uint8Array(row.bytes), {
          headers: {
            "Content-Type": row.mime,
            // Content-addressed ids never change, so cache forever.
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
