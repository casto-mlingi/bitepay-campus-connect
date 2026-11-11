import { useEffect, useRef, useState } from "react";
import { X, ScanBarcode, Flashlight, SwitchCamera, Usb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { scanBeep } from "@/lib/scan-feedback";

type Props = { onClose: () => void; onScan: (code: string) => void; continuous?: boolean; title?: string };

/** Camera scanner for product barcodes (EAN/UPC/Code128/Code39) and QR. Hardware scanners keep working while open. */
export function BarcodeScannerModal({ onClose, onScan, continuous = false, title = "Scan barcode" }: Props) {
  const id = "bitepay-barcode-reader";
  const [error, setError] = useState("");
  const [torch, setTorch] = useState(false);
  const [torchOk, setTorchOk] = useState(false);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [last, setLast] = useState("");
  const scannerRef = useRef<any>(null);
  const cb = useRef(onScan); cb.current = onScan;
  const recent = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const done = useRef(false);

  useEffect(() => {
    let cancelled = false; done.current = false;
    const stop = async (s: any) => { try { if (s && (s.getState?.() === 2 || s.getState?.() === 3)) { await s.stop(); s.clear(); } } catch { /* stopped */ } };
    (async () => {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats: F } = await import("html5-qrcode");
        if (cancelled) return;
        const s = new Html5Qrcode(id, { verbose: false, formatsToSupport: [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E, F.CODE_128, F.CODE_39, F.ITF, F.QR_CODE], useBarCodeDetectorIfSupported: true } as any);
        scannerRef.current = s;
        await s.start({ facingMode: facing }, {
          fps: 15,
          qrbox: (w: number, h: number) => ({ width: Math.max(200, Math.floor(w * 0.85)), height: Math.max(100, Math.floor(Math.min(h, w) * 0.4)) }),
        }, (text: string) => {
          if (cancelled || done.current) return;
          const now = Date.now();
          if (recent.current.code === text && now - recent.current.at < 1200) return;
          recent.current = { code: text, at: now };
          scanBeep(); setLast(text); cb.current(text);
          if (!continuous) { done.current = true; void stop(s); onClose(); }
        }, () => {});
        if (cancelled) { await stop(s); return; }
        try { const caps: any = s.getRunningTrackCapabilities?.(); setTorchOk(!!caps?.torch); } catch { setTorchOk(false); }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Camera unavailable. Allow camera access, or use a handheld scanner.");
      }
    })();
    return () => { cancelled = true; done.current = true; void stop(scannerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing, continuous]);

  const toggleTorch = async () => {
    try { await scannerRef.current?.applyVideoConstraints({ advanced: [{ torch: !torch }] } as any); setTorch(!torch); } catch { setTorchOk(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-foreground/70 grid place-items-center p-3" onClick={onClose}>
      <div role="dialog" aria-label={title} className="bg-background rounded-2xl w-full max-w-md p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold flex items-center gap-2"><ScanBarcode className="w-5 h-5 text-primary" /> {title}</h3>
          <Button variant="ghost" size="icon" aria-label="Close scanner" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <div className="relative w-full aspect-[4/3] bg-muted rounded-xl overflow-hidden">
          <div id={id} className="w-full h-full [&_video]:object-cover [&_video]:w-full [&_video]:h-full" />
          {!error && <div className="pointer-events-none absolute left-[8%] right-[8%] top-1/2 h-0.5 bg-destructive shadow-[0_0_8px_hsl(var(--destructive))] animate-pulse" />}
        </div>
        <div className="mt-3 flex gap-2">
          {torchOk && <Button type="button" variant={torch ? "default" : "outline"} className="flex-1 h-11" onClick={toggleTorch}><Flashlight className="w-4 h-4 mr-2" />{torch ? "Light on" : "Light"}</Button>}
          <Button type="button" variant="outline" className="flex-1 h-11" onClick={() => setFacing(facing === "environment" ? "user" : "environment")}><SwitchCamera className="w-4 h-4 mr-2" />Switch camera</Button>
        </div>
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : (
          <p className="mt-3 text-xs text-muted-foreground text-center">
            {continuous ? "Keep scanning — each item is added to the bill." : "Hold the barcode inside the frame."}
            {last && <span className="block mt-1 font-mono text-foreground">Last: {last}</span>}
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground flex items-center justify-center gap-1"><Usb className="w-3 h-3" /> Handheld USB/Bluetooth scanners also work anytime.</p>
        {continuous && <Button className="w-full mt-3 h-11" onClick={onClose}>Done</Button>}
      </div>
    </div>
  );
}
