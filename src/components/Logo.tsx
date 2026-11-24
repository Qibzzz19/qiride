import { useId } from 'react'

export function LogoMark({ className = 'h-10 w-10' }: { className?: string }) {
  const rawId = useId()
  const id = rawId.replace(/[^a-zA-Z0-9_-]/g, '')
  const bgId = `logo-bg-${id}`
  const ringId = `logo-ring-${id}`
  const monoId = `logo-mono-${id}`

  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={bgId} x1="9" y1="2" x2="56" y2="62" gradientUnits="userSpaceOnUse">
          <stop stopColor="#152239" />
          <stop offset="0.55" stopColor="#0B0F19" />
          <stop offset="1" stopColor="#080C14" />
        </linearGradient>
        <linearGradient id={ringId} x1="15" y1="37" x2="49" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#06B6D4" />
          <stop offset="0.55" stopColor="#3B82F6" />
          <stop offset="1" stopColor="#2563EB" />
        </linearGradient>
        <linearGradient id={monoId} x1="22" y1="39" x2="42" y2="29" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#BFDBFE" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill={`url(#${bgId})`} />
      <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="14.25" stroke="#3B82F6" strokeOpacity="0.25" strokeWidth="1.5" />
      <path d="M 15 37 A 17 17 0 0 1 49 37" stroke="#1E293B" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M 15 37 A 17 17 0 0 1 49 37" stroke={`url(#${ringId})`} strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="15" cy="37" r="1.2" fill="#06B6D4" />
      <circle cx="49" cy="37" r="1.2" fill="#3B82F6" />
      <path
        d="M 21.5 39 L 24 29.5 C 24.4 28 25.5 27.7 26.4 28.9 L 32 35.5 L 37.6 28.9 C 38.5 27.7 39.6 28 40 29.5 L 42.5 39"
        stroke={`url(#${monoId})`}
        strokeWidth="3.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="27" y="43.5" width="10" height="1" rx="0.5" fill="#22D3EE" fillOpacity="0.55" />
    </svg>
  )
}

export function LogoLockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark className={compact ? 'h-9 w-9' : 'h-10 w-10'} />
      <div className="leading-none">
        <p className="text-[15px] font-bold tracking-[-0.02em] text-white">
          Qiri<span className="text-cyan-300">de</span>
        </p>
        <p className="mt-1.5 text-[8px] font-semibold uppercase tracking-[0.22em] text-slate-500">
          Smart garage
        </p>
      </div>
    </div>
  )
}
