import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Role = "customer" | "staff";
export type StaffRole = "cashier" | "supervisor" | "owner";
export type Profile = {
  id: string;
  full_name: string;
  phone: string;
  password: string;
  wallet_balance: number;
  role: Role;
  staff_role?: StaffRole;
  staff_pin?: string;
  disabled?: boolean;
  last_login?: number;
  created_at?: number;
};

export type Store = {
  name: string;
  location: string;
  contact_phone: string;
  currency: string; // label only
  low_balance_threshold: number;
  enable_mobile_tender: boolean;
  created_at: number;
};

export type Permission =
  | "pos.sell"
  | "pos.refund"
  | "shift.manage"
  | "customers.view"
  | "customers.topup"
  | "inventory.view"
  | "inventory.edit"
  | "finance.view"
  | "finance.edit"
  | "analytics.view"
  | "team.view"
  | "team.manage_cashier"
  | "team.manage_all"
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
  batch_id: string;
  product_name: string;
  plates: number;
  reason: string;
  created_at: number;
};

export type PaymentMethod = "cash" | "bank";
export type Purchase = {
  id: string;
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
  date: number;
  category: ExpenseCategory;
  amount: number;
  description: string;
  payment_method: PaymentMethod;
};

export type CartItem = { product: Product; qty: number };

export type Shift = {
  id: string;
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
  channel: SmsChannel;
  to_phone: string;
  to_name: string;
  message: string;
  kind: "receipt" | "nudge";
  created_at: number;
};

