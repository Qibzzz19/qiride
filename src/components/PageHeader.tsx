import type { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow: string
  title: string
  description?: string
  action?: ReactNode
}

export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="h-px w-5 bg-gradient-to-r from-cyan-300/80 to-blue-500/30" />
          <p className="text-[9.5px] font-bold uppercase tracking-[0.21em] text-cyan-300/80">
            {eyebrow}
          </p>
        </div>
        <h1 className="mt-2.5 text-balance text-[28px] font-bold leading-[1.08] tracking-[-0.045em] text-white">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-[340px] text-[12.5px] leading-relaxed text-slate-400">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0 pt-1">{action}</div>}
    </header>
  )
}

interface SectionHeaderProps {
  title: string
  meta?: string
  actionLabel?: string
  onAction?: () => void
  icon?: ReactNode
}

export function SectionHeader({ title, meta, actionLabel, onAction, icon }: SectionHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-[15px] font-bold tracking-[-0.02em] text-white">{title}</h2>
          {meta && (
            <span className="rounded-full border border-white/[0.07] bg-white/[0.035] px-2 py-0.5 text-[9px] font-semibold text-slate-400">
              {meta}
            </span>
          )}
        </div>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="flex min-h-[44px] shrink-0 items-center text-[11.5px] font-semibold text-blue-400 transition hover:text-cyan-300"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
