import { isBeverage } from "./business-rules";
export type Department = "food" | "drinks" | "resale";
export const DEPARTMENT_LABELS: Record<Department, string> = { food: "🍽️ Food", drinks: "🥤 Drinks", resale: "🛒 Resale" };
type PackProduct = { pack_size?: number; pack_unit?: string; department?: Department; category?: string };
/** Valid pieces per wholesale pack (crate/carton), or null when the product is bought loose. */
export function packSize(p?: PackProduct | null) { const n = p?.pack_size ?? 0; return Number.isInteger(n) && n > 1 ? n : null; }
/** Converts a purchase quantity to stocking pieces; packs multiply by pieces-per-pack. */
export function toPieces(qty: number, p: PackProduct | null | undefined, inPacks: boolean) { const n = packSize(p); return inPacks && n ? qty * n : qty; }
/** Explicit department wins; older products fall back to category wording so nothing disappears from POS. */
export function productDepartment(p: PackProduct): Department { return p.department ?? (isBeverage(p.category ?? "") ? "drinks" : /cigar|tobacco|snack|sweet|gum|airtime|soap|resale/i.test(p.category ?? "") ? "resale" : "food"); }
