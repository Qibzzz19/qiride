import type { LucideIcon } from 'lucide-react'
import { Plus } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="relative overflow-hidden rounded-[26px] border border-dashed border-blue-400/20 bg-blue-500/[0.035] px-6 py-10 text-center">
      <div className="field-grid absolute inset-0 opacity-40" />
      <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-400/20 bg-[#0E1728] text-blue-400 shadow-[0_0_30px_-8px_rgba(59,130,246,0.45)]">
        <Icon className="h-6 w-6" strokeWidth={1.8} />
      </div>
      <h3 className="relative text-[15px] font-bold text-white">{title}</h3>
      <p className="relative mx-auto mt-2 max-w-[280px] text-[12px] leading-relaxed text-slate-400">
        {description}
      </p>
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="btn-primary relative mt-5 px-5">
          <Plus className="h-4 w-4" />
          {actionLabel}
        </button>
      )}
    </div>
  )
}
