import { useEffect, useRef, useState } from "react";

export default function NetworkStatus() {
  const [state, setState] = useState(() => navigator.onLine ? "online" : "offline");
  const hasDisconnected = useRef(!navigator.onLine);

  useEffect(() => {
    let timer;
    const offline = () => {
      window.clearTimeout(timer);
      hasDisconnected.current = true;
      setState("offline");
    };
    const online = () => {
      if (!hasDisconnected.current) return;
      setState("restored");
      timer = window.setTimeout(() => setState("online"), 3000);
    };
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
    };
  }, []);

  if (state === "online") return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed left-1/2 top-3 z-[130] flex -translate-x-1/2 items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold shadow-xl backdrop-blur ${state === "offline" ? "border-amber-500/30 bg-amber-950/95 text-amber-200" : "border-emerald-500/30 bg-emerald-950/95 text-emerald-200"}`}
    >
      <i className={`ti ${state === "offline" ? "ti-wifi-off" : "ti-wifi"}`} aria-hidden="true" />
      {state === "offline" ? "You’re offline — some content is unavailable" : "Back online"}
    </div>
  );
}
