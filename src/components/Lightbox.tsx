import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Camera, ScanLine, X } from 'lucide-react'
import type { Photo } from '../types'
import { useOverlayLayer } from '../hooks/useOverlayLayer'
import { formatDateShort } from '../lib/date'

interface LightboxProps {
  photos: Photo[]
  initialIndex?: number
  open: boolean
  onClose: () => void
}

export function Lightbox({ photos, initialIndex = 0, open, onClose }: LightboxProps) {
  const [index, setIndex] = useState(initialIndex)
  const [direction, setDirection] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)
  useOverlayLayer(open, onClose, panelRef)

  useEffect(() => {
    if (open) {
      setIndex(Math.max(0, Math.min(initialIndex, photos.length - 1)))
      setDirection(0)
    }
  }, [open, initialIndex, photos.length])

  const photo = photos[index]
  const hasMultiple = photos.length > 1

  function go(nextIndex: number) {
    if (nextIndex < 0 || nextIndex >= photos.length) return
    setDirection(nextIndex > index ? 1 : -1)
    setIndex(nextIndex)
  }

  useEffect(() => {
    if (!open) return
    const handleKeys = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') go(index - 1)
      if (event.key === 'ArrowRight') go(index + 1)
    }
    window.addEventListener('keydown', handleKeys)
    return () => window.removeEventListener('keydown', handleKeys)
  })

  return createPortal(
    <AnimatePresence>
      {open && photo && (
        <div className="fixed inset-0 z-[115] flex flex-col bg-[#05070c]/97 backdrop-blur-2xl">
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Lihat foto dokumentasi"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex h-full w-full flex-col outline-none"
          >
            <div className="flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+14px)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/10 text-cyan-300">
                  {photo.kind === 'odometer' ? (
                    <ScanLine className="h-4 w-4" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-200">
                    {photo.kind === 'odometer' ? 'Foto Spedometer' : 'Dokumentasi Servis'}
                  </p>
                  <p className="mono mt-0.5 text-[9px] tracking-wide text-slate-500">
                    {String(index + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}
                    <span className="mx-1.5 text-slate-700">•</span>
                    {formatDateShort(photo.createdAt.slice(0, 10))}
                  </p>
                </div>
              </div>
              <button type="button" onClick={onClose} className="icon-button h-11 w-11" aria-label="Tutup foto">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="relative flex min-h-0 flex-1 items-center justify-center px-3">
              <AnimatePresence initial={false} mode="popLayout" custom={direction}>
                <motion.img
                  key={photo.id}
                  src={photo.dataUrl}
                  alt={photo.kind === 'odometer' ? 'Foto spedometer' : 'Dokumentasi servis motor'}
                  className="max-h-full max-w-full rounded-2xl border border-white/10 object-contain shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]"
                  initial={{ opacity: 0, x: direction * 50, scale: 0.98 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: direction * -50, scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  drag={hasMultiple ? 'x' : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.16}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -70) go(index + 1)
                    if (info.offset.x > 70) go(index - 1)
                  }}
                />
              </AnimatePresence>

              {hasMultiple && (
                <>
                  <button
                    type="button"
                    onClick={() => go(index - 1)}
                    disabled={index === 0}
                    aria-label="Foto sebelumnya"
                    className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white backdrop-blur-md transition disabled:opacity-25"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => go(index + 1)}
                    disabled={index === photos.length - 1}
                    aria-label="Foto berikutnya"
                    className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white backdrop-blur-md transition disabled:opacity-25"
                  >
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>

            {hasMultiple && (
              <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-4">
                {photos.map((item, itemIndex) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => go(itemIndex)}
                    aria-label={`Buka foto ${itemIndex + 1}`}
                    className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border transition ${
                      itemIndex === index
                        ? 'border-cyan-300/70 opacity-100 ring-2 ring-cyan-300/20'
                        : 'border-white/10 opacity-50 hover:opacity-85'
                    }`}
                  >
                    <img src={item.dataUrl} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
