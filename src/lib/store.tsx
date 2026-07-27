import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Role = "customer" | "staff";
export type StaffRole = "cashier" | "supervisor" | "owner";
export type Profile = {
  id: string;
  full_name: string;
  phone: string;
  password: string;
  wallet_balance: number; // legacy — for customers this reflects the ACTIVE canteen wallet
  wallets?: Record<string, number>; // per-canteen balances (customers only)
  role: Role;
  staff_role?: StaffRole;
  staff_pin?: string;
  disabled?: boolean;
  last_login?: number;
  created_at?: number;
  store_id?: string; // home canteen (customer signup) / tenant (staff)
};


export type SubscriptionPlan = "trial" | "starter" | "pro" | "enterprise";
export type SubscriptionStatus = "active" | "suspended" | "expired";
export type Subscription = {
  plan: SubscriptionPlan;
  started_at: number;
  expires_at: number;
  status: SubscriptionStatus;
  monthly_price: number;
};

export type Store = {
  id: string;
  name: string;
  location: string;
  contact_phone: string;
  currency: string;
  low_balance_threshold: number;
  enable_mobile_tender: boolean;
  created_at: number;
  subscription: Subscription;
};

export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "low" | "normal" | "high" | "urgent";
export type TicketReply = { id: string; from: "store" | "admin"; author_name: string; body: string; created_at: number };
export type Ticket = {
  id: string;
  store_id: string;
  subject: string;
  message: string;
  category: "billing" | "technical" | "feature" | "other";
  priority: TicketPriority;
  status: TicketStatus;
  created_by_id: string;
  created_by_name: string;
  created_at: number;
  updated_at: number;
  replies: TicketReply[];
};

export type SuperAdmin = { username: string; password: string; full_name: string };
export type AdminAuditLog = { id: string; action: string; detail: string; created_at: number };

export const PLAN_PRICE: Record<SubscriptionPlan, number> = { trial: 0, starter: 25000, pro: 60000, enterprise: 150000 };
export const PLAN_LABEL: Record<SubscriptionPlan, string> = { trial: "Free Trial", starter: "Starter", pro: "Pro", enterprise: "Enterprise" };
export const PLAN_FEATURES: Record<SubscriptionPlan, string[]> = {
  trial: ["All features for 14 days", "Unlimited staff", "Unlimited customers"],
  starter: ["Up to 3 staff", "1,000 customers", "POS + Wallet + Inventory"],
  pro: ["Unlimited staff", "Unlimited customers", "Multi-tender + Analytics + Batch costing"],
  enterprise: ["Everything in Pro", "Priority support", "Custom onboarding & SLA"],
};

export type Permission =
  | "pos.sell" | "pos.refund" | "shift.manage"
  | "customers.view" | "customers.topup"
  | "inventory.view" | "inventory.edit"
  | "finance.view" | "finance.edit"
  | "analytics.view"
  | "team.view" | "team.manage_cashier" | "team.manage_all"
  | "settings.manage";

const PERMISSIONS: Record<StaffRole, Permission[]> = {
  cashier: ["pos.sell", "pos.refund", "shift.manage", "customers.view", "customers.topup", "inventory.view"],
  supervisor: [
    "pos.sell", "pos.refund", "shift.manage", "customers.view", "customers.topup",
    "inventory.view", "inventory.edit", "finance.view", "finance.edit", "analytics.view",
    "team.view", "team.manage_cashier",
  ],
  owner: [
    "pos.sell", "pos.refund", "shift.manage", "customers.view", "customers.topup",
    "inventory.view", "inventory.edit", "finance.view", "finance.edit", "analytics.view",
    "team.view", "team.manage_cashier", "team.manage_all", "settings.manage",
  ],
};

export type TopUpRequestStatus = "pending" | "approved" | "rejected";
export type TopUpRequest = {
  id: string;
  store_id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  amount: number;
  reference: string;
  note?: string;
  status: TopUpRequestStatus;
  created_at: number;
  resolved_at?: number;
  resolved_by?: string;
  reject_reason?: string;
};

export type Product = {
  id: string;
  store_id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  emoji: string;
  gradient: string;
};

export type OrderStatus = "new" | "in-progress" | "ready" | "completed";
export type DeliveryType = "pickup" | "delivery";

export type OrderItem = { product_id: string; name: string; price: number; qty: number };
export type Order = {
  id: string;
  store_id: string;
  customer_id: string;
  customer_name: string;
  items: OrderItem[];
  total_amount: number;
  status: OrderStatus;
  delivery_type: DeliveryType;
  payment_status: "paid" | "unpaid";
  created_at: number;
  receipt_no?: string;
  cash_paid?: number;
  wallet_paid?: number;
  loyalty_earned?: number;
  tender?: "cash" | "mobile";
  reference?: string;
  reversed?: boolean;
  reversal_of?: string;
  is_reversal?: boolean;
  cashier_id?: string;
  cashier_name?: string;
  shift_id?: string;
};

export type Transaction = {
  id: string;
  store_id: string;
  customer_id: string;
  order_id?: string;
  type: "topup" | "deduction";
  amount: number;
  description: string;
  created_at: number;
  reference?: string;
};

export type RawMaterial = {
  id: string;
  store_id: string;
  name: string;
  category: string;
  unit: "kg" | "liters" | "pcs";
  stock: number;
  avg_cost: number;
  low_threshold: number;
};

export type BatchIngredient = { raw_id: string; qty: number };
export type CookingBatch = {
  id: string;
  store_id: string;
  product_id: string;
  ingredients: BatchIngredient[];
  labor_cost: number;
  plates: number;
  raw_cost: number;
  unit_cost: number;
  plates_remaining: number;
  created_at: number;
};

export type WastageLog = {
  id: string;
  store_id: string;
  batch_id: string;
  product_name: string;
  plates: number;
  reason: string;
  created_at: number;
};

export type PaymentMethod = "cash" | "bank";
export type Purchase = {
  id: string;
  store_id: string;
  date: number;
  supplier: string;
  raw_id: string;
  raw_name: string;
  qty: number;
  total_cost: number;
  payment_method: PaymentMethod;
};

export type ExpenseCategory = "Labor" | "Utilities" | "Transport" | "Maintenance" | "Other";
export type Expense = {
  id: string;
  store_id: string;
  date: number;
  category: ExpenseCategory;
  amount: number;
  description: string;
  payment_method: PaymentMethod;
};

export type CartItem = { product: Product; qty: number };

export type Shift = {
  id: string;
  store_id: string;
  cashier_id: string;
  cashier_name: string;
  opened_at: number;
  closed_at?: number;
  opening_float: number;
  counted_cash?: number;
  counted_mobile?: number;
  cash_variance?: number;
  mobile_variance?: number;
  notes?: string;
};

export type PendingSaleKind = "wallet" | "cash";
export type PendingSale = {
  id: string;
  store_id: string;
  queued_at: number;
  kind: PendingSaleKind;
  customer_id?: string;
  customer_name?: string;
  items: OrderItem[];
  cash_portion?: number;
  cash_received?: number;
  tender: "cash" | "mobile";
  reference?: string;
};

export type SmsChannel = "sms" | "whatsapp";
export type SmsLog = {
  id: string;
  store_id: string;
  channel: SmsChannel;
  to_phone: string;
  to_name: string;
  message: string;
  kind: "receipt" | "nudge";
  created_at: number;
};

