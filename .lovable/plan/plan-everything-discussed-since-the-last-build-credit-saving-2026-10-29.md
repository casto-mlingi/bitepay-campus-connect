# Plan: Everything discussed since the last build (credit-saving order)

Four small batches, done in order. Each one reuses screens and rules the app already has, so nothing gets rebuilt. No existing records are deleted or changed.

## Batch 1: POS stock limits (small, high value)
- Each product card shows **remaining = stock minus what's already in the current bill and in open saved bills**.
- Tapping a product or "+" stops at the remaining amount and shows a short "Only X left" message.
- Reducing or removing an item puts the stock back on the card right away.
- Stock is only actually deducted when the sale is completed, using the same per-order stock rows as today, so offline phones still merge correctly.

## Batch 2: Finished goods edit and delete
- Inventory gets Edit (name, price, photo, category) and Delete on each finished good.
- Delete **hides** the item from POS (archive) and never removes it, so past sales and receipts stay correct. Archived items can be restored.

## Batch 3: Guided first setup (extends the current setup page)
1. Business name, location, type (Canteen / Restaurant / Bar / Hotel), WhatsApp number
2. Waiter payments (Save bill only / Wallet only / All), tables on/off, mobile money on/off
3. Debt limit (0 / 20k / 50k / custom) and loyalty % (0 = off)
4. Opening drawer cash and bank/mobile balance
5. **Raw materials**: one-tap starter list for the business type, with checkboxes to keep or untick, plus "add your own"
6. **Finished goods (POS menu)**: starter dishes/drinks with editable prices, plus "add your own"
7. Owner account and PIN, then finish

Everything is saved in the same single registration step that already exists, so a cut-off setup can't leave a half-made store. "Skip" is allowed on steps 5 and 6.

## Batch 4: Launch guide after sign-in, and installable app
- A checklist card on the owner home screen: add raw materials, add finished goods, add staff, set opening cash, make your first sale. Each item links to its page and turns green when done (worked out from real data, nothing extra stored). It can be shrunk and disappears once everything is done.
- Install as an app: add the missing app info file and icons, plus iPhone home-screen tags. After you publish, you can make the Android APK for free at pwabuilder.com.

## How this saves credits
- Four batches, each finished in one go, with no rework in between.
- Reuse what already exists: the current setup page, Inventory forms, the business and staff rules, and the stock-row logic.
- Tests only for the rules: stock cap, keeping archived items, the setup steps saving together, and checklist completion. Then one quick browser check per batch.
- No new backend tables. Only optional fields are added (archived flag, starter-pack data).

## Technical notes
- Remaining stock is a selector in the store using `availablePlates`, the active cart and open tabs where status = open.
- Products get `archived_at?: string`. POS filters it out, while reports and receipts still resolve it.
- Starter packs live in a static module, split by business type, and are passed into the onboarding transaction in `src/lib/onboarding.ts`.
- The checklist reads only from store state.
- `public/manifest.webmanifest` gets 192/512 icons, and `apple-touch-icon` plus meta tags go in `__root.tsx`.
