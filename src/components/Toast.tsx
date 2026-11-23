import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CircleCheck, Info, Sparkles, TriangleAlert, X } from 'lucide-react'
import { uid } from '../lib/format'

type ToastTone = 'success' | 'error' | 'info' | 'ai'

interface ToastItem {
  id: string
  message: string
  title?: string
  tone: ToastTone
}

interface ToastOptions {
  tone?: ToastTone
  title?: string
  duration?: number
}

type ToastFn = (message: string, options?: ToastOptions) => string

const ToastContext = createContext<ToastFn | null>(null)

const toneStyles: Record<
  ToastTone,
  { icon: typeof Info; iconClass: string; ring: string; glow: string }
> = {
  success: {
    icon: CircleCheck,
    iconClass: 'text-emerald-400',
    ring: 'border-emerald-400/20',
    glow: 'rgba(16,185,129,0.18)',
  },
  error: {
    icon: TriangleAlert,
    iconClass: 'text-red-400',
    ring: 'border-red-400/20',
    glow: 'rgba(239,68,68,0.18)',
  },
  info: {
    icon: Info,
    iconClass: 'text-blue-400',
    ring: 'border-blue-400/20',
    glow: 'rgba(59,130,246,0.18)',
  },
  ai: {
    icon: Sparkles,
    iconClass: 'text-cyan-300',
    ring: 'border-cyan-400/20',
    glow: 'rgba(6,182,212,0.2)',
  },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef(new Map<string, number>())

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id)
    if (timer) window.clearTimeout(timer)
    timers.current.delete(id)
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const toast = useCallback<ToastFn>(
    (message, options = {}) => {
      const id = uid('toast')
      const item: ToastItem = {
        id,
        message,
        title: options.title,
        tone: options.tone ?? 'info',
      }
      setToasts((current) => [...current.slice(-2), item])
      const duration = options.duration ?? (options.tone === 'error' ? 6500 : 4200)
      const timer = window.setTimeout(() => dismiss(id), duration)
      timers.current.set(id, timer)
      return id
    },
    [dismiss],
  )

  const value = useMemo(() => toast, [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+12px)] z-[120] mx-auto flex w-full max-w-[480px] flex-col items-stretch gap-2 px-3"
        aria-live="polite"
        aria-atomic="false"
      >
        <AnimatePresence initial={false}>
          {toasts.map((item) => {
            const style = toneStyles[item.tone]
            const Icon = style.icon
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: -16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                className={`pointer-events-auto relative overflow-hidden rounded-2xl border ${style.ring} bg-[#0d1422]/95 px-3.5 py-3 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl`}
                style={{ boxShadow: `0 18px 50px -24px ${style.glow}, 0 0 0 1px rgba(255,255,255,0.03)` }}
                role="status"
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.05]">
                    <Icon className={`h-4 w-4 ${style.iconClass}`} strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    {item.title && (
                      <p className="text-[12px] font-semibold text-slate-100">{item.title}</p>
                    )}
                    <p className="text-[12px] leading-relaxed text-slate-300">{item.message}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => dismiss(item.id)}
                    className="-mr-1 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/5 hover:text-slate-200"
                    aria-label="Tutup notifikasi"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <motion.span
                  className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-cyan-400/70 to-blue-500/40"
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: (item.tone === 'error' ? 6500 : 4200) / 1000, ease: 'linear' }}
                />
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastFn {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}
