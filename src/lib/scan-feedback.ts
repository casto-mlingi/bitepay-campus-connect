/** Short POS beep + vibration on a successful scan. Browser-only; call from handlers. */
let ctx: AudioContext | null = null;
export function scanBeep() {
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (AC) {
      ctx = ctx ?? new AC();
      const c = ctx!;
      const o = c.createOscillator(); const g = c.createGain();
      o.type = "square"; o.frequency.value = 880; g.gain.value = 0.08;
      o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.09);
    }
    navigator.vibrate?.(40);
  } catch { /* audio not allowed */ }
}
