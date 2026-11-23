import { useMemo, useState, type KeyboardEvent } from 'react'
import {
  CalendarDays,
  Camera,
  ChevronRight,
  History as HistoryIcon,
  Info,
  Plus,
  ReceiptText,
  ScanText,
  Search,
  SearchX,
  Sparkles,
  Tag,
  X,
} from 'lucide-react'
import type { GarageState, HistoryFilter, LogEntry, Photo } from '../types'
import { CATEGORIES, CATEGORY_GROUPS } from '../data/categories'
import { formatDateShort, formatMonthYear, formatRelativeDay } from '../lib/date'
import { formatCurrencyCompact, formatNumber } from '../lib/format'
import { serviceStats } from '../lib/state'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { Lightbox } from '../components/Lightbox'

interface HistoryScreenProps {
  state: GarageState
  onAdd: () => void
  onOpenLog: (log: LogEntry) => void
}

interface TimelineGroup {
  key: string
  label: string
  logs: LogEntry[]
}

function matchesFilter(log: LogEntry, filter: HistoryFilter): boolean {
  if (filter === 'all') return true
  return log.categories.some((key) => CATEGORIES[key].group === filter)
}

function searchText(log: LogEntry): string {
  return [
    log.note,
    log.spec,
    ...log.tags,
    ...log.categories.map((key) => CATEGORIES[key].label),
  ]
    .join(' ')
    .toLowerCase()
}

