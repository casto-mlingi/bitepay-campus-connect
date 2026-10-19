import { useState } from "react";
import { RotateCcw, Check, X } from "lucide-react";
import { useStore, formatTZS } from "@/lib/store";
import { canApproveRefund } from "@/lib/business-rules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RefundRequests() {
  const { currentUser, orders, reviewRefund } = useStore();
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const manager = currentUser?.role === "staff" && canApproveRefund(currentUser.staff_role);
  const requests = orders.filter((o) => o.refund_request && (manager || o.refund_request.by_id === currentUser?.id) && !o.is_reversal).sort((a, b) => (b.refund_request?.at ?? 0) - (a.refund_request?.at ?? 0));
  if (!requests.length) return null;
  return <section className="mb-6 border-y py-4">
    <h2 className="font-bold flex items-center gap-2 mb-3"><RotateCcw className="w-4 h-4 text-primary" />Refund requests</h2>
    {requests.map((order) => {
      const request = order.refund_request;
      if (!request) return null;
      const decide = (action: "approve" | "reject") => {
        const result = reviewRefund(order.id, action, notes[order.id]);
        setMessage(result.ok ? `Refund ${action === "approve" ? "approved" : "rejected"}` : result.reason);
      };
      return <div key={order.id} className="py-3 border-b last:border-b-0 space-y-2">
        <div className="flex justify-between gap-3 text-sm"><span className="font-semibold">{order.receipt_no ?? order.id} · {order.customer_name}</span><span>{formatTZS(order.total_amount)}</span></div>
        <p className="text-sm break-words">{request.reason}</p>
        <p className="text-xs text-muted-foreground">{request.by_name} · {new Date(request.at).toLocaleString()} · {request.status === "pending" ? "Awaiting manager" : request.status === "approved" ? "Approved" : "Rejected"}{request.reviewed_by && ` · ${request.reviewed_by} · ${new Date(request.reviewed_at ?? request.at).toLocaleString()}`}</p>
        {request.decision_note && <p className="text-xs text-muted-foreground">{request.decision_note}</p>}
        {manager && request.status === "pending" && <div className="flex flex-wrap gap-2">
          <Input aria-label={`Decision note ${order.id}`} placeholder="Decision note (optional)" value={notes[order.id] ?? ""} onChange={(e) => setNotes((prev) => ({ ...prev, [order.id]: e.target.value }))} className="sm:max-w-xs" />
          <Button size="sm" onClick={() => decide("approve")}><Check className="w-4 h-4 mr-1" />Approve refund</Button>
          <Button size="sm" variant="outline" onClick={() => decide("reject")}><X className="w-4 h-4 mr-1" />Reject</Button>
        </div>}
      </div>;
    })}
    {message && <p role="status" className="mt-3 text-sm text-primary">{message}</p>}
  </section>;
}