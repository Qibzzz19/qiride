import { ArrowUpRight, Clock3, Gauge, ScanLine, SlidersHorizontal, TrendingUp } from 'lucide-react'
import type { GarageState } from '../types'
import { useAnimatedNumber } from '../hooks/useAnimatedNumber'
import { formatNumber } from '../lib/format'
import { formatUpdatedAgo } from '../lib/date'
import type { ComponentHealth } from '../lib/health'
import { HEALTH_THEME, remainingKmLabel } from '../lib/health'

interface OdometerClusterProps {
  state: GarageState
  averageKm: number
  priority: ComponentHealth | null
  onUpdateKm: () => void
  onOpenGarage: () => void
  onOpenSettings: () => void
}

export function OdometerCluster({
  state,
  averageKm,
  priority,
  onUpdateKm,
  onOpenGarage,
  onOpenSettings,
}: OdometerClusterProps) {
  const animatedKm = useAnimatedNumber(state.odometer.current, 1.1)
  const initials =
    (state.profile.nickname || state.profile.model || 'M').trim().charAt(0).toUpperCase() || 'M'
  const theme = priority ? HEALTH_THEME[priority.status] : HEALTH_THEME.unknown

  return (
    <section aria-label="Odometer motor" className="relative">
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Live garage
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenSettings}
          className="group flex min-h-[44px] items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] py-1 pl-1 pr-3 transition hover:border-blue-400/25 hover:bg-white/[0.06]"
          aria-label="Buka setelan aplikasi"
        >
          <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-[10px] font-extrabold text-white">
            {initials}
            <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-[#141C2B] bg-emerald-400" />
          </span>
          <span className="hidden text-[10px] font-semibold text-slate-300 sm:block">
            {state.profile.nickname || 'Garasi saya'}
          </span>
        </button>
      </div>

      <div className="ripple-glow relative overflow-hidden rounded-[30px] border border-blue-400/[0.18] bg-[#0B1322] p-5 shadow-[0_30px_80px_-35px_rgba(37,99,235,0.5)]">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 70% at 76% 12%, rgba(37,99,235,0.23) 0%, transparent 58%), radial-gradient(ellipse 70% 55% at 15% 100%, rgba(6,182,212,0.1) 0%, transparent 60%), linear-gradient(155deg, rgba(30,41,59,0.55), rgba(11,15,25,0.98))',
          }}
        />
        <div className="tech-grid pointer-events-none absolute inset-0 opacity-70" />

        <svg
          viewBox="0 0 260 140"
          className="pointer-events-none absolute -right-8 top-12 w-[220px] opacity-60 sm:w-[250px]"
          fill="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="cluster-arc" x1="20" y1="120" x2="240" y2="120" gradientUnits="userSpaceOnUse">
              <stop stopColor="#06B6D4" stopOpacity="0.7" />
              <stop offset="0.6" stopColor="#3B82F6" stopOpacity="0.5" />
              <stop offset="1" stopColor="#1D4ED8" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M 24 122 A 112 112 0 0 1 248 122" stroke="rgba(148,163,184,0.12)" strokeWidth="5" />
          <path
            d="M 24 122 A 112 112 0 0 1 225 42"
            stroke="url(#cluster-arc)"
            strokeWidth="5"
            strokeLinecap="round"
          />
          {Array.from({ length: 19 }).map((_, index) => {
            const angle = Math.PI - (index / 18) * Math.PI
            const inner = 94
            const outer = index % 3 === 0 ? 106 : 101
            const cx = 136
            const cy = 122
            const x1 = cx + Math.cos(angle) * inner
            const y1 = cy - Math.sin(angle) * inner
            const x2 = cx + Math.cos(angle) * outer
            const y2 = cy - Math.sin(angle) * outer
            return (
              <line
                key={index}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(148,163,184,0.28)"
                strokeWidth={index % 3 === 0 ? 1.6 : 1}
                strokeLinecap="round"
              />
            )
          })}
        </svg>

        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-blue-400/25 bg-blue-500/[0.12] text-blue-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <Gauge className="h-5 w-5" strokeWidth={1.9} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-bold tracking-[-0.02em] text-white">
                  {state.profile.model || 'Motor Saya'}
                </p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="mono rounded border border-white/[0.08] bg-white/[0.045] px-1.5 py-0.5 text-[8.5px] font-medium tracking-[0.08em] text-slate-400">
                    {state.profile.plate || 'TANPA PLAT'}
                  </span>
                  <span className="text-[9px] text-slate-500">
                    {state.profile.year || ''}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <span className="flex items-center gap-1 rounded-full border border-white/[0.07] bg-black/20 px-2 py-1 text-[8.5px] font-medium text-slate-400 backdrop-blur-sm">
                <Clock3 className="h-2.5 w-2.5" />
                {formatUpdatedAgo(state.odometer.updatedAt)}
              </span>
              {priority && priority.status !== 'unknown' && (
                <span className={`mono flex items-center gap-1.5 text-[9px] font-semibold ${theme.text}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${theme.dot} shadow-[0_0_7px_currentColor]`} />
                  {theme.short}
                </span>
              )}
            </div>
          </div>

          <div className="mt-7">
            <div className="flex items-center gap-2">
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
                Total odometer
              </p>
              <span className="h-px flex-1 bg-gradient-to-r from-blue-400/20 to-transparent" />
              <span className="mono text-[8px] uppercase tracking-[0.12em] text-cyan-300/60">
                ODO · KM
              </span>
            </div>

            <div className="mt-1.5 flex items-end gap-2.5">
              <span
                className="mono select-none text-[clamp(42px,13vw,60px)] font-semibold leading-[0.95] tracking-[-0.065em] text-white text-glow"
                aria-label={`${formatNumber(state.odometer.current)} kilometer`}
              >
                {formatNumber(animatedKm)}
              </span>
              <span className="mb-1.5 text-[13px] font-bold tracking-[0.08em] text-blue-300/80">
                KM
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 text-[8.5px] font-semibold uppercase tracking-[0.13em] text-slate-500">
                <TrendingUp className="h-3 w-3 text-cyan-400/80" />
                Rata-rata
              </div>
              <p className="mono mt-1 text-[12px] font-semibold text-slate-100">
                {formatNumber(averageKm)}
                <span className="ml-1 font-sans text-[9px] font-medium text-slate-500">km/hari</span>
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 text-[8.5px] font-semibold uppercase tracking-[0.13em] text-slate-500">
                <ArrowUpRight className="h-3 w-3 text-cyan-400/80" />
                Berikutnya
              </div>
              <p className="mt-1 truncate text-[11px] font-semibold text-slate-100">
                {priority ? priority.category.shortLabel : '—'}
                {priority && priority.status !== 'unknown' && (
                  <span className={`mono ml-1.5 text-[9px] font-medium ${theme.text}`}>
                    {remainingKmLabel(priority)}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="mt-3.5 flex items-center gap-2">
            <button
              type="button"
              onClick={onUpdateKm}
              className="btn-primary group h-12 flex-1 overflow-hidden rounded-2xl"
            >
              <ScanLine className="h-[18px] w-[18px]" strokeWidth={2.2} />
              <span>Update KM</span>
              <span className="ml-0.5 flex items-center gap-1 rounded-md border border-white/20 bg-white/10 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.12em] text-cyan-100">
                AI scan
              </span>
            </button>
            <button
              type="button"
              onClick={onOpenGarage}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/[0.1] bg-white/[0.045] text-slate-300 transition hover:border-blue-400/30 hover:bg-white/[0.08] hover:text-white active:scale-95"
              aria-label="Buka setup motor"
            >
              <SlidersHorizontal className="h-[19px] w-[19px]" strokeWidth={1.9} />
            </button>
          </div>
        </div>
      </div>

      {priority && priority.status !== 'unknown' && (
        <div className="mt-2.5 flex items-center justify-between gap-3 px-1">
          <p className="flex min-w-0 items-center gap-1.5 text-[9.5px] text-slate-500">
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${theme.dot}`}
              style={{ boxShadow: `0 0 7px ${theme.hex}88` }}
            />
            <span className="truncate">
              {priority.category.label} · target {formatNumber(priority.targetKM)} KM
            </span>
          </p>
          <p className="mono shrink-0 text-[8px] uppercase tracking-[0.12em] text-slate-600">
            local-first
          </p>
        </div>
      )}
    </section>
  )
}