export type AppNotification = {
  id: string;
  store_id: string;
  user_id: string;
  title: string;
  body: string;
  kind: "low_balance" | "topup" | "order" | "info";
  created_at: number;
  read: boolean;
};

type SaleResult = { ok: true; order: Order } | { ok: false; reason: string };
type Ok<T = undefined> = T extends undefined ? { ok: true } : { ok: true; value: T };
type Fail = { ok: false; reason: string };

export type AddStaffInput = {
  full_name: string; phone: string; password: string; role: StaffRole; staff_pin: string;
};

type Treasury = { cash: number; bank: number };

type Ctx = {
  currentUser: Profile | null;
  profiles: Profile[]; // filtered to current store
  allProfiles: Profile[]; // unfiltered (for admin / login lookup)
  products: Product[]; // filtered
  orders: Order[]; // filtered
  transactions: Transaction[]; // filtered
  cart: CartItem[];
  rawMaterials: RawMaterial[];
  batches: CookingBatch[];
  wastage: WastageLog[];
  purchases: Purchase[];
  expenses: Expense[];
  cash: number;
  bank: number;
  shifts: Shift[];
  activeShift: Shift | null;
  pendingSales: PendingSale[];
  smsLogs: SmsLog[];
  notifications: AppNotification[];
  unreadNotifications: (userId: string) => AppNotification[];
  markNotificationsRead: (userId: string) => void;
  dismissNotification: (id: string) => void;
  isOnline: boolean;
  LOW_BALANCE_THRESHOLD: number;
  store: Store | null; // current tenant's store
  stores: Store[]; // all stores (for admin & customer picker)
  currentStoreId: string | null;
  selectedCanteenId: string | null; // customer's currently-shopping canteen
  setSelectedCanteen: (storeId: string) => void;
  availableCanteens: Store[]; // active canteens a customer can shop from
  hasOwner: boolean;

  login: (phone: string, password: string) => Profile | null;
  signup: (name: string, phone: string, password: string, store_id: string) => Profile | null;
  logout: () => void;
  hasStaffRole: (min: StaffRole) => boolean;
  can: (perm: Permission) => boolean;
  completeSetup: (input: { store: Omit<Store, "id" | "created_at" | "subscription">; owner: Omit<AddStaffInput, "role">; opening_cash?: number; opening_bank?: number }) => Ok | Fail;
  updateStore: (patch: Partial<Omit<Store, "id" | "created_at">>) => void;
  addStaff: (input: AddStaffInput) => Ok | Fail;
  updateStaff: (id: string, patch: Partial<Pick<Profile, "full_name" | "phone" | "staff_role">>) => Ok | Fail;
  disableStaff: (id: string, disabled: boolean) => Ok | Fail;
  resetStaffCredential: (id: string, kind: "password" | "pin", value: string) => Ok | Fail;
  addToCart: (p: Product) => void;
  setQty: (id: string, qty: number) => void;
  clearCart: () => void;
  placeOrder: (deliveryType: DeliveryType) => Order | null;
  advanceOrder: (id: string) => void;
  topUp: (customerId: string, amount: number, description?: string, tender?: "cash" | "mobile", reference?: string) => void;
  staffTopUp: (input: { customerId: string; amount: number; tender: "cash" | "mobile"; reference?: string; pin: string; requestId?: string }) => Ok | Fail;
  topUpRequests: TopUpRequest[];
  submitTopUpRequest: (input: { amount: number; reference: string; note?: string }) => TopUpRequest | null;
  rejectTopUpRequest: (id: string, reason: string) => void;
  setStaffPin: (currentPin: string | null, newPin: string) => Ok | Fail;
  posSale: (input: { customerId: string; items: OrderItem[]; cashPortion?: number; tender?: "cash" | "mobile"; reference?: string }) => SaleResult;
  posCashSale: (input: { items: OrderItem[]; cashReceived: number; customerName?: string; tender?: "cash" | "mobile"; reference?: string }) => SaleResult;
  reverseSale: (orderId: string, reason: string) => SaleResult;
  findCustomer: (query: string) => Profile | null;
  addCustomer: (input: { full_name: string; phone: string; initial_balance?: number }) => Profile | null;
  addRawMaterial: (r: Omit<RawMaterial, "id" | "store_id">) => void;
  updateRawStock: (id: string, delta: number) => void;
  createBatch: (input: { product_id: string; ingredients: BatchIngredient[]; labor_cost: number; plates: number }) => CookingBatch | null;
  logWastage: (batch_id: string, plates: number, reason: string) => void;
  recordPurchase: (input: { supplier: string; raw_id: string; qty: number; total_cost: number; payment_method: PaymentMethod; date?: number }) => Purchase | null;
  recordExpense: (input: { category: ExpenseCategory; amount: number; description: string; payment_method: PaymentMethod; date?: number }) => Expense | null;
  transferFunds: (from: PaymentMethod, amount: number) => boolean;
  availablePlates: (product_id: string) => number | null;
  openShift: (opening_float: number) => Shift | null;
  closeShift: (input: { counted_cash: number; counted_mobile: number; notes?: string }) => Shift | null;
  enqueueSale: (payload: Omit<PendingSale, "id" | "queued_at" | "store_id">) => void;
  syncOutbox: () => { synced: number; failed: number };
  sendReceiptMessage: (order: Order, channel: SmsChannel) => SmsLog | null;

  // Subscription & SaaS admin
  tickets: Ticket[];
  submitTicket: (input: { subject: string; message: string; category: Ticket["category"]; priority: TicketPriority }) => Ticket | null;
  replyToTicket: (ticketId: string, body: string) => Ok | Fail;
  updateTicketStatus: (ticketId: string, status: TicketStatus) => void;
  superAdmin: SuperAdmin;
  isAdminSignedIn: boolean;
  adminLogin: (username: string, password: string) => boolean;
  adminLogout: () => void;
  addSubscriptionDays: (days: number, storeId?: string) => void;
  changePlan: (plan: SubscriptionPlan, storeId?: string) => void;
  setSubscriptionStatus: (status: SubscriptionStatus, storeId?: string) => void;
  adminAuditLog: AdminAuditLog[];
  subscriptionDaysLeft: () => number;
  isSubscriptionBlocked: () => boolean;
};

const StoreContext = createContext<Ctx | null>(null);

const PRODUCT_TEMPLATE: Omit<Product, "id" | "store_id">[] = [
  { name: "Chicken Burger", description: "Crispy chicken, lettuce, house sauce", price: 4500, category: "Meals", emoji: "🍔", gradient: "from-orange-400 to-red-500" },
  { name: "Beef Chips", description: "Steak strips with hand-cut fries", price: 6000, category: "Meals", emoji: "🍟", gradient: "from-amber-400 to-orange-600" },
  { name: "Chapati Beans", description: "Soft chapati with stewed beans", price: 2500, category: "Meals", emoji: "🫓", gradient: "from-yellow-400 to-amber-500" },
  { name: "Pilau Rice", description: "Spiced rice with tender beef", price: 5000, category: "Meals", emoji: "🍛", gradient: "from-amber-500 to-red-500" },
  { name: "Samosa (2pc)", description: "Golden crispy triangles", price: 1500, category: "Snacks", emoji: "🥟", gradient: "from-orange-300 to-orange-500" },
  { name: "Mandazi (3pc)", description: "Sweet fluffy pastry", price: 1000, category: "Snacks", emoji: "🥐", gradient: "from-yellow-300 to-amber-400" },
  { name: "Fresh Juice", description: "Passion & mango blend", price: 2000, category: "Drinks", emoji: "🧃", gradient: "from-orange-300 to-pink-400" },
  { name: "Soda 500ml", description: "Chilled bottled soda", price: 1500, category: "Drinks", emoji: "🥤", gradient: "from-red-400 to-rose-500" },
  { name: "Coffee", description: "Freshly brewed Tanzanian coffee", price: 1800, category: "Drinks", emoji: "☕", gradient: "from-amber-700 to-yellow-800" },
];

