/**
 * Authentication server functions — phase 3.
 *
 * Public surface:
 *   - registerOwnerAndStore({ store, owner, opening_cash, opening_bank })
 *       Creates store + subscription (trial) + owner profile + treasury_balances
 *       + seeds default chart of accounts, then signs the user in.
 *   - loginUser({ phone, password })                → sets session cookie
 *   - logoutSession()                               → clears cookie
 *   - getCurrentSession()                           → { user, store } | null
 *
 * All DB work runs through a single Postgres transaction so partial
 * creation is impossible. No RLS bypass — writes execute as the
 * connection role (bitepays) which owns the tables.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const StoreInput = z.object({
  name: z.string().min(2).max(80),
  location: z.string().max(120).optional().default(""),
  contact_phone: z.string().min(4).max(40),
  currency: z.string().min(1).max(8).default("TZS"),
  low_balance_threshold: z.number().nonnegative().default(2000),
});
const OwnerInput = z.object({
  full_name: z.string().min(2).max(80),
  phone: z.string().min(4).max(40),
  password: z.string().min(4).max(200),
  staff_pin: z.string().regex(/^\d{4,6}$/),
});
const RegisterInput = z.object({
  store: StoreInput,
  owner: OwnerInput,
  opening_cash: z.number().nonnegative().default(0),
  opening_bank: z.number().nonnegative().default(0),
});
type RegisterInputT = z.infer<typeof RegisterInput>;

const LoginInput = z.object({
  phone: z.string().min(3).max(80),
  password: z.string().min(1).max(200),
});
type LoginInputT = z.infer<typeof LoginInput>;

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "store";
}

export const registerOwnerAndStore = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown): RegisterInputT => RegisterInput.parse(raw))
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db.server");
    const { hashPassword, hashPin } = await import("@/lib/auth/password.server");
    const { writeSessionCookie } = await import("@/lib/auth/session.server");

    const sql = getSql();

    // Uniqueness check outside the tx for a friendlier error.
    const existing = await sql<{ id: string }[]>`
      select id from profiles where phone = ${data.owner.phone} limit 1
    `;
    if (existing.length) throw new Error("An account with that phone already exists");

    const passwordHash = hashPassword(data.owner.password);
    const pinHash = hashPin(data.owner.staff_pin);

    // Reserve a unique slug — append -2, -3, … on collision.
    const base = slugify(data.store.name);
    let slug = base;
    for (let i = 2; i < 50; i++) {
      const [{ n }] = await sql<{ n: number }[]>`
        select count(*)::int as n from stores where slug = ${slug}
      `;
      if (n === 0) break;
      slug = `${base}-${i}`;
    }

    const result = await sql.begin(async (tx) => {
      const [store] = await tx<{ id: string }[]>`
        insert into stores (name, slug, location, contact_phone, currency_label, low_balance_nudge)
        values (${data.store.name}, ${slug}, ${data.store.location || null},
                ${data.store.contact_phone}, ${data.store.currency},
                ${data.store.low_balance_threshold})
        returning id
      `;

      const trialEnds = new Date(Date.now() + 14 * 86400 * 1000);
      await tx`
        insert into subscriptions (store_id, plan, status, trial_ends_at, current_period_end)
        values (${store.id}, 'trial', 'active', ${trialEnds}, ${trialEnds})
      `;

      const [owner] = await tx<{ id: string }[]>`
        insert into profiles (role, full_name, phone, password_hash, pin_hash,
                              home_store_id, staff_role)
        values ('staff', ${data.owner.full_name}, ${data.owner.phone},
                ${passwordHash}, ${pinHash}, ${store.id}, 'owner')
        returning id
      `;

      await tx`
        insert into treasury_balances (store_id, cash, bank)
        values (${store.id}, ${data.opening_cash}, ${data.opening_bank})
      `;

      // Seed default chart of accounts if the DB provides it.
      try {
        await tx`select seed_default_accounts(${store.id}::uuid)`;
      } catch {
        /* function may not exist in some environments; ignore */
      }

      return { storeId: store.id, ownerId: owner.id };
    });

    writeSessionCookie({
      uid: result.ownerId,
      sid: result.storeId,
      role: "staff",
      staffRole: "owner",
    });

    return { ok: true as const, storeId: result.storeId, ownerId: result.ownerId };
  });

export const loginUser = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown): LoginInputT => LoginInput.parse(raw))
  .handler(async ({ data }) => {
    const { getSql } = await import("@/lib/db.server");
    const { verifyPassword } = await import("@/lib/auth/password.server");
    const { writeSessionCookie } = await import("@/lib/auth/session.server");

    const sql = getSql();
    const rows = await sql<
      {
        id: string;
        role: "customer" | "staff" | "super_admin";
        staff_role: "cashier" | "supervisor" | "owner" | null;
        home_store_id: string | null;
        password_hash: string;
        is_disabled: boolean;
        full_name: string;
      }[]
    >`
      select id, role, staff_role, home_store_id, password_hash, is_disabled, full_name
      from profiles
      where phone = ${data.phone}
      limit 1
    `;
    const u = rows[0];
    if (!u || u.is_disabled || !verifyPassword(data.password, u.password_hash)) {
      throw new Error("Invalid phone or password");
    }

    await sql`update profiles set last_signin_at = now() where id = ${u.id}`;

    writeSessionCookie({
      uid: u.id,
      sid: u.home_store_id,
      role: u.role,
      staffRole: u.staff_role,
    });

    return {
      ok: true as const,
      user: { id: u.id, full_name: u.full_name, role: u.role, staff_role: u.staff_role },
      store_id: u.home_store_id,
    };
  });

export const logoutSession = createServerFn({ method: "POST" }).handler(async () => {
  const { clearSessionCookie } = await import("@/lib/auth/session.server");
  clearSessionCookie();
  return { ok: true as const };
});

export const getCurrentSession = createServerFn({ method: "GET" }).handler(async () => {
  const { readSessionCookie } = await import("@/lib/auth/session.server");
  const s = readSessionCookie();
  if (!s) return null;

  const { getSql } = await import("@/lib/db.server");
  const sql = getSql();
  const [user] = await sql<
    { id: string; full_name: string; role: string; staff_role: string | null; home_store_id: string | null }[]
  >`
    select id, full_name, role, staff_role, home_store_id
    from profiles where id = ${s.uid} and is_disabled = false
    limit 1
  `;
  if (!user) return null;

  const [store] = s.sid
    ? await sql<{ id: string; name: string; currency_label: string }[]>`
        select id, name, currency_label from stores where id = ${s.sid} limit 1
      `
    : [];

  return { user, store: store ?? null };
});
