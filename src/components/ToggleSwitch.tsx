import { motion } from 'framer-motion'

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  label: string
}

export function ToggleSwitch({ checked, onChange, disabled = false, label }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex min-h-[44px] min-w-[52px] items-center justify-center disabled:opacity-50"
    >
      <span
        className={`relative flex h-[27px] w-[48px] items-center rounded-full border p-[3px] transition-colors duration-200 ${
          checked
            ? 'border-cyan-300/40 bg-gradient-to-r from-blue-600 to-cyan-500 shadow-[0_0_18px_rgba(37,99,235,0.35)]'
            : 'border-slate-600/40 bg-slate-700/60'
        }`}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 600, damping: 34 }}
          className={`h-[19px] w-[19px] rounded-full shadow-md ${
            checked ? 'ml-auto bg-white' : 'bg-slate-300'
          }`}
        />
      </span>
    </button>
  )
}
