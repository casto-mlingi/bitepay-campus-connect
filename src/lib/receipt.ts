import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QRCodeSVG } from "qrcode.react";
import type { Order, Store } from "./store";
import { formatTZS } from "./store";
import { activeLipaNumbers, LIPA_PROVIDERS } from "./lipa-numbers";

export const VENDOR_WHATSAPP = "+255 765 03 5656";
export const VENDOR_WHATSAPP_LINK = "https://wa.me/qr/ZEMXKSGCS52ZG1";

export type ReceiptExtras = {
  bill?: boolean;
  businessName?: string;
  paymentMode?: "wallet" | "cash";
  cashReceived?: number;
  change?: number;
  cashierName?: string;
  store?: Store | null;
};

const esc = (v: unknown) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const qr = (value: string, size: number) => renderToStaticMarkup(createElement(QRCodeSVG, { value, size, level: "M", marginSize: 1 }));

/** Text a phone camera shows after scanning a Lipa Namba QR on a bill. */
export function lipaQrText(l: { provider: keyof typeof LIPA_PROVIDERS; number: string; account_name: string }, amount?: number) {
  return `${LIPA_PROVIDERS[l.provider]} Lipa Namba: ${l.number}\nName: ${l.account_name}${amount ? `\nAmount: ${formatTZS(amount)}` : ""}`;
}

const row = (k: string, v: string, bold = false) => `<div class="row${bold ? " b" : ""}"><span>${esc(k)}</span><span>${esc(v)}</span></div>`;

export function receiptHtml(order: Order, extras: ReceiptExtras = {}) {
  const s = extras.store ?? null;
  const name = s?.name ?? extras.businessName ?? "";
  const d = new Date(order.created_at);
  const date = d.toLocaleDateString("en-GB");
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const tender = extras.bill ? "AWAITING PAYMENT" : order.tender === "mobile" ? "LIPA NAMBA" : (extras.paymentMode ?? "wallet").toUpperCase();
  const lipa = activeLipaNumbers(s?.lipa_numbers);
  const h: string[] = [];

  h.push(`<div class="c">`);
  if (s?.receipt_logo) h.push(`<img class="logo" src="${esc(s.receipt_logo)}" alt="">`);
  if (name) h.push(`<div class="name">${esc(name)}</div>`);
  if (s?.location) h.push(`<div>${esc(s.location)}</div>`);
  if (s?.contact_phone) h.push(`<div>TEL: ${esc(s.contact_phone)}</div>`);
  if (s?.receipt_email) h.push(`<div>${esc(s.receipt_email)}</div>`);
  if (s?.tin_number) h.push(`<div>TIN: ${esc(s.tin_number)}</div>`);
  if (s?.vrn_number) h.push(`<div>VRN: ${esc(s.vrn_number)}</div>`);
  h.push(`</div><hr class="solid"><div class="c">${esc(date)} ${esc(time)}</div><div class="c b">${extras.bill ? "BILL — NOT PAID" : "RECEIPT"}</div><hr class="solid">`);

  h.push(row("RECEIPT #:", order.receipt_no ?? (order.id === "BILL" ? "—" : order.id.slice(0, 8).toUpperCase())));
  if (extras.cashierName) h.push(row("CASHIER:", extras.cashierName));
  h.push(row("CUSTOMER:", order.customer_name));
  if (order.table_no) h.push(row("TABLE:", order.table_no));
  if (order.kitchen_note) h.push(row("NOTE:", order.kitchen_note));
  h.push(`<hr>`);
  order.items.forEach((i) => h.push(row(`${i.qty > 1 ? `${i.qty}X ` : ""}${i.name.toUpperCase()}`, formatTZS(i.price * i.qty))));
  h.push(`<hr>`);
  h.push(row("TOTAL:", formatTZS(order.total_amount), true));
  h.push(`<hr>`);
  h.push(row("PAYMENT:", tender));
  if (order.reference) h.push(row("REF:", order.reference));
  if ((order.wallet_paid ?? 0) > 0 && (order.cash_paid ?? 0) > 0) { h.push(row("WALLET:", formatTZS(order.wallet_paid ?? 0))); h.push(row("CASH:", formatTZS(order.cash_paid ?? 0))); }
  if (extras.paymentMode === "cash" && extras.cashReceived != null && order.amount_received == null) { h.push(row("RECEIVED:", formatTZS(extras.cashReceived))); h.push(row("CHANGE:", formatTZS(extras.change ?? 0))); }
  if (order.amount_received != null) { h.push(row("RECEIVED:", formatTZS(order.amount_received))); h.push(row("CHANGE GIVEN:", formatTZS(order.change_returned ?? 0))); if ((order.change_saved ?? 0) > 0) h.push(row("CHANGE SAVED:", formatTZS(order.change_saved ?? 0))); }
  if ((order.debt_added ?? 0) > 0) h.push(row("ADDED TO DEBT:", formatTZS(order.debt_added ?? 0)));
  if ((order.loyalty_earned ?? 0) > 0) h.push(row("LOYALTY EARNED:", formatTZS(order.loyalty_earned ?? 0)));
  if (order.wallet_balance_after != null) h.push(row("WALLET BALANCE:", formatTZS(order.wallet_balance_after)));
  h.push(row("STATUS:", extras.bill ? "UNPAID" : "PAID"));

  if (lipa.length) {
    h.push(`<hr><div class="c b">${extras.bill ? "SCAN TO PAY — LIPA NAMBA" : "LIPA NAMBA"}</div><div class="lipa">`);
    lipa.forEach((l) => h.push(`<div class="lq">${extras.bill ? qr(lipaQrText(l, order.total_amount), 96) : ""}<div class="b">${esc(LIPA_PROVIDERS[l.provider])}</div><div class="b big">${esc(l.number)}</div><div>${esc(l.account_name)}</div></div>`));
    h.push(`</div>`);
  }

  h.push(`<div class="c thanks">THANK YOU, KARIBU TENA!</div><hr class="solid">`);
  h.push(`<div class="c foot"><div>Want this system? Contact</div><div class="b">${VENDOR_WHATSAPP}</div><div>via WhatsApp</div>${qr(VENDOR_WHATSAPP_LINK, 80)}</div>`);
  return h.join("");
}

