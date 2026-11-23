import { ArrowRight, Cog, SlidersHorizontal } from 'lucide-react'
import type { SetupState } from '../types'
import { formatDateShort } from '../lib/date'

const PREVIEW_FIELDS: Array<{ key: keyof SetupState; label: string }> = [
  { key: 'engineOil', label: 'Oli mesin' },
  { key: 'cvtPulley', label: 'Pulley' },
  { key: 'cvtRoller', label: 'Roller' },
  { key: 'cvtPerCvt', label: 'Per CVT' },
]

export function SetupMiniCard({
  setup,
  onOpenGarage,
}: {
  setup: SetupState
  onOpenGarage: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpenGarage}
      className="glass-card group relative w-full overflow-hidden rounded-[24px] p-4 text-left transition-colors hover:border-blue-400/25"
      aria-label="Lihat setup motor aktif"
    >
      <Cog className="pointer-events-none absolute -bottom-8 -right-5 h-32 w-32 rotate-12 text-blue-400/[0.05] transition-transform duration-500 group-hover:rotate-45" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-500/[0.08] text-cyan-300">
            <SlidersHorizontal className="h-4 w-4" strokeWidth={1.9} />
          </div>
          <div>
            <p className="text-[13px] font-bold tracking-[-0.01em] text-white">Setup Aktif</p>
            <p className="mt-0.5 text-[9px] text-slate-500">
              Diperbarui {formatDateShort(setup.updatedAt.slice(0, 10))}
            </p>
          </div>
        </div>
        <span className="flex items-center gap-1 text-[9px] font-semibold text-blue-400">
          Lihat semua
          <ArrowRight className="h-3 w-3" />
        </span>
      </div>

      <div className="relative mt-3.5 grid grid-cols-2 gap-x-4 gap-y-2.5">
        {PREVIEW_FIELDS.map((field) => (
          <div key={field.key} className="min-w-0">
            <p className="text-[8.5px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              {field.label}
            </p>
            <p className="mt-0.5 truncate text-[10.5px] font-medium text-slate-300">
              {setup[field.key] || '—'}
            </p>
          </div>
        ))}
      </div>
    </button>
  )
}
