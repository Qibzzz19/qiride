import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { TriangleAlert, X } from 'lucide-react'
import { useOverlayLayer } from '../hooks/useOverlayLayer'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'default'
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Lanjutkan',
  cancelLabel = 'Batal',
  tone = 'danger',
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  useOverlayLayer(open, onClose, panelRef)

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-5">
          <motion.button
            type="button"
            aria-label="Tutup konfirmasi"
            className="absolute inset-0 cursor-default bg-black/75 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-desc"
            tabIndex={-1}
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="glass-card relative w-full max-w-[390px] rounded-[26px] p-5 outline-none"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="absolute right-3.5 top-3.5 flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white/5 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            <div
              className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border ${
                tone === 'danger'
                  ? 'border-red-400/20 bg-red-500/10 text-red-400'
                  : 'border-blue-400/20 bg-blue-500/10 text-blue-400'
              }`}
            >
              <TriangleAlert className="h-5 w-5" />
            </div>
            <h2 id="confirm-title" className="pr-8 text-[18px] font-bold tracking-[-0.02em] text-white">
              {title}
            </h2>
            <p id="confirm-desc" className="mt-2 text-[13px] leading-relaxed text-slate-400">
              {description}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2.5">
              <button type="button" className="btn-ghost" onClick={onClose}>
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => {
                  onConfirm()
                  onClose()
                }}
                className={`inline-flex min-h-[44px] items-center justify-center rounded-2xl border px-4 text-[13px] font-semibold text-white transition active:scale-[0.985] ${
                  tone === 'danger'
                    ? 'border-red-400/25 bg-gradient-to-br from-red-500 to-red-700 shadow-[0_12px_28px_-14px_rgba(239,68,68,0.8)]'
                    : 'border-blue-300/25 bg-gradient-to-br from-blue-500 to-blue-700 shadow-[0_12px_28px_-14px_rgba(37,99,235,0.8)]'
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