const CSS = `*{box-sizing:border-box}body{font-family:"Courier New",ui-monospace,monospace;margin:0;padding:10px;width:302px;font-size:12px;color:#000;line-height:1.35;font-weight:600}
.c{text-align:center}.b{font-weight:800}.name{font-size:17px;font-weight:800;letter-spacing:1px;margin-bottom:2px;text-transform:uppercase}
.logo{max-width:110px;max-height:70px;display:block;margin:0 auto 4px;filter:grayscale(1) contrast(1.4)}
hr{border:0;border-top:1px dashed #000;margin:6px 0}hr.solid{border-top:1.5px solid #000}
.row{display:flex;justify-content:space-between;gap:8px}.row span:last-child{text-align:right;white-space:nowrap}.row.b{font-size:15px}
.lipa{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin-top:4px}.lq{text-align:center;width:130px}.lq svg{display:block;margin:0 auto 2px}.big{font-size:14px}
.thanks{margin:8px 0 4px}.foot{font-size:11px}.foot svg{display:block;margin:4px auto 0}
@media print{@page{size:80mm auto;margin:2mm}body{width:76mm;padding:0}}`;

export function printReceipt(order: Order, extras: ReceiptExtras = {}) {
  const w = window.open("", "_blank", "width=380,height=700");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Receipt</title><style>${CSS}</style></head><body>${receiptHtml(order, extras)}</body></html>`);
  w.document.close();
  w.focus();
  const go = () => setTimeout(() => w.print(), 200);
  const img = w.document.querySelector("img");
  if (img && !img.complete) img.onload = img.onerror = go; else go();
}

export function downloadReceipt(order: Order, extras: ReceiptExtras = {}) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${receiptHtml(order, extras)}</body></html>`;
  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = `Receipt-${order.receipt_no ?? order.id}.html`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

/** Prints a quotation only: never creates an order, debits a wallet or consumes stock. */
export function printBill(input: { items: Order["items"]; customerName?: string; tableNo?: string; kitchenNote?: string; businessName?: string; store?: Store | null }) {
  const bill: Order = { id: "BILL", store_id: "", customer_id: "walkin", customer_name: input.customerName || "Walk-in", items: input.items, total_amount: input.items.reduce((n, i) => n + i.price * i.qty, 0), status: "new", delivery_type: "pickup", payment_status: "unpaid", created_at: Date.now(), table_no: input.tableNo, kitchen_note: input.kitchenNote };
  printReceipt(bill, { bill: true, businessName: input.businessName, store: input.store });
}
