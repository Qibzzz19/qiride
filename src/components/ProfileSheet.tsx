import { useEffect, useState } from 'react'
import { Bike, CalendarDays, Check, Hash, TriangleAlert } from 'lucide-react'
import type { Profile } from '../types'
import { Sheet } from './Sheet'
import { formatNumber } from '../lib/format'

interface ProfileSheetProps {
  open: boolean
  profile: Profile
  onClose: () => void
  onSave: (profile: Profile) => void
}

export function ProfileSheet({ open, profile, onClose, onSave }: ProfileSheetProps) {
  const [model, setModel] = useState(profile.model)
  const [nickname, setNickname] = useState(profile.nickname)
  const [plate, setPlate] = useState(profile.plate)
  const [year, setYear] = useState(String(profile.year))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setModel(profile.model)
    setNickname(profile.nickname)
    setPlate(profile.plate)
    setYear(String(profile.year))
    setError(null)
  }, [open, profile])

  const yearNumber = Number(year)
  const validYear =
    Number.isInteger(yearNumber) &&
    yearNumber >= 1990 &&
    yearNumber <= new Date().getFullYear() + 1

  function handleSave() {
    const cleanModel = model.trim()
    const cleanPlate = plate.trim().toUpperCase()
    if (!cleanModel) {
      setError('Nama/model motor wajib diisi.')
      return
    }
    if (!validYear) {
      setError(`Tahun harus antara 1990 dan ${new Date().getFullYear() + 1}.`)
      return
    }
    onSave({
      model: cleanModel.slice(0, 48),
      nickname: nickname.trim().slice(0, 32),
      plate: cleanPlate.slice(0, 14),
      year: yearNumber,
    })
    onClose()
  }

  const preview = (nickname || model || 'M').trim().charAt(0).toUpperCase() || 'M'

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Profil Motor"
      eyebrow="Garage identity"
      headerRight={
        <span className="hidden items-center gap-1.5 rounded-full border border-blue-400/15 bg-blue-500/[0.06] px-2.5 py-1.5 text-[8px] font-bold uppercase tracking-[0.12em] text-blue-300 sm:flex">
          <Bike className="h-3 w-3" />
          Rider profile
        </span>
      }
      footer={
        <div className="space-y-2.5">
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-500/[0.08] px-3 py-2 text-[10px] text-red-300">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!model.trim() || !validYear}
            className="btn-primary h-[50px] w-full rounded-2xl"
          >
            <Check className="h-4.5 w-4.5" strokeWidth={2.5} />
            Simpan Profil
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="relative overflow-hidden rounded-3xl border border-blue-400/15 bg-[#0C1524] p-4">
          <div className="field-grid pointer-events-none absolute inset-0 opacity-30" />
          <div className="relative flex items-center gap-3.5">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] border border-blue-300/25 bg-gradient-to-br from-blue-500 to-cyan-500 text-[26px] font-extrabold text-white shadow-[0_16px_35px_-16px_rgba(37,99,235,0.9)]">
              {preview}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[16px] font-bold tracking-[-0.02em] text-white">
                {nickname.trim() || model.trim() || 'Motor Saya'}
              </p>
              <p className="mt-1 truncate text-[11px] text-slate-400">
                {model.trim() || 'Model motor belum diisi'}
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="mono rounded border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[8px] font-medium tracking-[0.08em] text-slate-300">
                  {plate.trim() || 'TANPA PLAT'}
                </span>
                <span className="text-[9px] text-slate-500">{year || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          <div>
            <label htmlFor="profile-model" className="field-label">
              Model / tipe motor <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Bike className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                id="profile-model"
                type="text"
                value={model}
                maxLength={48}
                onChange={(event) => {
                  setModel(event.target.value)
                  setError(null)
                }}
                placeholder="cth. Vario 160 ABS"
                className="field pl-9"
                autoComplete="off"
              />
            </div>
          </div>

          <div>
            <label htmlFor="profile-nickname" className="field-label">
              Nama panggilan
            </label>
            <input
              id="profile-nickname"
              type="text"
              value={nickname}
              maxLength={32}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="cth. Si Hitam"
              className="field"
              autoComplete="off"
            />
            <p className="mt-1.5 text-[8.5px] text-slate-600">
              Muncul di dashboard dan kartu garasi.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="profile-plate" className="field-label">
                Plat nomor
              </label>
              <div className="relative">
                <Hash className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <input
                  id="profile-plate"
                  type="text"
                  value={plate}
                  maxLength={14}
                  onChange={(event) => setPlate(event.target.value.toUpperCase())}
                  placeholder="B 1234 XYZ"
                  className="field mono pl-9 text-[11px] uppercase tracking-[0.04em]"
                  autoComplete="off"
                />
              </div>
            </div>
            <div>
              <label htmlFor="profile-year" className="field-label">
                Tahun
              </label>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <input
                  id="profile-year"
                  type="text"
                  inputMode="numeric"
                  value={year}
                  onChange={(event) => {
                    setYear(event.target.value.replace(/\D/g, '').slice(0, 4))
                    setError(null)
                  }}
                  placeholder={String(new Date().getFullYear())}
                  className="field mono pl-9 text-[11px]"
                  autoComplete="off"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] px-3.5 py-3">
          <p className="text-[9px] leading-relaxed text-slate-500">
            Profil hanya tersimpan di perangkat ini. Tahun kendaraan membantu memberi konteks
            interval, bukan mengganti perhitungan KM.
          </p>
          {yearNumber > 0 && Number.isFinite(yearNumber) && (
            <p className="mono mt-2 text-[8.5px] uppercase tracking-[0.12em] text-slate-500">
              Model year {formatNumber(yearNumber)}
            </p>
          )}
        </div>
      </div>
    </Sheet>
  )
}
