import { useState } from "react";
import { Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Reusable customer wallet-PIN prompt.
 * `onVerify` returns true on success, or an error string / false on failure.
 */
export function WalletPinDialog({
  title = "Enter wallet PIN",
  subtitle = "Ask the customer for their 4–6 digit wallet PIN.",
  onCancel,
  onVerify,
}: {
  title?: string;
  subtitle?: string;
  onCancel: () => void;
  onVerify: (pin: string) => boolean | string;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = onVerify(pin);
    if (res === true) return;
    setError(typeof res === "string" ? res : "Incorrect PIN");
    setPin("");
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 grid place-items-center p-4" onClick={onCancel}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-background rounded-3xl w-full max-w-xs p-6">
        <div className="flex items-start justify-between gap-2">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary grid place-items-center"><Lock className="w-5 h-5" /></div>
          <button type="button" onClick={onCancel} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <h3 className="mt-3 font-bold text-lg">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        <Input
          autoFocus
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setError(""); }}
          placeholder="••••"
          className="mt-4 text-center tracking-[0.5em] text-lg font-bold"
        />
        {error && <div className="mt-2 text-xs text-destructive font-medium">{error}</div>}
        <Button type="submit" disabled={pin.length < 4} className="w-full mt-4 h-11 rounded-xl">Unlock</Button>
      </form>
    </div>
  );
}
