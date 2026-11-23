import { useEffect, useState } from 'react'
import {
  Check,
  CircleDashed,
  Cog,
  Droplets,
  Info,
  Orbit,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react'
import type { SetupFieldKey, SetupState } from '../types'
import { Sheet } from './Sheet'
import { ToggleSwitch } from './ToggleSwitch'
import { formatDateShort } from '../lib/date'

type SetupPatch = Partial<Omit<SetupState, 'updatedAt'>>

interface SetupSheetProps {
  open: boolean
  setup: SetupState
  onClose: () => void
  onSave: (patch: SetupPatch) => void
}

const FIELDS: Record<
  SetupFieldKey,
  { label: string; placeholder: string; hint?: string }
> = {
  engineOil: {
    label: 'Oli mesin',
    placeholder: 'cth. Motul 5100 10W-40',
    hint: 'Spesifikasi oli yang sedang dipakai.',
  },
  gearOil: {
    label: 'Oli gardan',
    placeholder: 'cth. Yamalube 80W-90',
  },
  coolant: {
    label: 'Coolant',
    placeholder: 'cth. Yamaha Coolant 50/50',
  },
  cvtPulley: {
    label: 'Pulley',
    placeholder: 'cth. Kawahara 14°',
  },
  cvtRoller: {
    label: 'Roller',
    placeholder: 'cth. 10 g · 6 pcs',
  },
  cvtPerCvt: {
    label: 'Per CVT',
    placeholder: 'cth. 1.500 RPM',
  },
  cvtPerSentri: {
    label: 'Per sentri',
    placeholder: 'cth. 1.200 RPM',
  },
  cvtBoss: {
    label: 'Boss / washer',
    placeholder: 'cth. Boss STD + 1 washer',
  },
  vBelt: {
    label: 'V-Belt',
    placeholder: 'cth. Yamaha OEM',
  },
  frontTire: {
    label: 'Ban depan',
    placeholder: 'cth. IRC Fasti 80/90-14',
  },
  rearTire: {
    label: 'Ban belakang',
    placeholder: 'cth. IRC Fasti 90/90-14',
  },
  brakePads: {
    label: 'Kampas rem',
    placeholder: 'cth. Aspira Carbon',
  },
}

const GROUPS: Array<{
  title: string
  description: string
  icon: typeof Droplets
  accent: string
  fields: SetupFieldKey[]
}> = [
  {
    title: 'Pelumasan & pendingin',
    description: 'Oli mesin, gardan, dan cairan radiator',
    icon: Droplets,
    accent: '#3B82F6',
    fields: ['engineOil', 'gearOil', 'coolant'],
  },
  {
    title: 'Ruang CVT',
    description: 'Pulley, roller, per, boss, dan V-belt',
    icon: Orbit,
    accent: '#818CF8',
    fields: ['cvtPulley', 'cvtRoller', 'cvtPerCvt', 'cvtPerSentri', 'cvtBoss', 'vBelt'],
  },
  {
    title: 'Kaki-kaki',
    description: 'Ban dan kampas rem yang sedang terpasang',
    icon: CircleDashed,
    accent: '#94A3B8',
    fields: ['frontTire', 'rearTire', 'brakePads'],
  },
]

export function SetupSheet({ open, setup, onClose, onSave }: SetupSheetProps) {
  const [values, setValues] = useState<SetupPatch>(setup)
  const [showEmpty, setShowEmpty] = useState(true)

  useEffect(() => {
    if (!open) return
    const next: SetupPatch = {}
    for (const key of Object.keys(FIELDS) as SetupFieldKey[]) next[key] = setup[key]
    setValues(next)
    setShowEmpty(true)
  }, [open, setup])

  function updateField(key: SetupFieldKey, value: string) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function handleSave() {
    const patch: SetupPatch = {}
    for (const key of Object.keys(FIELDS) as SetupFieldKey[]) {
      patch[key] = (values[key] ?? '').trim()
    }
    onSave(patch)
    onClose()
  }

  const filledCount = (Object.keys(FIELDS) as SetupFieldKey[]).filter((key) =>
    (values[key] ?? '').trim(),
  ).length

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Setup Aktif"
      eyebrow="Spesifikasi terpasang"
      headerRight={
        <span className="hidden items-center gap-1.5 rounded-full border border-cyan-400/15 bg-cyan-500/[0.06] px-2.5 py-1.5 text-[8px] font-bold uppercase tracking-[0.12em] text-cyan-300 sm:flex">
          <SlidersHorizontal className="h-3 w-3" />
          {filledCount}/12 terisi
        </span>
      }
      footer={
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2">
            <p className="flex items-center gap-1.5 text-[9px] text-slate-500">
              <Cog className="h-3 w-3 text-cyan-400/70" />
              Terakhir diubah {formatDateShort(setup.updatedAt.slice(0, 10))}
            </p>
            <button
              type="button"
              onClick={() => setShowEmpty((value) => !value)}
              className="min-h-[44px] shrink-0 px-1 text-[10px] font-semibold text-blue-400"
            >
              {showEmpty ? 'Sembunyikan kosong' : 'Tampilkan kosong'}
            </button>
          </div>
          <button type="button" onClick={handleSave} className="btn-primary h-[50px] w-full rounded-2xl">
            <Check className="h-4.5 w-4.5" strokeWidth={2.5} />
            Simpan Setup
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex items-start gap-2.5 rounded-2xl border border-cyan-400/15 bg-cyan-500/[0.045] px-3.5 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
          <p className="text-[10px] leading-relaxed text-slate-400">
            Setup ini adalah kartu spesifikasi aktif motor kamu. Perbarui saat ganti part supaya
            tidak lupa kombinasi yang sedang terpasang.
          </p>
        </div>

        {GROUPS.map((group) => {
          const Icon = group.icon
          const visibleFields = showEmpty
            ? group.fields
            : group.fields.filter((key) => (values[key] ?? '').trim())
          return (
            <section key={group.title} className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-xl border"
                  style={{
                    borderColor: `${group.accent}33`,
                    backgroundColor: `${group.accent}12`,
                    color: group.accent,
                  }}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-[12px] font-bold text-slate-100">{group.title}</h3>
                  <p className="mt-0.5 text-[8.5px] text-slate-500">{group.description}</p>
                </div>
              </div>
              <div className="grid gap-2.5">
                {visibleFields.map((key) => (
                  <div key={key}>
                    <label htmlFor={`setup-edit-${key}`} className="field-label">
                      {FIELDS[key].label}
                    </label>
                    <input
                      id={`setup-edit-${key}`}
                      type="text"
                      value={values[key] ?? ''}
                      onChange={(event) => updateField(key, event.target.value)}
                      placeholder={FIELDS[key].placeholder}
                      className="field"
                      autoComplete="off"
                    />
                    {FIELDS[key].hint && (
                      <p className="mt-1.5 text-[8.5px] text-slate-600">{FIELDS[key].hint}</p>
                    )}
                  </div>
                ))}
                {visibleFields.length === 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmpty(true)
                      setTimeout(() => {
                        document.getElementById(`setup-edit-${group.fields[0]}`)?.focus()
                      }, 80)
                    }}
                    className="flex min-h-[50px] items-center gap-2.5 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-3.5 text-left transition hover:border-cyan-400/25"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] text-slate-500">
                      <CircleDashed className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-[10px] font-semibold text-slate-400">
                        Belum ada data {group.title.toLowerCase()}
                      </span>
                      <span className="mt-0.5 block text-[9px] text-slate-500">
                        Tap untuk mengisi spesifikasi
                      </span>
                    </span>
                  </button>
                )}
              </div>
            </section>
          )
        })}

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] px-3.5 py-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400/80" />
            <div>
              <p className="text-[9px] font-semibold text-slate-300">Tersimpan lokal</p>
              <p className="mt-0.5 text-[9px] text-slate-500">
                Setup ikut masuk ke backup JSON.
              </p>
            </div>
          </div>
          <ToggleSwitch
            checked={showEmpty}
            onChange={setShowEmpty}
            label="Tampilkan field kosong"
          />
        </div>
      </div>
    </Sheet>
  )
}
