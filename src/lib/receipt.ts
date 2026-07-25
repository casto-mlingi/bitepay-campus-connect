import type { Order } from "./store";
import { formatTZS } from "./store";

export type ReceiptExtras = {
  paymentMode?: "wallet" | "cash";
  cashReceived?: number;
  change?: number;
  cashierName?: string;
};

function receiptText(order: Order, extras: ReceiptExtras = {}) {
  const line = "--------------------------------";
  const date = new Date(order.created_at).toLocaleString();
  const lines: string[] = [];
  lines.push("           BitePay");
  lines.push("   College Canteen & Hotel");
  lines.push(line);
  lines.push(`Receipt : ${order.receipt_no ?? order.id}`);
  lines.push(`Order   : ${order.id}`);
  lines.push(`Date    : ${date}`);
  lines.push(`Customer: ${order.customer_name}`);
  if (extras.cashierName) lines.push(`Cashier : ${extras.cashierName}`);
  lines.push(`Payment : ${(extras.paymentMode ?? "wallet").toUpperCase()}`);
  lines.push(line);
  lines.push("Item                 Qty   Amount");
  order.items.forEach((i) => {
    const name = i.name.length > 18 ? i.name.slice(0, 18) : i.name.padEnd(18);
    const qty = String(i.qty).padStart(3);
    const amt = formatTZS(i.price * i.qty).padStart(10);
    lines.push(`${name} ${qty}  ${amt}`);
  });
  lines.push(line);
  lines.push(`TOTAL              ${formatTZS(order.total_amount).padStart(13)}`);
  if ((order.wallet_paid ?? 0) > 0 && (order.cash_paid ?? 0) > 0) {
    lines.push(`WALLET             ${formatTZS(order.wallet_paid ?? 0).padStart(13)}`);
    lines.push(`CASH               ${formatTZS(order.cash_paid ?? 0).padStart(13)}`);
  }
  if (extras.paymentMode === "cash" && extras.cashReceived != null) {
    lines.push(`CASH               ${formatTZS(extras.cashReceived).padStart(13)}`);
    lines.push(`CHANGE             ${formatTZS(extras.change ?? 0).padStart(13)}`);
  }
  if ((order.loyalty_earned ?? 0) > 0) {
    lines.push(`Loyalty earned     ${formatTZS(order.loyalty_earned ?? 0).padStart(13)}`);
  }
  lines.push(line);
  lines.push("     Thank you & enjoy!");
  lines.push("     bitepay.co.tz");
  return lines.join("\n");
}

export function downloadReceipt(order: Order, extras: ReceiptExtras = {}) {
  const text = receiptText(order, extras);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Receipt-${order.id}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function printReceipt(order: Order, extras: ReceiptExtras = {}) {
  const text = receiptText(order, extras);
  const w = window.open("", "_blank", "width=380,height=640");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><title>Receipt ${order.id}</title>
    <style>
      body{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;padding:16px;font-size:12px;white-space:pre;}
      @media print { @page { margin: 8mm; } }
    </style></head><body>${text.replace(/</g, "&lt;")}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 250);
}
