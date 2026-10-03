import type { Sql } from "postgres";

export async function ensureImageTable(sql: Sql): Promise<void> {
  await sql`
    create table if not exists app_images (
      id text primary key,
      mime text not null,
      bytes bytea not null,
      created_at timestamptz not null default now()
    )
  `;
}
