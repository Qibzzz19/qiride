import { useState } from 'react'
import {
  CalendarDays,
  Camera,
  Check,
  Clock3,
  Gauge,
  Info,
  Pencil,
  ReceiptText,
  ScanText,
  Sparkles,
  Tag,
  Trash2,
  Wrench,
} from 'lucide-react'
import type { GarageState, LogEntry } from '../types'
import { CATEGORIES } from '../data/categories'
import { addDays, formatDateLong, formatDateShort, formatRelativeToNow } from '../lib/date'
import { formatCurrency, formatNumber } from '../lib/format'
import { Sheet } from './Sheet'
import { Lightbox } from './Lightbox'
import { ConfirmDialog } from './ConfirmDialog'

interface LogDetailSheetProps {
  open: boolean
  log: LogEntry | null
  state: GarageState
  onClose: () => void
  onEdit: (log: LogEntry) => void
  onDelete: (log: LogEntry) => void
}

export function LogDetailSheet({
  open,
  log,
  state,
  onClose,
  onEdit,
  onDelete,
}: LogDetailSheetProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!log) return null

  const photos = log.photos
  const odometerPhotoIndex = photos.findIndex((photo) => photo.kind === 'odometer')
  const documentationPhotos = photos.filter((photo) => photo.kind === 'documentation')

  const totalCost = log.cost

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title="Detail Servis"
        eyebrow="Logbook entry"
        headerRight={
          log.odometerSource === 'ocr' ? (
            <span className="hidden items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-500/[0.07] px-2.5 py-1.5 text-[8px] font-bold uppercase tracking-[0.12em] text-cyan-300 sm:flex">
              <Sparkles className="h-3 w-3" />
              AI OCR
            </span>
          ) : undefined
        }
        footer={
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <button
              type="button"
              onClick={() => {
                onEdit(log)
                onClose()
              }}
              className="btn-primary h-[50px] rounded-2xl"
            >
              <Pencil className="h-4 w-4" />
              Edit Log
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex h-[50px] w-[52px] items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/[0.07] text-red-400 transition hover:bg-red-500/[0.12] active:scale-95"
              aria-label="Hapus log servis"
            >
              <Trash2 className="h-[18px] w-[18px]" />
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="relative overflow-hidden rounded-3xl border border-blue-400/15 bg-[#0B1424] p-4">
            <div className="tech-grid pointer-events-none absolute inset-0 opacity-50" />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-cyan-300/80">
                  <CalendarDays className="h-3 w-3" />
                  {formatDateLong(log.date)}
                </p>
                <div className="mt-2 flex items-end gap-2">
                  <span className="mono text-[38px] font-semibold leading-none tracking-[-0.055em] text-white">
                    {log.odometerSource === 'estimated' ? '±' : ''}
                    {formatNumber(log.odometer)}
                  </span>
                  <span className="mb-1 text-[10px] font-bold tracking-[0.08em] text-blue-300/80">
                    KM
                  </span>
                </div>
              </div>
              <span
                className={`flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[8.5px] font-bold uppercase tracking-[0.1em] ${
                  log.odometerSource === 'ocr'
                    ? 'border-cyan-400/20 bg-cyan-500/[0.07] text-cyan-300'
                    : log.odometerSource === 'estimated'
                      ? 'border-amber-400/25 bg-amber-500/[0.07] text-amber-300'
                      : 'border-white/10 bg-white/[0.04] text-slate-400'
                }`}
              >
                {log.odometerSource === 'ocr' ? (
                  <ScanText className="h-3 w-3" />
                ) : log.odometerSource === 'estimated' ? (
                  <Info className="h-3 w-3" />
                ) : (
                  <Gauge className="h-3 w-3" />
                )}
                {log.odometerSource === 'ocr'
                  ? 'AI scan'
                  : log.odometerSource === 'estimated'
                    ? 'Perkiraan'
                    : 'Manual'}
              </span>
            </div>
            <div className="relative mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-white/[0.06] pt-2.5 text-[9px] text-slate-500">
              <span className="flex items-center gap-1">
                <Wrench className="h-2.5 w-2.5" />
                {log.categories.length} komponen
              </span>
              {log.photos.length > 0 && (
                <span className="flex items-center gap-1">
                  <Camera className="h-2.5 w-2.5" />
                  {log.photos.length} foto
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock3 className="h-2.5 w-2.5" />
                Dicatat {formatRelativeToNow(log.createdAt)}
              </span>
              {log.updatedAt && (
                <span className="text-amber-400/70">
                  Diedit {formatRelativeToNow(log.updatedAt)}
                </span>
              )}
            </div>
          </div>

          <section className="space-y-2.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Komponen diservis
            </p>
            <div className="space-y-2">
              {log.categories.map((key) => {
                const def = CATEGORIES[key]
                const Icon = def.icon
                const rule = state.intervals[key]
                return (
                  <div
                    key={key}
                    className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-[#0C1524]/80 p-3"
                  >
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
                      style={{
                        borderColor: `${def.accent}33`,
                        backgroundColor: `${def.accent}12`,
                        color: def.accent,
                      }}
                    >
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11.5px] font-bold text-slate-100">{def.label}</p>
                      <p className="mt-0.5 text-[9px] text-slate-500">
                        {rule.enabled === false
                          ? 'Tanpa jadwal — pengingat nonaktif'
                          : `Interval ${formatNumber(rule.km)} KM / ${rule.days} hari`}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[8.5px] font-bold uppercase tracking-[0.11em] text-slate-500">
                        Berikutnya
                      </p>
                      {rule.enabled === false ? (
                        <p className="mono mt-0.5 text-[11px] font-semibold text-slate-500">—</p>
                      ) : (
                        <>
                          <p className="mono mt-0.5 text-[11px] font-semibold text-slate-200">
                            {formatNumber(log.odometer + rule.km)} KM
                          </p>
                          <p className="mt-0.5 text-[8.5px] text-slate-500">
                            ± {formatDateShort(addDays(log.date, rule.days))}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {photos.length > 0 && (
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Foto terlampir
                </p>
                <span className="text-[9px] text-slate-500">{photos.length} foto</span>
              </div>

              {odometerPhotoIndex >= 0 && (
                <button
                  type="button"
                  onClick={() => setLightboxIndex(odometerPhotoIndex)}
                  className="group relative block w-full overflow-hidden rounded-2xl border border-cyan-400/15 bg-[#060d18]"
                >
                  <img
                    src={photos[odometerPhotoIndex].dataUrl}
                    alt="Foto spedometer servis"
                    className="aspect-[16/9] w-full object-cover transition duration-500 group-hover:scale-[1.015]"
                  />
                  <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#03080f]/80 via-transparent to-transparent" />
                  <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-cyan-300/25 bg-[#061b25]/85 px-2 py-1 text-[8.5px] font-bold uppercase tracking-[0.1em] text-cyan-200 backdrop-blur-sm">
                    <ScanText className="h-3 w-3" />
                    Spedometer
                  </span>
                  <span className="absolute bottom-2.5 right-3 rounded-md border border-white/15 bg-black/40 px-1.5 py-0.5 text-[8.5px] text-slate-300 backdrop-blur-sm">
                    Tap untuk zoom
                  </span>
                </button>
              )}

              {documentationPhotos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {documentationPhotos.map((photo) => {
                    const index = photos.findIndex((item) => item.id === photo.id)
                    return (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() => setLightboxIndex(index)}
                        className="group relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-[#0A1220]"
                        aria-label="Buka foto dokumentasi"
                      >
                        <img
                          src={photo.dataUrl}
                          alt="Dokumentasi servis"
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      </button>
                    )
                  })}
                </div>
              )}
            </section>
          )}

          {(log.spec || log.tags.length > 0) && (
            <section className="space-y-2.5">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Spesifikasi & tag
              </p>
              {log.spec && (
                <div className="flex items-start gap-2.5 rounded-2xl border border-blue-400/12 bg-blue-500/[0.045] px-3.5 py-3">
                  <Tag className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-blue-300/70">
                      Part terpasang
                    </p>
                    <p className="mt-1 text-[11.5px] font-semibold text-slate-100">{log.spec}</p>
                  </div>
                </div>
              )}
              {log.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {log.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-lg border border-white/[0.08] bg-white/[0.035] px-2 py-1 text-[9px] font-medium text-slate-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </section>
          )}

          {log.note && (
            <section className="space-y-2">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Catatan
              </p>
              <p className="whitespace-pre-line rounded-2xl border border-white/[0.065] bg-white/[0.022] px-3.5 py-3 text-[11px] leading-relaxed text-slate-300">
                {log.note}
              </p>
            </section>
          )}

          <section className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-white/[0.065] bg-white/[0.022] p-3">
              <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">
                <ReceiptText className="h-3 w-3" />
                Biaya
              </p>
              <p className="mono mt-1.5 text-[14px] font-semibold text-slate-100">
                {totalCost > 0 ? formatCurrency(totalCost) : '—'}
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.065] bg-white/[0.022] p-3">
              <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">
                <Check className="h-3 w-3" />
                Setup aktif
              </p>
              <p className="mt-1.5 text-[11px] font-semibold text-slate-200">
                {log.setupUpdated ? 'Diperbarui' : 'Tidak diubah'}
              </p>
            </div>
          </section>

          {log.ocrProvider && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-cyan-400/10 bg-cyan-500/[0.035] px-3.5 py-2.5">
              <p className="flex items-center gap-1.5 text-[9px] text-slate-500">
                <Sparkles className="h-3 w-3 text-cyan-400/70" />
                Odometer dibaca dengan {log.ocrProvider === 'gemini' ? 'Gemini Vision' : 'mode demo'}
              </p>
              <span className="mono text-[8.5px] uppercase tracking-[0.1em] text-cyan-300/60">
                OCR
              </span>
            </div>
          )}
        </div>
      </Sheet>

      <Lightbox
        photos={photos}
        initialIndex={lightboxIndex ?? 0}
        open={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Hapus log ini?"
        description={`Log ${formatDateShort(log.date)} di ${formatNumber(
          log.odometer,
        )} KM akan dihapus permanen. Health komponen akan dihitung ulang dari log berikutnya.`}
        confirmLabel="Hapus log"
        onConfirm={() => {
          onDelete(log)
          onClose()
        }}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  )
}
