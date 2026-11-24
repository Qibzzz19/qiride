import { useRef } from 'react'
import { ScanText, SlidersHorizontal, Sparkles } from 'lucide-react'
import type { AppTab, CategoryKey, GarageState, PresetId } from '../types'
import type { ComponentHealth } from '../lib/health'
import { getOverallSummary } from '../lib/health'
import { ocrConfigured, ocrModeLabel } from '../lib/ocr'
import { LogoLockup } from '../components/Logo'
import { OdometerCluster } from '../components/OdometerCluster'
import { SmartBanner } from '../components/SmartBanner'
import { HealthCard } from '../components/HealthCard'
import { QuickActions } from '../components/QuickActions'
import { SetupMiniCard } from '../components/SetupMiniCard'
import { SectionHeader } from '../components/PageHeader'

interface DashboardProps {
  state: GarageState
  healths: ComponentHealth[]
  priority: ComponentHealth | null
  averageKm: number
  onAdd: (options: { preset?: PresetId; category?: CategoryKey; voice?: boolean }) => void
  onNavigate: (tab: AppTab) => void
}

export function Dashboard({
  state,
  healths,
  priority,
  averageKm,
  onAdd,
  onNavigate,
}: DashboardProps) {
  const healthGridRef = useRef<HTMLElement>(null)
  const summary = getOverallSummary(healths)
  const configured = ocrConfigured(state.settings)
  const attention = summary.overdue + summary.due

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <LogoLockup />
        <button
          type="button"
          onClick={() => onNavigate('settings')}
          className="flex min-h-[44px] items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 transition hover:border-cyan-400/25 hover:bg-white/[0.055]"
          aria-label="Status OCR dan API key"
        >
          <span className="relative flex h-6 w-6 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-500/[0.08] text-cyan-300">
            <ScanText className="h-3 w-3" />
            <span
              className={`absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full border border-[#0B0F19] ${
                configured ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
          </span>
          <span className="text-left">
            <span className="block text-[8.5px] font-semibold uppercase tracking-[0.12em] text-slate-600">
              AI Vision
            </span>
            <span className="block max-w-[96px] truncate text-[9px] font-semibold text-slate-300">
              {configured ? ocrModeLabel(state.settings).replace('Gemini · ', '') : 'Demo mode'}
            </span>
          </span>
        </button>
      </div>

      <OdometerCluster
        state={state}
        averageKm={averageKm}
        priority={priority}
        onUpdateKm={() => onAdd({ preset: 'kmOnly' })}
        onOpenGarage={() => onNavigate('garage')}
        onOpenSettings={() => onNavigate('settings')}
      />

      <SmartBanner
        priority={priority}
        healths={healths}
        averageKm={averageKm}
        onLog={(category) => onAdd({ category })}
        onViewComponents={() =>
          healthGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      />

      <section ref={healthGridRef} id="health-grid" className="scroll-mt-6 space-y-3.5">
        <SectionHeader
          title="Kesehatan Komponen"
          meta={`${healths.length} komponen`}
          actionLabel="Atur"
          onAction={() => onNavigate('settings')}
          icon={
            attention > 0 ? (
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_7px_rgba(245,158,11,0.6)]" />
                <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-amber-400/90">
                  {attention} perlu perhatian
                </span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-emerald-400/90">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-[8px] font-bold uppercase tracking-[0.12em]">All clear</span>
              </span>
            )
          }
        />
        <div className="grid grid-cols-2 gap-2.5">
          {healths.map((health, index) => (
            <HealthCard
              key={health.category.key}
              health={health}
              index={index}
              onLog={(category) => onAdd({ category })}
            />
          ))}
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-white/[0.055] bg-white/[0.02] px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400/80" />
            <p className="text-[9px] leading-relaxed text-slate-500">
              Status dihitung dari target KM, interval waktu, dan rata-rata perjalanan.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('garage')}
            className="flex shrink-0 items-center gap-1 text-[9px] font-semibold text-blue-400"
          >
            Setup
            <SlidersHorizontal className="h-3 w-3" />
          </button>
        </div>
      </section>

      <section className="space-y-3.5">
        <SectionHeader
          title="Aksi Cepat"
          meta="1-tap"
          actionLabel="Semua"
          onAction={() => onNavigate('history')}
        />
        <QuickActions
          onPreset={(preset) => onAdd({ preset })}
          onVoice={() => onAdd({ voice: true })}
        />
      </section>

      <SetupMiniCard setup={state.setup} onOpenGarage={() => onNavigate('garage')} />

      <div className="flex items-center justify-center gap-2 pb-1">
        <span className="h-px w-8 bg-gradient-to-r from-transparent to-slate-700/70" />
        <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-slate-600">
          Qiride · local-first cockpit
        </p>
        <span className="h-px w-8 bg-gradient-to-l from-transparent to-slate-700/70" />
      </div>
    </div>
  )
}
