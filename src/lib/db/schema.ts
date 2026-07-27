/**
 * Drizzle schema mirroring the BitePay Postgres 18 database.
 * Kept server-only via the .server-adjacent import from db.server.ts.
 * All monetary/quantity numerics are exposed as string (postgres.js default)
 * to avoid float rounding — cast at the application boundary.
 */
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  numeric,
  integer,
  boolean,
  timestamp,
  date,
  jsonb,
  bigserial,
  primaryKey,
} from "drizzle-orm/pg-core";

// ── Enums ────────────────────────────────────────────────────────────────
export const accountKind = pgEnum("account_kind", [
  "asset", "liability", "equity", "revenue", "expense",
]);
export const cashSource = pgEnum("cash_source", ["cash", "bank"]);
export const journalSide = pgEnum("journal_side", ["debit", "credit"]);
export const mmProvider = pgEnum("mm_provider", [
  "mpesa", "tigopesa", "airtelmoney", "halopesa", "other",
]);
export const notifKind = pgEnum("notif_kind", [
  "low_balance", "topup_approved", "topup_rejected", "order_ready", "system", "promo",
]);
export const orderChannel = pgEnum("order_channel", ["customer_app", "pos_walkin"]);
export const orderStatus = pgEnum("order_status", [
  "pending", "preparing", "ready", "completed", "cancelled", "refunded",
]);
export const rawUnit = pgEnum("raw_unit", ["kg", "liters", "pcs", "g", "ml"]);
export const shiftStatus = pgEnum("shift_status", ["open", "closed"]);
export const staffRole = pgEnum("staff_role", ["cashier", "supervisor", "owner"]);
export const subPlan = pgEnum("sub_plan", ["trial", "starter", "pro", "enterprise"]);
export const subStatus = pgEnum("sub_status", ["active", "past_due", "canceled", "expired"]);
export const tenderType = pgEnum("tender_type", ["wallet", "cash", "mobile_money", "split"]);
export const ticketPriority = pgEnum("ticket_priority", ["low", "normal", "high", "urgent"]);
export const ticketStatus = pgEnum("ticket_status", ["open", "in_progress", "resolved", "closed"]);
export const topupStatus = pgEnum("topup_status", ["pending", "approved", "rejected", "cancelled"]);
export const txnType = pgEnum("txn_type", [
  "topup", "purchase", "refund", "adjustment", "transfer_in", "transfer_out",
]);
export const userRole = pgEnum("user_role", ["customer", "staff", "super_admin"]);

// Helpers
const id = () => uuid("id").primaryKey().defaultRandom();
const money = (name: string) => numeric(name, { precision: 14, scale: 2 });
const qty = (name: string) => numeric(name, { precision: 14, scale: 3 });
const ts = (name: string) => timestamp(name, { withTimezone: true });
const now = () => ts("created_at").notNull().defaultNow();

