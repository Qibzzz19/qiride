import { ArrowRight, BellRing, Sparkles, Target } from 'lucide-react'
import type { CategoryKey } from '../types'
import type { ComponentHealth } from '../lib/health'
import {
  HEALTH_THEME,
  buildRecommendation,
  remainingDaysLabel,
  remainingKmLabel,
} from '../lib/health'
import { formatNumber } from '../lib/format'
import { HealthRing } from './HealthRing'

interface SmartBannerProps {
  priority: ComponentHealth | null
  healths: ComponentHealth[]
  averageKm: number
  onLog: (category: CategoryKey) => void
  onViewComponents: () => void
}

export function SmartBanner({
  priority,
  healths,
  averageKm,
  onLog,
  onViewComponents,
}: SmartBannerProps) {
  const known = healths.filter(
    (health) => health.status !== 'unknown' && health.status !== 'disabled',
  )
  const allHealthy = known.length > 0 && known.every((health) => health.status === 'healthy')
  const tone = priority ? (allHealthy ? 'healthy' : priority.status) : 'unknown'
  const theme = HEALTH_THEME[tone]
  const Icon = priority?.category.icon ?? Sparkles
  const recommendation = priority ? buildRecommendation(priority, averageKm) : null

  const title = allHealthy
    ? 'Semua komponen terkendali'
    : priority
      ? recommendation?.title
      : 'Mulai bangun riwayat servis'
  const body = allHealthy
    ? priority
      ? `Tidak ada servis mendesak. Berikutnya ${priority.category.label.toLowerCase()} dalam ${formatNumber(Math.max(0, priority.remainingKM))} KM atau ${remainingDaysLabel(priority).toLowerCase()}.`
      : 'Semua komponen tercatat aman.'
    : priority
      ? recommendation?.body
      : 'Catat servis pertamamu. MotoLog AI akan menghitung target KM dan memprediksi jadwal berikutnya.'

  return (
    <div
      className="ripple-glow relative overflow-hidden rounded-[26px] border p-4"
      style={{
        borderColor: `${theme.hex}33`,
        background: `linear-gradient(145deg, ${theme.hex}18 0%, rgba(17,24,39,0.92) 46%, rgba(11,15,25,0.97) 100%)`,
        boxShadow: `0 24px 60px -40px ${theme.hex}80, inset 0 1px 0 rgba(255,255,255,0.04)`,
      }}
    >
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full blur-3xl"
        style={{ background: theme.hex, opacity: 0.1 }}
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className={`flex h-6 w-6 items-center justify-center rounded-lg ${theme.bg} ${theme.text}`}>
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2.2} />
            </span>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                AI Pit Coach
              </p>
              <p className="mt-0.5 text-[9px] font-medium tracking-wide text-slate-500">
                Prediksi dari KM & waktu
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {priority && priority.status !== 'unknown' && (
              <HealthRing
                value={priority.health}
                size={42}
                stroke={3.5}
                color={theme.hex}
                label="Kesehatan prioritas"
              />
            )}
            <span
              className={`flex items-center gap-1.5 rounded-full border px-2 py-1 text-[8.5px] font-bold uppercase tracking-[0.12em] ${theme.badge}`}
            >
              {allHealthy ? (
                <span className={`h-1.5 w-1.5 rounded-full ${theme.dot}`} />
              ) : (
                <BellRing className="h-2.5 w-2.5" />
              )}
              {allHealthy ? 'Optimal' : theme.short}
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${theme.border} ${theme.iconBg} ${theme.text} shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]`}
          >
            <Icon className="h-5 w-5" strokeWidth={1.9} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-balance text-[14.5px] font-bold leading-snug tracking-[-0.02em] text-white">
              {title}
            </h2>
            <p className="mt-1.5 text-[11px] leading-[1.65] text-slate-400">{body}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2.5 rounded-2xl border border-white/[0.06] bg-black/20 py-2 pl-3 pr-2 backdrop-blur-sm">
          <div className="flex min-w-0 items-center gap-2">
            <Target className={`h-3.5 w-3.5 shrink-0 ${theme.text}`} />
            <div className="min-w-0">
              <p className="truncate text-[9px] font-medium text-slate-500">
                {priority && priority.status !== 'unknown'
                  ? `${priority.category.label} · target ${formatNumber(priority.targetKM)} KM`
                  : 'Belum ada target servis'}
              </p>
              <p className={`mono truncate text-[10px] font-semibold ${theme.text}`}>
                {priority && priority.status !== 'unknown'
                  ? `${remainingKmLabel(priority)} · ${remainingDaysLabel(priority)}`
                  : 'Catat servis untuk mulai'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (allHealthy) {
                onViewComponents()
              } else if (priority) {
                onLog(priority.category.key)
              }
            }}
            className={`flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl border px-3.5 text-[10.5px] font-semibold transition active:scale-[0.97] ${
              allHealthy
                ? 'border-white/10 bg-white/[0.05] text-slate-200 hover:bg-white/[0.08]'
                : 'border-white/10 bg-white/10 text-white hover:bg-white/[0.15]'
            }`}
          >
            {allHealthy ? 'Lihat' : 'Catat servis'}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