export type AppNotification = {
  id: string;
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

type Ctx = {
  currentUser: Profile | null;
  profiles: Profile[];
  products: Product[];
  orders: Order[];
  transactions: Transaction[];
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
  store: Store | null;
  hasOwner: boolean;
  login: (phone: string, password: string) => Profile | null;
  signup: (name: string, phone: string, password: string) => Profile | null;
  logout: () => void;
  hasStaffRole: (min: StaffRole) => boolean;
  can: (perm: Permission) => boolean;
  completeSetup: (input: { store: Omit<Store, "created_at">; owner: Omit<AddStaffInput, "role">; opening_cash?: number; opening_bank?: number }) => Ok | Fail;
  updateStore: (patch: Partial<Omit<Store, "created_at">>) => void;
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
  addRawMaterial: (r: Omit<RawMaterial, "id">) => void;
  updateRawStock: (id: string, delta: number) => void;
  createBatch: (input: { product_id: string; ingredients: BatchIngredient[]; labor_cost: number; plates: number }) => CookingBatch | null;
  logWastage: (batch_id: string, plates: number, reason: string) => void;
  recordPurchase: (input: { supplier: string; raw_id: string; qty: number; total_cost: number; payment_method: PaymentMethod; date?: number }) => Purchase | null;
  recordExpense: (input: { category: ExpenseCategory; amount: number; description: string; payment_method: PaymentMethod; date?: number }) => Expense | null;
  transferFunds: (from: PaymentMethod, amount: number) => boolean;
  availablePlates: (product_id: string) => number | null;
  openShift: (opening_float: number) => Shift | null;
  closeShift: (input: { counted_cash: number; counted_mobile: number; notes?: string }) => Shift | null;
  enqueueSale: (payload: Omit<PendingSale, "id" | "queued_at">) => void;
  syncOutbox: () => { synced: number; failed: number };
  sendReceiptMessage: (order: Order, channel: SmsChannel) => SmsLog | null;
};

const StoreContext = createContext<Ctx | null>(null);

const seedProducts: Product[] = [
  { id: "p1", name: "Chicken Burger", description: "Crispy chicken, lettuce, house sauce", price: 4500, category: "Meals", emoji: "🍔", gradient: "from-orange-400 to-red-500" },
  { id: "p2", name: "Beef Chips", description: "Steak strips with hand-cut fries", price: 6000, category: "Meals", emoji: "🍟", gradient: "from-amber-400 to-orange-600" },
  { id: "p3", name: "Chapati Beans", description: "Soft chapati with stewed beans", price: 2500, category: "Meals", emoji: "🫓", gradient: "from-yellow-400 to-amber-500" },
  { id: "p4", name: "Pilau Rice", description: "Spiced rice with tender beef", price: 5000, category: "Meals", emoji: "🍛", gradient: "from-amber-500 to-red-500" },
  { id: "p5", name: "Samosa (2pc)", description: "Golden crispy triangles", price: 1500, category: "Snacks", emoji: "🥟", gradient: "from-orange-300 to-orange-500" },
  { id: "p6", name: "Mandazi (3pc)", description: "Sweet fluffy pastry", price: 1000, category: "Snacks", emoji: "🥐", gradient: "from-yellow-300 to-amber-400" },
  { id: "p7", name: "Fresh Juice", description: "Passion & mango blend", price: 2000, category: "Drinks", emoji: "🧃", gradient: "from-orange-300 to-pink-400" },
  { id: "p8", name: "Soda 500ml", description: "Chilled bottled soda", price: 1500, category: "Drinks", emoji: "🥤", gradient: "from-red-400 to-rose-500" },
  { id: "p9", name: "Coffee", description: "Freshly brewed Tanzanian coffee", price: 1800, category: "Drinks", emoji: "☕", gradient: "from-amber-700 to-yellow-800" },
];

// Only a single demo customer is seeded. Staff & store are created by the owner during first-run setup.
const seedProfiles: Profile[] = [
  { id: "u1", full_name: "Amina Hassan", phone: "0712345678", password: "1234", wallet_balance: 15000, role: "customer" },
];

const seedOrders: Order[] = [];
const seedTx: Transaction[] = [];

let counter = 1043;
const nextOrderId = () => `O-${counter++}`;

const pad = (n: number, w = 3) => String(n).padStart(w, "0");
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}${pad(d.getMonth() + 1, 2)}${pad(d.getDate(), 2)}`;
};
const LOYALTY_RATE = 0.01;

const roleRank: Record<StaffRole, number> = { cashier: 1, supervisor: 2, owner: 3 };

const seedRaw: RawMaterial[] = [
  { id: "r1", name: "Rice", category: "Grains", unit: "kg", stock: 45, avg_cost: 3200, low_threshold: 20 },
  { id: "r2", name: "Beans", category: "Legumes", unit: "kg", stock: 12, avg_cost: 4500, low_threshold: 15 },
  { id: "r3", name: "Cooking Oil", category: "Oils", unit: "liters", stock: 18, avg_cost: 6800, low_threshold: 10 },
  { id: "r4", name: "Chicken", category: "Protein", unit: "kg", stock: 8, avg_cost: 12000, low_threshold: 10 },
  { id: "r5", name: "Wheat Flour", category: "Grains", unit: "kg", stock: 30, avg_cost: 2400, low_threshold: 15 },
  { id: "r6", name: "Onions", category: "Vegetables", unit: "kg", stock: 22, avg_cost: 1800, low_threshold: 10 },
];

export function StoreProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>(seedProfiles);
  const [products] = useState<Product[]>(seedProducts);
  const [orders, setOrders] = useState<Order[]>(seedOrders);
  const [transactions, setTransactions] = useState<Transaction[]>(seedTx);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>(seedRaw);
  const [batches, setBatches] = useState<CookingBatch[]>([]);
  const [wastage, setWastage] = useState<WastageLog[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cash, setCash] = useState<number>(0);
  const [bank, setBank] = useState<number>(0);
  const [receiptSeq, setReceiptSeq] = useState<{ day: string; n: number }>({ day: todayKey(), n: 0 });
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);
  const [pendingSales, setPendingSales] = useState<PendingSale[]>([]);
  const [smsLogs, setSmsLogs] = useState<SmsLog[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [topUpRequests, setTopUpRequests] = useState<TopUpRequest[]>([]);
  const [store, setStore] = useState<Store | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator === "undefined" ? true : navigator.onLine);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

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

  const currentUser = profiles.find((p) => p.id === currentUserId) ?? null;
  const activeShift = shifts.find((s) => s.id === activeShiftId && !s.closed_at) ?? null;
  const hasOwner = profiles.some((p) => p.role === "staff" && p.staff_role === "owner" && !p.disabled);
  const LOW_BALANCE_THRESHOLD = store?.low_balance_threshold ?? 3000;

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
    setNotifications((prev) => [{ ...n, id: `n${Date.now()}${Math.random().toString(36).slice(2, 6)}`, created_at: Date.now(), read: false }, ...prev]);
  }, []);

  const pushNudgeIfLow = useCallback((customer: Profile) => {
    if (customer.wallet_balance >= LOW_BALANCE_THRESHOLD) return;
    // Suppress duplicates: skip if an unread low_balance notification already exists for this user
    setNotifications((prev) => {
      if (prev.some((n) => n.user_id === customer.id && n.kind === "low_balance" && !n.read)) return prev;
      return [{
        id: `n${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
        user_id: customer.id,
        title: "Wallet running low",
        body: `Your balance is TZS ${customer.wallet_balance.toLocaleString()}. Top up now so you don't get stuck at checkout.`,
        kind: "low_balance",
        created_at: Date.now(),
        read: false,
      }, ...prev];
    });
  }, [LOW_BALANCE_THRESHOLD]);

  const _executePosSale = useCallback((customerId: string, items: OrderItem[], cashPortion: number, tender: "cash" | "mobile", reference?: string): SaleResult => {
    const total = items.reduce((s, i) => s + i.price * i.qty, 0);
    const cust = profiles.find((p) => p.id === customerId);
    if (!cust) return { ok: false, reason: "Customer not found" };
    const cashPart = Math.max(0, Math.min(cashPortion, total));
    const walletPart = total - cashPart;
    if (cust.wallet_balance < walletPart) return { ok: false, reason: "Insufficient wallet balance" };
    if (tender === "mobile" && cashPart > 0 && !reference?.trim()) return { ok: false, reason: "Mobile payment reference required" };
    const id = nextOrderId();
    const receipt_no = nextReceiptNo();
    const loyalty = Math.round(total * LOYALTY_RATE);
    const order: Order = {
      id, customer_id: cust.id, customer_name: cust.full_name, items,
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
      if (walletPart > 0) tx.push({ id: `t${Date.now()}`, customer_id: cust.id, order_id: id, type: "deduction", amount: walletPart, description: `POS ${receipt_no}`, created_at: Date.now() });
      if (loyalty > 0) tx.push({ id: `tl${Date.now()}`, customer_id: cust.id, order_id: id, type: "topup", amount: loyalty, description: `Loyalty reward (${receipt_no})`, created_at: Date.now() + 1 });
      return [...tx, ...prev];
    });
    if (cashPart > 0) {
      if (tender === "mobile") setBank((b) => b + cashPart);
      else setCash((c) => c + cashPart);
    }
    pushNudgeIfLow(nextCust);
    return { ok: true, order };
  }, [profiles, currentUser, activeShift, pushNudgeIfLow]);

  const _executeCashSale = useCallback((items: OrderItem[], cashReceived: number, customerName: string, tender: "cash" | "mobile", reference?: string): SaleResult => {
    const total = items.reduce((s, i) => s + i.price * i.qty, 0);
    if (total <= 0) return { ok: false, reason: "Cart empty" };
    if (tender === "cash" && cashReceived < total) return { ok: false, reason: "Amount received is less than total" };
    if (tender === "mobile" && !reference?.trim()) return { ok: false, reason: "Mobile payment reference required" };
    const id = nextOrderId();
    const receipt_no = nextReceiptNo();
    const order: Order = {
      id, customer_id: "walkin", customer_name: customerName, items,
      total_amount: total, status: "completed", delivery_type: "pickup", payment_status: "paid",
      created_at: Date.now(), receipt_no, cash_paid: tender === "cash" ? cashReceived : total, wallet_paid: 0, tender,
      reference: tender === "mobile" ? reference : undefined,
      cashier_id: currentUser?.id, cashier_name: currentUser?.full_name, shift_id: activeShift?.id,
    };
    setOrders((prev) => [order, ...prev]);
    if (tender === "mobile") setBank((b) => b + total);
    else setCash((c) => c + total);
    return { ok: true, order };
  }, [currentUser, activeShift]);

  const value: Ctx = useMemo(() => ({
    currentUser, profiles, products, orders, transactions, cart, rawMaterials, batches, wastage,
    purchases, expenses, cash, bank, shifts, activeShift, pendingSales, smsLogs, isOnline, LOW_BALANCE_THRESHOLD,
    topUpRequests, store, hasOwner,
    notifications,
    unreadNotifications: (userId) => notifications.filter((n) => n.user_id === userId && !n.read),
    markNotificationsRead(userId) { setNotifications((prev) => prev.map((n) => n.user_id === userId ? { ...n, read: true } : n)); },
    dismissNotification(id) { setNotifications((prev) => prev.filter((n) => n.id !== id)); },
    can, hasStaffRole,
    completeSetup({ store: s, owner, opening_cash = 0, opening_bank = 0 }) {
      if (hasOwner) return { ok: false, reason: "Store is already set up" };
      if (!s.name.trim() || !s.contact_phone.trim()) return { ok: false, reason: "Store name and contact phone are required" };
      if (!owner.full_name.trim() || !owner.phone.trim() || !owner.password) return { ok: false, reason: "All owner fields are required" };
      if (!/^\d{4,6}$/.test(owner.staff_pin)) return { ok: false, reason: "Staff PIN must be 4–6 digits" };
      if (opening_cash < 0 || opening_bank < 0) return { ok: false, reason: "Opening balances cannot be negative" };
      if (profiles.some((p) => p.phone === owner.phone.trim())) return { ok: false, reason: "That phone is already in use" };
      const ownerProfile: Profile = {
        id: `u${Date.now()}`, full_name: owner.full_name.trim(), phone: owner.phone.trim(),
        password: owner.password, wallet_balance: 0, role: "staff", staff_role: "owner",
        staff_pin: owner.staff_pin, created_at: Date.now(),
      };
      setProfiles((prev) => [...prev, ownerProfile]);
      setStore({ ...s, name: s.name.trim(), created_at: Date.now() });
      setCash(opening_cash);
      setBank(opening_bank);
      setCurrentUserId(ownerProfile.id);
      return { ok: true };
    },
    updateStore(patch) {
      setStore((prev) => prev ? { ...prev, ...patch, name: (patch.name ?? prev.name).trim() || prev.name } : prev);
    },
    addStaff({ full_name, phone, password, role, staff_pin }) {
      if (!can("team.view")) return { ok: false, reason: "Not allowed" };
      if (role !== "cashier" && !can("team.manage_all")) return { ok: false, reason: "Only the owner can add supervisors or owners" };
      if (!full_name.trim() || !phone.trim() || !password) return { ok: false, reason: "All fields are required" };
      if (!/^\d{4,6}$/.test(staff_pin)) return { ok: false, reason: "Staff PIN must be 4–6 digits" };
      if (profiles.some((p) => p.phone === phone.trim())) return { ok: false, reason: "Phone already in use" };
      const p: Profile = {
        id: `u${Date.now()}`, full_name: full_name.trim(), phone: phone.trim(), password,
        wallet_balance: 0, role: "staff", staff_role: role, staff_pin, created_at: Date.now(),
      };
      setProfiles((prev) => [...prev, p]);
      return { ok: true };
    },
    updateStaff(id, patch) {
      if (!can("team.view")) return { ok: false, reason: "Not allowed" };
      const target = profiles.find((p) => p.id === id);
      if (!target || target.role !== "staff") return { ok: false, reason: "Staff not found" };
      if (patch.staff_role && patch.staff_role !== "cashier" && !can("team.manage_all")) return { ok: false, reason: "Only the owner can promote to supervisor or owner" };
      if (target.staff_role === "owner" && !can("team.manage_all")) return { ok: false, reason: "Only an owner can edit an owner" };
      if (patch.phone && profiles.some((p) => p.phone === patch.phone!.trim() && p.id !== id)) return { ok: false, reason: "Phone already in use" };
      setProfiles((prev) => prev.map((p) => p.id === id ? {
        ...p,
        full_name: patch.full_name?.trim() || p.full_name,
        phone: patch.phone?.trim() || p.phone,
        staff_role: patch.staff_role ?? p.staff_role,
      } : p));
      return { ok: true };
    },
    disableStaff(id, disabled) {
      if (!can("team.view")) return { ok: false, reason: "Not allowed" };
      const target = profiles.find((p) => p.id === id);
      if (!target || target.role !== "staff") return { ok: false, reason: "Staff not found" };
      if (target.staff_role === "owner" && !can("team.manage_all")) return { ok: false, reason: "Only an owner can disable an owner" };
      if (target.id === currentUser?.id) return { ok: false, reason: "You cannot disable yourself" };
      if (disabled && target.staff_role === "owner") {
        const activeOwners = profiles.filter((p) => p.staff_role === "owner" && !p.disabled && p.id !== id).length;
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
      if (!currentUser || currentUser.role !== "customer") return null;
      if (amount <= 0 || !reference.trim()) return null;
      const req: TopUpRequest = {
        id: `TR-${Date.now()}`, customer_id: currentUser.id, customer_name: currentUser.full_name,
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
      const cust = profiles.find((p) => p.id === customerId);
      if (!cust) return { ok: false, reason: "Customer not found" };
      const desc = tender === "mobile" ? `Mobile top-up · ref ${reference}` : "Cash top-up at counter";
      setProfiles((prev) => prev.map((p) => p.id === customerId ? { ...p, wallet_balance: p.wallet_balance + amount } : p));
      setTransactions((prev) => [{ id: `t${Date.now()}`, customer_id: customerId, type: "topup", amount, description: `${desc} · by ${currentUser.full_name}`, created_at: Date.now(), reference }, ...prev]);
      if (tender === "mobile") setBank((b) => b + amount);
      else setCash((c) => c + amount);
      if (requestId) {
        setTopUpRequests((prev) => prev.map((r) => r.id === requestId ? { ...r, status: "approved", resolved_at: Date.now(), resolved_by: currentUser.id } : r));
      }
      return { ok: true };
    },
    login(phone, password) {
      const u = profiles.find((p) => p.phone === phone && p.password === password);
      if (!u) return null;
      if (u.disabled) return null;
      setCurrentUserId(u.id);
      setProfiles((prev) => prev.map((p) => p.id === u.id ? { ...p, last_login: Date.now() } : p));
      return u;
    },
    signup(name, phone, password) {
      if (profiles.some((p) => p.phone === phone)) return null;
      const u: Profile = { id: `u${Date.now()}`, full_name: name, phone, password, wallet_balance: 0, role: "customer", created_at: Date.now() };
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
      if (!currentUser) return null;
      const total = cart.reduce((s, c) => s + c.product.price * c.qty, 0);
      if (total <= 0 || currentUser.wallet_balance < total) return null;
      const id = nextOrderId();
      const order: Order = {
        id, customer_id: currentUser.id, customer_name: currentUser.full_name,
        items: cart.map((c) => ({ product_id: c.product.id, name: c.product.name, price: c.product.price, qty: c.qty })),
        total_amount: total, status: "new", delivery_type: deliveryType, payment_status: "paid",
        created_at: Date.now(),
      };
      setOrders((prev) => [order, ...prev]);
      const nextUser = { ...currentUser, wallet_balance: currentUser.wallet_balance - total };
      setProfiles((prev) => prev.map((p) => p.id === currentUser.id ? nextUser : p));
      setTransactions((prev) => [{ id: `t${Date.now()}`, customer_id: currentUser.id, order_id: id, type: "deduction", amount: total, description: `Order ${id}`, created_at: Date.now() }, ...prev]);
      setCart([]);
      pushNudgeIfLow(nextUser);
      return order;
    },
    advanceOrder(id) {
      const flow: Record<OrderStatus, OrderStatus> = { "new": "in-progress", "in-progress": "ready", "ready": "completed", "completed": "completed" };
      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: flow[o.status] } : o));
    },
    topUp(customerId, amount, description = "Cash top-up at counter", tender = "cash", reference) {
      setProfiles((prev) => prev.map((p) => p.id === customerId ? { ...p, wallet_balance: p.wallet_balance + amount } : p));
      const desc = tender === "mobile" && reference ? `${description} · ref ${reference}` : description;
      setTransactions((prev) => [{ id: `t${Date.now()}`, customer_id: customerId, type: "topup", amount, description: desc, created_at: Date.now(), reference }, ...prev]);
      if (tender === "mobile") setBank((b) => b + amount);
      else setCash((c) => c + amount);
    },
    posSale({ customerId, items, cashPortion = 0, tender = "cash", reference }) {
      return _executePosSale(customerId, items, cashPortion, tender, reference);
    },
    posCashSale({ items, cashReceived, customerName = "Walk-in", tender = "cash", reference }) {
      return _executeCashSale(items, cashReceived, customerName || (tender === "mobile" ? "Mobile Money" : "Walk-in Cash"), tender, reference);
    },
    reverseSale(orderId, reason) {
      const original = orders.find((o) => o.id === orderId);
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
        setTransactions((prev) => [{ id: `tr${Date.now()}`, customer_id: original.customer_id, order_id: id, type: "topup", amount: original.wallet_paid ?? 0, description: `Refund ${original.receipt_no ?? original.id} · ${reason}`, created_at: Date.now() }, ...prev]);
      }
      const cashPart = original.cash_paid ?? 0;
      if (cashPart > 0) {
        if (original.tender === "mobile") setBank((b) => b - cashPart);
        else setCash((c) => c - cashPart);
      }
      return { ok: true, order: credit };
    },
    findCustomer(query) {
      const q = query.trim().toLowerCase();
      if (!q) return null;
      return profiles.find((p) => p.role === "customer" && (p.phone.includes(q) || p.id.toLowerCase() === q)) ?? null;
    },
    addCustomer({ full_name, phone, initial_balance = 0 }) {
      const name = full_name.trim();
      const ph = phone.trim();
      if (!name || !ph) return null;
      if (profiles.some((p) => p.phone === ph)) return null;
      const u: Profile = { id: `u${Date.now()}`, full_name: name, phone: ph, password: ph.slice(-4) || "0000", wallet_balance: initial_balance, role: "customer", created_at: Date.now() };
      setProfiles((prev) => [...prev, u]);
      if (initial_balance > 0) {
        setTransactions((prev) => [{ id: `t${Date.now()}`, customer_id: u.id, type: "topup", amount: initial_balance, description: "Opening balance", created_at: Date.now() }, ...prev]);
        setCash((c) => c + initial_balance);
      }
      return u;
    },
    addRawMaterial(r) { setRawMaterials((prev) => [...prev, { ...r, id: `r${Date.now()}` }]); },
    updateRawStock(id, delta) { setRawMaterials((prev) => prev.map((r) => r.id === id ? { ...r, stock: Math.max(0, r.stock + delta) } : r)); },
    createBatch({ product_id, ingredients, labor_cost, plates }) {
      if (plates <= 0 || ingredients.length === 0) return null;
      let raw_cost = 0;
      for (const ing of ingredients) {
        const raw = rawMaterials.find((r) => r.id === ing.raw_id);
        if (!raw || raw.stock < ing.qty) return null;
        raw_cost += raw.avg_cost * ing.qty;
      }
      const unit_cost = Math.round((raw_cost + labor_cost) / plates);
      const batch: CookingBatch = {
        id: `B-${Date.now()}`, product_id, ingredients, labor_cost, plates,
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
      if (!b || plates <= 0) return;
      const prod = seedProducts.find((p) => p.id === b.product_id);
      setBatches((prev) => prev.map((x) => x.id === batch_id ? { ...x, plates_remaining: Math.max(0, x.plates_remaining - plates) } : x));
      setWastage((prev) => [{ id: `w${Date.now()}`, batch_id, product_name: prod?.name ?? b.product_id, plates, reason, created_at: Date.now() }, ...prev]);
    },
    recordPurchase({ supplier, raw_id, qty, total_cost, payment_method, date }) {
      if (qty <= 0 || total_cost < 0) return null;
      const raw = rawMaterials.find((r) => r.id === raw_id);
      if (!raw) return null;
      const newStock = raw.stock + qty;
      const newAvg = newStock > 0 ? Math.round((raw.avg_cost * raw.stock + total_cost) / newStock) : raw.avg_cost;
      setRawMaterials((prev) => prev.map((r) => r.id === raw_id ? { ...r, stock: newStock, avg_cost: newAvg } : r));
      if (payment_method === "bank") setBank((b) => b - total_cost);
      else setCash((c) => c - total_cost);
      const purchase: Purchase = {
        id: `PO-${Date.now()}`, date: date ?? Date.now(), supplier, raw_id, raw_name: raw.name,
        qty, total_cost, payment_method,
      };
      setPurchases((prev) => [purchase, ...prev]);
      return purchase;
    },
    recordExpense({ category, amount, description, payment_method, date }) {
      if (amount <= 0) return null;
      const exp: Expense = { id: `EX-${Date.now()}`, date: date ?? Date.now(), category, amount, description, payment_method };
      setExpenses((prev) => [exp, ...prev]);
      if (payment_method === "bank") setBank((b) => b - amount);
      else setCash((c) => c - amount);
      return exp;
    },
    transferFunds(from, amount) {
      if (amount <= 0) return false;
      if (from === "cash") {
        if (cash < amount) return false;
        setCash((c) => c - amount); setBank((b) => b + amount);
      } else {
        if (bank < amount) return false;
        setBank((b) => b - amount); setCash((c) => c + amount);
      }
      return true;
    },
    availablePlates(product_id) {
      const rel = batches.filter((b) => b.product_id === product_id);
      if (rel.length === 0) return null;
      return rel.reduce((s, b) => s + b.plates_remaining, 0);
    },
    openShift(opening_float) {
      if (!currentUser || currentUser.role !== "staff") return null;
      if (activeShift) return null;
      const s: Shift = {
        id: `SH-${Date.now()}`, cashier_id: currentUser.id, cashier_name: currentUser.full_name,
        opened_at: Date.now(), opening_float,
      };
      setShifts((prev) => [s, ...prev]);
      setActiveShiftId(s.id);
      setCash((c) => c + opening_float);
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
      const p: PendingSale = { id: `PQ-${Date.now()}`, queued_at: Date.now(), ...payload };
      setPendingSales((prev) => [p, ...prev]);
    },
    syncOutbox() {
      let synced = 0, failed = 0;
      const rem: PendingSale[] = [];
      for (const p of [...pendingSales].reverse()) {
        let res: SaleResult;
        if (p.kind === "wallet" && p.customer_id) {
          res = _executePosSale(p.customer_id, p.items, p.cash_portion ?? 0, p.tender, p.reference);
        } else {
          res = _executeCashSale(p.items, p.cash_received ?? p.items.reduce((s, i) => s + i.price * i.qty, 0), p.customer_name ?? "Walk-in", p.tender, p.reference);
        }
        if (res.ok) synced++; else { failed++; rem.push(p); }
      }
      setPendingSales(rem);
      return { synced, failed };
    },
    sendReceiptMessage(order, channel) {
      const cust = profiles.find((p) => p.id === order.customer_id);
      const to_phone = cust?.phone ?? "";
      const to_name = cust?.full_name ?? order.customer_name;
      if (!to_phone) return null;
      const log: SmsLog = {
        id: `sms${Date.now()}`, channel, to_phone, to_name,
        message: `BitePay receipt ${order.receipt_no ?? order.id} · TZS ${order.total_amount.toLocaleString()} · Thank you!`,
        kind: "receipt", created_at: Date.now(),
      };
      setSmsLogs((prev) => [log, ...prev]);
      return log;
    },
  }), [currentUser, profiles, products, orders, transactions, cart, rawMaterials, batches, wastage, purchases, expenses, cash, bank, receiptSeq, shifts, activeShift, pendingSales, smsLogs, topUpRequests, isOnline, store, hasOwner, LOW_BALANCE_THRESHOLD, hasStaffRole, can, _executePosSale, _executeCashSale, pushNudgeIfLow]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export const formatTZS = (n: number) => `TZS ${n.toLocaleString("en-US")}`;
