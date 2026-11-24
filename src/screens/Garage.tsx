import { useId } from 'react'
import {
  ArrowUpRight,
  Camera,
  CircleDashed,
  Cog,
  Droplets,
  Gauge,
  Orbit,
  Pencil,
  Plus,
  ReceiptText,
  ScanLine,
  ScanText,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Wrench,
} from 'lucide-react'
import type { CategoryKey, GarageState, OdometerPoint, SetupFieldKey } from '../types'
import type { ComponentHealth } from '../lib/health'
import { HEALTH_THEME, remainingDaysLabel, remainingKmLabel } from '../lib/health'
import { formatDateShort, formatRelativeDay, daysBetween } from '../lib/date'
import { formatCurrencyCompact, formatNumber } from '../lib/format'
import { serviceStats } from '../lib/state'
import { PageHeader, SectionHeader } from '../components/PageHeader'

interface GarageScreenProps {
  state: GarageState
  healths: ComponentHealth[]
  averageKm: number
  onEditProfile: () => void
  onEditSetup: () => void
  onUpdateKm: () => void
  onAddForCategory: (category: CategoryKey) => void
  onOpenSettings: () => void
}

const SETUP_GROUPS: Array<{
  title: string
  icon: typeof Droplets
  accent: string
  fields: Array<{ key: SetupFieldKey; label: string }>
}> = [
  {
    title: 'Mesin & pelumasan',
    icon: Droplets,
    accent: '#3B82F6',
    fields: [
      { key: 'engineOil', label: 'Oli mesin' },
      { key: 'gearOil', label: 'Oli gardan' },
      { key: 'coolant', label: 'Coolant' },
      { key: 'vBelt', label: 'V-Belt' },
    ],
  },
  {
    title: 'Ruang CVT',
    icon: Orbit,
    accent: '#818CF8',
    fields: [
      { key: 'cvtPulley', label: 'Pulley' },
      { key: 'cvtRoller', label: 'Roller' },
      { key: 'cvtPerCvt', label: 'Per CVT' },
      { key: 'cvtPerSentri', label: 'Per sentri' },
      { key: 'cvtBoss', label: 'Boss / washer' },
    ],
  },
  {
    title: 'Kaki-kaki',
    icon: CircleDashed,
    accent: '#94A3B8',
    fields: [
      { key: 'frontTire', label: 'Ban depan' },
      { key: 'rearTire', label: 'Ban belakang' },
      { key: 'brakePads', label: 'Kampas rem' },
    ],
  },
]

const SOURCE_LABEL: Record<string, string> = {
  seed: 'Data awal',
  quick: 'Update KM',
  service: 'Servis',
  manual: 'Manual',
}

function OdometerChart({ points }: { points: OdometerPoint[] }) {
  const gradientId = `odo-gradient-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date))
  if (sorted.length < 2) return null

  const width = 300
  const height = 76
  const paddingX = 4
  const paddingY = 8
  const values = sorted.map((point) => point.km)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(1, max - min)
  const coords = sorted.map((point, index) => {
    const x =
      paddingX + (index / Math.max(1, sorted.length - 1)) * (width - paddingX * 2)
    const y =
      height - paddingY - ((point.km - min) / span) * (height - paddingY * 2)
    return { x, y, point }
  })
  const line = coords.map((coord) => `${coord.x.toFixed(1)},${coord.y.toFixed(1)}`).join(' ')
  const area = `M ${coords[0].x} ${height} L ${line.replace(/ /g, ' L ')} L ${
    coords[coords.length - 1].x
  } ${height} Z`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-[76px] w-full"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((ratio) => (
        <line
          key={ratio}
          x1="0"
          x2={width}
          y1={height * ratio}
          y2={height * ratio}
          stroke="rgba(148,163,184,0.08)"
          strokeWidth="1"
        />
      ))}
      <path d={area} fill={`url(#${gradientId})`} />
      <polyline
        points={line}
        fill="none"
        stroke="#22D3EE"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {coords.map((coord, index) => (
        <circle
          key={coord.point.date}
          cx={coord.x}
          cy={coord.y}
          r={index === coords.length - 1 ? 3.4 : 2}
          fill={index === coords.length - 1 ? '#67E8F9' : '#141C2B'}
          stroke="#22D3EE"
          strokeWidth="1.5"
        />
      ))}
    </svg>
  )
}

