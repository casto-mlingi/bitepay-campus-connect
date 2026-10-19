import { useEffect, useRef, useState } from "react";
import { X, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QRScannerModal({ onClose, onScan }: { onClose: () => void; onScan: (text: string) => void }) {
  const containerId = "bitepay-qr-reader";
  const [error, setError] = useState<string>("");
  const stoppedRef = useRef(false);

  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    let scanner: any;
    let cancelled = false;
    stoppedRef.current = false;

    // html5-qrcode throws synchronously when the scanner isn't running,
    // so stop() must be wrapped in try/catch, not just .catch().
    const safeStop = async (s: any) => {
      if (!s) return;
      try {
        if (typeof s.getState === "function" && s.getState() !== 2 && s.getState() !== 3) return;
        await s.stop();
        s.clear();
      } catch {
        /* already stopped */
      }
    };

    (async () => {
      try {
        const mod: any = await import("html5-qrcode");
        if (cancelled) return;
        const { Html5Qrcode } = mod;
        scanner = new Html5Qrcode(containerId);
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            aspectRatio: 1,
            // Always a square box: side = 70% of the smaller viewfinder edge.
            qrbox: (w: number, h: number) => {
              const side = Math.max(160, Math.floor(Math.min(w, h) * 0.7));
              return { width: side, height: side };
            },
          },
          (decoded: string) => {
            if (cancelled || stoppedRef.current) return;
            stoppedRef.current = true;
            onScanRef.current(decoded);
            void safeStop(scanner);
          },
          () => {},
        );
        if (cancelled) await safeStop(scanner);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? "Camera unavailable. Grant camera permission or use manual search.");
      }
    })();

    return () => {
      cancelled = true;
      stoppedRef.current = true;
      void safeStop(scanner);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-foreground/70 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-background rounded-2xl w-full max-w-sm p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold flex items-center gap-2"><Camera className="w-4 h-4 text-primary" /> Scan Customer QR</h3>
          <Button variant="ghost" size="icon" aria-label="Close QR scanner" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <div id={containerId} className="w-full aspect-square bg-muted rounded-xl overflow-hidden" />
        {error ? (
          <div className="mt-3 text-sm text-destructive">{error}</div>
        ) : (
          <div className="mt-3 text-xs text-muted-foreground text-center">Point the camera at the customer's BitePay ID card.</div>
        )}
      </div>
    </div>
  );
}
