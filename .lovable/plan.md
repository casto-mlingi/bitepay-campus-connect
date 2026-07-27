# Owner Onboarding & Staff Management

Right now the app ships with pre-seeded demo staff (`u2`–`u4`). You want a real first-run flow: the **store owner** creates their account, sets up the store, and then invites staff members with specific roles. Role gates already partially exist (cashier / supervisor / owner) — this pass makes them meaningful end-to-end.

## 1. First-run owner setup

- On app boot, if there is no `owner` profile in the store, `/` redirects to a new **`/setup`** route (a 2-step wizard):
  1. **Store details** — store name, location, contact phone, currency label (default TZS), low-balance threshold.
  2. **Owner account** — full name, phone, password, staff PIN (4-digit).
- Submitting creates the owner profile (`role: staff`, `staff_role: owner`) and a `store` record in the store, then auto-signs the owner in and routes to `/staff`.
- Existing demo seed profiles are removed. The login screen "demo" quick-fill is replaced by a "First time? **Set up your store**" link.

## 2. Staff management (owner + supervisor)

- New route **`/team`** (nav item "Team", visible to supervisor+; only owner can create/delete owners).
- Lists all staff with: name, phone, role badge, status (active/disabled), last sign-in.
- Actions:
  - **Add member** modal — name, phone, temp password, role (cashier / supervisor / owner), staff PIN.
  - **Edit role** — change role or disable account (owner-only for owner-role edits).
  - **Reset PIN / password** — owner or the member themselves.
  - **Remove** — soft-disable (can't sign in), owner-only.
- Cashiers cannot see /team.

## 3. Role-gated features (single source of truth)

Centralize permissions in `store.tsx` as a `PERMISSIONS` map keyed by role, and expose `can(perm)` on the store. Nav items and page bodies use `can(...)` instead of ad-hoc `hasStaffRole`.

| Feature                          | Cashier | Supervisor | Owner |
|----------------------------------|:-------:|:----------:|:-----:|
| POS sales / refunds              |    ✓    |     ✓      |   ✓   |
| Shift open/close                 |    ✓    |     ✓      |   ✓   |
| Customers list & top-up request approval |    ✓    |     ✓      |   ✓   |
| Inventory read                   |    ✓    |     ✓      |   ✓   |
| Inventory edits / batches / wastage |         |     ✓      |   ✓   |
| Finance dashboard & journal      |         |     ✓      |   ✓   |
| Purchases / expenses / transfers |         |     ✓      |   ✓   |
| Analytics                        |         |     ✓      |   ✓   |
| Team management                  |         |    ✓ (view / add cashier) |   ✓ (full)   |
| Store settings                   |         |            |   ✓   |
| Delete owner / change store name |         |            |   ✓   |

Pages hit by unauthorized users show a friendly "You don't have access to this area — ask your store manager" card instead of blanking.

## 4. Store settings (owner only)

Small **`/settings`** route (nav item, owner only) to edit the store details captured at setup, plus toggle features (e.g. enable/disable mobile-money tender). Values live in the same `store` object added in step 1.

## 5. Small polish

- Staff shell header shows the store name next to the BitePay logo.
- Signup on `/` stays **customer-only** (the current customer signup); staff accounts can only be created by an owner/supervisor from `/team`, never via public signup.
- All new routes get proper `head()` meta.

## Technical notes

- All state stays in `src/lib/store.tsx` (localStorage-backed) — no backend changes.
- New types: `Store`, `PERMISSIONS: Record<StaffRole, Permission[]>`, `Permission` union.
- New store fields: `store: Store | null`, `hasOwner: boolean` (derived).
- New actions: `completeSetup(store, ownerInput)`, `addStaff(input)`, `updateStaff(id, patch)`, `disableStaff(id)`, `resetStaffCredential(id, kind, value)`, `updateStore(patch)`, `can(perm)`.
- Files touched: `src/lib/store.tsx`, `src/routes/index.tsx`, `src/routes/__root.tsx` (redirect guard), `src/components/staff-shell.tsx`. New files: `src/routes/setup.tsx`, `src/routes/team.tsx`, `src/routes/settings.tsx`, `src/components/access-denied.tsx`.
- Existing demo quick-fill buttons and seeded staff profiles are removed; a single demo customer stays for convenience.
