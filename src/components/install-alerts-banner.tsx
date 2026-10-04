import { useEffect, useState } from "react";
import { BellRing, Download, X } from "lucide-react";
import { inIframe, notify, permissionState, requestAlerts } from "@/lib/push-notifications";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/**
 * Phone banner: offers "Install BitePay" (Android Chrome install prompt) and,
 * once the app runs from the home screen, asks to turn on order alerts.
 */
export function InstallAlertsBanner() {
  const [installEvt, setInstallEvt] = useState<InstallEvent | null>(null);
  const [needsAlerts, setNeedsAlerts] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (inIframe()) return;
    setHidden(sessionStorage.getItem("bitepay.banner.hide") === "1");
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setNeedsAlerts(standalone && permissionState() === "default");
    const onPrompt = (e: Event) => { e.preventDefault(); setInstallEvt(e as InstallEvent); };
    const onInstalled = () => { setInstallEvt(null); setNeedsAlerts(permissionState() === "default"); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (hidden || (!installEvt && !needsAlerts)) return null;

  const install = async () => {
    if (!installEvt) return;
    await installEvt.prompt();
    await installEvt.userChoice;
    setInstallEvt(null);
    // Ask for alerts right after install while the user is engaged.
    if (permissionState() === "default") setNeedsAlerts(true);
  };
  const enable = async () => {
    const r = await requestAlerts();
    setNeedsAlerts(false);
    if (r === "granted") void notify({ title: "BitePay alerts are on", body: "New orders will ring here." });
  };
  const close = () => { sessionStorage.setItem("bitepay.banner.hide", "1"); setHidden(true); };

  return (
    <div className="fixed top-2 inset-x-2 z-[60] mx-auto max-w-md rounded-xl border bg-surface shadow-xl p-3 flex items-center gap-3">
      {installEvt ? <Download className="w-5 h-5 text-primary shrink-0" /> : <BellRing className="w-5 h-5 text-primary shrink-0" />}
      <div className="flex-1 text-sm">
        <div className="font-semibold">{installEvt ? "Install BitePay" : "Turn on order alerts"}</div>
        <div className="text-xs text-muted-foreground">{installEvt ? "Add it to your home screen for alerts and offline use." : "Ring this phone when a new order arrives."}</div>
      </div>
      <button onClick={installEvt ? install : enable} className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
        {installEvt ? "Install" : "Allow"}
      </button>
      <button onClick={close} aria-label="Dismiss" className="p-1 text-muted-foreground"><X className="w-4 h-4" /></button>
    </div>
  );
}
