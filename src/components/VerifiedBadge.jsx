export default function VerifiedBadge({ showLabel = true, className = "" }) {
  return (
    <span
      title="Verified artist"
      aria-label="Verified artist"
      className={`inline-flex items-center gap-1 text-sky-400 ${className}`}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0">
        <circle cx="12" cy="12" r="10" fill="currentColor" />
        <path d="m7.5 12.2 3 3 6-6.4" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {showLabel && <span>Verified</span>}
    </span>
  );
}
