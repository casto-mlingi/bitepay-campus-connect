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
