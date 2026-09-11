import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing, X, Volume2, VolumeX, Smartphone } from "lucide-react";
import {
  alertsEnabled,
  isSupported,
  inIframe,
  notify,
  permissionState,
  requestAlerts,
  setAlertsEnabled,
  setSoundEnabled,
  soundEnabled,
  type PermissionState,
} from "@/lib/push-notifications";

export function NotificationBell({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [perm, setPerm] = useState<PermissionState>("default");
  const [on, setOn] = useState(false);
  const [sound, setSound] = useState(true);
  const [msg, setMsg] = useState("");

  const refresh = () => {
    setPerm(permissionState());
    setOn(alertsEnabled());
    setSound(soundEnabled());
  };

  useEffect(refresh, []);

  const enable = async () => {
    const r = await requestAlerts();
    refresh();
    if (r === "granted") {
      setMsg("Alerts are on. We'll ring your device for every new order.");
      void notify({ title: "BitePay alerts are on", body: "You'll be notified here when a new order or request arrives." });
    } else if (r === "open-in-new-tab") {
      setMsg("Open BitePay in its own browser tab or install it on your phone, then turn alerts on.");
    } else if (r === "denied") {
      setMsg("Your browser blocked alerts. Allow notifications for this site in your browser settings, then try again.");
    } else {
      setMsg("This browser can't show device notifications.");
    }
  };

  const turnOff = () => { setAlertsEnabled(false); refresh(); setMsg("Alerts paused on this device."); };

  const active = on && perm === "granted";
  const Icon = !isSupported() ? BellOff : active ? BellRing : Bell;

  return (
    <>
      <button
        onClick={() => { refresh(); setMsg(""); setOpen(true); }}
        title="Notification settings"
        aria-label="Notification settings"
        className={`relative p-2 rounded-lg hover:bg-muted ${className}`}
      >
        <Icon className={`w-4 h-4 ${active ? "text-primary" : ""}`} />
        {!active && isSupported() && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500" />
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-background w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2"><BellRing className="w-5 h-5 text-primary" /> Notifications</h3>
                <p className="text-sm text-muted-foreground">Ring this device when a new order, menu request or wallet update arrives.</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
            </div>

            <div className="mt-4 rounded-2xl border p-4 flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-sm">Device alerts</div>
                <div className="text-xs text-muted-foreground">
                  {active ? "On — alerts show in your notification bar." : perm === "denied" ? "Blocked by your browser settings." : "Off — turn on to get alerted."}
                </div>
              </div>
              {active ? (
                <button onClick={turnOff} className="h-10 px-4 rounded-xl text-sm font-semibold bg-muted hover:bg-muted/80">Turn off</button>
              ) : (
                <button onClick={enable} className="h-10 px-4 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90">Turn on</button>
              )}
            </div>

            <label className="mt-3 flex items-center justify-between gap-3 rounded-2xl border p-4 cursor-pointer">
              <div className="flex items-center gap-2">
                {sound ? <Volume2 className="w-4 h-4 text-primary" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
                <div>
                  <div className="font-semibold text-sm">Alert sound</div>
                  <div className="text-xs text-muted-foreground">Play a chime with each alert.</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={sound}
                onChange={(e) => { setSoundEnabled(e.target.checked); setSound(e.target.checked); }}
                className="w-5 h-5 accent-primary"
              />
            </label>

            {active && (
              <button
                onClick={() => void notify({ title: "Test alert", body: "This is how a new order will look." })}
                className="mt-3 w-full h-11 rounded-xl border text-sm font-semibold hover:bg-muted"
              >
                Send a test alert
              </button>
            )}

            <div className="mt-4 rounded-2xl bg-surface border p-4 text-xs text-muted-foreground space-y-1.5">
              <div className="flex items-center gap-2 text-foreground font-semibold text-xs uppercase tracking-wider"><Smartphone className="w-4 h-4 text-primary" /> On Android</div>
              <p>Open BitePay in Chrome, tap the menu and choose <b>Install app</b> / <b>Add to Home screen</b>. Open it from the home screen and turn alerts on here — Android will ask you to allow notifications.</p>
              <p>On Windows, allow notifications when the browser asks; alerts appear in the action center as long as BitePay stays open in a tab.</p>
              {inIframe() && <p className="text-amber-600">You're viewing BitePay inside a preview frame — open it in its own tab to switch alerts on.</p>}
            </div>

            {msg && <p className="mt-3 text-sm font-medium">{msg}</p>}
          </div>
        </div>
      )}
    </>
  );
}
