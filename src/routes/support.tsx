import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LifeBuoy, ArrowLeft, Send, CheckCircle2 } from "lucide-react";
import { useStore, type TicketPriority, type Ticket } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/support")({
  component: SupportPage,
  head: () => ({ meta: [
    { title: "Support — BitePay" },
    { name: "description", content: "Submit a support ticket to the BitePay team." },
    { property: "og:title", content: "BitePay Support" },
    { property: "og:description", content: "Get help from the BitePay team." },
  ] }),
});

function SupportPage() {
  const { currentUser, tickets, submitTicket, replyToTicket } = useStore();
  const navigate = useNavigate();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<Ticket["category"]>("technical");
  const [priority, setPriority] = useState<TicketPriority>("normal");
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  if (!currentUser || currentUser.role !== "staff") {
    return (
      <div className="min-h-screen bg-background grid place-items-center p-6">
        <div className="max-w-md w-full bg-surface border rounded-3xl p-8 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 grid place-items-center text-primary mb-4"><LifeBuoy className="w-7 h-7" /></div>
          <h1 className="text-xl font-bold">Sign in to open a ticket</h1>
          <p className="text-sm text-muted-foreground mt-1">Support is available to store staff (owners, supervisors and cashiers).</p>
          <Button onClick={() => navigate({ to: "/" })} className="mt-6 w-full">Go to sign-in</Button>
        </div>
      </div>
    );
  }

  const myTickets = tickets.filter((t) => t.created_by_id === currentUser.id);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setOk(false);
    const t = submitTicket({ subject, message, category, priority });
    if (!t) return setError("Subject and message are required");
    setSubject(""); setMessage(""); setPriority("normal");
    setOk(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-white">
        <div className="max-w-4xl mx-auto px-4 lg:px-8 py-5 flex items-center justify-between">
          <Link to="/staff" className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white"><ArrowLeft className="w-4 h-4" /> Back to console</Link>
          <div className="text-right">
            <div className="font-bold">Support</div>
            <div className="text-[10px] uppercase tracking-widest text-white/70">BitePay Help Center</div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 lg:px-8 py-6 grid md:grid-cols-2 gap-6">
        <div className="bg-surface border rounded-2xl p-6">
          <h2 className="font-bold text-lg">Open a new ticket</h2>
          <p className="text-sm text-muted-foreground">Our team responds within one business day.</p>
          <form onSubmit={submit} className="mt-4 space-y-3">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Short summary" className="mt-1.5 h-11" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Category</Label>
                <select value={category} onChange={(e) => setCategory(e.target.value as Ticket["category"])} className="mt-1.5 w-full h-11 rounded-md border bg-background px-3 text-sm">
                  <option value="technical">Technical</option>
                  <option value="billing">Billing</option>
                  <option value="feature">Feature request</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Priority</Label>
                <select value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority)} className="mt-1.5 w-full h-11 rounded-md border bg-background px-3 text-sm">
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Describe the issue</Label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} className="mt-1.5 w-full rounded-md border p-3 text-sm" placeholder="What happened? Include steps to reproduce, screenshots URLs, and expected behavior." />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {ok && <p className="text-sm text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Ticket submitted — the admin will reply here.</p>}
            <Button type="submit" className="w-full"><Send className="w-4 h-4 mr-1" /> Submit ticket</Button>
          </form>
        </div>

        <div className="bg-surface border rounded-2xl p-6">
          <h2 className="font-bold text-lg">Your tickets</h2>
          {myTickets.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-2">You haven't submitted any tickets yet.</p>
          ) : (
            <div className="mt-3 space-y-3 max-h-[560px] overflow-auto">
              {myTickets.map((t) => (
                <details key={t.id} className="border rounded-xl p-3">
                  <summary className="cursor-pointer flex items-center justify-between gap-2">
                    <span className="font-semibold truncate">{t.subject}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100">{t.status.replace("_", " ")}</span>
                  </summary>
                  <p className="text-xs text-muted-foreground mt-2">{new Date(t.created_at).toLocaleString()} · {t.category} · {t.priority}</p>
                  <p className="text-sm mt-2 whitespace-pre-wrap">{t.message}</p>
                  {t.replies.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {t.replies.map((r) => (
                        <div key={r.id} className={`rounded-lg p-2 text-sm ${r.from === "admin" ? "bg-primary/10" : "bg-slate-50"}`}>
                          <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{r.author_name} · {r.from}</p>
                          <p className="whitespace-pre-wrap">{r.body}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <QuickReply ticketId={t.id} onSend={replyToTicket} />
                </details>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function QuickReply({ ticketId, onSend }: { ticketId: string; onSend: (id: string, body: string) => { ok: boolean } }) {
  const [body, setBody] = useState("");
  return (
    <div className="mt-3 flex gap-2">
      <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add a note..." className="h-9 text-sm" />
      <Button size="sm" onClick={() => { if (onSend(ticketId, body).ok) setBody(""); }} disabled={!body.trim()}>Send</Button>
    </div>
  );
}
