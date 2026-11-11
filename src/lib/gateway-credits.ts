/**
 * Durable wallet credit for gateway-verified Lipa Namba top-ups.
 * Runs on the server against the shared records so a confirmed SMS always reaches the
 * customer's balance, even if the customer closed the page or their phone cannot upload.
 * Idempotent: one transaction per top-up (id `gw-<topup id>`, reference `gw:<topup id>`).
 */
export type PaidTopup = { id: string; store_id: string; customer_id: string; reference: string; amount: number; paid_at: number };
type Row = Record<string, unknown>;

export function applyGatewayCredits(snapshot: Record<string, unknown>, paid: PaidTopup[]): { snapshot: Record<string, unknown>; credited: string[] } {
  const txs = (Array.isArray(snapshot.transactions) ? snapshot.transactions : []) as Row[];
  const reqs = (Array.isArray(snapshot.topUpRequests) ? snapshot.topUpRequests : []) as Row[];
  const credited: string[] = [];
  const newTx: Row[] = [];
  const approved = new Map<string, number>();
  for (const t of paid) {
    const amount = Math.round(t.amount);
    if (!Number.isSafeInteger(amount) || amount <= 0) continue;
    const exists = txs.some((x) => x.id === `gw-${t.id}` || x.reference === `gw:${t.id}` ||
      (x.customer_id === t.customer_id && x.type === "topup" && String(x.reference ?? "").toUpperCase() === t.reference.toUpperCase()));
    approved.set(t.id, amount);
    if (exists) continue;
    newTx.push({ id: `gw-${t.id}`, store_id: t.store_id, customer_id: t.customer_id, type: "topup", amount,
      description: `Lipa Namba top-up confirmed by BitePay (receipt ${t.reference})`, tender: "mobile", created_at: t.paid_at, reference: `gw:${t.id}` });
    credited.push(t.id);
  }
  const nextReqs = reqs.map((r) => {
    const amt = approved.get(String(r.id));
    return amt != null && r.status !== "approved" && !r.resolved_by ? { ...r, status: "approved", amount: amt, resolved_at: r.resolved_at ?? Date.now() } : r;
  });
  if (!credited.length && nextReqs.every((r, i) => r === reqs[i])) return { snapshot, credited };
  const treasuries = { ...((snapshot.treasuries as Record<string, { cash: number; bank: number }>) ?? {}) };
  for (const t of newTx) {
    const sid = String(t.store_id);
    const cur = treasuries[sid] ?? { cash: 0, bank: 0 };
    treasuries[sid] = { ...cur, bank: (cur.bank ?? 0) + Number(t.amount) };
  }
  return { snapshot: { ...snapshot, transactions: [...newTx, ...txs], topUpRequests: nextReqs, treasuries }, credited };
}

/** Auto-matched (not staff-claimed) paid top-ups from the last 60 days, with the SMS amount as truth. */
export async function loadPaidTopups(tx: any): Promise<PaidTopup[]> {
  const rows = await tx`select t.id, t.store_id, t.customer_id, t.reference, coalesce(t.paid_amount, s.amount, t.amount) as amount, coalesce(t.paid_at, t.created_at) as paid_at
    from gateway_topups t join gateway_sms s on s.id = t.sms_id
    where t.status='paid' and s.checkout_id = 'topup:' || t.id and t.created_at > now() - interval '60 days'`;
  return rows.map((r: Row) => ({ id: String(r.id), store_id: String(r.store_id), customer_id: String(r.customer_id), reference: String(r.reference), amount: Number(r.amount), paid_at: new Date(r.paid_at as string).getTime() }));
}

/** Write any missing credits into the shared records (own transaction, row-locked). */
export async function settlePaidTopupsInSnapshot(sql: any) {
  return sql.begin(async (tx: any) => {
    const [cur] = await tx`select revision, payload from app_snapshots where key='global' for update`;
    if (!cur) return [];
    const { snapshot, credited } = applyGatewayCredits(JSON.parse(String(cur.payload)), await loadPaidTopups(tx));
    if (!credited.length) return credited;
    await tx`update app_snapshots set revision=${Number(cur.revision) + 1}, payload=${JSON.stringify(snapshot)}, updated_at=now() where key='global'`;
    return credited;
  });
}
