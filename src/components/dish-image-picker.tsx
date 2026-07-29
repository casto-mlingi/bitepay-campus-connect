import { useRef, useState } from "react";
import { Camera, Upload, X, Check, RotateCcw } from "lucide-react";

// Reads a file to data URL while reporting progress (0..100).
function readFileWithProgress(file: File, onProgress: (pct: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    fr.onload = () => { onProgress(100); resolve(String(fr.result)); };
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = src;
  });
}

// Renders the source image cropped to a 1:1 square at OUT_SIZE px using zoom + offset.
const OUT_SIZE = 640;
function renderCrop(img: HTMLImageElement, zoom: number, ox: number, oy: number, viewSize: number): string {
  // The visible square shows a portion of the image scaled by `baseScale * zoom`.
  const baseScale = viewSize / Math.min(img.width, img.height);
  const scale = baseScale * zoom;
  const canvas = document.createElement("canvas");
  canvas.width = OUT_SIZE;
  canvas.height = OUT_SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, OUT_SIZE, OUT_SIZE);
  const drawW = img.width * scale * (OUT_SIZE / viewSize);
  const drawH = img.height * scale * (OUT_SIZE / viewSize);
  const cx = OUT_SIZE / 2 + ox * (OUT_SIZE / viewSize);
  const cy = OUT_SIZE / 2 + oy * (OUT_SIZE / viewSize);
  ctx.drawImage(img, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
  return canvas.toDataURL("image/jpeg", 0.85);
}

type Props = {
  value?: string;
  onChange: (image: string | undefined) => void;
  onBusyChange?: (busy: boolean) => void;
};

const VIEW = 280;

export function DishImagePicker({ value, onChange, onBusyChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"idle" | "reading" | "processing" | "cropping">("idle");
  const [source, setSource] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);

  const busy = phase !== "idle";
  const setBusy = (b: boolean, ph: typeof phase = "idle") => { setPhase(b ? ph : "idle"); onBusyChange?.(b); };

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    try {
      setBusy(true, "reading");
      setProgress(0);
      const dataUrl = await readFileWithProgress(file, setProgress);
      setPhase("processing");
      const img = await loadImage(dataUrl);
      setSource(img);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setPhase("cropping");
      onBusyChange?.(true);
    } catch {
      setBusy(false);
    }
  };

  const commit = () => {
    if (!source) return;
    const out = renderCrop(source, zoom, offset.x, offset.y, VIEW);
    onChange(out);
    setSource(null);
    setBusy(false);
    setProgress(0);
  };

  const cancel = () => { setSource(null); setBusy(false); setProgress(0); };

  return (
    <div>
      <div className="text-muted-foreground text-sm mb-1">Dish Photo</div>
      <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-dashed border-border bg-muted/30 grid place-items-center">
        {value ? (
          <>
            <img src={value} alt="Dish preview" className="w-full h-full object-cover" />
            <button type="button" onClick={() => onChange(undefined)} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5" aria-label="Remove photo">
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="text-center text-xs text-muted-foreground px-3">
            {busy ? `${phase === "reading" ? "Reading" : phase === "processing" ? "Processing" : "Ready to crop"}…` : "Add a photo of the dish"}
          </div>
        )}
      </div>

      {/* Progress bar shown during read/process */}
      {(phase === "reading" || phase === "processing") && (
        <div className="mt-2">
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${phase === "reading" ? progress : 100}%` }} />
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">
            {phase === "reading" ? `Uploading ${progress}%` : "Preparing preview…"}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mt-2">
        <button type="button" disabled={busy} onClick={() => cameraRef.current?.click()} className="flex items-center justify-center gap-1.5 border rounded-lg py-2 text-xs font-semibold hover:bg-muted disabled:opacity-50">
          <Camera className="w-4 h-4" /> Camera
        </button>
        <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="flex items-center justify-center gap-1.5 border rounded-lg py-2 text-xs font-semibold hover:bg-muted disabled:opacity-50">
          <Upload className="w-4 h-4" /> Upload
        </button>
      </div>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }} />

      {/* Crop modal */}
      {phase === "cropping" && source && (
        <div className="fixed inset-0 z-[80] bg-black/70 grid place-items-center p-4">
          <div className="bg-background rounded-2xl w-full max-w-md p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold">Crop to square</div>
              <button onClick={cancel} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div
              className="mx-auto relative overflow-hidden rounded-xl bg-black touch-none select-none"
              style={{ width: VIEW, height: VIEW }}
              onPointerDown={(e) => {
                (e.target as Element).setPointerCapture(e.pointerId);
                dragRef.current = { startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y };
              }}
              onPointerMove={(e) => {
                if (!dragRef.current) return;
                setOffset({ x: dragRef.current.ox + (e.clientX - dragRef.current.startX), y: dragRef.current.oy + (e.clientY - dragRef.current.startY) });
              }}
              onPointerUp={() => { dragRef.current = null; }}
            >
              <img
                src={source.src}
                alt="Crop source"
                draggable={false}
                className="absolute left-1/2 top-1/2 pointer-events-none"
                style={{
                  transform: `translate(-50%,-50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                  transformOrigin: "center center",
                  height: source.height >= source.width ? "100%" : "auto",
                  width: source.width > source.height ? "100%" : "auto",
                  maxWidth: "none",
                }}
              />
              <div className="absolute inset-0 ring-1 ring-white/40 pointer-events-none" />
            </div>
            <div className="flex items-center gap-3 mt-4">
              <label className="text-xs font-semibold text-muted-foreground">Zoom</label>
              <input type="range" min={1} max={4} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-primary" />
              <button type="button" onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }} className="p-1.5 rounded-lg border hover:bg-muted" aria-label="Reset">
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button onClick={cancel} className="border rounded-lg py-2 text-sm font-semibold">Cancel</button>
              <button onClick={commit} className="bg-primary text-white rounded-lg py-2 text-sm font-semibold flex items-center justify-center gap-1.5">
                <Check className="w-4 h-4" /> Use photo
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 text-center">Drag to reposition · pinch/scroll or use the slider to zoom</p>
          </div>
        </div>
      )}
    </div>
  );
}
