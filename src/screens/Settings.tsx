import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import {
  Camera,
  Check,
  Database,
  Download,
  Eye,
  EyeOff,
  FileJson,
  FileSpreadsheet,
  HardDrive,
  Info,
  KeyRound,
  LoaderCircle,
  Lock,
  RotateCcw,
  Save,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  TriangleAlert,
  Upload,
  Wifi,
  WifiOff,
} from 'lucide-react'
import type { CategoryKey, GarageState, IntervalMap, IntervalRule } from '../types'
import type { GarageStore } from '../hooks/useGarage'
import { CATEGORY_LIST } from '../data/categories'
import {
  addDays,
  formatDateShort,
  formatRelativeToNow,
  todayInput,
} from '../lib/date'
import { formatNumber } from '../lib/format'
import { formatBytes } from '../lib/image'
import { createDefaultIntervals } from '../lib/state'
import { getComponentHealth } from '../lib/health'
import {
  backupSizeLabel,
  exportJsonBackup,
  exportLogsCsv,
  parseBackupFile,
} from '../lib/backup'
import { estimateDatabaseBytes } from '../lib/db'
import { configuredOcrProxy, ocrConfigured, ocrModeLabel } from '../lib/ocr'
import { useInstallPrompt, useOnlineStatus } from '../hooks/usePwa'
import { PageHeader, SectionHeader } from '../components/PageHeader'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ToggleSwitch } from '../components/ToggleSwitch'
import { useToast } from '../components/Toast'

interface SettingsScreenProps {
  state: GarageState
  actions: GarageStore['actions']
}

const MODEL_OPTIONS = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash · recommended' },
  { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite · hemat' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash · legacy' },
]

interface PendingImport {
  state: GarageState
  fileName: string
}