// ── Core / tenants ───────────────────────────────────────────────────────
export const stores = pgTable("stores", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull(), // citext in DB
  location: text("location"),
  contactPhone: text("contact_phone"),
  currencyLabel: text("currency_label").notNull().default("TZS"),
  lowBalanceNudge: money("low_balance_nudge").notNull().default("2000"),
  features: jsonb("features").notNull().default({}),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: now(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  id: id(),
  storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  plan: subPlan("plan").notNull().default("trial"),
  status: subStatus("status").notNull().default("active"),
  trialEndsAt: ts("trial_ends_at"),
  currentPeriodStart: ts("current_period_start").notNull().defaultNow(),
  currentPeriodEnd: ts("current_period_end"),
  amount: money("amount").notNull().default("0"),
  seats: integer("seats").notNull().default(5),
  createdAt: now(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

// ── Identity ─────────────────────────────────────────────────────────────
export const profiles = pgTable("profiles", {
  id: id(),
  role: userRole("role").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),   // citext
  email: text("email"),   // citext
  passwordHash: text("password_hash").notNull(),
  pinHash: text("pin_hash"),
  homeStoreId: uuid("home_store_id").references(() => stores.id, { onDelete: "set null" }),
  staffRole: staffRole("staff_role"),
  isDisabled: boolean("is_disabled").notNull().default(false),
  lastSigninAt: ts("last_signin_at"),
  createdAt: now(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const wallets = pgTable("wallets", {
  id: id(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  balance: money("balance").notNull().default("0"),
  loyaltyPts: integer("loyalty_pts").notNull().default(0),
  createdAt: now(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

// ── Catalog ──────────────────────────────────────────────────────────────
export const products = pgTable("products", {
  id: id(),
  storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  emoji: text("emoji"),
  category: text("category"),
  price: money("price").notNull(),
  isAvailable: boolean("is_available").notNull().default(true),
  stockPlates: integer("stock_plates").notNull().default(0),
  createdAt: now(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const rawMaterials = pgTable("raw_materials", {
  id: id(),
  storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category"),
  unit: rawUnit("unit").notNull(),
  stock: qty("stock").notNull().default("0"),
  avgCost: money("avg_cost").notNull().default("0"),
  lowThreshold: qty("low_threshold").notNull().default("0"),
  createdAt: now(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const cookingBatches = pgTable("cooking_batches", {
  id: id(),
  storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id),
  plates: integer("plates").notNull(),
  platesRemaining: integer("plates_remaining").notNull(),
  rawCost: money("raw_cost").notNull().default("0"),
  laborCost: money("labor_cost").notNull().default("0"),
  unitCost: money("unit_cost").notNull().default("0"),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: now(),
});

export const batchIngredients = pgTable("batch_ingredients", {
  id: id(),
  batchId: uuid("batch_id").notNull().references(() => cookingBatches.id, { onDelete: "cascade" }),
  rawId: uuid("raw_id").notNull().references(() => rawMaterials.id),
  qty: qty("qty").notNull(),
  unitCost: money("unit_cost").notNull().default("0"),
});

export const wastageLogs = pgTable("wastage_logs", {
  id: id(),
  storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  batchId: uuid("batch_id").references(() => cookingBatches.id),
  productId: uuid("product_id").references(() => products.id),
  plates: integer("plates").notNull(),
  costImpact: money("cost_impact").notNull().default("0"),
  reason: text("reason"),
  loggedBy: uuid("logged_by").references(() => profiles.id),
  createdAt: now(),
});

// ── Operations ───────────────────────────────────────────────────────────
export const shifts = pgTable("shifts", {
  id: id(),
  storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  openedBy: uuid("opened_by").notNull().references(() => profiles.id),
  closedBy: uuid("closed_by").references(() => profiles.id),
  openedAt: ts("opened_at").notNull().defaultNow(),
  closedAt: ts("closed_at"),
  openingFloat: money("opening_float").notNull().default("0"),
  closingCash: money("closing_cash"),
  expectedCash: money("expected_cash"),
  variance: money("variance"),
  status: shiftStatus("status").notNull().default("open"),
  notes: text("notes"),
});

export const orders = pgTable("orders", {
  id: id(),
  storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  shiftId: uuid("shift_id").references(() => shifts.id),
  customerId: uuid("customer_id").references(() => profiles.id),
  cashierId: uuid("cashier_id").references(() => profiles.id),
  channel: orderChannel("channel").notNull(),
  status: orderStatus("status").notNull().default("pending"),
  subtotal: money("subtotal").notNull().default("0"),
  discount: money("discount").notNull().default("0"),
  tax: money("tax").notNull().default("0"),
  total: money("total").notNull().default("0"),
  receiptNo: text("receipt_no"),
  createdAt: now(),
  completedAt: ts("completed_at"),
});

export const orderItems = pgTable("order_items", {
  id: id(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id),
  batchId: uuid("batch_id").references(() => cookingBatches.id),
  qty: integer("qty").notNull(),
  unitPrice: money("unit_price").notNull(),
  unitCost: money("unit_cost").notNull().default("0"),
  lineTotal: money("line_total").notNull(),
});

export const payments = pgTable("payments", {
  id: id(),
  storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }),
  tender: tenderType("tender").notNull(),
  mmProvider: mmProvider("mm_provider"),
  amount: money("amount").notNull(),
  cashReceived: money("cash_received"),
  changeGiven: money("change_given"),
  reference: text("reference"),
  createdAt: now(),
});

// ── Wallet ledger ────────────────────────────────────────────────────────
export const walletTransactions = pgTable("wallet_transactions", {
  id: id(),
  storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  walletId: uuid("wallet_id").notNull().references(() => wallets.id, { onDelete: "cascade" }),
  type: txnType("type").notNull(),
  amount: money("amount").notNull(),
  balanceAfter: money("balance_after").notNull(),
  orderId: uuid("order_id").references(() => orders.id),
  performedBy: uuid("performed_by").references(() => profiles.id),
  memo: text("memo"),
  createdAt: now(),
});

export const topupRequests = pgTable("topup_requests", {
  id: id(),
  storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  amount: money("amount").notNull(),
  paymentRef: text("payment_ref"),
  mmProvider: mmProvider("mm_provider"),
  status: topupStatus("status").notNull().default("pending"),
  approvedBy: uuid("approved_by").references(() => profiles.id),
  approvedAt: ts("approved_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: now(),
});

// ── Accounting ───────────────────────────────────────────────────────────
export const accounts = pgTable("accounts", {
  id: id(),
  storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  name: text("name").notNull(),
  kind: accountKind("kind").notNull(),
  isSystem: boolean("is_system").notNull().default(false),
});

export const journalEntries = pgTable("journal_entries", {
  id: id(),
  storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  entryDate: date("entry_date").notNull().defaultNow(),
  memo: text("memo"),
  source: text("source"),
  sourceId: uuid("source_id"),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: now(),
});

export const journalLines = pgTable("journal_lines", {
  id: id(),
  entryId: uuid("entry_id").notNull().references(() => journalEntries.id, { onDelete: "cascade" }),
  accountId: uuid("account_id").notNull().references(() => accounts.id),
  side: journalSide("side").notNull(),
  amount: money("amount").notNull(),
});

// ── Treasury ─────────────────────────────────────────────────────────────
export const treasuryBalances = pgTable(
  "treasury_balances",
  {
    storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
    cash: money("cash").notNull().default("0"),
    bank: money("bank").notNull().default("0"),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.storeId] }) }),
);

export const treasuryTransfers = pgTable("treasury_transfers", {
  id: id(),
  storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  fromSide: cashSource("from_side").notNull(),
  toSide: cashSource("to_side").notNull(),
  amount: money("amount").notNull(),
  reference: text("reference"),
  performedBy: uuid("performed_by").references(() => profiles.id),
  createdAt: now(),
});

export const purchases = pgTable("purchases", {
  id: id(),
  storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  supplier: text("supplier"),
  paidFrom: cashSource("paid_from").notNull().default("cash"),
  total: money("total").notNull(),
  note: text("note"),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: now(),
});

export const purchaseItems = pgTable("purchase_items", {
  id: id(),
  purchaseId: uuid("purchase_id").notNull().references(() => purchases.id, { onDelete: "cascade" }),
  rawId: uuid("raw_id").notNull().references(() => rawMaterials.id),
  qty: qty("qty").notNull(),
  unitCost: money("unit_cost").notNull(),
  lineTotal: money("line_total").notNull(),
});

export const expenses = pgTable("expenses", {
  id: id(),
  storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  amount: money("amount").notNull(),
  paidFrom: cashSource("paid_from").notNull().default("cash"),
  note: text("note"),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: now(),
});

// ── System ───────────────────────────────────────────────────────────────
export const notifications = pgTable("notifications", {
  id: id(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  storeId: uuid("store_id").references(() => stores.id, { onDelete: "cascade" }),
  kind: notifKind("kind").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  data: jsonb("data"),
  readAt: ts("read_at"),
  createdAt: now(),
});

export const supportTickets = pgTable("support_tickets", {
  id: id(),
  storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  openedBy: uuid("opened_by").notNull().references(() => profiles.id),
  subject: text("subject").notNull(),
  body: text("body"),
  priority: ticketPriority("priority").notNull().default("normal"),
  status: ticketStatus("status").notNull().default("open"),
  assignedTo: uuid("assigned_to").references(() => profiles.id),
  createdAt: now(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const ticketMessages = pgTable("ticket_messages", {
  id: id(),
  ticketId: uuid("ticket_id").notNull().references(() => supportTickets.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").notNull().references(() => profiles.id),
  body: text("body").notNull(),
  createdAt: now(),
});

export const pendingSales = pgTable("pending_sales", {
  id: id(),
  storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  deviceId: text("device_id"),
  payload: jsonb("payload").notNull(),
  syncedAt: ts("synced_at"),
  error: text("error"),
  createdAt: now(),
});

export const auditLog = pgTable("audit_log", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  storeId: uuid("store_id").references(() => stores.id, { onDelete: "cascade" }),
  actorId: uuid("actor_id").references(() => profiles.id),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: uuid("entity_id"),
  before: jsonb("before"),
  after: jsonb("after"),
  ip: text("ip"), // inet in DB, expose as string
  createdAt: now(),
});
