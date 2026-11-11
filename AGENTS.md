<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Shared cooked-stock balances are derived from immutable per-order usage rows so offline device merges preserve every deduction.
- Staff permissions and PIN requirements live in the shared staff-rules module; forms and store actions use it so waiter restrictions remain consistent.
- Business modes add service tools without removing existing workflows; business-rules centralizes mode and payment/refund checks.
- Waiter wallet sales require an expiring, one-use in-memory scan grant scoped to customer, staff and store, including customer PIN verification when set; never queue these grants offline.
- Refund requests and decisions live on their order with updated timestamps for snapshot merging; only manager actions execute reversals.
- Order identifiers use UUIDs rather than per-session counters so refunds and cross-device orders cannot overwrite original sales.
- Snapshot writes require a verified server session, reject local-development requests, use exact base-revision checks, and retain immutable database versions; this prevents test and stale-device replacement of customer data.
- Recovery only reconstructs evidenced records and preserves the pre-recovery payload; missing historical transactions must never be fabricated.
- Operational backups use a verified, repeatable-read internal archive of the current snapshot and requested business tables before any recovery; this protects current records without exposing private data in exports or logs.
- Owner onboarding persists canonical database IDs before creating local state, so reloads and recovery cannot split one owner into unrelated accounts.
- Owner registration commits its visible snapshot records in the same database transaction as the canonical account; interrupted onboarding must not strand an account without a store in the app.
- Snapshot acknowledgements compare the exact sent payload to current device state, and local hydration never waits for network initialization; this keeps later offline edits queued and prevents upload replies from clearing them.
- Preserve store context identity in Vite hot-module data during preview edits, never in an SSR global; provider and split-route consumers must keep the same context without sharing user state between requests.
- Server calls carry the signed session as both a partitioned cookie and an x-bp-session header from browser storage, renewed on each launch; phones that block framed cookies must still sync.
- Saved POS bills (open tabs) are status rows (open/paid/cancelled) with updated_at, never deleted, so snapshot union-merges cannot revive closed bills; an explicit waiter pick on a sale overrides table attribution.

- Supplier bills are credit purchases; amounts owed are derived from append-only supplier payment rows so offline merges keep every payment.
- Customer balances (receivables) are a read-only aging view built from unpaid delivery orders, approved pay-later wallet debt and open tabs; collections go through each source's existing payment action.
- POS settlement rules live in pos-payments; orders retain separate tender receipts, treasury deltas, wallet charges and saved change so debt, refunds and shift reports do not mistake tendered money for sales revenue.
- POS completion actions pass the change disposition directly to the sale handler rather than setting a toggle first, preventing stale selection state from changing the financial outcome.
- Wallet reads use a group-level opening anchor plus unique subsequent transaction rows; a group wallet never adds its legacy display balance, preserving deductions across device merges without inventing missing history.
- Witnessed shift closes are verified and frozen server-side; drawer float and safe handovers are locations of existing cash, not new revenue or expenses.
- POS stock reservation (pos-stock) counts the active bill plus other open saved bills; real stock deductions still happen only at sale completion.
- Products are archived (archived_at) instead of deleted so historical orders and receipts keep resolving.
- Raw and product items carry optional supplier-pack fields (pack_unit/pack_size) normalized by pack-units.normalizePack, so buying by the crate converts to stocking pieces and an invalid pack is dropped rather than saved.
- First-run starter raw materials/products are owner-selected in setup and inserted by completeSetup with zero stock; nothing is seeded automatically.
- The owner launch checklist is derived from live records only (launch-guide), never stored.
- Account packages, prices, owner-group store caps and business eligibility live in subscription-rules; existing hospitality tools remain grandfathered to avoid daily-work regressions.
- Retail stock is derived from immutable opening quantities, purchase rows and signed sale/refund quantities in retail-stock, never a mutable display balance, so offline merges retain deductions.
- New branches inherit verified account billing at the locked snapshot boundary; staff snapshot uploads cannot modify subscriptions or opening-stock anchors, preventing self-upgrades and stock inflation.
- BytePay Gateway SMS payments live in gateway tables (devices with hashed secrets, provider+reference-unique SMS rows, expiring checkouts); sms-parser matching only auto-pays an exact amount with one unambiguous checkout so typos and duplicates never double-credit.
- Customer Lipa Namba top-ups are mirrored to gateway_topups (10-minute window); the gateway phone polls /api/public/gateway/pending, SMS ingest settles exactly one matching top-up, and the customer's device credits the wallet idempotently (reference gw:<id>) so snapshot merges never double-credit. Top-ups match on receipt number only and credit the SMS amount; staff confirmations lock the receipt server-side first so it can never be credited twice.
- Hospitality finished goods are products flagged direct_sale whose stock lives in ingredient-free batches; raw items moved there keep a converted_product_id instead of being deleted so old cooking batches still resolve.
- Finance uses hospitality-costing; Journal and Books share buildLedger to prevent report drift.
- Sector wording (retail/hospitality/canteen) comes from business-rules sectorTerms; shared public screens stay sector-neutral so no business sees another sector's words.
