export function LogoMark({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <img
      src="/logo-mark.png"
      alt=""
      aria-hidden="true"
      className={`${className} rounded-xl object-contain`}
    />
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