export function HistoryScreen({ state, onAdd, onOpenLog }: HistoryScreenProps) {
  const [filter, setFilter] = useState<HistoryFilter>('all')
  const [query, setQuery] = useState('')
  const [viewer, setViewer] = useState<{ photos: Photo[]; index: number } | null>(null)

  const stats = serviceStats(state)
  const normalizedQuery = query.trim().toLowerCase()

  const counts = useMemo(() => {
    const result: Record<HistoryFilter, number> = {
      all: state.logs.length,
      oli: 0,
      cvt: 0,
      kaki: 0,
      other: 0,
    }
    for (const log of state.logs) {
      for (const group of ['oli', 'cvt', 'kaki', 'other'] as const) {
        if (matchesFilter(log, group)) result[group] += 1
      }
    }
    return result
  }, [state.logs])

  const filteredLogs = useMemo(() => {
    return state.logs
      .filter((log) => matchesFilter(log, filter))
      .filter((log) => !normalizedQuery || searchText(log).includes(normalizedQuery))
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
      )
  }, [state.logs, filter, normalizedQuery])

  const groups = useMemo(() => {
    const map = new Map<string, TimelineGroup>()
    for (const log of filteredLogs) {
      const key = log.date.slice(0, 7)
      const existing = map.get(key)
      if (existing) existing.logs.push(log)
      else map.set(key, { key, label: formatMonthYear(log.date), logs: [log] })
    }
    return [...map.values()]
  }, [filteredLogs])

  const hasFilters = filter !== 'all' || normalizedQuery.length > 0
  const totalPhotos = state.logs.reduce((sum, log) => sum + log.photos.length, 0)

  function resetFilters() {
    setFilter('all')
    setQuery('')
  }

  function handleCardKeyDown(event: KeyboardEvent<HTMLElement>, log: LogEntry) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    if (event.target !== event.currentTarget) return
    event.preventDefault()
    onOpenLog(log)
  }

  return (
    <div className="space-y-5 pb-2">
      <PageHeader
        eyebrow="Logbook"
        title="Riwayat Servis"
        description="Semua catatan perawatan, foto, dan biaya dalam satu timeline."
        action={
          <button
            type="button"
            onClick={onAdd}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-300/20 bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-[0_12px_28px_-14px_rgba(37,99,235,0.9)] transition active:scale-95"
            aria-label="Tambah log servis baru"
          >
            <Plus className="h-5 w-5" strokeWidth={2.3} />
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-2">
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-3">
          <CalendarDays className="absolute -right-2 -top-2 h-12 w-12 text-blue-400/[0.06]" />
          <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-slate-600">
            Total log
          </p>
          <p className="mono mt-1 text-[20px] font-semibold leading-none text-white">
            {stats.totalLogs}
            <span className="ml-1 font-sans text-[9px] font-medium text-slate-500">entri</span>
          </p>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-3">
          <ReceiptText className="absolute -right-2 -top-2 h-12 w-12 text-cyan-400/[0.06]" />
          <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-slate-600">
            Biaya bulan ini
          </p>
          <p className="mono mt-1 text-[17px] font-semibold leading-none text-cyan-200">
            {formatCurrencyCompact(stats.monthSpend)}
          </p>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-3">
          <Sparkles className="absolute -right-2 -top-2 h-12 w-12 text-indigo-400/[0.06]" />
          <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-slate-600">
            Total biaya
          </p>
          <p className="mono mt-1 text-[17px] font-semibold leading-none text-slate-100">
            {formatCurrencyCompact(stats.totalSpend)}
          </p>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-3">
          <Camera className="absolute -right-2 -top-2 h-12 w-12 text-emerald-400/[0.06]" />
          <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-slate-600">
            Dokumentasi
          </p>
          <p className="mono mt-1 text-[20px] font-semibold leading-none text-white">
            {totalPhotos}
            <span className="ml-1 font-sans text-[9px] font-medium text-slate-500">foto</span>
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari catatan, part, atau tag…"
            className="field min-h-[46px] pl-10 pr-10 text-[12px]"
            aria-label="Cari riwayat servis"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/5 hover:text-white"
              aria-label="Hapus pencarian"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
          {CATEGORY_GROUPS.map((group) => {
            const active = filter === group.key
            const count = counts[group.key]
            return (
              <button
                key={group.key}
                type="button"
                onClick={() => setFilter(group.key)}
                aria-pressed={active}
                className={`flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[10.5px] font-semibold transition ${
                  active
                    ? 'border-blue-400/45 bg-blue-500/15 text-blue-100 shadow-[0_0_18px_-8px_rgba(59,130,246,0.8)]'
                    : 'border-white/[0.07] bg-white/[0.025] text-slate-400 hover:border-white/15 hover:text-slate-200'
                }`}
              >
                {group.label}
                <span
                  className={`mono rounded-full px-1.5 py-0.5 text-[9px] ${
                    active ? 'bg-blue-400/15 text-blue-200' : 'bg-white/[0.05] text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {state.logs.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="Logbook masih kosong"
          description="Catat servis pertama atau scan spedometer untuk memulai riwayat perawatan motor."
          actionLabel="Catat servis pertama"
          onAction={onAdd}
        />
      ) : filteredLogs.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Tidak ada yang cocok"
          description={
            normalizedQuery
              ? `Tidak ada log yang mengandung “${query.trim()}” di filter ini.`
              : 'Belum ada log untuk kategori ini. Coba filter lain.'
          }
          actionLabel="Reset filter"
          onAction={resetFilters}
        />
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between px-0.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">
              {hasFilters ? 'Hasil filter' : 'Timeline terbaru'}
            </p>
            <p className="mono text-[9px] uppercase tracking-[0.1em] text-slate-500">
              {filteredLogs.length} entri
            </p>
          </div>

          {groups.map((group) => (
            <section key={group.key} className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-300">
                  {group.label}
                </h2>
                <span className="h-px flex-1 bg-gradient-to-r from-white/[0.08] to-transparent" />
                <span className="mono text-[9px] text-slate-500">
                  {group.logs.length} entri
                </span>
              </div>

              <div className="relative space-y-2.5">
                <span
                  className="pointer-events-none absolute bottom-5 left-[21px] top-5 w-px bg-gradient-to-b from-blue-400/25 via-blue-400/10 to-transparent"
                  aria-hidden="true"
                />
                {group.logs.map((log) => {
                  const primary = CATEGORIES[log.categories[0]]
                  const PrimaryIcon = primary.icon
                  const extraCategories = log.categories.slice(1)
                  const date = new Date(`${log.date}T12:00:00`)
                  const day = String(date.getDate()).padStart(2, '0')
                  const month = new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(date)
                  const docs = log.photos.filter((photo) => photo.kind === 'documentation')
                  const photoPreview = log.photos.slice(0, 3)
                  return (
                    <div key={log.id} className="relative flex gap-2.5">
                      <div className="relative z-10 flex w-[42px] shrink-0 flex-col items-center">
                        <div className="flex h-[44px] w-[42px] flex-col items-center justify-center rounded-xl border border-white/[0.09] bg-[#0D1626] shadow-[0_8px_20px_-12px_rgba(0,0,0,0.9)]">
                          <span className="mono text-[15px] font-semibold leading-none text-white">
                            {day}
                          </span>
                          <span className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.1em] text-slate-500">
                            {month}
                          </span>
                        </div>
                        <span className="mt-1 text-[8.5px] text-slate-600">
                          {formatRelativeDay(log.date)}
                        </span>
                      </div>

                      <article
                        role="button"
                        tabIndex={0}
                        onClick={() => onOpenLog(log)}
                        onKeyDown={(event) => handleCardKeyDown(event, log)}
                        aria-label={`Detail servis ${primary.label} ${formatDateShort(log.date)}`}
                        className="group min-w-0 flex-1 cursor-pointer overflow-hidden rounded-2xl border border-white/[0.065] bg-gradient-to-br from-[#111A2B]/85 to-[#0B111D]/90 p-3 text-left shadow-[0_14px_35px_-30px_rgba(0,0,0,0.95)] transition-all hover:border-blue-400/25 hover:from-[#132036]/90 active:scale-[0.995]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <span
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border"
                              style={{
                                borderColor: `${primary.accent}33`,
                                backgroundColor: `${primary.accent}14`,
                                color: primary.accent,
                              }}
                            >
                              <PrimaryIcon className="h-3.5 w-3.5" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-[11px] font-bold leading-tight text-slate-100">
                                {primary.label}
                                {extraCategories.length > 0 && (
                                  <span className="text-slate-400">
                                    {' '}
                                    +{extraCategories.length}
                                  </span>
                                )}
                              </p>
                              {extraCategories.length > 0 && (
                                <p className="mt-0.5 truncate text-[9px] text-slate-500">
                                  {extraCategories
                                    .map((key) => CATEGORIES[key].shortLabel)
                                    .join(' · ')}
                                </p>
                              )}
                            </div>
                          </div>
                          {log.cost > 0 && (
                            <span className="mono shrink-0 rounded-lg border border-white/[0.06] bg-black/20 px-1.5 py-1 text-[8.5px] font-medium text-slate-300">
                              {formatCurrencyCompact(log.cost)}
                            </span>
                          )}
                        </div>

                        {log.spec && (
                          <p className="mt-2 flex items-center gap-1.5 truncate text-[9px] text-slate-400">
                            <Tag className="h-2.5 w-2.5 shrink-0 text-blue-400/70" />
                            <span className="truncate">{log.spec}</span>
                          </p>
                        )}

                        {log.note && (
                          <p className="mt-1.5 line-clamp-2 text-[9.5px] leading-relaxed text-slate-500">
                            {log.note}
                          </p>
                        )}

                        {log.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {log.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="rounded-md border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5 text-[8.5px] text-slate-500"
                              >
                                {tag}
                              </span>
                            ))}
                            {log.tags.length > 3 && (
                              <span className="px-1 py-0.5 text-[8.5px] text-slate-600">
                                +{log.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        {photoPreview.length > 0 && (
                          <div className="mt-2 flex gap-1.5">
                            {photoPreview.map((photo) => {
                              const index = log.photos.findIndex((item) => item.id === photo.id)
                              return (
                                <button
                                  key={photo.id}
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    setViewer({ photos: log.photos, index })
                                  }}
                                  className="relative h-11 w-11 overflow-hidden rounded-lg border border-white/10 transition hover:border-cyan-300/40"
                                  aria-label="Buka foto log"
                                >
                                  <img
                                    src={photo.dataUrl}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                  {photo.kind === 'odometer' && (
                                    <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-0.5 bg-black/55 py-0.5 text-[7.5px] font-bold uppercase tracking-[0.06em] text-cyan-200 backdrop-blur-sm">
                                      <ScanText className="h-2 w-2" />
                                      ODO
                                    </span>
                                  )}
                                </button>
                              )
                            })}
                            {log.photos.length > 3 && (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  setViewer({ photos: log.photos, index: 3 })
                                }}
                                className="flex h-11 w-11 items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] text-[9px] font-semibold text-slate-500"
                                aria-label={`Lihat ${log.photos.length - 3} foto lainnya`}
                              >
                                +{log.photos.length - 3}
                              </button>
                            )}
                          </div>
                        )}

                        <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-white/[0.055] pt-2">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <span className="mono text-[9px] font-semibold text-slate-300">
                              {log.odometerSource === 'estimated' ? '±' : ''}
                              {formatNumber(log.odometer)} KM
                            </span>
                            {log.odometerSource === 'estimated' && (
                              <span className="flex items-center gap-0.5 rounded border border-amber-400/20 bg-amber-500/[0.07] px-1 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-amber-300/90">
                                <Info className="h-2 w-2" />
                                Perkiraan
                              </span>
                            )}
                            {log.odometerSource === 'ocr' && (
                              <span className="flex items-center gap-0.5 rounded border border-cyan-400/15 bg-cyan-500/[0.06] px-1 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-cyan-300/80">
                                <Sparkles className="h-2 w-2" />
                                AI
                              </span>
                            )}
                            {docs.length > 0 && (
                              <span className="flex items-center gap-0.5 text-[8.5px] text-slate-500">
                                <Camera className="h-2.5 w-2.5" />
                                {docs.length}
                              </span>
                            )}
                          </div>
                          <span className="flex shrink-0 items-center gap-0.5 text-[9.5px] font-semibold text-blue-400/80 transition group-hover:text-cyan-300">
                            Detail
                            <ChevronRight className="h-3 w-3" />
                          </span>
                        </div>
                      </article>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}

          <div className="flex items-center justify-center gap-2 pt-1">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-slate-700/70" />
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-600">
              Awal logbook · data lokal
            </p>
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-slate-700/70" />
          </div>
        </div>
      )}

      <Lightbox
        photos={viewer?.photos ?? []}
        initialIndex={viewer?.index ?? 0}
        open={viewer !== null}
        onClose={() => setViewer(null)}
      />
    </div>
  )
}
