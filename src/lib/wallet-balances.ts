type WalletProfile = { id: string; store_id?: string; wallet_balance?: number; wallets?: Record<string, number>; wallet_anchors?: Record<string, { balance: number; transaction_ids: string[] }> };
type WalletRow = { id: string; customer_id: string; store_id: string; type: "topup" | "deduction"; amount: number };
export function canonicalWallet(p: WalletProfile, org: string, siblings: string[]) {
  const w = p.wallets ?? {};
  // A group key is authoritative; never add its legacy display copy again.
  if (org in w) return w[org];
  const keys = siblings.filter((id) => id in w);
  if (keys.length) return keys.reduce((sum, id) => sum + w[id], 0);
  return p.store_id === org || siblings.includes(p.store_id ?? "") ? p.wallet_balance ?? 0 : 0;
}
export function liveWallet(p: WalletProfile, org: string, siblings: string[], rows: WalletRow[]) {
  const anchor = p.wallet_anchors?.[org];
  if (!anchor) return canonicalWallet(p, org, siblings);
  const seen = new Set(anchor.transaction_ids);
  const unique = new Map(rows.filter((r) => r.customer_id === p.id && (r.store_id === org || siblings.includes(r.store_id))).map((r) => [r.id, r]));
  return anchor.balance + [...unique.values()].reduce((sum, r) => sum + (seen.has(r.id) ? 0 : r.type === "topup" ? r.amount : -r.amount), 0);
}
export function loyaltyReward(total: number, percentage: number, balanceAfter: number) {
  return balanceAfter < 0 || !Number.isFinite(percentage) || percentage <= 0 ? 0 : Math.round(total * Math.min(100, percentage) / 100);
}