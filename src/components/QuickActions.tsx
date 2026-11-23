import { ArrowUpRight, Mic } from 'lucide-react'
import { QUICK_PRESETS } from '../data/categories'
import type { PresetId } from '../types'

const TONES: Record<string, { tile: string; border: string; glow: string }> = {
  blue: {
    tile: 'border-blue-400/20 bg-blue-500/[0.12] text-blue-300',
    border: 'hover:border-blue-400/30',
    glow: 'rgba(59,130,246,0.14)',
  },
  cyan: {
    tile: 'border-cyan-400/20 bg-cyan-500/[0.1] text-cyan-300',
    border: 'hover:border-cyan-400/30',
    glow: 'rgba(6,182,212,0.12)',
  },
  indigo: {
    tile: 'border-indigo-400/20 bg-indigo-500/[0.1] text-indigo-300',
    border: 'hover:border-indigo-400/30',
    glow: 'rgba(129,140,248,0.12)',
  },
  rapid: {
    tile: 'border-cyan-300/25 bg-gradient-to-br from-cyan-500/15 to-blue-500/10 text-cyan-200',
    border: 'hover:border-cyan-300/35',
    glow: 'rgba(34,211,238,0.15)',
  },
}

export function QuickActions({
  onPreset,
  onVoice,
}: {
  onPreset: (preset: PresetId) => void
  onVoice?: () => void
}) {
  return (
    <div className="no-scrollbar -mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-1">
      <button
        type="button"
        onClick={onVoice}
        className="group relative flex w-[150px] shrink-0 snap-start flex-col overflow-hidden rounded-[20px] border border-fuchsia-400/20 bg-[#101827]/80 p-3 text-left backdrop-blur-xl transition-all duration-200 active:scale-[0.98] hover:border-fuchsia-400/35"
      >
        <span
          className="pointer-events-none absolute -right-5 -top-5 h-16 w-16 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: 'rgba(217,70,239,0.16)' }}
        />
        <div className="flex items-start justify-between">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-fuchsia-400/25 bg-fuchsia-500/[0.1] text-fuchsia-300">
            <Mic className="h-4 w-4" strokeWidth={2} />
          </span>
          <ArrowUpRight className="h-3.5 w-3.5 text-slate-600 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-slate-300" />
        </div>
        <p className="mt-3 text-[11.5px] font-bold leading-tight text-slate-100">Voice note</p>
        <p className="mt-1 text-[9px] font-medium leading-snug tracking-wide text-slate-500">
          Ucap → AI isi form servis
        </p>
      </button>
      {QUICK_PRESETS.map((preset) => {
        const Icon = preset.icon
        const tone = TONES[preset.tone]
        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => onPreset(preset.id)}
            className={`group relative flex w-[150px] shrink-0 snap-start flex-col overflow-hidden rounded-[20px] border border-white/[0.075] bg-[#101827]/80 p-3 text-left backdrop-blur-xl transition-all duration-200 active:scale-[0.98] ${tone.border}`}
          >
            <span
              className="pointer-events-none absolute -right-5 -top-5 h-16 w-16 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: tone.glow }}
            />
            <div className="flex items-start justify-between">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-xl border ${tone.tile}`}
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 text-slate-600 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-slate-300" />
            </div>
            <p className="mt-3 text-[11.5px] font-bold leading-tight text-slate-100">
              {preset.label}
            </p>
            <p className="mt-1 text-[9px] font-medium leading-snug tracking-wide text-slate-500">
              {preset.hint}
            </p>
          </button>
        )
      })}
    </div>
  )
}