const RAW_TEMPLATE: Omit<RawMaterial, "id" | "store_id">[] = [
  { name: "Rice", category: "Grains", unit: "kg", stock: 45, avg_cost: 3200, low_threshold: 20 },
  { name: "Beans", category: "Legumes", unit: "kg", stock: 12, avg_cost: 4500, low_threshold: 15 },
  { name: "Cooking Oil", category: "Oils", unit: "liters", stock: 18, avg_cost: 6800, low_threshold: 10 },
  { name: "Chicken", category: "Protein", unit: "kg", stock: 8, avg_cost: 12000, low_threshold: 10 },
  { name: "Wheat Flour", category: "Grains", unit: "kg", stock: 30, avg_cost: 2400, low_threshold: 15 },
  { name: "Onions", category: "Vegetables", unit: "kg", stock: 22, avg_cost: 1800, low_threshold: 10 },
];

let counter = 1043;
const nextOrderId = () => `O-${counter++}`;
const pad = (n: number, w = 3) => String(n).padStart(w, "0");
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}${pad(d.getMonth() + 1, 2)}${pad(d.getDate(), 2)}`;
};
const LOYALTY_RATE = 0.01;
const roleRank: Record<StaffRole, number> = { cashier: 1, supervisor: 2, owner: 3 };
const uid = (prefix: string) => `${prefix}${Date.now()}${Math.random().toString(36).slice(2, 6)}`;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedCanteenId, setSelectedCanteenId] = useState<string | null>(null);

  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [batches, setBatches] = useState<CookingBatch[]>([]);
  const [wastage, setWastage] = useState<WastageLog[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [treasuries, setTreasuries] = useState<Record<string, Treasury>>({});
  const [receiptSeq, setReceiptSeq] = useState<{ day: string; n: number }>({ day: todayKey(), n: 0 });
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);
  const [pendingSales, setPendingSales] = useState<PendingSale[]>([]);
  const [smsLogs, setSmsLogs] = useState<SmsLog[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [topUpRequests, setTopUpRequests] = useState<TopUpRequest[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [superAdminSignedIn, setSuperAdminSignedIn] = useState(false);
  const [adminAuditLog, setAdminAuditLog] = useState<AdminAuditLog[]>([]);
  const superAdmin: SuperAdmin = { username: "admin", password: "bitepay2025", full_name: "BitePay Admin" };
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator === "undefined" ? true : navigator.onLine);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const currentUser = profiles.find((p) => p.id === currentUserId) ?? null;
  const currentStoreId = currentUser?.store_id ?? null;
  const store = stores.find((s) => s.id === currentStoreId) ?? null;
  const hasOwner = profiles.some((p) => p.role === "staff" && p.staff_role === "owner" && !p.disabled);
  const LOW_BALANCE_THRESHOLD = store?.low_balance_threshold ?? 3000;

  // Filtered per-tenant views
  const scopedProducts = useMemo(() => currentStoreId ? products.filter((p) => p.store_id === currentStoreId) : [], [products, currentStoreId]);
  const scopedProfiles = useMemo(() => currentStoreId ? profiles.filter((p) => p.store_id === currentStoreId) : [], [profiles, currentStoreId]);
  const scopedOrders = useMemo(() => currentStoreId ? orders.filter((o) => o.store_id === currentStoreId) : [], [orders, currentStoreId]);
  const scopedTx = useMemo(() => currentStoreId ? transactions.filter((t) => t.store_id === currentStoreId) : [], [transactions, currentStoreId]);
  const scopedRaw = useMemo(() => currentStoreId ? rawMaterials.filter((r) => r.store_id === currentStoreId) : [], [rawMaterials, currentStoreId]);
  const scopedBatches = useMemo(() => currentStoreId ? batches.filter((b) => b.store_id === currentStoreId) : [], [batches, currentStoreId]);
  const scopedWaste = useMemo(() => currentStoreId ? wastage.filter((w) => w.store_id === currentStoreId) : [], [wastage, currentStoreId]);
  const scopedPurchases = useMemo(() => currentStoreId ? purchases.filter((p) => p.store_id === currentStoreId) : [], [purchases, currentStoreId]);
  const scopedExpenses = useMemo(() => currentStoreId ? expenses.filter((e) => e.store_id === currentStoreId) : [], [expenses, currentStoreId]);
  const scopedShifts = useMemo(() => currentStoreId ? shifts.filter((s) => s.store_id === currentStoreId) : [], [shifts, currentStoreId]);
  const scopedPending = useMemo(() => currentStoreId ? pendingSales.filter((p) => p.store_id === currentStoreId) : [], [pendingSales, currentStoreId]);
  const scopedSms = useMemo(() => currentStoreId ? smsLogs.filter((s) => s.store_id === currentStoreId) : [], [smsLogs, currentStoreId]);
  const scopedNotifs = useMemo(() => currentStoreId ? notifications.filter((n) => n.store_id === currentStoreId) : notifications, [notifications, currentStoreId]);
  const scopedRequests = useMemo(() => currentStoreId ? topUpRequests.filter((r) => r.store_id === currentStoreId) : [], [topUpRequests, currentStoreId]);
  const scopedTickets = useMemo(() => superAdminSignedIn ? tickets : (currentStoreId ? tickets.filter((t) => t.store_id === currentStoreId) : []), [tickets, currentStoreId, superAdminSignedIn]);

  const treasury: Treasury = (currentStoreId && treasuries[currentStoreId]) || { cash: 0, bank: 0 };
  const cash = treasury.cash;
  const bank = treasury.bank;

  const activeShift = scopedShifts.find((s) => s.id === activeShiftId && !s.closed_at) ?? null;

  const adjustCash = useCallback((updater: number | ((c: number) => number), sid?: string) => {
    const targetId = sid ?? currentStoreId;
    if (!targetId) return;
    setTreasuries((prev) => {
      const cur = prev[targetId] ?? { cash: 0, bank: 0 };
      const nv = typeof updater === "function" ? updater(cur.cash) : updater;
      return { ...prev, [targetId]: { ...cur, cash: nv } };
    });
  }, [currentStoreId]);

  const adjustBank = useCallback((updater: number | ((b: number) => number), sid?: string) => {
    const targetId = sid ?? currentStoreId;
    if (!targetId) return;
    setTreasuries((prev) => {
      const cur = prev[targetId] ?? { cash: 0, bank: 0 };
      const nv = typeof updater === "function" ? updater(cur.bank) : updater;
      return { ...prev, [targetId]: { ...cur, bank: nv } };
    });
  }, [currentStoreId]);

  const hasStaffRole = useCallback((min: StaffRole) => {
    if (!currentUser || currentUser.role !== "staff") return false;
    const rank = roleRank[currentUser.staff_role ?? "cashier"];
    return rank >= roleRank[min];
  }, [currentUser]);

  const can = useCallback((perm: Permission) => {
    if (!currentUser || currentUser.role !== "staff") return false;
    const role = currentUser.staff_role ?? "cashier";
    return PERMISSIONS[role].includes(perm);
  }, [currentUser]);

  const pushNotification = useCallback((n: Omit<AppNotification, "id" | "created_at" | "read">) => {
    setNotifications((prev) => [{ ...n, id: uid("n"), created_at: Date.now(), read: false }, ...prev]);
  }, []);

  const pushNudgeIfLow = useCallback((customer: Profile) => {
    if (!customer.store_id) return;
    const threshold = stores.find((s) => s.id === customer.store_id)?.low_balance_threshold ?? 3000;
    if (customer.wallet_balance >= threshold) return;
    setNotifications((prev) => {
      if (prev.some((n) => n.user_id === customer.id && n.kind === "low_balance" && !n.read)) return prev;
      return [{
        id: uid("n"), store_id: customer.store_id!, user_id: customer.id,
        title: "Wallet running low",
        body: `Your balance is TZS ${customer.wallet_balance.toLocaleString()}. Top up now so you don't get stuck at checkout.`,
        kind: "low_balance", created_at: Date.now(), read: false,
      }, ...prev];
    });
  }, [stores]);

  const nextReceiptNo = () => {
    const day = todayKey();
    let no = "";
    setReceiptSeq((prev) => {
      const next = prev.day === day ? { day, n: prev.n + 1 } : { day, n: 1 };
      no = `R-${day}-${pad(next.n)}`;
      return next;
    });
    const nextN = receiptSeq.day === day ? receiptSeq.n + 1 : 1;
    return no || `R-${day}-${pad(nextN)}`;
  };

  const _executePosSale = useCallback((customerId: string, items: OrderItem[], cashPortion: number, tender: "cash" | "mobile", reference?: string): SaleResult => {
    if (!currentStoreId) return { ok: false, reason: "No store context" };
    const total = items.reduce((s, i) => s + i.price * i.qty, 0);
    const cust = profiles.find((p) => p.id === customerId && p.store_id === currentStoreId);
    if (!cust) return { ok: false, reason: "Customer not found" };
    const cashPart = Math.max(0, Math.min(cashPortion, total));
    const walletPart = total - cashPart;
    if (cust.wallet_balance < walletPart) return { ok: false, reason: "Insufficient wallet balance" };
    if (tender === "mobile" && cashPart > 0 && !reference?.trim()) return { ok: false, reason: "Mobile payment reference required" };
    const id = nextOrderId();
    const receipt_no = nextReceiptNo();
    const loyalty = Math.round(total * LOYALTY_RATE);
    const order: Order = {
      id, store_id: currentStoreId, customer_id: cust.id, customer_name: cust.full_name, items,
      total_amount: total, status: "completed", delivery_type: "pickup", payment_status: "paid",
      created_at: Date.now(), receipt_no, cash_paid: cashPart, wallet_paid: walletPart, loyalty_earned: loyalty,
      tender: cashPart > 0 ? tender : undefined, reference: cashPart > 0 && tender === "mobile" ? reference : undefined,
      cashier_id: currentUser?.id, cashier_name: currentUser?.full_name, shift_id: activeShift?.id,
    };
    setOrders((prev) => [order, ...prev]);
    const nextCust = { ...cust, wallet_balance: cust.wallet_balance - walletPart + loyalty };
    setProfiles((prev) => prev.map((p) => p.id === cust.id ? nextCust : p));
    setTransactions((prev) => {
      const tx: Transaction[] = [];
      if (walletPart > 0) tx.push({ id: uid("t"), store_id: currentStoreId, customer_id: cust.id, order_id: id, type: "deduction", amount: walletPart, description: `POS ${receipt_no}`, created_at: Date.now() });
      if (loyalty > 0) tx.push({ id: uid("tl"), store_id: currentStoreId, customer_id: cust.id, order_id: id, type: "topup", amount: loyalty, description: `Loyalty reward (${receipt_no})`, created_at: Date.now() + 1 });
      return [...tx, ...prev];
    });
    if (cashPart > 0) {
      if (tender === "mobile") adjustBank((b) => b + cashPart);
      else adjustCash((c) => c + cashPart);
    }
    pushNudgeIfLow(nextCust);
    return { ok: true, order };
  }, [profiles, currentUser, activeShift, pushNudgeIfLow, currentStoreId, adjustBank, adjustCash]);

  const _executeCashSale = useCallback((items: OrderItem[], cashReceived: number, customerName: string, tender: "cash" | "mobile", reference?: string): SaleResult => {
    if (!currentStoreId) return { ok: false, reason: "No store context" };
    const total = items.reduce((s, i) => s + i.price * i.qty, 0);
    if (total <= 0) return { ok: false, reason: "Cart empty" };
    if (tender === "cash" && cashReceived < total) return { ok: false, reason: "Amount received is less than total" };
    if (tender === "mobile" && !reference?.trim()) return { ok: false, reason: "Mobile payment reference required" };
    const id = nextOrderId();
    const receipt_no = nextReceiptNo();
    const order: Order = {
      id, store_id: currentStoreId, customer_id: "walkin", customer_name: customerName, items,
      total_amount: total, status: "completed", delivery_type: "pickup", payment_status: "paid",
      created_at: Date.now(), receipt_no, cash_paid: tender === "cash" ? cashReceived : total, wallet_paid: 0, tender,
      reference: tender === "mobile" ? reference : undefined,
      cashier_id: currentUser?.id, cashier_name: currentUser?.full_name, shift_id: activeShift?.id,
    };
    setOrders((prev) => [order, ...prev]);
    if (tender === "mobile") adjustBank((b) => b + total);
    else adjustCash((c) => c + total);
    return { ok: true, order };
  }, [currentUser, activeShift, currentStoreId, adjustBank, adjustCash]);

  const value: Ctx = useMemo(() => ({
    currentUser, profiles: scopedProfiles, allProfiles: profiles, products: scopedProducts,
    orders: scopedOrders, transactions: scopedTx, cart,
    rawMaterials: scopedRaw, batches: scopedBatches, wastage: scopedWaste,
    purchases: scopedPurchases, expenses: scopedExpenses, cash, bank,
    shifts: scopedShifts, activeShift, pendingSales: scopedPending, smsLogs: scopedSms,
    isOnline, LOW_BALANCE_THRESHOLD, topUpRequests: scopedRequests, store, stores, currentStoreId, hasOwner,
    notifications: scopedNotifs,
    unreadNotifications: (userId) => scopedNotifs.filter((n) => n.user_id === userId && !n.read),
    markNotificationsRead(userId) { setNotifications((prev) => prev.map((n) => n.user_id === userId ? { ...n, read: true } : n)); },
    dismissNotification(id) { setNotifications((prev) => prev.filter((n) => n.id !== id)); },
    can, hasStaffRole,
    completeSetup({ store: s, owner, opening_cash = 0, opening_bank = 0 }) {
      if (!s.name.trim() || !s.contact_phone.trim()) return { ok: false, reason: "Store name and contact phone are required" };
      if (!owner.full_name.trim() || !owner.phone.trim() || !owner.password) return { ok: false, reason: "All owner fields are required" };
      if (!/^\d{4,6}$/.test(owner.staff_pin)) return { ok: false, reason: "Staff PIN must be 4–6 digits" };
      if (opening_cash < 0 || opening_bank < 0) return { ok: false, reason: "Opening balances cannot be negative" };
      if (profiles.some((p) => p.phone === owner.phone.trim())) return { ok: false, reason: "That phone is already in use" };
      const now = Date.now();
      const trialDays = 14;
      const storeId = uid("s");
      const newStore: Store = {
        id: storeId, ...s, name: s.name.trim(), created_at: now,
        subscription: { plan: "trial", started_at: now, expires_at: now + trialDays * 86400000, status: "active", monthly_price: 0 },
      };
      const ownerProfile: Profile = {
        id: uid("u"), full_name: owner.full_name.trim(), phone: owner.phone.trim(),
        password: owner.password, wallet_balance: 0, role: "staff", staff_role: "owner",
        staff_pin: owner.staff_pin, created_at: now, store_id: storeId,
      };
      // Seed per-store menu & raw materials so each tenant starts clean.
      const seededProducts: Product[] = PRODUCT_TEMPLATE.map((p, i) => ({ ...p, id: `p-${storeId}-${i}`, store_id: storeId }));
      const seededRaw: RawMaterial[] = RAW_TEMPLATE.map((r, i) => ({ ...r, id: `r-${storeId}-${i}`, store_id: storeId }));
      setStores((prev) => [...prev, newStore]);
      setProfiles((prev) => [...prev, ownerProfile]);
      setProducts((prev) => [...prev, ...seededProducts]);
      setRawMaterials((prev) => [...prev, ...seededRaw]);
      setTreasuries((prev) => ({ ...prev, [storeId]: { cash: opening_cash, bank: opening_bank } }));
      setCurrentUserId(ownerProfile.id);
      return { ok: true };
    },
    updateStore(patch) {
      if (!currentStoreId) return;
      setStores((prev) => prev.map((s) => s.id === currentStoreId ? { ...s, ...patch, name: (patch.name ?? s.name).trim() || s.name } : s));
    },
    addStaff({ full_name, phone, password, role, staff_pin }) {
      if (!can("team.view")) return { ok: false, reason: "Not allowed" };
      if (!currentStoreId) return { ok: false, reason: "No store context" };
      if (role !== "cashier" && !can("team.manage_all")) return { ok: false, reason: "Only the owner can add supervisors or owners" };
      if (!full_name.trim() || !phone.trim() || !password) return { ok: false, reason: "All fields are required" };
      if (!/^\d{4,6}$/.test(staff_pin)) return { ok: false, reason: "Staff PIN must be 4–6 digits" };
      if (profiles.some((p) => p.phone === phone.trim())) return { ok: false, reason: "Phone already in use" };
      const p: Profile = {
        id: uid("u"), full_name: full_name.trim(), phone: phone.trim(), password,
        wallet_balance: 0, role: "staff", staff_role: role, staff_pin, created_at: Date.now(),
        store_id: currentStoreId,
      };
      setProfiles((prev) => [...prev, p]);
      return { ok: true };
    },
    updateStaff(id, patch) {
      if (!can("team.view")) return { ok: false, reason: "Not allowed" };
      const target = profiles.find((p) => p.id === id && p.store_id === currentStoreId);
      if (!target || target.role !== "staff") return { ok: false, reason: "Staff not found" };
      if (patch.staff_role && patch.staff_role !== "cashier" && !can("team.manage_all")) return { ok: false, reason: "Only the owner can promote to supervisor or owner" };
      if (target.staff_role === "owner" && !can("team.manage_all")) return { ok: false, reason: "Only an owner can edit an owner" };
      if (patch.phone && profiles.some((p) => p.phone === patch.phone!.trim() && p.id !== id)) return { ok: false, reason: "Phone already in use" };
      setProfiles((prev) => prev.map((p) => p.id === id ? {
        ...p, full_name: patch.full_name?.trim() || p.full_name,
        phone: patch.phone?.trim() || p.phone, staff_role: patch.staff_role ?? p.staff_role,
      } : p));
      return { ok: true };
    },
    disableStaff(id, disabled) {
      if (!can("team.view")) return { ok: false, reason: "Not allowed" };
      const target = profiles.find((p) => p.id === id && p.store_id === currentStoreId);
      if (!target || target.role !== "staff") return { ok: false, reason: "Staff not found" };
      if (target.staff_role === "owner" && !can("team.manage_all")) return { ok: false, reason: "Only an owner can disable an owner" };
      if (target.id === currentUser?.id) return { ok: false, reason: "You cannot disable yourself" };
      if (disabled && target.staff_role === "owner") {
        const activeOwners = profiles.filter((p) => p.store_id === currentStoreId && p.staff_role === "owner" && !p.disabled && p.id !== id).length;
        if (activeOwners === 0) return { ok: false, reason: "At least one active owner is required" };
      }
      setProfiles((prev) => prev.map((p) => p.id === id ? { ...p, disabled } : p));
      return { ok: true };
    },
    resetStaffCredential(id, kind, value) {
      const target = profiles.find((p) => p.id === id);
      if (!target) return { ok: false, reason: "User not found" };
      const isSelf = currentUser?.id === id;
      if (!isSelf && !can("team.view")) return { ok: false, reason: "Not allowed" };
      if (!isSelf && target.staff_role === "owner" && !can("team.manage_all")) return { ok: false, reason: "Only an owner can reset an owner's credentials" };
      if (kind === "pin" && !/^\d{4,6}$/.test(value)) return { ok: false, reason: "PIN must be 4–6 digits" };
      if (kind === "password" && value.length < 4) return { ok: false, reason: "Password must be at least 4 characters" };
      setProfiles((prev) => prev.map((p) => p.id === id ? (kind === "pin" ? { ...p, staff_pin: value } : { ...p, password: value }) : p));
      return { ok: true };
    },
    submitTopUpRequest({ amount, reference, note }) {
      if (!currentUser || currentUser.role !== "customer" || !currentUser.store_id) return null;
      if (amount <= 0 || !reference.trim()) return null;
      const req: TopUpRequest = {
        id: `TR-${Date.now()}`, store_id: currentUser.store_id,
        customer_id: currentUser.id, customer_name: currentUser.full_name,
        customer_phone: currentUser.phone, amount, reference: reference.trim(), note,
        status: "pending", created_at: Date.now(),
      };
      setTopUpRequests((prev) => [req, ...prev]);
      return req;
    },
    rejectTopUpRequest(id, reason) {
      setTopUpRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "rejected", resolved_at: Date.now(), resolved_by: currentUser?.id, reject_reason: reason } : r));
    },
    setStaffPin(currentPin, newPin) {
      if (!currentUser || currentUser.role !== "staff") return { ok: false, reason: "Not staff" };
      if (!/^\d{4,6}$/.test(newPin)) return { ok: false, reason: "PIN must be 4–6 digits" };
      if (currentUser.staff_pin && currentUser.staff_pin !== currentPin) return { ok: false, reason: "Current PIN is incorrect" };
      setProfiles((prev) => prev.map((p) => p.id === currentUser.id ? { ...p, staff_pin: newPin } : p));
      return { ok: true };
    },
    staffTopUp({ customerId, amount, tender, reference, pin, requestId }) {
      if (!currentUser || currentUser.role !== "staff") return { ok: false, reason: "Not signed in as staff" };
      if (!can("customers.topup")) return { ok: false, reason: "Not allowed" };
      if (!currentUser.staff_pin) return { ok: false, reason: "Set your staff PIN first" };
      if (currentUser.staff_pin !== pin) return { ok: false, reason: "Incorrect PIN" };
      if (amount <= 0) return { ok: false, reason: "Enter an amount" };
      if (tender === "mobile" && !reference?.trim()) return { ok: false, reason: "Mobile payment reference required" };
      const cust = profiles.find((p) => p.id === customerId && p.store_id === currentStoreId);
      if (!cust) return { ok: false, reason: "Customer not found" };
      const desc = tender === "mobile" ? `Mobile top-up · ref ${reference}` : "Cash top-up at counter";
      setProfiles((prev) => prev.map((p) => p.id === customerId ? { ...p, wallet_balance: p.wallet_balance + amount } : p));
      setTransactions((prev) => [{ id: uid("t"), store_id: currentStoreId!, customer_id: customerId, type: "topup", amount, description: `${desc} · by ${currentUser.full_name}`, created_at: Date.now(), reference }, ...prev]);
      if (tender === "mobile") adjustBank((b) => b + amount);
      else adjustCash((c) => c + amount);
      if (requestId) {
        setTopUpRequests((prev) => prev.map((r) => r.id === requestId ? { ...r, status: "approved", resolved_at: Date.now(), resolved_by: currentUser.id } : r));
      }
      pushNotification({
        store_id: currentStoreId!, user_id: customerId,
        title: "Wallet topped up",
        body: `TZS ${amount.toLocaleString()} added by ${currentUser.full_name}. New balance: TZS ${(cust.wallet_balance + amount).toLocaleString()}.`,
        kind: "topup",
      });
      return { ok: true };
    },
    login(phone, password) {
      const u = profiles.find((p) => p.phone === phone && p.password === password);
      if (!u || u.disabled) return null;
      setCurrentUserId(u.id);
      setProfiles((prev) => prev.map((p) => p.id === u.id ? { ...p, last_login: Date.now() } : p));
      return u;
    },
    signup(name, phone, password, store_id) {
      if (!store_id || !stores.some((s) => s.id === store_id)) return null;
      if (profiles.some((p) => p.phone === phone)) return null;
      const u: Profile = { id: uid("u"), full_name: name, phone, password, wallet_balance: 0, role: "customer", created_at: Date.now(), store_id };
      setProfiles((prev) => [...prev, u]);
      setCurrentUserId(u.id);
      return u;
    },
    logout() { setCurrentUserId(null); setCart([]); },
    addToCart(p) {
      setCart((prev) => {
        const found = prev.find((c) => c.product.id === p.id);
        if (found) return prev.map((c) => c.product.id === p.id ? { ...c, qty: c.qty + 1 } : c);
        return [...prev, { product: p, qty: 1 }];
      });
    },
    setQty(id, qty) {
      setCart((prev) => qty <= 0 ? prev.filter((c) => c.product.id !== id) : prev.map((c) => c.product.id === id ? { ...c, qty } : c));
    },
    clearCart() { setCart([]); },
    placeOrder(deliveryType) {
      if (!currentUser || !currentUser.store_id) return null;
      const total = cart.reduce((s, c) => s + c.product.price * c.qty, 0);
      if (total <= 0 || currentUser.wallet_balance < total) return null;
      const id = nextOrderId();
      const order: Order = {
        id, store_id: currentUser.store_id, customer_id: currentUser.id, customer_name: currentUser.full_name,
        items: cart.map((c) => ({ product_id: c.product.id, name: c.product.name, price: c.product.price, qty: c.qty })),
        total_amount: total, status: "new", delivery_type: deliveryType, payment_status: "paid",
        created_at: Date.now(),
      };
      setOrders((prev) => [order, ...prev]);
      const nextUser = { ...currentUser, wallet_balance: currentUser.wallet_balance - total };
      setProfiles((prev) => prev.map((p) => p.id === currentUser.id ? nextUser : p));
      setTransactions((prev) => [{ id: uid("t"), store_id: currentUser.store_id!, customer_id: currentUser.id, order_id: id, type: "deduction", amount: total, description: `Order ${id}`, created_at: Date.now() }, ...prev]);
      setCart([]);
      pushNudgeIfLow(nextUser);
      return order;
    },
    advanceOrder(id) {
      const flow: Record<OrderStatus, OrderStatus> = { "new": "in-progress", "in-progress": "ready", "ready": "completed", "completed": "completed" };
      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: flow[o.status] } : o));
    },
    topUp(customerId, amount, description = "Cash top-up at counter", tender = "cash", reference) {
      if (!currentStoreId) return;
      setProfiles((prev) => prev.map((p) => p.id === customerId ? { ...p, wallet_balance: p.wallet_balance + amount } : p));
      const desc = tender === "mobile" && reference ? `${description} · ref ${reference}` : description;
      setTransactions((prev) => [{ id: uid("t"), store_id: currentStoreId, customer_id: customerId, type: "topup", amount, description: desc, created_at: Date.now(), reference }, ...prev]);
      if (tender === "mobile") adjustBank((b) => b + amount);
      else adjustCash((c) => c + amount);
    },
    posSale({ customerId, items, cashPortion = 0, tender = "cash", reference }) {
      return _executePosSale(customerId, items, cashPortion, tender, reference);
    },
    posCashSale({ items, cashReceived, customerName = "Walk-in", tender = "cash", reference }) {
      return _executeCashSale(items, cashReceived, customerName || (tender === "mobile" ? "Mobile Money" : "Walk-in Cash"), tender, reference);
    },
    reverseSale(orderId, reason) {
      const original = orders.find((o) => o.id === orderId && o.store_id === currentStoreId);
      if (!original) return { ok: false, reason: "Order not found" };
      if (original.reversed || original.is_reversal) return { ok: false, reason: "Already reversed" };
      const id = nextOrderId();
      const receipt_no = `CN-${todayKey()}-${pad(receiptSeq.n + 1)}`;
      const credit: Order = {
        ...original, id, receipt_no,
        items: original.items.map((i) => ({ ...i, qty: -i.qty })),
        total_amount: -original.total_amount,
        cash_paid: -(original.cash_paid ?? 0),
        wallet_paid: -(original.wallet_paid ?? 0),
        loyalty_earned: -(original.loyalty_earned ?? 0),
        created_at: Date.now(), status: "completed",
        is_reversal: true, reversal_of: original.id,
      };
      setOrders((prev) => prev.map((o) => o.id === original.id ? { ...o, reversed: true } : o).concat([credit]).sort((a, b) => b.created_at - a.created_at));
      if ((original.wallet_paid ?? 0) > 0 && original.customer_id !== "walkin") {
        setProfiles((prev) => prev.map((p) => p.id === original.customer_id ? { ...p, wallet_balance: p.wallet_balance + (original.wallet_paid ?? 0) - (original.loyalty_earned ?? 0) } : p));
        setTransactions((prev) => [{ id: uid("tr"), store_id: currentStoreId!, customer_id: original.customer_id, order_id: id, type: "topup", amount: original.wallet_paid ?? 0, description: `Refund ${original.receipt_no ?? original.id} · ${reason}`, created_at: Date.now() }, ...prev]);
      }
      const cashPart = original.cash_paid ?? 0;
      if (cashPart > 0) {
        if (original.tender === "mobile") adjustBank((b) => b - cashPart);
        else adjustCash((c) => c - cashPart);
      }
      return { ok: true, order: credit };
    },
    findCustomer(query) {
      const q = query.trim().toLowerCase();
      if (!q) return null;
      return profiles.find((p) => p.role === "customer" && p.store_id === currentStoreId && (p.phone.includes(q) || p.id.toLowerCase() === q)) ?? null;
    },
    addCustomer({ full_name, phone, initial_balance = 0 }) {
      if (!currentStoreId) return null;
      const name = full_name.trim();
      const ph = phone.trim();
      if (!name || !ph) return null;
      if (profiles.some((p) => p.phone === ph)) return null;
      const u: Profile = { id: uid("u"), full_name: name, phone: ph, password: ph.slice(-4) || "0000", wallet_balance: initial_balance, role: "customer", created_at: Date.now(), store_id: currentStoreId };
      setProfiles((prev) => [...prev, u]);
      if (initial_balance > 0) {
        setTransactions((prev) => [{ id: uid("t"), store_id: currentStoreId, customer_id: u.id, type: "topup", amount: initial_balance, description: "Opening balance", created_at: Date.now() }, ...prev]);
        adjustCash((c) => c + initial_balance);
      }
      return u;
    },
    addRawMaterial(r) {
      if (!currentStoreId) return;
      setRawMaterials((prev) => [...prev, { ...r, id: uid("r"), store_id: currentStoreId }]);
    },
    updateRawStock(id, delta) { setRawMaterials((prev) => prev.map((r) => r.id === id ? { ...r, stock: Math.max(0, r.stock + delta) } : r)); },
    createBatch({ product_id, ingredients, labor_cost, plates }) {
      if (!currentStoreId || plates <= 0 || ingredients.length === 0) return null;
      let raw_cost = 0;
      for (const ing of ingredients) {
        const raw = rawMaterials.find((r) => r.id === ing.raw_id && r.store_id === currentStoreId);
        if (!raw || raw.stock < ing.qty) return null;
        raw_cost += raw.avg_cost * ing.qty;
      }
      const unit_cost = Math.round((raw_cost + labor_cost) / plates);
      const batch: CookingBatch = {
        id: `B-${Date.now()}`, store_id: currentStoreId, product_id, ingredients, labor_cost, plates,
        raw_cost, unit_cost, plates_remaining: plates, created_at: Date.now(),
      };
      setRawMaterials((prev) => prev.map((r) => {
        const ing = ingredients.find((i) => i.raw_id === r.id);
        return ing ? { ...r, stock: Math.max(0, r.stock - ing.qty) } : r;
      }));
      setBatches((prev) => [batch, ...prev]);
      return batch;
    },
    logWastage(batch_id, plates, reason) {
      const b = batches.find((x) => x.id === batch_id);
      if (!b || plates <= 0 || !currentStoreId) return;
      const prod = products.find((p) => p.id === b.product_id);
      setBatches((prev) => prev.map((x) => x.id === batch_id ? { ...x, plates_remaining: Math.max(0, x.plates_remaining - plates) } : x));
      setWastage((prev) => [{ id: uid("w"), store_id: currentStoreId, batch_id, product_name: prod?.name ?? b.product_id, plates, reason, created_at: Date.now() }, ...prev]);
    },
    recordPurchase({ supplier, raw_id, qty, total_cost, payment_method, date }) {
      if (!currentStoreId || qty <= 0 || total_cost < 0) return null;
      const raw = rawMaterials.find((r) => r.id === raw_id && r.store_id === currentStoreId);
      if (!raw) return null;
      const newStock = raw.stock + qty;
      const newAvg = newStock > 0 ? Math.round((raw.avg_cost * raw.stock + total_cost) / newStock) : raw.avg_cost;
      setRawMaterials((prev) => prev.map((r) => r.id === raw_id ? { ...r, stock: newStock, avg_cost: newAvg } : r));
      if (payment_method === "bank") adjustBank((b) => b - total_cost);
      else adjustCash((c) => c - total_cost);
      const purchase: Purchase = {
        id: `PO-${Date.now()}`, store_id: currentStoreId, date: date ?? Date.now(), supplier, raw_id, raw_name: raw.name,
        qty, total_cost, payment_method,
      };
      setPurchases((prev) => [purchase, ...prev]);
      return purchase;
    },
    recordExpense({ category, amount, description, payment_method, date }) {
      if (!currentStoreId || amount <= 0) return null;
      const exp: Expense = { id: `EX-${Date.now()}`, store_id: currentStoreId, date: date ?? Date.now(), category, amount, description, payment_method };
      setExpenses((prev) => [exp, ...prev]);
      if (payment_method === "bank") adjustBank((b) => b - amount);
      else adjustCash((c) => c - amount);
      return exp;
    },
    transferFunds(from, amount) {
      if (!currentStoreId || amount <= 0) return false;
      const t = treasuries[currentStoreId] ?? { cash: 0, bank: 0 };
      if (from === "cash") {
        if (t.cash < amount) return false;
        setTreasuries((prev) => ({ ...prev, [currentStoreId]: { cash: prev[currentStoreId].cash - amount, bank: prev[currentStoreId].bank + amount } }));
      } else {
        if (t.bank < amount) return false;
        setTreasuries((prev) => ({ ...prev, [currentStoreId]: { cash: prev[currentStoreId].cash + amount, bank: prev[currentStoreId].bank - amount } }));
      }
      return true;
    },
    availablePlates(product_id) {
      const rel = batches.filter((b) => b.product_id === product_id && b.store_id === currentStoreId);
      if (rel.length === 0) return null;
      return rel.reduce((s, b) => s + b.plates_remaining, 0);
    },
    openShift(opening_float) {
      if (!currentUser || currentUser.role !== "staff" || !currentStoreId) return null;
      if (activeShift) return null;
      const s: Shift = {
        id: `SH-${Date.now()}`, store_id: currentStoreId, cashier_id: currentUser.id, cashier_name: currentUser.full_name,
        opened_at: Date.now(), opening_float,
      };
      setShifts((prev) => [s, ...prev]);
      setActiveShiftId(s.id);
      adjustCash((c) => c + opening_float);
      return s;
    },
    closeShift({ counted_cash, counted_mobile, notes }) {
      if (!activeShift) return null;
      const shiftOrders = orders.filter((o) => o.shift_id === activeShift.id && !o.is_reversal);
      const reversals = orders.filter((o) => o.shift_id === activeShift.id && o.is_reversal);
      const cashSales = shiftOrders.reduce((s, o) => s + (o.tender === "cash" ? (o.cash_paid ?? 0) : 0), 0)
        + reversals.reduce((s, o) => s + (o.tender === "cash" ? (o.cash_paid ?? 0) : 0), 0);
      const mobileSales = shiftOrders.reduce((s, o) => s + (o.tender === "mobile" ? (o.cash_paid ?? 0) : 0), 0)
        + reversals.reduce((s, o) => s + (o.tender === "mobile" ? (o.cash_paid ?? 0) : 0), 0);
      const expectedCash = activeShift.opening_float + cashSales;
      const cash_variance = counted_cash - expectedCash;
      const mobile_variance = counted_mobile - mobileSales;
      const closed: Shift = { ...activeShift, closed_at: Date.now(), counted_cash, counted_mobile, cash_variance, mobile_variance, notes };
      setShifts((prev) => prev.map((s) => s.id === activeShift.id ? closed : s));
      setActiveShiftId(null);
      return closed;
    },
    enqueueSale(payload) {
      if (!currentStoreId) return;
      const p: PendingSale = { id: `PQ-${Date.now()}`, store_id: currentStoreId, queued_at: Date.now(), ...payload };
      setPendingSales((prev) => [p, ...prev]);
    },
    syncOutbox() {
      let synced = 0, failed = 0;
      const rem: PendingSale[] = [];
      for (const p of [...pendingSales].filter((x) => x.store_id === currentStoreId).reverse()) {
        let res: SaleResult;
        if (p.kind === "wallet" && p.customer_id) {
          res = _executePosSale(p.customer_id, p.items, p.cash_portion ?? 0, p.tender, p.reference);
        } else {
          res = _executeCashSale(p.items, p.cash_received ?? p.items.reduce((s, i) => s + i.price * i.qty, 0), p.customer_name ?? "Walk-in", p.tender, p.reference);
        }
        if (res.ok) synced++; else { failed++; rem.push(p); }
      }
      setPendingSales((prev) => prev.filter((x) => x.store_id !== currentStoreId).concat(rem));
      return { synced, failed };
    },
    sendReceiptMessage(order, channel) {
      const cust = profiles.find((p) => p.id === order.customer_id);
      const to_phone = cust?.phone ?? "";
      const to_name = cust?.full_name ?? order.customer_name;
      if (!to_phone || !currentStoreId) return null;
      const log: SmsLog = {
        id: uid("sms"), store_id: currentStoreId, channel, to_phone, to_name,
        message: `BitePay receipt ${order.receipt_no ?? order.id} · TZS ${order.total_amount.toLocaleString()} · Thank you!`,
        kind: "receipt", created_at: Date.now(),
      };
      setSmsLogs((prev) => [log, ...prev]);
      return log;
    },
    tickets: scopedTickets,
    submitTicket({ subject, message, category, priority }) {
      if (!currentUser || currentUser.role !== "staff" || !currentStoreId) return null;
      if (!subject.trim() || !message.trim()) return null;
      const now = Date.now();
      const t: Ticket = {
        id: `TK-${now}`, store_id: currentStoreId, subject: subject.trim(), message: message.trim(), category, priority,
        status: "open", created_by_id: currentUser.id, created_by_name: currentUser.full_name,
        created_at: now, updated_at: now, replies: [],
      };
      setTickets((prev) => [t, ...prev]);
      return t;
    },
    replyToTicket(ticketId, body) {
      if (!body.trim()) return { ok: false, reason: "Reply cannot be empty" };
      const from: "store" | "admin" = superAdminSignedIn ? "admin" : "store";
      const author_name = superAdminSignedIn ? superAdmin.full_name : (currentUser?.full_name ?? "Unknown");
      const now = Date.now();
      setTickets((prev) => prev.map((t) => t.id === ticketId ? {
        ...t, updated_at: now,
        status: t.status === "open" ? "in_progress" : t.status,
        replies: [...t.replies, { id: `rep${now}`, from, author_name, body: body.trim(), created_at: now }],
      } : t));
      return { ok: true };
    },
    updateTicketStatus(ticketId, status) {
      setTickets((prev) => prev.map((t) => t.id === ticketId ? { ...t, status, updated_at: Date.now() } : t));
    },
    superAdmin,
    isAdminSignedIn: superAdminSignedIn,
    adminLogin(username, password) {
      if (username.trim().toLowerCase() === superAdmin.username && password === superAdmin.password) {
        setSuperAdminSignedIn(true);
        setAdminAuditLog((prev) => [{ id: uid("au"), action: "sign_in", detail: "Admin signed in", created_at: Date.now() }, ...prev]);
        return true;
      }
      return false;
    },
    adminLogout() { setSuperAdminSignedIn(false); },
    addSubscriptionDays(days, storeId) {
      const targetId = storeId ?? currentStoreId;
      if (!targetId || days === 0) return;
      const target = stores.find((s) => s.id === targetId);
      if (!target) return;
      const nowMs = Date.now();
      const base = Math.max(target.subscription.expires_at, nowMs);
      const newExpiry = base + days * 86400000;
      const newStatus: SubscriptionStatus = newExpiry > nowMs ? "active" : "expired";
      setStores((prev) => prev.map((s) => s.id === targetId ? { ...s, subscription: { ...s.subscription, expires_at: newExpiry, status: newStatus } } : s));
      setAdminAuditLog((prev) => [{ id: uid("au"), action: "extend_subscription", detail: `${days > 0 ? "+" : ""}${days} days on ${target.name}`, created_at: Date.now() }, ...prev]);
    },
    changePlan(plan, storeId) {
      const targetId = storeId ?? currentStoreId;
      if (!targetId) return;
      setStores((prev) => prev.map((s) => s.id === targetId ? { ...s, subscription: { ...s.subscription, plan, monthly_price: PLAN_PRICE[plan] } } : s));
      setAdminAuditLog((prev) => [{ id: uid("au"), action: "change_plan", detail: `Plan → ${PLAN_LABEL[plan]}`, created_at: Date.now() }, ...prev]);
    },
    setSubscriptionStatus(status, storeId) {
      const targetId = storeId ?? currentStoreId;
      if (!targetId) return;
      setStores((prev) => prev.map((s) => s.id === targetId ? { ...s, subscription: { ...s.subscription, status } } : s));
      setAdminAuditLog((prev) => [{ id: uid("au"), action: "status_change", detail: `Status → ${status}`, created_at: Date.now() }, ...prev]);
    },
    adminAuditLog,
    subscriptionDaysLeft() {
      if (!store) return 0;
      return Math.max(0, Math.ceil((store.subscription.expires_at - Date.now()) / 86400000));
    },
    isSubscriptionBlocked() {
      if (!store) return false;
      const s = store.subscription;
      if (s.status === "suspended") return true;
      if (s.expires_at < Date.now()) return true;
      return false;
    },
  }), [currentUser, profiles, scopedProfiles, scopedProducts, scopedOrders, scopedTx, cart, scopedRaw, scopedBatches, scopedWaste, scopedPurchases, scopedExpenses, cash, bank, receiptSeq, scopedShifts, activeShift, scopedPending, scopedSms, scopedNotifs, scopedRequests, isOnline, store, stores, currentStoreId, hasOwner, LOW_BALANCE_THRESHOLD, hasStaffRole, can, _executePosSale, _executeCashSale, pushNudgeIfLow, pushNotification, tickets, scopedTickets, superAdminSignedIn, adminAuditLog, treasuries, orders, batches, products, rawMaterials, pendingSales, adjustBank, adjustCash]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export const formatTZS = (n: number) => `TZS ${n.toLocaleString("en-US")}`;
