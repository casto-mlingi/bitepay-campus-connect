import postgres from "postgres";
import { strict as assert } from "node:assert";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Database access unavailable");
const sql = postgres(url, { max: 1, prepare: false });
try {
  const [row] = await sql`select revision,payload from app_snapshots where key='global'`;
  const before = JSON.parse(String(row.payload));
  assert.equal(before.stores.length, 6);
  assert.equal(before.profiles.length, 6);
  const [archive] = await sql`select count(*)::int as n from bitepay_recovery_archives`;
  assert.ok(archive.n >= 1);
  const [versions] = await sql`select count(*)::int as n from app_snapshot_versions`;
  assert.ok(versions.n >= 1);
  try {
    await sql.begin(async (tx) => {
      await tx`update app_snapshots set revision=revision+1,updated_at=now() where key='global'`;
      const [savedVersions] = await tx`select count(*)::int as n from app_snapshot_versions`;
      assert.equal(savedVersions.n, versions.n + 2);
      throw new Error("Verified valid update and automatic versioning; roll back test");
    });
  } catch (err) {
    if (!(err instanceof Error) || !err.message.startsWith("Verified valid update")) throw err;
    console.log("Verified protection: valid update keeps automatic before/after backups");
  }
  for (const operation of ["delete-records", "stale-revision", "delete-snapshot"]) {
    let blocked = false;
    try {
      await sql.begin(async (tx) => {
        if (operation === "delete-records") await tx`update app_snapshots set payload=${JSON.stringify({ ...before, profiles: [] })},revision=revision+1 where key='global'`;
        else if (operation === "stale-revision") await tx`update app_snapshots set revision=revision+10 where key='global'`;
        else await tx`delete from app_snapshots where key='global'`;
        throw new Error("Unexpectedly allowed; rolling back");
      });
    } catch (err) {
      blocked = err instanceof Error && err.message.startsWith("Data protection:");
    }
    assert.equal(blocked, true, `${operation} must be blocked`);
    console.log(`Verified protection: ${operation}`);
  }
  const [after] = await sql`select revision,payload from app_snapshots where key='global'`;
  assert.equal(String(after.payload), String(row.payload));
  assert.equal(Number(after.revision), Number(row.revision));
  console.log("Verified: six recovered stores and owners; archives available; no test changed shared records.");
} finally { await sql.end(); }