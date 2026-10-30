import type { BusinessType } from "./business-rules";

export type StarterRaw = { name: string; category: string; unit: "kg" | "liters" | "pcs" };
export type StarterGood = { name: string; category: string; price: number; emoji: string };

const COMMON_RAW: StarterRaw[] = [
  { name: "Rice", category: "Grains", unit: "kg" },
  { name: "Cooking oil", category: "Oils", unit: "liters" },
  { name: "Sugar", category: "Dry goods", unit: "kg" },
  { name: "Salt", category: "Spices", unit: "kg" },
  { name: "Onions", category: "Vegetables", unit: "kg" },
  { name: "Tomatoes", category: "Vegetables", unit: "kg" },
];

export const STARTER_RAW: Record<BusinessType, StarterRaw[]> = {
  canteen: [...COMMON_RAW, { name: "Maize flour", category: "Grains", unit: "kg" }, { name: "Beans", category: "Grains", unit: "kg" }, { name: "Chicken", category: "Meat", unit: "kg" }, { name: "Tea leaves", category: "Beverages", unit: "kg" }],
  restaurant: [...COMMON_RAW, { name: "Beef", category: "Meat", unit: "kg" }, { name: "Chicken", category: "Meat", unit: "kg" }, { name: "Potatoes", category: "Vegetables", unit: "kg" }, { name: "Spices mix", category: "Spices", unit: "kg" }],
  hotel: [...COMMON_RAW, { name: "Eggs", category: "Dairy", unit: "pcs" }, { name: "Bread", category: "Bakery", unit: "pcs" }, { name: "Milk", category: "Dairy", unit: "liters" }, { name: "Coffee", category: "Beverages", unit: "kg" }],
  bar: [{ name: "Ice", category: "Supplies", unit: "kg" }, { name: "Lemons", category: "Fruits", unit: "pcs" }, { name: "Beef (nyama choma)", category: "Meat", unit: "kg" }, { name: "Charcoal", category: "Supplies", unit: "kg" }, { name: "Salt", category: "Spices", unit: "kg" }],
};

export const STARTER_GOODS: Record<BusinessType, StarterGood[]> = {
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
