import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { UserPlus, Users, Shield, ShieldCheck, Crown, KeyRound, Ban, CheckCircle2, X, Pencil } from "lucide-react";
import { useStore, type Profile, type StaffRole } from "@/lib/store";
import { StaffShell } from "@/components/staff-shell";
import { AccessDenied } from "@/components/access-denied";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/team")({
  component: TeamPage,
  head: () => ({ meta: [
    { title: "Team — BitePay Staff" },
    { name: "description", content: "Manage staff accounts, roles and access for your BitePay store." },
  ] }),
});

function TeamPage() {
  const { currentUser, profiles, can, addStaff, updateStaff, disableStaff, resetStaffCredential } = useStore();
  const navigate = useNavigate();
  const [showAdd, setShowAdd] = useState(false);
  const [edit, setEdit] = useState<Profile | null>(null);
  const [reset, setReset] = useState<{ p: Profile; kind: "password" | "pin" } | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!currentUser) navigate({ to: "/" });
    else if (currentUser.role !== "staff") navigate({ to: "/dashboard" });
  }, [currentUser, navigate]);

  const staff = useMemo(() => profiles.filter((p) => p.role === "staff").sort((a, b) => (a.created_at ?? 0) - (b.created_at ?? 0)), [profiles]);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2200); };

  if (!currentUser || currentUser.role !== "staff") return null;
  if (!can("team.view")) return <StaffShell><AccessDenied feature="Team management" /></StaffShell>;

  const canManageAll = can("team.manage_all");

  return (
    <StaffShell>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Users className="w-7 h-7 text-primary" /> Team</h1>
          <p className="text-muted-foreground">{canManageAll ? "Add or remove members and set their role." : "You can add cashiers. Only the owner can add supervisors or owners."}</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="rounded-xl"><UserPlus className="w-4 h-4 mr-2" /> Add member</Button>
      </div>

      <div className="bg-surface border rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_auto] px-4 py-3 text-[11px] uppercase tracking-wider font-bold text-muted-foreground border-b bg-muted/30">
          <div>Member</div>
          <div>Phone</div>
          <div>Role</div>
          <div>Status</div>
          <div className="text-right">Actions</div>
        </div>
        {staff.map((p) => (
          <div key={p.id} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_auto] items-center px-4 py-3 border-b last:border-0 text-sm">
            <div>
              <div className="font-semibold flex items-center gap-2">
                {p.full_name}
                {p.id === currentUser.id && <span className="text-[10px] uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded">You</span>}
              </div>
              <div className="text-xs text-muted-foreground">Since {p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}{p.last_login ? ` · last sign-in ${new Date(p.last_login).toLocaleDateString()}` : ""}</div>
            </div>
            <div>{p.phone}</div>
            <div><RoleBadge role={p.staff_role ?? "cashier"} /></div>
            <div>{p.disabled ? <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">Disabled</span> : <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Active</span>}</div>
            <div className="flex items-center justify-end gap-1">
              <button title="Edit" onClick={() => setEdit(p)} className="p-2 rounded-lg hover:bg-muted"><Pencil className="w-4 h-4" /></button>
              <button title="Reset password" onClick={() => setReset({ p, kind: "password" })} className="p-2 rounded-lg hover:bg-muted"><KeyRound className="w-4 h-4" /></button>
              <button title="Reset PIN" onClick={() => setReset({ p, kind: "pin" })} className="p-2 rounded-lg hover:bg-muted text-xs font-bold">PIN</button>
              <button
                title={p.disabled ? "Enable" : "Disable"}
                onClick={() => { const r = disableStaff(p.id, !p.disabled); flash(r.ok ? (p.disabled ? "Enabled" : "Disabled") : r.reason); }}
                className={`p-2 rounded-lg hover:bg-muted ${p.disabled ? "text-emerald-700" : "text-red-700"}`}
              >
                {p.disabled ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
              </button>
            </div>
          </div>
        ))}
        {staff.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No staff yet — click Add member.</div>}
      </div>

      {showAdd && <AddStaffModal onClose={() => setShowAdd(false)} onSubmit={(input) => {
        const r = addStaff(input); flash(r.ok ? "Member added" : r.reason); if (r.ok) setShowAdd(false);
      }} canManageAll={canManageAll} />}

      {edit && <EditStaffModal p={edit} onClose={() => setEdit(null)} onSubmit={(patch) => {
        const r = updateStaff(edit.id, patch); flash(r.ok ? "Updated" : r.reason); if (r.ok) setEdit(null);
      }} canManageAll={canManageAll} />}

      {reset && <ResetModal p={reset.p} kind={reset.kind} onClose={() => setReset(null)} onSubmit={(v) => {
        const r = resetStaffCredential(reset.p.id, reset.kind, v); flash(r.ok ? `${reset.kind === "pin" ? "PIN" : "Password"} reset` : r.reason); if (r.ok) setReset(null);
      }} />}

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-foreground text-background text-sm px-4 py-2 rounded-lg shadow-lg">{toast}</div>}
    </StaffShell>
  );
}

