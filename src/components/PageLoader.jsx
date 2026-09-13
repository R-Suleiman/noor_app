export default function PageLoader() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center px-6" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4">
        <img src="/pwa-icon-192.png" alt="" className="h-14 w-14 animate-pulse rounded-2xl" />
        <div className="h-1 w-24 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full w-1/2 animate-[pulse_1s_ease-in-out_infinite] rounded-full bg-emerald-500" />
        </div>
        <span className="text-xs font-semibold tracking-wide text-zinc-500">Opening Noor…</span>
      </div>
    </div>
  );
}