export function SettingsScreen({ state, actions }: SettingsScreenProps) {
  const toast = useToast()
  const { canInstall, installed, promptInstall } = useInstallPrompt()
  const online = useOnlineStatus()

  const [apiKey, setApiKey] = useState(state.settings.geminiApiKey)
  const [model, setModel] = useState(state.settings.ocrModel)
  const [showKey, setShowKey] = useState(false)
  const [intervalDraft, setIntervalDraft] = useState<IntervalMap>(state.intervals)
  const [storageBytes, setStorageBytes] = useState(0)
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmResetIntervals, setConfirmResetIntervals] = useState(false)
  const [importing, setImporting] = useState(false)
  const [installing, setInstalling] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setApiKey(state.settings.geminiApiKey)
    setModel(state.settings.ocrModel)
  }, [state.settings.geminiApiKey, state.settings.ocrModel])

  useEffect(() => {
    setIntervalDraft(state.intervals)
  }, [state.intervals])

  useEffect(() => {
    let active = true
    void estimateDatabaseBytes().then((bytes) => {
      if (active) setStorageBytes(bytes)
    })
    return () => {
      active = false
    }
  }, [state.logs.length, state.odometerUpdates.length])

  const settingsDirty =
    apiKey.trim() !== state.settings.geminiApiKey.trim() || model !== state.settings.ocrModel
  const configured = ocrConfigured(state.settings)
  const proxyActive = Boolean(configuredOcrProxy)

  const intervalDirty = CATEGORY_LIST.some((category) => {
    const draft = intervalDraft[category.key]
    const saved = state.intervals[category.key]
    return (
      draft.km !== saved.km ||
      draft.days !== saved.days ||
      draft.enabled !== false !== (saved.enabled !== false)
    )
  })

  const previewState = { ...state, intervals: intervalDraft }
  const photoCount = state.logs.reduce((sum, log) => sum + log.photos.length, 0)

  function saveSettings() {
    const nextKey = apiKey.trim()
    if (!nextKey && !proxyActive) {
      toast('Mode demo tetap aktif. Scan akan memakai estimasi dan bisa dikoreksi manual.', {
        tone: 'info',
        title: 'Tanpa API key',
      })
    }
    actions.updateSettings({
      geminiApiKey: nextKey,
      ocrModel: model,
    })
    toast(
      nextKey
        ? 'API key dan model OCR disimpan lokal di perangkat ini.'
        : 'Pengaturan OCR disimpan. Mode demo akan dipakai saat scan.',
      { tone: 'success', title: 'Setelan AI disimpan' },
    )
  }

  function clearApiKey() {
    actions.updateSettings({ geminiApiKey: '' })
    setApiKey('')
    setShowKey(false)
    toast('API key dihapus. Scan berikutnya memakai mode demo.', {
      tone: 'info',
      title: 'Mode demo aktif',
    })
  }

  function updateRule(key: CategoryKey, patch: Partial<IntervalRule>) {
    setIntervalDraft((current) => ({
      ...current,
      [key]: { ...current[key], ...patch },
    }))
  }

  function saveIntervals() {
    const invalid = CATEGORY_LIST.find((category) => {
      const draft = intervalDraft[category.key]
      // Aturan nonaktif tidak divalidasi angkanya — bisa diaktifkan lagi nanti.
      if (draft.enabled === false) return false
      return (
        !Number.isFinite(draft.km) ||
        draft.km < 100 ||
        !Number.isFinite(draft.days) ||
        draft.days < 1
      )
    })
    if (invalid) {
      toast('Interval KM minimal 100 dan interval hari minimal 1.', {
        tone: 'error',
        title: 'Aturan belum valid',
      })
      return
    }
    for (const category of CATEGORY_LIST) {
      actions.updateInterval(category.key, {
        ...intervalDraft[category.key],
        enabled: intervalDraft[category.key].enabled !== false,
      })
    }
    toast('Target servis dan health bar akan dihitung ulang dengan aturan baru.', {
      tone: 'success',
      title: 'Interval disimpan',
    })
  }

  function handleExportJson() {
    const filename = exportJsonBackup(state)
    toast(`Backup lengkap (termasuk foto) diunduh sebagai ${filename}.`, {
      tone: 'success',
      title: 'Backup JSON siap',
    })
  }

  function handleExportCsv() {
    const filename = exportLogsCsv(state)
    toast(`Logbook CSV diunduh sebagai ${filename}. Foto tidak ikut di CSV.`, {
      tone: 'success',
      title: 'CSV siap',
    })
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    setImporting(true)
    try {
      const imported = await parseBackupFile(file)
      setPendingImport({ state: imported, fileName: file.name })
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Backup gagal dibaca.', {
        tone: 'error',
        title: 'Import gagal',
      })
    } finally {
      setImporting(false)
    }
  }

  async function handleInstall() {
    setInstalling(true)
    try {
      const outcome = await promptInstall()
      if (outcome === 'accepted') {
        toast('MotoLog AI dipasang di layar utama. Data lokal tetap sama.', {
          tone: 'success',
          title: 'Aplikasi terpasang',
        })
      } else if (outcome === 'dismissed') {
        toast('Pemasangan dibatalkan. Bisa dicoba lagi dari setelan.', { tone: 'info' })
      } else {
        toast('Gunakan menu browser → “Install app” atau “Tambahkan ke layar utama”.', {
          tone: 'info',
          title: 'Install manual',
        })
      }
    } finally {
      setInstalling(false)
    }
  }

  const mobileInstallHint = /iphone|ipad|ipod/i.test(navigator.userAgent)

  return (
    <div className="space-y-6 pb-2">
      <PageHeader
        eyebrow="Control room"
        title="Setelan"
        description="OCR AI, aturan interval, backup, dan status aplikasi."
      />

      <section className="space-y-3">
        <SectionHeader
          title="AI Vision OCR"
          meta={configured ? 'aktif' : 'demo'}
          icon={<Sparkles className="h-3.5 w-3.5 text-cyan-400/80" />}
        />
        <div className="relative overflow-hidden rounded-3xl border border-cyan-400/12 bg-[#0A1622]/80 p-4">
          <div className="field-grid pointer-events-none absolute inset-0 opacity-30" />
          <div className="relative">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-500/10 text-cyan-300">
                <Camera className="h-5 w-5" strokeWidth={1.9} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[12.5px] font-bold text-white">Scan spedometer</p>
                  <span
                    className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.08em] ${
                      configured
                        ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300'
                        : 'border-amber-400/20 bg-amber-500/10 text-amber-300'
                    }`}
                  >
                    <span
                      className={`h-1 w-1 rounded-full ${
                        configured ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                    />
                    {ocrModeLabel(state.settings)}
                  </span>
                </div>
                <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                  Gemini 2.5 Flash memisahkan total ODO dari trip A/B dan jam pada layar negatif
                  Vario 160.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              <div>
                <label htmlFor="gemini-key" className="field-label">
                  Gemini API key
                </label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                  <input
                    id="gemini-key"
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    placeholder="AIza…"
                    className="field mono pr-11 pl-9 text-[11px]"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((value) => !value)}
                    className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/5 hover:text-slate-200"
                    aria-label={showKey ? 'Sembunyikan API key' : 'Tampilkan API key'}
                  >
                    {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <p className="mt-1.5 flex items-start gap-1.5 text-[9px] leading-relaxed text-slate-500">
                  <Lock className="mt-0.5 h-2.5 w-2.5 shrink-0" />
                  Hanya tersimpan di IndexedDB perangkat. Request dikirim langsung ke Google
                  Generative Language API.
                </p>
              </div>

              <div>
                <label htmlFor="ocr-model" className="field-label">
                  Model OCR
                </label>
                <select
                  id="ocr-model"
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  className="field text-[11px]"
                >
                  {!MODEL_OPTIONS.some((option) => option.value === model) && (
                    <option value={model}>{model} · custom</option>
                  )}
                  {MODEL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-[1fr_auto] gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={saveSettings}
                  disabled={!settingsDirty}
                  className="btn-primary h-11 rounded-xl text-[11px]"
                >
                  <Save className="h-3.5 w-3.5" />
                  Simpan setelan AI
                </button>
                {state.settings.geminiApiKey && (
                  <button
                    type="button"
                    onClick={clearApiKey}
                    className="flex h-11 items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-[10px] font-semibold text-slate-400 transition hover:border-red-400/25 hover:text-red-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Hapus
                  </button>
                )}
              </div>

              {!configured && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-400/15 bg-amber-500/[0.045] px-3 py-2.5">
                  <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                  <p className="text-[9.5px] leading-relaxed text-amber-200/80">
                    Tanpa API key, scan memakai angka simulasi dari odometer terakhir. Selalu
                    koreksi manual sebelum simpan.
                  </p>
                </div>
              )}
              {proxyActive && (
                <p className="flex items-center gap-1.5 text-[9px] text-cyan-300/70">
                  <ShieldCheck className="h-3 w-3" />
                  Proxy OCR aktif melalui environment build. API key browser tidak diperlukan.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader
          title="Aturan Interval"
          meta={`${CATEGORY_LIST.length} komponen`}
          actionLabel="Default"
          onAction={() => setConfirmResetIntervals(true)}
          icon={<RotateCcw className="h-3.5 w-3.5 text-blue-400/80" />}
        />
        <div className="overflow-hidden rounded-2xl border border-white/[0.065] bg-[#0B121F]/70">
          {CATEGORY_LIST.map((category, index) => {
            const Icon = category.icon
            const draft = intervalDraft[category.key]
            const preview = getComponentHealth(previewState, category.key)
            const active = draft.enabled !== false
            const dirty =
              draft.km !== state.intervals[category.key].km ||
              draft.days !== state.intervals[category.key].days ||
              active !== (state.intervals[category.key].enabled !== false)
            return (
              <div
                key={category.key}
                className={`p-3.5 ${index > 0 ? 'border-t border-white/[0.055]' : ''} ${
                  dirty ? 'bg-blue-500/[0.025]' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border"
                      style={{
                        borderColor: `${category.accent}30`,
                        backgroundColor: `${category.accent}10`,
                        color: category.accent,
                      }}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-[10.5px] font-bold text-slate-100">
                        {category.label}
                        {dirty && (
                          <span className="h-1 w-1 shrink-0 rounded-full bg-blue-400 shadow-[0_0_6px_rgba(59,130,246,0.8)]" />
                        )}
                      </p>
                      <p className="mt-0.5 truncate text-[9px] text-slate-500">
                        {preview.lastKM !== null
                          ? `Terakhir ${formatNumber(preview.lastKM)} KM · ${formatDateShort(
                              preview.lastDate ?? '',
                            )}`
                          : 'Belum ada riwayat'}
                      </p>
                    </div>
                  </div>
                  <span className="mono shrink-0 text-[8.5px] uppercase tracking-[0.08em] text-slate-500">
                    {active ? `${formatNumber(preview.targetKM)} KM` : 'Tanpa jadwal'}
                  </span>
                </div>

                <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl border border-white/[0.055] bg-white/[0.02] px-2.5">
                  <div className="min-w-0 py-1">
                    <p className="text-[9.5px] font-semibold text-slate-300">Jadwal pengingat</p>
                    <p className="truncate text-[8.5px] text-slate-500">
                      {active
                        ? `${formatNumber(draft.km)} KM / ${draft.days} hari`
                        : 'Tidak memilih — tidak dihitung'}
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={active}
                    onChange={(checked) => updateRule(category.key, { enabled: checked })}
                    label={`Jadwal ${category.label}`}
                  />
                </div>

                <div
                  className={`mt-2.5 grid grid-cols-2 gap-2 transition-opacity ${
                    active ? '' : 'pointer-events-none opacity-40'
                  }`}
                >
                  <div>
                    <label
                      htmlFor={`interval-km-${category.key}`}
                      className="mb-1 block text-[8.5px] font-semibold uppercase tracking-[0.1em] text-slate-500"
                    >
                      Interval KM
                    </label>
                    <div className="relative">
                      <input
                        id={`interval-km-${category.key}`}
                        type="text"
                        inputMode="numeric"
                        disabled={!active}
                        value={draft.km}
                        onChange={(event) => {
                          const digits = event.target.value.replace(/\D/g, '').slice(0, 6)
                          updateRule(category.key, { km: Number(digits || 0) })
                        }}
                        className="field mono min-h-[44px] py-2 pr-8 text-[11px] disabled:opacity-60"
                      />
                      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[8.5px] font-semibold text-slate-500">
                        KM
                      </span>
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor={`interval-days-${category.key}`}
                      className="mb-1 block text-[8.5px] font-semibold uppercase tracking-[0.1em] text-slate-500"
                    >
                      Interval hari
                    </label>
                    <div className="relative">
                      <input
                        id={`interval-days-${category.key}`}
                        type="text"
                        inputMode="numeric"
                        disabled={!active}
                        value={draft.days}
                        onChange={(event) => {
                          const digits = event.target.value.replace(/\D/g, '').slice(0, 4)
                          updateRule(category.key, { days: Number(digits || 0) })
                        }}
                        className="field mono min-h-[44px] py-2 pr-9 text-[11px] disabled:opacity-60"
                      />
                      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[8.5px] font-semibold text-slate-500">
                        hari
                      </span>
                    </div>
                  </div>
                </div>
                <p className="mt-1.5 text-[8.5px] text-slate-500">
                  {active ? (
                    <>
                      Perkiraan jatuh tempo berikutnya {formatDateShort(
                        preview.lastDate
                          ? addDays(preview.lastDate, draft.days)
                          : addDays(todayInput(), draft.days),
                      )}
                      {preview.lastKM === null ? ' dari hari ini' : ' dari servis terakhir'}
                    </>
                  ) : (
                    'Pengingat dinonaktifkan — komponen ini dilewati dari health bar dan banner AI.'
                  )}
                </p>
              </div>
            )
          })}
        </div>
        <div className="flex items-center justify-between gap-3 px-0.5">
          <p
            className={`text-[9px] leading-relaxed ${
              intervalDirty ? 'text-blue-300/80' : 'text-slate-600'
            }`}
          >
            {intervalDirty
              ? 'Ada perubahan belum disimpan.'
              : 'Aturan dipakai untuk semua health bar.'}
          </p>
          <button
            type="button"
            onClick={saveIntervals}
            disabled={!intervalDirty}
            className={`flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl border px-3.5 text-[10px] font-semibold transition ${
              intervalDirty
                ? 'border-blue-400/30 bg-blue-500/15 text-blue-200'
                : 'border-white/[0.06] bg-white/[0.02] text-slate-600'
            }`}
          >
            <Check className="h-3.5 w-3.5" />
            Simpan aturan
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader
          title="Data & Backup"
          meta={backupSizeLabel(state)}
          icon={<Database className="h-3.5 w-3.5 text-emerald-400/80" />}
        />
        <div className="rounded-2xl border border-white/[0.065] bg-[#0B121F]/70 p-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white/[0.025] px-2.5 py-2">
              <p className="text-[8.5px] uppercase tracking-[0.1em] text-slate-500">Log</p>
              <p className="mono mt-0.5 text-[13px] font-semibold text-slate-100">
                {state.logs.length}
              </p>
            </div>
            <div className="rounded-xl bg-white/[0.025] px-2.5 py-2">
              <p className="text-[8.5px] uppercase tracking-[0.1em] text-slate-500">Foto</p>
              <p className="mono mt-0.5 text-[13px] font-semibold text-slate-100">{photoCount}</p>
            </div>
            <div className="rounded-xl bg-white/[0.025] px-2.5 py-2">
              <p className="text-[8.5px] uppercase tracking-[0.1em] text-slate-500">Browser</p>
              <p className="mono mt-0.5 text-[11px] font-semibold text-slate-100">
                {storageBytes > 0 ? formatBytes(storageBytes) : '—'}
              </p>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <button
              type="button"
              onClick={handleExportJson}
              className="flex min-h-[48px] w-full items-center gap-3 rounded-xl border border-emerald-400/18 bg-emerald-500/[0.055] px-3 text-left transition hover:bg-emerald-500/[0.09] active:scale-[0.995]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <FileJson className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-semibold text-slate-100">
                  Export backup JSON
                </span>
                <span className="mt-0.5 block text-[9px] text-slate-500">
                  Semua log, foto, setup, dan setelan
                </span>
              </span>
              <Download className="h-3.5 w-3.5 shrink-0 text-emerald-400/70" />
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="flex min-h-[48px] w-full items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 text-left transition hover:bg-white/[0.045] active:scale-[0.995]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                <FileSpreadsheet className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-semibold text-slate-100">
                  Export logbook CSV
                </span>
                <span className="mt-0.5 block text-[9px] text-slate-500">
                  Tabel biaya & servis untuk Excel
                </span>
              </span>
              <Download className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="flex min-h-[48px] w-full items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 text-left transition hover:bg-white/[0.045] disabled:opacity-50 active:scale-[0.995]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                {importing ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-semibold text-slate-100">
                  {importing ? 'Membaca backup…' : 'Import backup JSON'}
                </span>
                <span className="mt-0.5 block text-[9px] text-slate-500">
                  Ganti data lokal setelah konfirmasi
                </span>
              </span>
              <Download className="h-3.5 w-3.5 shrink-0 rotate-180 text-slate-500" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImportFile}
            />
          </div>

          <div className="mt-3 flex items-start gap-2 border-t border-white/[0.055] pt-2.5">
            <HardDrive className="mt-0.5 h-3 w-3 shrink-0 text-slate-600" />
            <p className="text-[9px] leading-relaxed text-slate-500">
              Data MotoLog {backupSizeLabel(state)}. Foto dikompres WebP dan tersimpan di
              IndexedDB. Backup disarankan sebelum mengganti perangkat.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader
          title="Aplikasi & Offline"
          meta="PWA"
          icon={<Smartphone className="h-3.5 w-3.5 text-cyan-400/80" />}
        />
        <div className="rounded-2xl border border-white/[0.065] bg-[#0B121F]/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
                  online
                    ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-400'
                    : 'border-amber-400/20 bg-amber-500/10 text-amber-400'
                }`}
              >
                {online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              </span>
              <div>
                <p className="text-[10px] font-semibold text-slate-100">
                  {online ? 'Terhubung' : 'Offline'}
                </p>
                <p className="mt-0.5 text-[9px] text-slate-500">
                  {online
                    ? 'Data tetap lokal. OCR AI butuh koneksi.'
                    : 'Logbook tetap bisa dibuka dan diedit.'}
                </p>
              </div>
            </div>
            <span
              className={`mono shrink-0 rounded-full border px-2 py-1 text-[8.5px] uppercase tracking-[0.1em] ${
                online
                  ? 'border-emerald-400/15 text-emerald-300/80'
                  : 'border-amber-400/15 text-amber-300/80'
              }`}
            >
              {online ? 'online' : 'offline'}
            </span>
          </div>

          <div className="mt-3 border-t border-white/[0.055] pt-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/18 bg-cyan-500/[0.07] text-cyan-300">
                  <Smartphone className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[10px] font-semibold text-slate-100">
                    {installed ? 'MotoLog AI terpasang' : 'Pasang sebagai aplikasi'}
                  </p>
                  <p className="mt-0.5 text-[9px] text-slate-500">
                    {installed
                      ? 'Berjalan dalam mode standalone.'
                      : mobileInstallHint
                        ? 'iPhone: Share → Tambahkan ke Layar Utama.'
                        : 'Akses cepat dari layar utama, tanpa address bar.'}
                  </p>
                </div>
              </div>
              {canInstall && !installed ? (
                <button
                  type="button"
                  onClick={() => void handleInstall()}
                  disabled={installing}
                  className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl border border-cyan-300/25 bg-cyan-500/12 px-3 text-[9.5px] font-semibold text-cyan-200 transition hover:bg-cyan-500/20 disabled:opacity-50"
                >
                  {installing ? (
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Install
                </button>
              ) : (
                <span
                  className={`shrink-0 rounded-full border px-2 py-1 text-[8.5px] font-bold uppercase tracking-[0.08em] ${
                    installed
                      ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300'
                      : 'border-white/[0.07] bg-white/[0.03] text-slate-500'
                  }`}
                >
                  {installed ? 'Installed' : 'Manual'}
                </span>
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/[0.055] pt-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400/70" />
              <p className="text-[9px] text-slate-500">Versi 1.0.0 · local-first · tanpa akun</p>
            </div>
            <span className="mono text-[8.5px] uppercase tracking-[0.1em] text-slate-600">
              MotoLog AI
            </span>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader
          title="Zona Reset"
          meta="hati-hati"
          icon={<TriangleAlert className="h-3.5 w-3.5 text-red-400/80" />}
        />
        <div className="rounded-2xl border border-red-400/12 bg-red-500/[0.035] p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-400/20 bg-red-500/10 text-red-400">
              <RotateCcw className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold text-slate-100">Reset ke data demo</p>
              <p className="mt-1 text-[9px] leading-relaxed text-slate-500">
                Menghapus seluruh data lokal dan memuat contoh garasi Vario 160. Export backup
                dulu jika diperlukan.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-red-400/20 bg-red-500/[0.075] text-[10px] font-semibold text-red-300 transition hover:bg-red-500/[0.12] active:scale-[0.995]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset semua data
          </button>
        </div>
      </section>

      <div className="flex items-center justify-center gap-2 pt-1 pb-1">
        <span className="h-px w-8 bg-gradient-to-r from-transparent to-slate-700/70" />
        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-600">
          Dibuat untuk rider harian
        </p>
        <span className="h-px w-8 bg-gradient-to-l from-transparent to-slate-700/70" />
      </div>

      <div className="space-y-1.5 rounded-2xl border border-white/[0.05] bg-white/[0.018] p-3">
        <p className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-400">
          <Info className="h-3 w-3 text-blue-400/70" />
          Catatan keamanan
        </p>
        <p className="text-[8.5px] leading-relaxed text-slate-600">
          API key Gemini di browser cocok untuk pemakaian pribadi. Untuk hosting publik atau
          banyak pengguna, gunakan proxy server melalui VITE_GEMINI_PROXY_URL agar key tidak
          terekspos di bundle.
        </p>
        <p className="flex items-center gap-1.5 pt-0.5 text-[8.5px] text-slate-600">
          <ShieldCheck className="h-3 w-3 text-emerald-500/60" />
          Data terakhir diubah {formatRelativeToNow(state.odometer.updatedAt)}.
        </p>
      </div>

      <ConfirmDialog
        open={confirmResetIntervals}
        title="Kembalikan interval default?"
        description="Semua aturan interval KM dan hari akan kembali ke standar MotoLog. Log dan setup tidak berubah."
        confirmLabel="Pakai default"
        tone="default"
        onConfirm={() => {
          actions.resetIntervals()
          setIntervalDraft(createDefaultIntervals())
          toast('Aturan interval dikembalikan ke default.', { tone: 'success' })
        }}
        onClose={() => setConfirmResetIntervals(false)}
      />

      <ConfirmDialog
        open={pendingImport !== null}
        title="Import backup ini?"
        description={
          pendingImport
            ? `${pendingImport.fileName} berisi ${pendingImport.state.logs.length} log, ${pendingImport.state.odometerUpdates.length} update KM, dan ${pendingImport.state.profile.model}. Semua data lokal saat ini akan diganti.`
            : ''
        }
        confirmLabel="Import & ganti"
        tone="default"
        onConfirm={() => {
          if (!pendingImport) return
          actions.importState(pendingImport.state)
          setPendingImport(null)
          toast(
            `${pendingImport.state.logs.length} log dipulihkan dari ${pendingImport.fileName}.`,
            { tone: 'success', title: 'Backup dipulihkan' },
          )
        }}
        onClose={() => setPendingImport(null)}
      />

      <ConfirmDialog
        open={confirmReset}
        title="Reset ke data demo?"
        description="Seluruh log, foto, setup, dan setelan di perangkat ini akan dihapus lalu diganti contoh garasi Vario 160. Tindakan ini tidak bisa dibatalkan tanpa backup."
        confirmLabel="Reset & muat demo"
        onConfirm={() => {
          void actions.resetAll().then(() => {
            toast('Data lokal direset. Garasi demo Vario 160 dimuat.', {
              tone: 'success',
              title: 'Reset selesai',
            })
          })
        }}
        onClose={() => setConfirmReset(false)}
      />
    </div>
  )
}
