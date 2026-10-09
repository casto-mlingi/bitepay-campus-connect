import { useState } from "react";
import { Mail, Printer, ReceiptText } from "lucide-react";
import { useStore, formatTZS } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Payment = { order_id: string; amount: number; fee: number; created_at: number };

export function TopupReceiptButton({ payment, network }: { payment: Payment; network: string }) {
  const { currentUser, store } = useStore();
  const [open, setOpen] = useState(false);
  const total = payment.amount + payment.fee;
  const date = new Date(payment.created_at).toLocaleString();
  const lines = [
    `BitePay — ${store?.name ?? "Canteen"}`,
    "Mobile money top-up receipt",
    `Date: ${date}`,
    `Customer: ${currentUser?.full_name ?? ""}`,
    `Network: ${network}`,
    `Reference: ${payment.order_id}`,
    `Wallet top-up: ${formatTZS(payment.amount)}`,
    `Transaction fee: ${formatTZS(payment.fee)}`,
    `Total paid: ${formatTZS(total)}`,
    "Status: Successful",
  ];

  const print = () => {
    const w = window.open("", "_blank", "width=380,height=600");
    if (!w) return;
    const esc = (t: string) => t.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
    w.document.write(`<html><head><title>Receipt ${esc(payment.order_id)}</title></head><body style="font-family:monospace;padding:16px">${lines.map((l, i) => `<div style="${i < 2 ? "font-weight:bold;" : ""}margin:4px 0">${esc(l)}</div>`).join("")}</body></html>`);
    w.document.close(); w.focus(); w.print();
  };
  const email = () => {
    const href = `mailto:${encodeURIComponent((currentUser as { email?: string } | null)?.email ?? "")}?subject=${encodeURIComponent(`BitePay top-up receipt ${payment.order_id}`)}&body=${encodeURIComponent(lines.join("\n"))}`;
    window.location.href = href;
  };

  return (
    <>
      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setOpen(true)}><ReceiptText className="w-3 h-3 mr-1" /> Receipt</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Top-up receipt</DialogTitle></DialogHeader>
          <div className="rounded-lg border p-4 text-sm space-y-1.5">
            <Row k="Date" v={date} />
            <Row k="Network" v={network} />
            <Row k="Reference" v={payment.order_id} mono />
            <Row k="Wallet top-up" v={formatTZS(payment.amount)} />
            <Row k="Transaction fee" v={formatTZS(payment.fee)} />
            <div className="border-t pt-1.5"><Row k="Total paid" v={formatTZS(total)} bold /></div>
            <div className="text-success font-semibold pt-1">Successful — added to your wallet</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={email}><Mail className="w-4 h-4 mr-1" /> Email</Button>
            <Button onClick={print}><Printer className="w-4 h-4 mr-1" /> Print</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Row({ k, v, mono, bold }: { k: string; v: string; mono?: boolean; bold?: boolean }) {
  return <div className={`flex justify-between gap-3 ${bold ? "font-bold" : ""}`}><span className="text-muted-foreground">{k}</span><span className={mono ? "font-mono text-xs" : ""}>{v}</span></div>;
}
