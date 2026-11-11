import { useEffect, useRef } from "react";

/** True when keystrokes arrive as a scanner burst: >=4 chars, each within maxGap ms. */
export function isScannerBurst(times: number[], maxGap = 35) {
  if (times.length < 4) return false;
  for (let i = 1; i < times.length; i++) if (times[i] - times[i - 1] > maxGap) return false;
  return true;
}

/** Listens for USB/Bluetooth keyboard-wedge scanners anywhere on the page. */
export function useHardwareScanner(onScan: (code: string) => void, enabled = true) {
  const cb = useRef(onScan); cb.current = onScan;
  useEffect(() => {
    if (!enabled) return;
    let buf = ""; let times: number[] = [];
    const onKey = (e: KeyboardEvent) => {
      const now = performance.now();
      if (times.length && now - times[times.length - 1] > 80) { buf = ""; times = []; }
      if (e.key === "Enter") {
        if (buf.length >= 4 && isScannerBurst(times)) { e.preventDefault(); e.stopPropagation(); const code = buf; cb.current(code); }
        buf = ""; times = []; return;
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { buf += e.key; times.push(now); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [enabled]);
}
