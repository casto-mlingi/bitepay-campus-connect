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
