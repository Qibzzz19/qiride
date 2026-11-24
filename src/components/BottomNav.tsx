import { motion } from 'framer-motion'
import {
  History,
  House,
  Plus,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import type { AppTab } from '../types'

interface NavItem {
  id: Exclude<AppTab, 'home'> | 'home'
  label: string
  icon: LucideIcon
}

const LEFT_ITEMS: NavItem[] = [
  { id: 'home', label: 'Beranda', icon: House },
  { id: 'history', label: 'Riwayat', icon: History },
]

const RIGHT_ITEMS: NavItem[] = [
  { id: 'garage', label: 'Garasi', icon: SlidersHorizontal },
  { id: 'settings', label: 'Setelan', icon: Settings2 },
]

interface BottomNavProps {
  active: AppTab
  onChange: (tab: AppTab) => void
  onAdd: () => void
}

function NavButton({
  item,
  active,
  onClick,
}: {
  item: NavItem
  active: boolean
  onClick: () => void
}) {
  const Icon = item.icon
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={item.label}
      aria-current={active ? 'page' : undefined}
      className={`relative flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 transition-colors duration-200 ${
        active ? 'text-white' : 'text-slate-500 hover:text-slate-300'
      }`}
    >
      {active && (
        <motion.span
          layoutId="nav-active-pill"
          className="absolute inset-0 rounded-2xl border border-blue-400/10 bg-gradient-to-b from-blue-500/[0.12] to-transparent"
          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        />
      )}
      <span className="relative">
        <Icon
          className={`h-[21px] w-[21px] transition-all ${
            active ? 'drop-shadow-[0_0_9px_rgba(59,130,246,0.7)]' : ''
          }`}
          strokeWidth={active ? 2.25 : 1.9}
        />
        {active && (
          <motion.span
            layoutId="nav-active-dot"
            className="absolute -right-2 -top-1 h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.9)]"
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          />
        )}
      </span>
      <span
        className={`truncate text-[9.5px] font-semibold tracking-[0.02em] ${
          active ? 'text-slate-100' : 'text-slate-500'
        }`}
      >
        {item.label}
      </span>
    </button>
  )
}

export function BottomNav({ active, onChange, onAdd }: BottomNavProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[560px] px-3 pb-[calc(env(safe-area-inset-bottom)+10px)]">
      <nav
        className="pointer-events-auto relative grid grid-cols-5 items-center rounded-[26px] border border-blue-400/[0.14] bg-[#141C2B]/94 px-1.5 pt-1.5 pb-1 shadow-[0_-12px_55px_-20px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-2xl"
        aria-label="Navigasi utama"
      >
        {LEFT_ITEMS.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            active={active === item.id}
            onClick={() => onChange(item.id)}
          />
        ))}

        <div className="relative flex min-h-[58px] flex-col items-center justify-end pb-0.5">
          <motion.button
            type="button"
            onClick={onAdd}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.93 }}
            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
            aria-label="Catat servis atau scan spedometer"
            className="group relative -mt-8 flex h-[62px] w-[62px] items-center justify-center rounded-[22px] border border-blue-300/30 bg-gradient-to-br from-[#3B82F6] via-[#2563EB] to-[#1D4ED8] text-white shadow-[0_16px_40px_-12px_rgba(37,99,235,0.9),inset_0_1px_0_rgba(255,255,255,0.3)] ring-[5px] ring-[#141C2B]"
          >
            <span className="absolute inset-0 rounded-[22px] bg-[radial-gradient(circle_at_30%_15%,rgba(255,255,255,0.3),transparent_45%)]" />
            <Plus className="relative h-[27px] w-[27px]" strokeWidth={2.4} />
            <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-cyan-200/30 bg-[#08252d] text-cyan-300 shadow-[0_0_14px_rgba(6,182,212,0.4)]">
              <Sparkles className="h-2.5 w-2.5" strokeWidth={2.4} />
            </span>
          </motion.button>
          <span className="mt-0.5 text-[9.5px] font-semibold text-slate-300">Catat</span>
        </div>

        {RIGHT_ITEMS.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            active={active === item.id}
            onClick={() => onChange(item.id)}
          />
        ))}
      </nav>
    </div>
  )
}