export function GarageScreen({
  state,
  healths,
  averageKm,
  onEditProfile,
  onEditSetup,
  onUpdateKm,
  onAddForCategory,
  onOpenSettings,
}: GarageScreenProps) {
  const stats = serviceStats(state)
  const initial =
    (state.profile.nickname || state.profile.model || 'M').trim().charAt(0).toUpperCase() || 'M'

  const sortedHistory = [...state.odometerHistory].sort((a, b) => a.date.localeCompare(b.date))
  const historyFirst = sortedHistory[0]
  const historyLast = sortedHistory[sortedHistory.length - 1]
  const historySpan = historyFirst && historyLast ? daysBetween(historyFirst.date, historyLast.date) : 0
  const historyDelta = historyFirst && historyLast ? historyLast.km - historyFirst.km : 0
  const recentUpdates = state.odometerUpdates.slice(0, 4)

  const filledSetup = SETUP_GROUPS.flatMap((group) => group.fields).filter(
    (field) => state.setup[field.key].trim().length > 0,
  ).length
  const totalSetupFields = SETUP_GROUPS.flatMap((group) => group.fields).length

  return (
    <div className="space-y-5 pb-2">
      <PageHeader
        eyebrow="Garage control"
        title="Garasi"
        description="Identitas motor, spesifikasi aktif, dan kesehatan semua komponen."
        action={
          <button
            type="button"
            onClick={onEditProfile}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-blue-400/30 hover:text-white active:scale-95"
            aria-label="Edit profil motor"
          >
            <Pencil className="h-4 w-4" />
          </button>
        }
      />

      <section className="relative overflow-hidden rounded-[28px] border border-blue-400/15 bg-[#0B1424] p-4 shadow-[0_24px_60px_-40px_rgba(37,99,235,0.7)]">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 75% 65% at 84% 4%, rgba(37,99,235,0.2), transparent 58%), linear-gradient(155deg, rgba(30,41,59,0.45), rgba(11,15,25,0.96))',
          }}
        />
        <div className="tech-grid pointer-events-none absolute inset-0 opacity-50" />
        <div className="relative">
          <div className="flex items-start gap-3.5">
            <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-blue-300/25 bg-gradient-to-br from-blue-500 to-cyan-500 text-[22px] font-extrabold text-white shadow-[0_16px_34px_-16px_rgba(37,99,235,0.95)]">
              {initial}
              <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#0B1424] bg-emerald-500 text-white">
                <ShieldCheck className="h-2.5 w-2.5" strokeWidth={3} />
              </span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[17px] font-bold tracking-[-0.025em] text-white">
                {state.profile.nickname || state.profile.model || 'Motor Saya'}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-slate-400">{state.profile.model}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="mono rounded border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[9px] font-medium tracking-[0.08em] text-slate-300">
                  {state.profile.plate || 'TANPA PLAT'}
                </span>
                <span className="text-[9px] text-slate-500">{state.profile.year}</span>
                <span className="h-1 w-1 rounded-full bg-slate-700" />
                <span className="text-[9px] text-slate-500">
                  {formatRelativeDay(state.odometer.updatedAt.slice(0, 10))} update
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-white/[0.06] bg-black/15 px-3 py-2.5">
              <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">
                <Gauge className="h-2.5 w-2.5 text-cyan-400/70" />
                Odometer
              </div>
              <p className="mono mt-1 text-[17px] font-semibold leading-none text-white">
                {formatNumber(state.odometer.current)}
                <span className="ml-1 font-sans text-[8.5px] font-medium text-slate-500">KM</span>
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-black/15 px-3 py-2.5">
              <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">
                <TrendingUp className="h-2.5 w-2.5 text-cyan-400/70" />
                Rata-rata
              </div>
              <p className="mono mt-1 text-[17px] font-semibold leading-none text-slate-100">
                {formatNumber(averageKm)}
                <span className="ml-1 font-sans text-[8.5px] font-medium text-slate-500">
                  km/hari
                </span>
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-black/15 px-3 py-2.5">
              <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">
                <Wrench className="h-2.5 w-2.5 text-blue-400/70" />
                Total servis
              </div>
              <p className="mono mt-1 text-[17px] font-semibold leading-none text-slate-100">
                {stats.totalLogs}
                <span className="ml-1 font-sans text-[8.5px] font-medium text-slate-500">log</span>
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-black/15 px-3 py-2.5">
              <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">
                <ReceiptText className="h-2.5 w-2.5 text-amber-400/70" />
                Biaya bulan ini
              </div>
              <p className="mono mt-1 text-[14px] font-semibold leading-none text-amber-200">
                {formatCurrencyCompact(stats.monthSpend)}
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
            <button
              type="button"
              onClick={onUpdateKm}
              className="btn-primary h-11 rounded-xl text-[11px]"
            >
              <ScanLine className="h-4 w-4" />
              Update KM
            </button>
            <button
              type="button"
              onClick={onEditProfile}
              className="flex h-11 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-[10px] font-semibold text-slate-300 transition hover:border-blue-400/30 hover:text-white"
            >
              <Pencil className="h-3.5 w-3.5" />
              Profil
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader
          title="Setup Aktif"
          meta={`${filledSetup}/${totalSetupFields}`}
          actionLabel="Ubah"
          onAction={onEditSetup}
          icon={<SlidersHorizontal className="h-3.5 w-3.5 text-cyan-400/80" />}
        />

        <div className="space-y-2">
          {SETUP_GROUPS.map((group) => {
            const Icon = group.icon
            return (
              <div
                key={group.title}
                className="rounded-2xl border border-white/[0.065] bg-[#0C1422]/75 p-3.5"
              >
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-lg border"
                      style={{
                        borderColor: `${group.accent}33`,
                        backgroundColor: `${group.accent}12`,
                        color: group.accent,
                      }}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <p className="text-[10.5px] font-bold text-slate-200">{group.title}</p>
                  </div>
                  <span className="mono text-[7px] uppercase tracking-[0.1em] text-slate-600">
                    {formatDateShort(state.setup.updatedAt.slice(0, 10))}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                  {group.fields.map((field) => {
                    const value = state.setup[field.key]
                    return (
                      <div key={field.key} className="min-w-0">
                        <p className="text-[7px] font-semibold uppercase tracking-[0.1em] text-slate-600">
                          {field.label}
                        </p>
                        <p
                          className={`mt-0.5 truncate text-[9.5px] font-medium ${
                            value ? 'text-slate-300' : 'text-slate-600'
                          }`}
                          title={value || undefined}
                        >
                          {value || '—'}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
        <p className="flex items-center gap-1.5 px-1 text-[8px] text-slate-600">
          <Sparkles className="h-2.5 w-2.5 text-cyan-400/50" />
          Spesifikasi ikut tercatat saat kamu mengaktifkan “Update setup” di log servis.
        </p>
      </section>

      <section className="space-y-3">
        <SectionHeader
          title="Kesehatan Komponen"
          meta={`${healths.length} komponen`}
          actionLabel="Atur interval"
          onAction={onOpenSettings}
          icon={<Cog className="h-3.5 w-3.5 text-blue-400/80" />}
        />
        <div className="overflow-hidden rounded-2xl border border-white/[0.065] bg-[#0B121F]/70">
          {healths.map((health, index) => {
            const theme = HEALTH_THEME[health.status]
            const def = health.category
            const Icon = def.icon
            const noTarget = health.status === 'unknown' || health.status === 'disabled'
            const progress = noTarget ? 0 : health.health
            return (
              <div
                key={def.key}
                className={`p-3.5 ${index > 0 ? 'border-t border-white/[0.055]' : ''}`}
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border"
                    style={{
                      borderColor: `${def.accent}30`,
                      backgroundColor: `${def.accent}10`,
                      color: def.accent,
                    }}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[11px] font-bold text-slate-100">{def.label}</p>
                      <span
                        className={`flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.08em] ${theme.badge}`}
                      >
                        <span className={`h-1 w-1 rounded-full ${theme.dot}`} />
                        {theme.short}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[9px] text-slate-500">
                      {health.lastKM !== null
                        ? `Terakhir ${formatNumber(health.lastKM)} KM · ${formatDateShort(
                            health.lastDate ?? '',
                          )}`
                        : 'Belum ada riwayat servis'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onAddForCategory(def.key)}
                    className="flex h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-xl border border-blue-400/20 bg-blue-500/[0.07] px-2.5 text-[9.5px] font-semibold text-blue-300 transition hover:bg-blue-500/15 active:scale-95"
                    aria-label={`Catat servis ${def.label}`}
                  >
                    <Plus className="h-3 w-3" />
                    Catat
                  </button>
                </div>

                <div className="mt-2.5 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full transition-[width] duration-700"
                      style={{
                        width: `${Math.max(0, Math.min(100, progress))}%`,
                        background: `linear-gradient(90deg, ${theme.gradientFrom}, ${theme.gradientTo})`,
                        boxShadow: `0 0 10px ${theme.flash}`,
                      }}
                    />
                  </div>
                  <span className={`mono w-8 text-right text-[9px] font-semibold ${theme.text}`}>
                    {noTarget ? '—' : `${Math.round(progress)}%`}
                  </span>
                </div>

                <div className="mt-2 grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-[8px] uppercase tracking-[0.1em] text-slate-500">Sisa KM</p>
                    <p className={`mono mt-0.5 text-[9.5px] font-medium ${theme.text}`}>
                      {remainingKmLabel(health)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[8px] uppercase tracking-[0.1em] text-slate-500">Waktu</p>
                    <p className="mono mt-0.5 truncate text-[9.5px] font-medium text-slate-400">
                      {remainingDaysLabel(health)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] uppercase tracking-[0.1em] text-slate-500">Target</p>
                    <p className="mono mt-0.5 truncate text-[9.5px] font-medium text-slate-400">
                      {noTarget ? '—' : `${formatNumber(health.targetKM)} KM`}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <p className="px-1 text-[9px] leading-relaxed text-slate-500">
          Semua komponen memakai aturan interval global. Ubah di setelan untuk menyesuaikan
          kebiasaan pemakaian. Komponen berstatus NONAKTIF dipilih “tidak memilih” dan tidak
          dihitung pengingatnya.
        </p>
      </section>

      {sortedHistory.length >= 2 && historyFirst && historyLast && (
        <section className="space-y-3">
          <SectionHeader
            title="Jejak Odometer"
            meta={`${formatNumber(historyDelta)} KM`}
            icon={<ArrowUpRight className="h-3.5 w-3.5 text-cyan-400/80" />}
          />
          <div className="overflow-hidden rounded-2xl border border-white/[0.065] bg-[#0C1524]/70 p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  Total perjalanan tercatat
                </p>
                <p className="mono mt-1 text-[17px] font-semibold leading-none text-white">
                  {formatNumber(historyDelta)}
                  <span className="ml-1 font-sans text-[8.5px] font-medium text-slate-500">KM</span>
                </p>
              </div>
              <span className="rounded-full border border-cyan-400/15 bg-cyan-500/[0.05] px-2 py-1 text-[8.5px] font-semibold text-cyan-300/80">
                ± {historySpan} hari
              </span>
            </div>
            <div className="mt-2">
              <OdometerChart points={sortedHistory} />
            </div>
            <div className="mt-1 flex items-center justify-between text-[8.5px] text-slate-500">
              <span>
                {formatDateShort(historyFirst.date)} · {formatNumber(historyFirst.km)} KM
              </span>
              <span>
                {formatDateShort(historyLast.date)} · {formatNumber(historyLast.km)} KM
              </span>
            </div>

            {recentUpdates.length > 0 && (
              <div className="mt-3 space-y-1.5 border-t border-white/[0.055] pt-2.5">
                {recentUpdates.map((update) => (
                  <div key={update.id} className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-1.5">
                      {update.photo ? (
                        <Camera className="h-2.5 w-2.5 shrink-0 text-cyan-400/60" />
                      ) : (
                        <ScanText className="h-2.5 w-2.5 shrink-0 text-slate-600" />
                      )}
                      <span className="truncate text-[9px] text-slate-500">
                        {formatDateShort(update.date)}
                        <span className="mx-1 text-slate-600">·</span>
                        {update.provider === 'gemini'
                          ? 'AI Vision'
                          : update.provider === 'demo'
                            ? 'Demo AI'
                            : 'Manual'}
                      </span>
                    </div>
                    <span className="mono shrink-0 text-[9px] font-medium text-slate-300">
                      {formatNumber(update.km)} KM
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.022] p-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">
            Total biaya
          </p>
          <p className="mono mt-1 text-[13px] font-semibold text-slate-100">
            {formatCurrencyCompact(stats.totalSpend)}
          </p>
          <p className="mt-1 text-[8.5px] text-slate-500">
            {stats.totalLogs} log · {stats.photoCount} foto
          </p>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.022] p-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">
            Update terakhir
          </p>
          <p className="mono mt-1 text-[13px] font-semibold text-slate-100">
            {formatRelativeDay(state.odometer.updatedAt.slice(0, 10))}
          </p>
          <p className="mt-1 text-[8.5px] text-slate-500">
            via {SOURCE_LABEL[state.odometer.lastSource] ?? 'Manual'}
          </p>
        </div>
      </section>

      <div className="flex items-center justify-center gap-2 pt-1 pb-1">
        <span className="h-px w-8 bg-gradient-to-r from-transparent to-slate-700/70" />
        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-600">
          Garage data · local first
        </p>
        <span className="h-px w-8 bg-gradient-to-l from-transparent to-slate-700/70" />
      </div>
    </div>
  )
}
