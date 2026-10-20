/** Run with Bun against the existing DATABASE_URL. Never prints private data. */
import postgres from "postgres";
import { readFile } from "node:fs/promises";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Database access is unavailable");
const sql = postgres(url, { max: 1, prepare: false });
const epoch = (value: unknown) => value ? new Date(String(value)).getTime() : 0;
try {
  const protection = await readFile(new URL("./protect-snapshots.sql", import.meta.url), "utf8");
  const summary = await sql.begin(async (tx) => {
    await tx`lock table app_snapshots in exclusive mode`;
    await tx`create table if not exists bitepay_recovery_archives (id bigserial primary key, saved_at timestamptz not null default now(), source text not null, data jsonb not null)`;
    const [saved] = await tx`select * from app_snapshots where key='global' for update`;
    if (!saved) throw new Error("Shared snapshot not found; recovery stopped");
    const existing = JSON.parse(String(saved.payload));
    const stores = await tx`select * from stores`;
    const profiles = await tx`select * from profiles`;
    const subscriptions = await tx`select * from subscriptions`;
    const treasuries = await tx`select * from treasury_balances`;
    const accounts = await tx`select * from accounts`;
    await tx`insert into bitepay_recovery_archives(source,data) values ('pre-recovery',${JSON.stringify({ snapshot: saved, stores, profiles, subscriptions, treasuries, accounts })}::jsonb)`;
    // Quarantine only the explicit browser fixtures identified in the incident.
    // They remain intact in the recovery archive, never represented as real sales.
    const fixtureIds = new Set(["store-check", "owner-check", "waiter-check", "customer-check", "beer-check", "food-check"]);
    const recovered = { ...existing };
    for (const [field, value] of Object.entries(recovered)) {
      if (Array.isArray(value)) recovered[field] = value.filter((row) => !fixtureIds.has(row.id) && row.store_id !== "store-check");
    }
    recovered.treasuries = { ...(existing.treasuries ?? {}) };
    delete recovered.treasuries["store-check"];
    recovered.activeShiftId = null;
    const profileMap = new Map((recovered.profiles ?? []).map((p: { id: string }) => [p.id, p]));
    for (const p of profiles) {
      if (p.role === "super_admin") continue;
      if (profileMap.has(p.id)) continue;
      profileMap.set(p.id, { id: p.id, full_name: p.full_name, phone: p.phone ?? "", password: "", wallet_balance: 0,
        role: p.role, staff_role: p.staff_role ?? undefined, store_id: p.home_store_id ?? undefined,
        memberships: p.staff_role && p.home_store_id ? [{ store_id: p.home_store_id, staff_role: p.staff_role }] : [],
        disabled: p.is_disabled, created_at: epoch(p.created_at), last_login: epoch(p.last_signin_at), updated_at: epoch(p.updated_at) });
    }
    recovered.profiles = [...profileMap.values()];
    const storeMap = new Map((recovered.stores ?? []).map((s: { id: string }) => [s.id, s]));
    for (const s of stores) {
      if (storeMap.has(s.id)) continue;
      const sub = subscriptions.find((sub) => sub.store_id === s.id);
      if (!sub) throw new Error("A store has no subscription evidence; recovery stopped");
      const owners = profiles.filter((p) => p.home_store_id === s.id && p.staff_role === "owner");
      storeMap.set(s.id, { id: s.id, name: s.name, location: s.location ?? "", contact_phone: s.contact_phone ?? "",
        currency: s.currency_label, low_balance_threshold: Number(s.low_balance_nudge), enable_mobile_tender: true,
        owner_user_id: owners.length === 1 ? owners[0]?.id : undefined, created_at: epoch(s.created_at), updated_at: epoch(s.updated_at),
        subscription: { plan: sub.plan, status: sub.status === "active" ? "active" : sub.status === "expired" ? "expired" : "suspended",
          started_at: epoch(sub.current_period_start), expires_at: epoch(sub.current_period_end ?? sub.trial_ends_at), monthly_price: Number(sub.amount) } });
    }
    recovered.stores = [...storeMap.values()];
    for (const t of treasuries) if (!(t.store_id in recovered.treasuries)) recovered.treasuries[t.store_id] = { cash: Number(t.cash), bank: Number(t.bank) };
    const revision = Number(saved.revision) + 1;
    await tx`update app_snapshots set payload=${JSON.stringify(recovered)},revision=${revision},updated_at=now() where key='global'`;
    await tx.unsafe(protection);
    await tx`insert into app_snapshot_versions(key,revision,payload) select key,revision,payload from app_snapshots where key='global'`;
    return { stores: recovered.stores.length, profiles: recovered.profiles.length, treasuryBalances: Object.keys(recovered.treasuries).length, revision };
  });
  console.log("Recovered available records and installed database protection:", summary);
} finally { await sql.end(); }