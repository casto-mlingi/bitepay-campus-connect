import { useEffect, useRef, useState } from "react";
import { X, Camera, Loader2, ImageUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { extractLipaReference } from "@/lib/lipa-reference";
import { scanBeep } from "@/lib/scan-feedback";

/** Reads the receipt code off a customer's phone screen (M-Pesa, Airtel, Mixx…) with the camera. */
export function ReceiptScannerModal({ onClose, onScan }: { onClose: () => void; onScan: (ref: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1920 } } });
        if (cancelled) { s.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = s;
        if (videoRef.current) { videoRef.current.srcObject = s; await videoRef.current.play().catch(() => {}); }
      } catch { if (!cancelled) setError("Camera unavailable. Allow camera access or take a photo instead."); }
    })();
    return () => { cancelled = true; streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  const read = async (source: HTMLCanvasElement | File) => {
    setBusy(true); setError(""); setFound("");
    try {
      const { recognize } = await import("tesseract.js");
      const { data } = await recognize(source, "eng");
      const ref = extractLipaReference(data.text);
      if (ref) { scanBeep(); setFound(ref); } else setError("No receipt number found. Hold the phone closer, reduce glare, and try again.");
    } catch { setError("Could not read the picture. Try again or type the number."); }
    finally { setBusy(false); }
  };

  const capture = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth; c.height = v.videoHeight;
    const ctx = c.getContext("2d")!;
    ctx.filter = "grayscale(1) contrast(1.4)";
    ctx.drawImage(v, 0, 0);
    void read(c);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-foreground/70 grid place-items-center p-3" onClick={onClose}>
      <div role="dialog" aria-label="Scan Lipa receipt" className="bg-background rounded-2xl w-full max-w-md p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold flex items-center gap-2"><Camera className="w-5 h-5 text-primary" /> Scan Lipa receipt</h3>
          <Button variant="ghost" size="icon" aria-label="Close receipt scanner" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <div className="relative w-full aspect-[4/3] bg-muted rounded-xl overflow-hidden">
          <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
          <div className="pointer-events-none absolute inset-x-[8%] top-[35%] h-[30%] border-2 border-primary rounded-lg" />
        </div>
        <p className="mt-2 text-xs text-muted-foreground text-center">Put the payment message with the receipt number inside the box.</p>
        {found ? (
          <div className="mt-3 rounded-xl border border-success/40 bg-success/10 p-3 text-center">
            <div className="text-xs text-muted-foreground">Receipt number</div>
            <div className="font-mono text-xl font-bold">{found}</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setFound("")}>Scan again</Button>
              <Button onClick={() => { onScan(found); onClose(); }}>Use this</Button>
            </div>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button className="h-12" disabled={busy || !!error && !streamRef.current} onClick={capture}>
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Camera className="w-4 h-4 mr-2" />}{busy ? "Reading…" : "Capture"}
            </Button>
            <label className="h-12 inline-flex items-center justify-center rounded-md border text-sm font-medium cursor-pointer">
              <ImageUp className="w-4 h-4 mr-2" />Take photo
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void read(f); }} />
            </label>
          </div>
        )}
        {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
