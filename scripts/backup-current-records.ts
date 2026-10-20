/** Internal recovery archive only; never exports credentials or customer records. */
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Database access is unavailable");
const sql = postgres(url, { max: 1, prepare: false });
const tables = [
  "orders", "order_items", "payments", "wallet_transactions", "wallets",
  "topup_requests", "products", "raw_materials", "cooking_batches",
  "batch_ingredients", "wastage_logs", "purchases", "purchase_items",
  "treasury_balances", "treasury_transfers", "journal_entries", "journal_lines",
  "accounts", "expenses", "shifts", "pending_sales", "selcom_payments", "audit_log",
];
function counts(payload: string) {
  const data = JSON.parse(payload) as Record<string, unknown>;
  return Object.fromEntries(Object.entries(data).filter(([, value]) => Array.isArray(value))
    .map(([key, value]) => [key, (value as unknown[]).length]));
}
try {
  if (!process.argv.includes("--inspect-only")) {
    const backup = await sql.begin("isolation level repeatable read", async (tx) => {
    const [snapshot] = await tx`select key, revision, payload, updated_at from app_snapshots where key='global'`;
    if (!snapshot) throw new Error("Current shared records are unavailable; backup stopped");
    const records: Record<string, unknown[]> = {};
    for (const table of tables) records[table] = await tx`select * from ${tx(table)}`;
    const data = JSON.stringify({ snapshot, records });
    const [archive] = await tx`insert into bitepay_recovery_archives(source,data)
      values ('current-sales-payments-inventory-backup',${data}::jsonb) returning id`;
    if (!archive) throw new Error("Backup was not saved");
    const [check] = await tx`select data = ${data}::jsonb as verified from bitepay_recovery_archives where id=${archive.id}`;
    if (!check?.verified) throw new Error("Backup verification failed; rolling back");
    return { archiveId: String(archive.id), revision: Number(snapshot.revision), verified: true,
      snapshotCounts: counts(String(snapshot.payload)), tableCounts: Object.fromEntries(Object.entries(records).map(([k, rows]) => [k, rows.length])) };
  });
    console.log("Verified internal backup:", JSON.stringify(backup));
  }
  const versions = await sql`select id,revision,payload from app_snapshot_versions where key='global' order by revision,id`;
  console.log("Historical snapshot counts:", JSON.stringify(versions.map((v) => ({ id: String(v.id), revision: Number(v.revision), counts: counts(String(v.payload)) }))));
  const archives = await sql`select id,source,data from bitepay_recovery_archives order by id`;
  console.log("Recovery archive counts:", JSON.stringify(archives.map((a) => {
    const data = (typeof a.data === "string" ? JSON.parse(a.data) : a.data) as Record<string, unknown>;
    const snapshot = data.snapshot as { payload?: string } | undefined;
    const records = (data.records ?? data) as Record<string, unknown>;
    return { id: String(a.id), source: a.source, snapshotCounts: snapshot?.payload ? counts(snapshot.payload) : {},
      tableCounts: Object.fromEntries(Object.entries(records).filter(([, value]) => Array.isArray(value)).map(([k, rows]) => [k, (rows as unknown[]).length])) };
  })));
} finally { await sql.end(); }