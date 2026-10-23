# Roadmap

## Unified POS payments (Oct 23)
- [ ] Add capped wallet debt, cash/mobile received amounts, saved change and customer change payouts without removing existing payments.
- [ ] Connect receipts, financial entries and aging; test concrete amounts and responsive payment screens without uploading fixtures.

## Store signup and silent offline saving
- [x] Remove global-owner signup blocking, validate inputs before registration, and commit canonical onboarding records with the account.
- [x] Save changes on the device before network initialization; retry prerequisite downloads and queued uploads automatically, preserving edits made during uploads and device-local shift state.
- [x] Verify signup validation, database connectivity, local settings saving and reload, plus preservation tests without uploading fixtures.
- [ ] Verify completed account creation and reconnect upload on the live site (blocked: requires redeployment and a real signup; localhost uploads remain deliberately prohibited).

## Current sales and historical recovery
- [x] Archive current sales, payments, inventory and balances and verify the saved copy.
- [x] Inspect available snapshot versions, recovery archives and audit evidence; archived sales belong only to quarantined test fixtures.
- [ ] Restore evidenced missing history without replacing current records (blocked: available archives contain no real historical sales; needs an older hosting backup or unaffected device copy).

## Data recovery and protection
- [x] Archive shared records and recover six evidenced stores, owner accounts and treasury balances.
- [x] Block local-test uploads, destructive replacement and stale revisions; retain database versions.
- [x] Verify database protections and recovered browser data persistence with isolated tests.
- [ ] Verify recovered owner sign-in end to end (requires the owner to sign in with their existing password).
- [ ] Recover unavailable history (requires an older backup or an unaffected device).
- [ ] Apply updated application protections on the self-hosted site (requires redeployment).

## Business modes and waiter service (Oct 18)
- [x] Add unpaid POS bill printing and additive business-type settings with food/beverage service tools.
- [x] Enable single-sale QR-only waiter wallet payments without wallet browsing or top-ups.
- [x] Add assigned-table access, preparation notes, ready alerts and manager-approved refund requests with a decision log.
- [x] Test rules and isolated owner/waiter POS flows, including actual camera decoding and refund approval. Live cross-device/payment verification requires redeployment and real accounts.

## Team and waiter access (Oct 17)
- [x] Fix team creation and show failed submissions inside the form.
- [x] Allow waiter creation and sales without a staff PIN; deny wallets and top-ups.
- [x] Test isolated owner creation flow and waiter restrictions; suggest table service, kitchen notes and ready-order alerts (live cross-device verification not performed).

- [x] Finish delivery pricing, saved addresses, staff delivery details, notification text, and automatic sync recovery.
- [x] Inspect current inventory, finished-goods batch, recipe, and POS deduction flows.
- [x] Add bulk cooked commodity batches with active-batch balances.
- [x] Add standardized full/sub-portion mappings from menu items to cooked commodities.
- [x] Deduct mapped portions from active batches when POS/customer sales complete.
- [x] Add batch reconciliation showing initial, sold, and estimated remaining quantities.
- [x] Verify responsive UI, types, app routes, and current build health.

## New requests (Oct 3)
- [x] Android install (home-screen app) that asks for notification permission
- [x] Publish app for phone install + alert test
- [x] Mobile staff layout: swipeable order board, cart, My performance
- [x] Automatic nightly commission payout (Labor expense + waiter balances)
- [x] Dish photos to file storage + rebuilt sync retry
- [x] Cooked-stock waste log reconciled per batch
