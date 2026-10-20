/**
 * Password and customer-account writes that must reach the database
 * immediately (not wait for the next snapshot upload), so a customer can sign
 * in from any phone right after an owner creates/resets them or they sign up.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

type SnapProfile = {
  id: string; phone: string; role: string; store_id?: string | null; full_name: string;
  password?: string; default_password?: string; must_change_password?: boolean; disabled?: boolean;
  memberships?: { store_id: string }[]; wallets?: Record<string, number>; wallet_balance?: number; created_at?: number;
};
type Snap = { profiles?: SnapProfile[]; stores?: { id: string; parent_id?: string | null }[] };

const norm = (p: string) => p.replace(/\D/g, "");

async function editSnapshot<R>(edit: (snap: Snap) => R): Promise<R> {
  const { getSql } = await import("@/lib/db.server");
  const { ensureSnapshotTable } = await import("@/lib/sync.server");
  const sql = getSql();
  await ensureSnapshotTable(sql);
  return sql.begin<R>(async (tx) => {
    const [row] = await tx`select revision, payload from app_snapshots where key='global' for update`;
    if (!row) throw new Error("Store data not ready yet. Try again shortly.");
    const snap = JSON.parse(String(row.payload)) as Snap;
    const result = edit(snap);
    await tx`update app_snapshots set revision=${Number(row.revision) + 1}, payload=${JSON.stringify(snap)}, updated_at=now() where key='global'`;
    return result;
  });
}

async function syncDbHash(id: string, phone: string, password: string) {
  const { getSql } = await import("@/lib/db.server");
  const { hashPassword } = await import("@/lib/auth/password.server");
  const sql = getSql();
  try {
    await sql`update profiles set password_hash=${hashPassword(password)} where id::text=${id} or phone=${phone}`;
  } catch { /* snapshot remains the source for legacy accounts */ }
}

const SaveInput = z.object({
  targetId: z.string().min(1).max(80),
  password: z.string().min(4).max(200),
  mustChange: z.boolean(),
  /** Customer record to insert when the owner just created it on this device. */
  newCustomer: z.object({ id: z.string(), full_name: z.string().min(1).max(80), phone: z.string().min(4).max(40), store_id: z.string() }).optional(),
});

export const savePassword = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => SaveInput.parse(raw))
  .handler(async ({ data }) => {
    const { readSessionCookie } = await import("@/lib/auth/session.server");
    const session = readSessionCookie();
    if (!session) return { ok: false as const, error: "Sign in again" };
    const r = await editSnapshot((snap) => {
      snap.profiles ??= [];
      const me = snap.profiles.find((p) => p.id === session.uid);
      const myStores = new Set<string>([me?.store_id ?? "", session.sid ?? "", ...(me?.memberships ?? []).map((m) => m.store_id)].filter(Boolean));
      let target = snap.profiles.find((p) => p.id === data.targetId);
      const isSelf = data.targetId === session.uid;
      if (!isSelf && session.role !== "staff") return { ok: false as const, error: "Not allowed" };
      if (!target && data.newCustomer && session.role === "staff") {
        if (!myStores.has(data.newCustomer.store_id)) return { ok: false as const, error: "Not allowed" };
        if (snap.profiles.some((p) => norm(p.phone) === norm(data.newCustomer!.phone))) return { ok: false as const, error: "Phone already registered" };
        target = { ...data.newCustomer, role: "customer", wallet_balance: 0, created_at: Date.now() };
        snap.profiles.push(target);
      }
      if (!target) return { ok: false as const, error: "Account not found" };
      if (!isSelf && (target.role !== "customer" && !myStores.has(target.store_id ?? ""))) return { ok: false as const, error: "Not allowed" };
      target.password = data.password;
      target.must_change_password = data.mustChange;
      if (data.mustChange) target.default_password = data.password;
      return { ok: true as const, phone: target.phone };
    });
    if (r.ok) await syncDbHash(data.targetId, r.phone, data.password);
    return r.ok ? { ok: true as const } : r;
  });

const RegisterInput = z.object({
  id: z.string().min(1).max(80),
  full_name: z.string().min(2).max(80),
  phone: z.string().min(9).max(20),
  password: z.string().min(4).max(200),
  store_id: z.string().min(1),
});

/** Public self sign-up: writes the customer straight into the shared data and signs them in. */
export const registerCustomer = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => RegisterInput.parse(raw))
  .handler(async ({ data }) => {
    const r = await editSnapshot((snap) => {
      snap.profiles ??= [];
      if (!(snap.stores ?? []).some((s) => s.id === data.store_id || s.parent_id === data.store_id)) return { ok: false as const, error: "Store not found" };
      if (snap.profiles.some((p) => norm(p.phone) === norm(data.phone))) return { ok: false as const, error: "Phone already registered" };
      snap.profiles.push({ id: data.id, full_name: data.full_name.trim(), phone: data.phone.trim(), password: data.password, role: "customer", store_id: data.store_id, wallet_balance: 0, wallets: {}, created_at: Date.now() });
      return { ok: true as const };
    });
    if (r.ok) {
      const { writeSessionCookie } = await import("@/lib/auth/session.server");
      writeSessionCookie({ uid: data.id, sid: data.store_id, role: "customer", staffRole: null });
    }
    return r;
  });
