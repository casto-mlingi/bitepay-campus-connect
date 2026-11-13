import { isBeverage } from "./business-rules";
import { TRADE_UNITS, type TradeUnit } from "./retail-stock";
/** Wholesale units a supplier delivers in; anything sold loose has no pack. */
export const PACK_UNITS: TradeUnit[] = TRADE_UNITS.filter((u) => ["crate", "carton", "box", "bale", "packet", "bag", "jerrican"].includes(u));
/** Supplier-pack fields survive only when a pack unit is chosen and it holds a whole number of pieces above 1. */
export function normalizePack(pack_unit?: string | null, pack_size?: number | null): { pack_unit?: TradeUnit; pack_size?: number } {
  const unit = PACK_UNITS.find((u) => u === (pack_unit ?? "").trim().toLowerCase());
  const n = Math.round(Number(pack_size ?? 0) || 0);
  if (!unit || !Number.isInteger(n) || n < 2) return {};
  return { pack_unit: unit, pack_size: n };
}
/** Human label for the wholesale pack, e.g. "crate × 25". */
export function packLabel(p?: PackProduct | null) { const n = packSize(p); return n ? `${p!.pack_unit} × ${n}` : "—"; }
export type Department = string;
export const BASE_DEPARTMENTS = ["food", "drinks", "resale"] as const;
export const DEPARTMENT_LABELS: Record<string, string> = { food: "🍽️ Food", drinks: "🥤 Drinks", resale: "🛒 Resale" };
type PackProduct = { pack_size?: number; pack_unit?: string; department?: Department; category?: string };
/** Valid pieces per wholesale pack (crate/carton), or null when the product is bought loose. */
export function packSize(p?: PackProduct | null) { const n = p?.pack_size ?? 0; return Number.isInteger(n) && n > 1 ? n : null; }
/** Converts a purchase quantity to stocking pieces; packs multiply by pieces-per-pack. */
export function toPieces(qty: number, p: PackProduct | null | undefined, inPacks: boolean) { const n = packSize(p); return inPacks && n ? qty * n : qty; }
/** Explicit department wins; older products fall back to category wording so nothing disappears from POS. */
export function productDepartment(p: PackProduct): Department { return p.department ?? (isBeverage(p.category ?? "") ? "drinks" : /cigar|tobacco|snack|sweet|gum|airtime|soap|resale/i.test(p.category ?? "") ? "resale" : "food"); }

/** Built-in sections show their emoji label; custom sections are stored as their own display name. */
export function deptLabel(d: string) { return DEPARTMENT_LABELS[d] ?? d; }
