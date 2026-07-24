import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type Role = "customer" | "staff";
export type Profile = {
  id: string;
  full_name: string;
  phone: string;
  password: string;
  wallet_balance: number;
  role: Role;
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
};

export type Transaction = {
  id: string;
  customer_id: string;
  order_id?: string;
  type: "topup" | "deduction";
  amount: number;
  description: string;
  created_at: number;
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

export type CartItem = { product: Product; qty: number };

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
  login: (phone: string, password: string) => Profile | null;
  signup: (name: string, phone: string, password: string) => Profile | null;
  logout: () => void;
  addToCart: (p: Product) => void;
  setQty: (id: string, qty: number) => void;
  clearCart: () => void;
  placeOrder: (deliveryType: DeliveryType) => Order | null;
  advanceOrder: (id: string) => void;
  topUp: (customerId: string, amount: number, description?: string) => void;
  posSale: (customerId: string, items: OrderItem[]) => Order | null;
  findCustomer: (query: string) => Profile | null;
  addRawMaterial: (r: Omit<RawMaterial, "id">) => void;
  updateRawStock: (id: string, delta: number) => void;
  createBatch: (input: { product_id: string; ingredients: BatchIngredient[]; labor_cost: number; plates: number }) => CookingBatch | null;
  logWastage: (batch_id: string, plates: number, reason: string) => void;
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

const seedProfiles: Profile[] = [
  { id: "u1", full_name: "Amina Hassan", phone: "0712345678", password: "1234", wallet_balance: 15000, role: "customer" },
  { id: "u2", full_name: "Staff Cashier", phone: "0700000000", password: "staff", wallet_balance: 0, role: "staff" },
];

const seedOrders: Order[] = [
  {
    id: "O-1042", customer_id: "u1", customer_name: "Amina Hassan",
    items: [{ product_id: "p1", name: "Chicken Burger", price: 4500, qty: 1 }],
    total_amount: 4500, status: "in-progress", delivery_type: "pickup", payment_status: "paid",
    created_at: Date.now() - 1000 * 60 * 12,
  },
  {
    id: "O-1041", customer_id: "u1", customer_name: "Amina Hassan",
    items: [{ product_id: "p7", name: "Fresh Juice", price: 2000, qty: 2 }],
    total_amount: 4000, status: "completed", delivery_type: "pickup", payment_status: "paid",
    created_at: Date.now() - 1000 * 60 * 60 * 22,
  },
];

const seedTx: Transaction[] = [
  { id: "t1", customer_id: "u1", type: "topup", amount: 20000, description: "Cash top-up at counter", created_at: Date.now() - 1000 * 60 * 60 * 48 },
  { id: "t2", customer_id: "u1", order_id: "O-1041", type: "deduction", amount: 4000, description: "Order O-1041", created_at: Date.now() - 1000 * 60 * 60 * 22 },
  { id: "t3", customer_id: "u1", order_id: "O-1042", type: "deduction", amount: 4500, description: "Order O-1042", created_at: Date.now() - 1000 * 60 * 12 },
];

let counter = 1043;
const nextOrderId = () => `O-${counter++}`;

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

  const currentUser = profiles.find((p) => p.id === currentUserId) ?? null;

  const value: Ctx = useMemo(() => ({
    currentUser, profiles, products, orders, transactions, cart, rawMaterials, batches, wastage,
    login(phone, password) {
      const u = profiles.find((p) => p.phone === phone && p.password === password);
      if (u) setCurrentUserId(u.id);
      return u ?? null;
    },
    signup(name, phone, password) {
      if (profiles.some((p) => p.phone === phone)) return null;
      const u: Profile = { id: `u${Date.now()}`, full_name: name, phone, password, wallet_balance: 0, role: "customer" };
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
      setProfiles((prev) => prev.map((p) => p.id === currentUser.id ? { ...p, wallet_balance: p.wallet_balance - total } : p));
      setTransactions((prev) => [{ id: `t${Date.now()}`, customer_id: currentUser.id, order_id: id, type: "deduction", amount: total, description: `Order ${id}`, created_at: Date.now() }, ...prev]);
      setCart([]);
      return order;
    },
    advanceOrder(id) {
      const flow: Record<OrderStatus, OrderStatus> = { "new": "in-progress", "in-progress": "ready", "ready": "completed", "completed": "completed" };
      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: flow[o.status] } : o));
    },
    topUp(customerId, amount, description = "Cash top-up at counter") {
      setProfiles((prev) => prev.map((p) => p.id === customerId ? { ...p, wallet_balance: p.wallet_balance + amount } : p));
      setTransactions((prev) => [{ id: `t${Date.now()}`, customer_id: customerId, type: "topup", amount, description, created_at: Date.now() }, ...prev]);
    },
    posSale(customerId, items) {
      const total = items.reduce((s, i) => s + i.price * i.qty, 0);
      const cust = profiles.find((p) => p.id === customerId);
      if (!cust || cust.wallet_balance < total) return null;
      const id = nextOrderId();
      const order: Order = {
        id, customer_id: cust.id, customer_name: cust.full_name, items,
        total_amount: total, status: "completed", delivery_type: "pickup", payment_status: "paid",
        created_at: Date.now(),
      };
      setOrders((prev) => [order, ...prev]);
      setProfiles((prev) => prev.map((p) => p.id === cust.id ? { ...p, wallet_balance: p.wallet_balance - total } : p));
      setTransactions((prev) => [{ id: `t${Date.now()}`, customer_id: cust.id, order_id: id, type: "deduction", amount: total, description: `POS ${id}`, created_at: Date.now() }, ...prev]);
      return order;
    },
    findCustomer(query) {
      const q = query.trim().toLowerCase();
      if (!q) return null;
      return profiles.find((p) => p.role === "customer" && (p.phone.includes(q) || p.id.toLowerCase() === q)) ?? null;
    },
  }), [currentUser, profiles, products, orders, transactions, cart]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export const formatTZS = (n: number) => `TZS ${n.toLocaleString("en-US")}`;
