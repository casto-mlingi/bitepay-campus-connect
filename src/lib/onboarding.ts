export type OnboardingInput = {
  store: { name: string; location: string; contact_phone: string; admin_email?: string; currency: string; low_balance_threshold: number; business_type?: string; enable_mobile_tender?: boolean };
  owner: { full_name: string; phone: string; password: string; staff_pin: string };
  opening_cash: number;
  opening_bank: number;
  starter?: { raw: Record<string, unknown>[]; products: Record<string, unknown>[] };
};

/** Canonical onboarding records are committed with the account, never later. */
export function addCanonicalOnboarding<T extends Record<string, unknown>>(previous: T, data: OnboardingInput, ids: { storeId: string; ownerId: string }, now: number) {
  const stores = Array.isArray(previous.stores) ? previous.stores : [];
  const profiles = Array.isArray(previous.profiles) ? previous.profiles : [];
  return {
    ...previous,
    stores: stores.some((s) => s.id === ids.storeId) ? stores : [...stores, {
      ...data.store, id: ids.storeId, owner_user_id: ids.ownerId, enable_mobile_tender: data.store.enable_mobile_tender ?? true,
      created_at: now, updated_at: now,
      subscription: { plan: "trial", status: "active", started_at: now, expires_at: now + 14 * 86400000, monthly_price: 0 },
    }],
    profiles: profiles.some((p) => p.id === ids.ownerId) ? profiles : [...profiles, {
      ...data.owner, id: ids.ownerId, role: "staff", staff_role: "owner", wallet_balance: 0,
      store_id: ids.storeId, memberships: [{ store_id: ids.storeId, staff_role: "owner" }], created_at: now, updated_at: now,
    }],
    treasuries: { [ids.storeId]: { cash: data.opening_cash, bank: data.opening_bank },
      ...(previous.treasuries as Record<string, unknown> ?? {}) },
    ...(data.starter ? {
      rawMaterials: [...(Array.isArray(previous.rawMaterials) ? previous.rawMaterials : []), ...data.starter.raw.map((r, i) => ({ ...r, id: `setup-raw-${ids.storeId}-${i}`, store_id: ids.storeId, stock: 0, updated_at: now }))],
      products: [...(Array.isArray(previous.products) ? previous.products : []), ...data.starter.products.map((p, i) => ({ ...p, id: `setup-product-${ids.storeId}-${i}`, store_id: ids.storeId, opening_stock: 0, updated_at: now }))],
    } : {}),
  };
}