import { useEffect, useState } from "react";

const DISMISSED_AT_KEY = "noor_pwa_install_dismissed_at";
const DISMISS_FOR_MS = 7 * 24 * 60 * 60 * 1000;

const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches
  || window.navigator.standalone === true;

const isIos = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent);

export default function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(() => isStandalone());
  const ios = isIos();

  useEffect(() => {
    if (installed) return undefined;

    const dismissedAt = Number(window.localStorage.getItem(DISMISSED_AT_KEY) || 0);
    const recentlyDismissed = Date.now() - dismissedAt < DISMISS_FOR_MS;
    let timer;

    const onBeforeInstall = (event) => {
      event.preventDefault();
      setInstallEvent(event);
      if (!recentlyDismissed) setVisible(true);
    };

    const onInstalled = () => {
      setInstalled(true);
      setVisible(false);
      setInstallEvent(null);
      window.localStorage.removeItem(DISMISSED_AT_KEY);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    if (!recentlyDismissed) {
      timer = window.setTimeout(() => setVisible(true), 1500);
    }

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [installed]);

  const dismiss = () => {
    window.localStorage.setItem(DISMISSED_AT_KEY, String(Date.now()));
    setVisible(false);
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    setInstallEvent(null);
    if (outcome === "accepted") setVisible(false);
  };

  if (installed || !visible) return null;

  const manualInstall = !installEvent;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/65 p-3 backdrop-blur-sm sm:items-center" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) dismiss();
    }}>
      <section role="dialog" aria-modal="true" aria-labelledby="pwa-install-title" className="w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-zinc-900 shadow-2xl shadow-black/60">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <img src="/pwa-icon-192.png" alt="" className="h-16 w-16 shrink-0 rounded-2xl shadow-lg" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-purple-400">Noor app</p>
              <h2 id="pwa-install-title" className="mt-1 text-xl font-bold text-white">Add Noor to your home screen</h2>
            </div>
          </div>

          <p className="mt-5 text-sm leading-6 text-zinc-400">
            Open Noor like an app with a full-screen experience and faster repeat visits.
          </p>

          {manualInstall && (
            <div className="mt-4 rounded-2xl border border-purple-500/20 bg-purple-500/10 p-4 text-sm leading-6 text-zinc-300">
              {ios ? (
                <p>Tap the <strong className="text-white">Share</strong> button in Safari, then choose <strong className="text-white">Add to Home Screen</strong>.</p>
              ) : (
                <p>Open your browser menu and choose <strong className="text-white">Install app</strong> or <strong className="text-white">Add to Home screen</strong>.</p>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 border-t border-white/5 bg-zinc-950/50 p-4">
          <button type="button" onClick={dismiss} className="flex-1 rounded-xl bg-zinc-800 px-4 py-3 text-sm font-bold text-zinc-300 transition-colors hover:bg-zinc-700">
            Not now
          </button>
          {installEvent && (
            <button type="button" onClick={install} className="flex-1 rounded-xl bg-purple-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-purple-500">
              Install Noor
            </button>
          )}
          {manualInstall && (
            <button type="button" onClick={dismiss} className="flex-1 rounded-xl bg-purple-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-purple-500">
              Got it
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
