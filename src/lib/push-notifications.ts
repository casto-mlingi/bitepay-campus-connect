/**
 * System (OS-level) notifications for BitePay.
 * Works on Android (Chrome / installed app) and Windows desktop browsers.
 * Alerts are raised while the app is running — including when it sits in a
 * background tab or behind other windows.
 */

const PREF_KEY = "bitepay.notify";
const SOUND_KEY = "bitepay.notify.sound";

export type PermissionState = "unsupported" | "default" | "granted" | "denied";

export function isSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function permissionState(): PermissionState {
  if (!isSupported()) return "unsupported";
  return Notification.permission as PermissionState;
}

export function alertsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PREF_KEY) !== "off" && permissionState() === "granted";
}

export function setAlertsEnabled(on: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREF_KEY, on ? "on" : "off");
}

export function soundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(SOUND_KEY) !== "off";
}

export function setSoundEnabled(on: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SOUND_KEY, on ? "on" : "off");
}

export function inIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export type EnableResult =
  | "granted"
  | "denied"
  | "unsupported"
  | "open-in-new-tab";

/** Must be called from a click handler — browsers ignore silent requests. */
export async function requestAlerts(): Promise<EnableResult> {
  if (!isSupported()) return "unsupported";
  if (Notification.permission === "granted") {
    setAlertsEnabled(true);
    return "granted";
  }
  if (inIframe()) return "open-in-new-tab";
  let result: NotificationPermission = "denied";
  try {
    result = await Notification.requestPermission();
  } catch {
    return "denied";
  }
  if (result !== "granted") return "denied";
  setAlertsEnabled(true);
  return "granted";
}

let audioCtx: AudioContext | null = null;

/** Short two-tone chime so a busy counter hears the new order. */
export function playChime() {
  if (!soundEnabled() || typeof window === "undefined") return;
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    audioCtx = audioCtx ?? new Ctor();
    void audioCtx.resume();
    const now = audioCtx.currentTime;
    [
      [880, 0],
      [1320, 0.18],
    ].forEach(([freq, offset]) => {
      const osc = audioCtx!.createOscillator();
      const gain = audioCtx!.createGain();
      osc.type = "sine";
      osc.frequency.value = freq as number;
      gain.gain.setValueAtTime(0.0001, now + (offset as number));
      gain.gain.exponentialRampToValueAtTime(0.25, now + (offset as number) + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (offset as number) + 0.16);
      osc.connect(gain).connect(audioCtx!.destination);
      osc.start(now + (offset as number));
      osc.stop(now + (offset as number) + 0.2);
    });
  } catch {
    /* audio is best-effort */
  }
}

export type NotifyInput = {
  title: string;
  body: string;
  tag?: string;
  /** Path opened when the user taps the notification. */
  url?: string;
  silent?: boolean;
};

/** Shows a notification in the OS notification bar / action center. */
export async function notify({ title, body, tag, silent }: NotifyInput) {
  if (!alertsEnabled()) return;
  const options: NotificationOptions = {
    body,
    tag,
    icon: "/bitepay-icon.png",
    badge: "/bitepay-icon.png",
    ...(tag ? { renotify: true } : {}),
  } as NotificationOptions;

  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(title, options);
        if (!silent) playChime();
        return;
      }
    }
    new Notification(title, options);
    if (!silent) playChime();
  } catch {
    /* notification is best-effort */
  }
}
