
Big-scope client-side upgrade (all state stays in `src/lib/store.tsx` — no backend). Everything is one coordinated batch.

## Store additions (`src/lib/store.tsx`)
- Types: `StaffRole = "cashier"|"supervisor"|"owner"`; `Profile.staff_role?`; `Order.reference? / reversed? / reversal_of? / cashier_id? / shift_id?`; `Transaction.reference?`; `Shift`, `PendingSale`, `SmsLog`.
- New state: `shifts`, `activeShiftId`, `pendingSales`, `smsLogs`, `LOW_BALANCE_THRESHOLD`.
- New actions: `openShift(float)`, `closeShift(counted_cash, counted_mobile, notes)`, `reverseSale(orderId, reason)`, `enqueueSale(payload)`, `syncOutbox()`, `sendReceiptMessage(order, channel)`, `availablePlates(productId)`, `hasStaffRole(min)`.
- Every `posSale` / `posCashSale` / `topUp` now: accepts `reference?`, stamps `cashier_id` + `shift_id`, and low-balance nudge appended to smsLogs if wallet < threshold.

## Routes / components
- **`src/routes/shift.tsx` (new)** — open shift form, live Z-report per tender (cash/mobile/wallet), counted-cash + counted-mobile inputs with variance flag, close-shift button. Nav entry in staff-shell.
- **`src/components/staff-shell.tsx`** — add Shift nav item, show staff role badge + active-shift indicator, gate nav items behind role (cashier hides Finance/Analytics/Inventory create actions still visible but forms gated).
- **`src/routes/pos.tsx`** — add: reference field when tender=mobile (for both cash sale + split); refund button on Last Receipt panel that calls `reverseSale`; grey out products with 0 plates via `availablePlates`; guard sale if no active shift → toast + link to /shift; offline banner + auto-enqueue when `!navigator.onLine` with Sync button; "Send receipt SMS/WhatsApp" buttons on Last Receipt.
- **`src/routes/menu.tsx`** — hide products whose backing batches have 0 remaining (only when at least one batch exists for that product).
- **`src/routes/dashboard.tsx`** — add "My QR" card (QRCodeSVG with student id) + low-balance nudge banner when balance < threshold.
- **`src/routes/finance.tsx`** — add "Journal" tab: daily settlement entries per day (Sales credit, Cash/Bank debit, Wallet Liability entries, COGS→Inventory, Mobile Settlement T+1); breakdown of revenue by tender. Gate purchase/expense forms to supervisor+ (read-only otherwise).

## Notes
- Mobile provider simplified to a single "Mobile Money (Lipa Namba)" tender with a reference/confirmation code captured per sale/top-up, as user asked.
- Offline outbox is real: uses `navigator.onLine`; queued payloads replay via `syncOutbox()` when back online.
- Reversal creates a mirrored `reversal_of` order with negative amounts, refunds wallet, and reverses cash/bank movements.
- Roles seeded: existing `u2` becomes supervisor; add `u3` cashier + `u4` owner demo accounts on the login screen quick-fill.

Deferred (out of scope for this pass): real SMS/WhatsApp provider integration — the button logs a mock delivery entry in `smsLogs` and toasts. Wiring to Twilio/GatewayAPI is a separate task requiring the user to pick a provider + secrets.
