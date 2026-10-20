export type OnboardingInput = {
  store: { name: string; location: string; contact_phone: string; admin_email?: string; currency: string; low_balance_threshold: number };
  owner: { full_name: string; phone: string; password: string; staff_pin: string };
  opening_cash: number;
  opening_bank: number;
};

/** Canonical onboarding records are committed with the account, never later. */
export function addCanonicalOnboarding<T extends Record<string, unknown>>(previous: T, data: OnboardingInput, ids: { storeId: string; ownerId: string }, now: number) {
  const stores = Array.isArray(previous.stores) ? previous.stores : [];
  const profiles = Array.isArray(previous.profiles) ? previous.profiles : [];
  return {
    ...previous,
    stores: stores.some((s) => s.id === ids.storeId) ? stores : [...stores, {
      ...data.store, id: ids.storeId, owner_user_id: ids.ownerId, enable_mobile_tender: true,
      created_at: now, updated_at: now,
      subscription: { plan: "trial", status: "active", started_at: now, expires_at: now + 14 * 86400000, monthly_price: 0 },
    }],
    profiles: profiles.some((p) => p.id === ids.ownerId) ? profiles : [...profiles, {
      ...data.owner, id: ids.ownerId, role: "staff", staff_role: "owner", wallet_balance: 0,
      store_id: ids.storeId, memberships: [{ store_id: ids.storeId, staff_role: "owner" }], created_at: now, updated_at: now,
    }],
    treasuries: { [ids.storeId]: { cash: data.opening_cash, bank: data.opening_bank },
      ...(previous.treasuries as Record<string, unknown> ?? {}) },
  };
}