import { useState } from "react";
import { ScanBarcode } from "lucide-react";
import { BarcodeScannerModal } from "@/components/barcode-scanner-modal";

/** Barcode input: type, pull a handheld scanner trigger while focused, or scan with the phone camera. */
export function BarcodeField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex gap-2 mt-1">
      <input aria-label="Barcode" inputMode="numeric" placeholder="Scan or type barcode" value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
        className="flex-1 min-w-0 h-11 border rounded-md px-3 bg-background font-mono" />
      <button type="button" onClick={() => setOpen(true)} aria-label="Scan barcode with camera"
        className="h-11 px-3 rounded-md border font-semibold text-sm flex items-center gap-1.5 hover:bg-muted">
        <ScanBarcode className="w-4 h-4 text-primary" /> Scan
      </button>
      {open && <BarcodeScannerModal title="Scan item barcode" onClose={() => setOpen(false)} onScan={(c) => onChange(c.trim())} />}
    </div>
  );
}
