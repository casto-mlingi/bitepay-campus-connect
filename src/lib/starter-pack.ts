import type { BusinessType } from "./business-rules";
import type { TradeUnit } from "./retail-stock";

export type StarterRaw = { name: string; category: string; unit: "kg" | "liters" | "pcs" };
export type StarterGood = { name: string; category: string; price: number; emoji: string; unit?: TradeUnit };

const COMMON_RAW: StarterRaw[] = [
  { name: "Rice", category: "Grains", unit: "kg" },
  { name: "Cooking oil", category: "Oils", unit: "liters" },
  { name: "Sugar", category: "Dry goods", unit: "kg" },
  { name: "Salt", category: "Spices", unit: "kg" },
  { name: "Onions", category: "Vegetables", unit: "kg" },
  { name: "Tomatoes", category: "Vegetables", unit: "kg" },
];

export const STARTER_RAW: Record<BusinessType, StarterRaw[]> = {
  shop: [], hardware: [], supermarket: [], wholesale: [],
  canteen: [...COMMON_RAW, { name: "Maize flour", category: "Grains", unit: "kg" }, { name: "Beans", category: "Grains", unit: "kg" }, { name: "Chicken", category: "Meat", unit: "kg" }, { name: "Tea leaves", category: "Beverages", unit: "kg" }],
  restaurant: [...COMMON_RAW, { name: "Beef", category: "Meat", unit: "kg" }, { name: "Chicken", category: "Meat", unit: "kg" }, { name: "Potatoes", category: "Vegetables", unit: "kg" }, { name: "Spices mix", category: "Spices", unit: "kg" }],
  hotel: [...COMMON_RAW, { name: "Eggs", category: "Dairy", unit: "pcs" }, { name: "Bread", category: "Bakery", unit: "pcs" }, { name: "Milk", category: "Dairy", unit: "liters" }, { name: "Coffee", category: "Beverages", unit: "kg" }],
  bar: [{ name: "Ice", category: "Supplies", unit: "kg" }, { name: "Lemons", category: "Fruits", unit: "pcs" }, { name: "Beef (nyama choma)", category: "Meat", unit: "kg" }, { name: "Charcoal", category: "Supplies", unit: "kg" }, { name: "Salt", category: "Spices", unit: "kg" }],
};

export const STARTER_GOODS: Record<BusinessType, StarterGood[]> = {
  shop: [
    { name: "Sugar 1kg", category: "Groceries", price: 3000, emoji: "📦", unit: "packet" },
    { name: "Cooking oil 1L", category: "Groceries", price: 6000, emoji: "🛢️", unit: "pcs" },
    { name: "Laundry soap", category: "Household", price: 1500, emoji: "🧼", unit: "pcs" },
  ],
  hardware: [
    { name: "Cement 50kg", category: "Building", price: 18000, emoji: "📦", unit: "bag" },
    { name: "Nails", category: "Fasteners", price: 5000, emoji: "🔩", unit: "kg" },
    { name: "PVC pipe", category: "Plumbing", price: 12000, emoji: "🔧", unit: "pcs" },
    { name: "Electrical cable", category: "Electrical", price: 2000, emoji: "🔌", unit: "meter" },
  ],
  supermarket: [
    { name: "Rice 1kg", category: "Groceries", price: 3500, emoji: "🍚", unit: "packet" },
    { name: "Water 1.5L", category: "Beverages", price: 1000, emoji: "💧", unit: "pcs" },
    { name: "Toothpaste 100ml", category: "Personal care", price: 2500, emoji: "📦", unit: "pcs" },
    { name: "Laundry soap", category: "Household", price: 1500, emoji: "🧼", unit: "pcs" },
  ],
  wholesale: [
    { name: "Sugar 50kg", category: "Groceries", price: 145000, emoji: "📦", unit: "bag" },
    { name: "Rice 25kg", category: "Groceries", price: 75000, emoji: "🍚", unit: "bag" },
    { name: "Maize flour 12 × 2kg", category: "Groceries", price: 28000, emoji: "📦", unit: "bale" },
    { name: "Cooking oil 20L", category: "Groceries", price: 85000, emoji: "🛢️", unit: "jerrican" },
    { name: "Soda 24 bottles", category: "Beverages", price: 16000, emoji: "🥤", unit: "crate" },
    { name: "Laundry soap 50pcs", category: "Household", price: 45000, emoji: "🧼", unit: "carton" },
  ],
  canteen: [
    { name: "Pilau", category: "Food", price: 3000, emoji: "🍛" },
    { name: "Ugali & beans", category: "Food", price: 2000, emoji: "🍲" },
    { name: "Chips mayai", category: "Food", price: 2500, emoji: "🍳" },
    { name: "Tea", category: "Drinks", price: 500, emoji: "☕" },
    { name: "Soda", category: "Drinks", price: 1000, emoji: "🥤" },
  ],
  restaurant: [
    { name: "Rice & beef stew", category: "Food", price: 6000, emoji: "🍛" },
    { name: "Grilled chicken", category: "Food", price: 9000, emoji: "🍗" },
    { name: "Chips", category: "Food", price: 3000, emoji: "🍟" },
    { name: "Fresh juice", category: "Drinks", price: 2500, emoji: "🧃" },
    { name: "Water", category: "Drinks", price: 1000, emoji: "💧" },
  ],
  hotel: [
    { name: "Breakfast", category: "Food", price: 10000, emoji: "🍳" },
    { name: "Lunch buffet", category: "Food", price: 15000, emoji: "🍽️" },
    { name: "Coffee", category: "Drinks", price: 3000, emoji: "☕" },
    { name: "Water", category: "Drinks", price: 1500, emoji: "💧" },
  ],
  bar: [
    { name: "Beer", category: "Drinks", price: 3500, emoji: "🍺" },
    { name: "Soda", category: "Drinks", price: 1500, emoji: "🥤" },
    { name: "Water", category: "Drinks", price: 1000, emoji: "💧" },
    { name: "Nyama choma", category: "Food", price: 8000, emoji: "🍖" },
    { name: "Chips", category: "Food", price: 3000, emoji: "🍟" },
  ],
};
