/**
 * Dish photos live in their own Postgres table on the BitePay server so the
 * synced snapshot only carries a short URL instead of a large image.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const UploadInput = z.object({
  dataUrl: z.string().startsWith("data:image/").max(4_000_000),
});

export const uploadImage = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => UploadInput.parse(raw))
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db.server");
    const { ensureImageTable } = await import("@/lib/images.server");
    const { withRetry } = await import("@/lib/sync.server");
    const { createHash } = await import("node:crypto");
    const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(data.dataUrl);
    if (!match) throw new Error("Unsupported image");
    const bytes = Buffer.from(match[2], "base64");
    const id = createHash("sha256").update(bytes).digest("hex").slice(0, 32);
    const sql = getSql();
    await ensureImageTable(sql);
    await withRetry(() => sql`
      insert into app_images (id, mime, bytes) values (${id}, ${match[1]}, ${bytes})
      on conflict (id) do nothing
    `);
    return { url: `/api/public/images/${id}` };
  });
