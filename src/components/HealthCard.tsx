import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import type { CategoryKey } from '../types'
import type { ComponentHealth } from '../lib/health'
import { HEALTH_THEME, remainingKmLabel } from '../lib/health'
import { formatDateCompact } from '../lib/date'
import { formatNumber } from '../lib/format'

interface HealthCardProps {
  health: ComponentHealth
  index: number
  onLog: (category: CategoryKey) => void
}

export function HealthCard({ health, index, onLog }: HealthCardProps) {
  const theme = HEALTH_THEME[health.status]
  const Icon = health.category.icon
  const isUnknown = health.status === 'unknown'
  const isDisabled = health.status === 'disabled'
  const noTarget = isUnknown || isDisabled
  const percent = noTarget ? null : Math.round(health.health)
  const progress = noTarget ? 0 : Math.max(health.health, health.remainingKM <= 0 ? 2 : 3)
  const ariaLabel = isDisabled
    ? `${health.category.label}. Tanpa jadwal, pengingat nonaktif. Catat perawatan.`
    : isUnknown
      ? `${health.category.label}. Belum ada data. Catat perawatan.`
      : `${health.category.label}. Kesehatan ${percent} persen, ${remainingKmLabel(health)}. Catat perawatan.`

  return (
    <motion.button
      type="button"
      onClick={() => onLog(health.category.key)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.045, 0.28), ease: [0.22, 1, 0.36, 1] }}
      whileTap={{ scale: 0.985 }}
      aria-label={ariaLabel}
      className="glass-card group relative min-h-[172px] overflow-hidden rounded-[22px] p-3.5 text-left transition-colors duration-200 hover:border-blue-400/25"
    >
      <div
        className="pointer-events-none absolute -right-7 -top-8 h-24 w-24 rounded-full opacity-[0.09] blur-2xl transition-opacity group-hover:opacity-[0.17]"
        style={{ background: theme.hex }}
      />
      <div className="relative flex items-start justify-between gap-2">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl border"
          style={{
            borderColor: `${health.category.accent}26`,
            backgroundColor: `${health.category.accent}14`,
            color: health.category.accent,
          }}
        >
          <Icon className="h-[17px] w-[17px]" strokeWidth={1.9} />
        </div>
        <div className="text-right">
          <p className={`mono text-[12px] font-semibold leading-none ${theme.text}`}>
            {percent === null ? '—' : `${percent}%`}
          </p>
          <span className={`mt-1 inline-flex items-center gap-1 text-[8.5px] font-bold uppercase tracking-[0.1em] ${theme.text}`}>
            <span className={`h-1 w-1 rounded-full ${theme.dot}`} />
            {theme.label}
          </span>
        </div>
      </div>

      <h3 className="relative mt-3 text-[12.5px] font-bold leading-tight tracking-[-0.015em] text-slate-100">
        {health.category.label}
      </h3>

      <div className="relative mt-2.5 h-[4px] overflow-hidden rounded-full bg-white/[0.065]">
        {!noTarget && (
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.7, delay: 0.1 + Math.min(index * 0.04, 0.24), ease: [0.22, 1, 0.36, 1] }}
            style={{
              background: `linear-gradient(90deg, ${theme.gradientFrom}, ${theme.gradientTo})`,
              boxShadow: `0 0 9px ${theme.hex}70`,
            }}
          />
        )}
      </div>

      <div className="relative mt-2.5 flex items-end justify-between gap-1">
        <div>
          <p className="text-[8.5px] font-semibold uppercase tracking-[0.1em] text-slate-500">Target</p>
          <p className="mono mt-0.5 text-[10.5px] font-medium text-slate-300">
            {noTarget ? '—' : formatNumber(health.targetKM)}
          </p>
        </div>
        <p className={`mono text-right text-[10.5px] font-semibold ${noTarget ? 'text-slate-500' : theme.text}`}>
          {isDisabled
            ? 'Tanpa jadwal'
            : isUnknown
              ? 'Belum ada data'
              : health.remainingKM < 0
                ? `Telat ${formatNumber(Math.abs(health.remainingKM))}`
                : `Sisa ${formatNumber(health.remainingKM)}`}
          {!noTarget && <span className="ml-0.5 font-sans text-[8.5px] font-medium text-slate-500">KM</span>}
        </p>
      </div>

      <div className="relative mt-2.5 flex items-center justify-between gap-1 border-t border-white/[0.055] pt-2">
        <p className="min-w-0 truncate text-[8.5px] text-slate-500">
          {health.lastDate && health.lastKM !== null
            ? `${formatDateCompact(health.lastDate)} · ${formatNumber(health.lastKM)} KM`
            : 'Belum ada riwayat'}
        </p>
        <span className="flex shrink-0 items-center gap-0.5 text-[8.5px] font-semibold text-blue-400/90 transition group-hover:text-cyan-300">
          <Plus className="h-2.5 w-2.5" /> Catat
        </span>
      </div>
    </motion.button>
  )
}