function RoleBadge({ role }: { role: StaffRole }) {
  const map: Record<StaffRole, { label: string; cls: string; icon: React.ReactNode }> = {
    owner: { label: "Owner", cls: "bg-amber-100 text-amber-700", icon: <Crown className="w-3 h-3" /> },
    supervisor: { label: "Supervisor", cls: "bg-primary/10 text-primary", icon: <ShieldCheck className="w-3 h-3" /> },
    cashier: { label: "Cashier", cls: "bg-slate-100 text-slate-700", icon: <Shield className="w-3 h-3" /> },
  };
  const m = map[role];
  return <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${m.cls}`}>{m.icon}{m.label}</span>;
}

function AddStaffModal({ onClose, onSubmit, canManageAll }: { onClose: () => void; onSubmit: (input: { full_name: string; phone: string; password: string; role: StaffRole; staff_pin: string }) => void; canManageAll: boolean }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState<StaffRole>("cashier");

  return (
    <Modal title="Add team member" onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit({ full_name: name, phone, password, role, staff_pin: pin }); }} className="space-y-3">
        <Field label="Full name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" /></Field>
        <Field label="Phone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 000 000" /></Field>
        <Field label="Temporary password"><Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 4 characters" /></Field>
        <Field label="Staff PIN (4–6 digits)"><Input inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="1234" /></Field>
        <Field label="Role">
          <div className="grid grid-cols-3 gap-2">
            {(["cashier", "supervisor", "owner"] as StaffRole[]).map((r) => {
              const disabled = r !== "cashier" && !canManageAll;
              return (
                <button key={r} type="button" disabled={disabled} onClick={() => setRole(r)}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold border capitalize ${role === r ? "border-primary bg-primary/10 text-primary" : "border-transparent bg-muted"} ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}>
                  {r}
                </button>
              );
            })}
          </div>
          {!canManageAll && <p className="text-xs text-muted-foreground mt-1">Only the owner can create supervisors or owners.</p>}
        </Field>
        <Button type="submit" className="w-full">Add member</Button>
      </form>
    </Modal>
  );
}

function EditStaffModal({ p, onClose, onSubmit, canManageAll }: { p: Profile; onClose: () => void; onSubmit: (patch: Partial<Pick<Profile, "full_name" | "phone" | "staff_role">>) => void; canManageAll: boolean }) {
  const [name, setName] = useState(p.full_name);
  const [phone, setPhone] = useState(p.phone);
  const [role, setRole] = useState<StaffRole>(p.staff_role ?? "cashier");

  return (
    <Modal title={`Edit ${p.full_name}`} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit({ full_name: name, phone, staff_role: role }); }} className="space-y-3">
        <Field label="Full name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Phone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
        <Field label="Role">
          <div className="grid grid-cols-3 gap-2">
            {(["cashier", "supervisor", "owner"] as StaffRole[]).map((r) => {
              const disabled = r !== "cashier" && !canManageAll;
              return (
                <button key={r} type="button" disabled={disabled} onClick={() => setRole(r)}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold border capitalize ${role === r ? "border-primary bg-primary/10 text-primary" : "border-transparent bg-muted"} ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}>
                  {r}
                </button>
              );
            })}
          </div>
        </Field>
        <Button type="submit" className="w-full">Save changes</Button>
      </form>
    </Modal>
  );
}

function ResetModal({ p, kind, onClose, onSubmit }: { p: Profile; kind: "password" | "pin"; onClose: () => void; onSubmit: (v: string) => void }) {
  const [v, setV] = useState("");
  return (
    <Modal title={`Reset ${kind} for ${p.full_name}`} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(v); }} className="space-y-3">
        <Field label={kind === "pin" ? "New PIN (4–6 digits)" : "New password"}>
          <Input inputMode={kind === "pin" ? "numeric" : "text"} value={v}
            onChange={(e) => setV(kind === "pin" ? e.target.value.replace(/\D/g, "").slice(0, 6) : e.target.value)} />
        </Field>
        <Button type="submit" className="w-full">Reset {kind}</Button>
      </form>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-surface rounded-2xl w-full max-w-md p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
        <h3 className="font-bold text-lg mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
