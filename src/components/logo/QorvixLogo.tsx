export default function QorvixLogo({ size = 40 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5" aria-label="QORVIX logo">
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" role="img" aria-hidden="true">
        <rect x="2" y="2" width="60" height="60" rx="16" fill="#0F172A" stroke="rgba(255,255,255,.12)" />
        <circle cx="32" cy="30" r="16" stroke="#4F46E5" strokeWidth="5" strokeLinecap="round" strokeDasharray="75 25" transform="rotate(-45 32 30)" />
        <circle cx="32" cy="30" r="3.5" fill="#fff" />
        <path d="M25 30.5 30 35.5 40 24" stroke="#22C55E" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="18" y="50" width="28" height="3" rx="1.5" fill="#4F46E5" opacity=".9" />
      </svg>
      <span className="leading-none">
        <span className="block text-[17px] font-extrabold tracking-tight">QORVIX</span>
        <span className="block text-[10px] font-medium text-slate-500 dark:text-slate-400">Trajectory to Victory</span>
      </span>
    </span>
  );
}
