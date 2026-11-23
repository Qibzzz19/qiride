import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  ImagePlus,
  Info,
  LoaderCircle,
  Mic,
  PencilLine,
  Plus,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  ScanLine,
  ScanText,
  ShieldCheck,
  Sparkles,
  Tag,
  TriangleAlert,
  Wrench,
  X,
  Zap,
} from 'lucide-react'
import type {
  AddSheetRequest,
  CategoryKey,
  GarageState,
  LogEntry,
  Photo,
  PresetId,
  SetupFieldKey,
  SetupState,
} from '../types'
import {
  CATEGORIES,
  CVT_QUICK_TAGS,
  LOG_CATEGORIES,
  QUICK_PRESETS,
} from '../data/categories'
import { Sheet } from './Sheet'
import { ToggleSwitch } from './ToggleSwitch'
import { useToast } from './Toast'
import { useGarage } from '../hooks/useGarage'
import { compressPhoto, formatBytes } from '../lib/image'
import { extractOdometer } from '../lib/ocr'
import type { OcrResult } from '../lib/ocr'
import {
  cancelListening,
  listenOnce,
  parseVoiceIntent,
  speechSupported,
  voiceProviderLabel,
} from '../lib/voice'
import type { VoiceIntent } from '../lib/voice'
import {
  addDays,
  formatDateShort,
  formatDateLong,
  nowIso,
  todayInput,
} from '../lib/date'
import {
  formatCurrency,
  formatNumber,
  uid,
} from '../lib/format'
import { getComponentHealth } from '../lib/health'

type Mode = 'log' | 'km'
type ScanState = 'idle' | 'scanning' | 'success' | 'error'
/** Override interval per komponen di sheet: angka target + status aktif/tanpa jadwal. */
type IntervalOverride = { km: number; enabled: boolean }

interface AddLogSheetProps {
  open: boolean
  request: AddSheetRequest | null
  state: GarageState
  onClose: () => void
  actions: ReturnType<typeof useGarage>['actions']
}

const SETUP_FIELD_META: Record<SetupFieldKey, { label: string; placeholder: string }> = {
  engineOil: { label: 'Oli mesin aktif', placeholder: 'cth. Motul 5100 10W-40' },
  gearOil: { label: 'Oli gardan aktif', placeholder: 'cth. Yamalube 80W-90' },
  coolant: { label: 'Coolant aktif', placeholder: 'cth. Yamaha Coolant 50/50' },
  cvtPulley: { label: 'Pulley', placeholder: 'cth. Kawahara 14°' },
  cvtRoller: { label: 'Roller', placeholder: 'cth. 10 g · 6 pcs' },
  cvtPerCvt: { label: 'Per CVT', placeholder: 'cth. 1.500 RPM' },
  cvtPerSentri: { label: 'Per sentri', placeholder: 'cth. 1.200 RPM' },
  cvtBoss: { label: 'Boss / washer', placeholder: 'cth. Boss STD + 1 washer' },
  vBelt: { label: 'V-Belt aktif', placeholder: 'cth. Yamaha OEM' },
  frontTire: { label: 'Ban depan', placeholder: 'cth. IRC Fasti 80/90-14' },
  rearTire: { label: 'Ban belakang', placeholder: 'cth. IRC Fasti 90/90-14' },
  brakePads: { label: 'Kampas rem aktif', placeholder: 'cth. Aspira Carbon' },
}

const RELEVANT_SETUP_FIELDS: Partial<Record<CategoryKey, SetupFieldKey[]>> = {
  engineOil: ['engineOil'],
  gearOil: ['gearOil'],
  coolant: ['coolant'],
  cvt: ['cvtPulley', 'cvtRoller', 'cvtPerCvt', 'cvtPerSentri', 'cvtBoss'],
  vBelt: ['vBelt'],
  brakePads: ['brakePads'],
  tires: ['frontTire', 'rearTire'],
}

const SCAN_STEPS = [
  'Mendeteksi panel instrumen…',
  'Memisahkan ODO dari trip & jam…',
  'Mengekstrak angka odometer…',
]

function lastLogFor(state: GarageState, category: CategoryKey): LogEntry | null {
  const matches = state.logs
    .filter((log) => log.categories.includes(category))
    .sort((a, b) => b.date.localeCompare(a.date) || b.odometer - a.odometer)
  return matches[0] ?? null
}

function prefillSpec(state: GarageState, categories: CategoryKey[]): string {
  if (categories.length !== 1) return ''
  const key = categories[0]
  const latest = lastLogFor(state, key)
  if (latest?.spec) return latest.spec
  if (key === 'engineOil') return state.setup.engineOil
  if (key === 'gearOil') return state.setup.gearOil
  if (key === 'coolant') return state.setup.coolant
  if (key === 'vBelt') return state.setup.vBelt
  if (key === 'brakePads') return state.setup.brakePads
  return ''
}

function ScanOverlay({ withImage = false }: { withImage?: boolean }) {
  const [step, setStep] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => {
      setStep((value) => Math.min(SCAN_STEPS.length - 1, value + 1))
    }, 850)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="absolute inset-0 z-10 overflow-hidden bg-[#020915]/80">
      {withImage && <div className="absolute inset-0 bg-gradient-to-t from-[#020915] via-transparent to-[#020915]/45" />}
      <div className="field-grid absolute inset-0 opacity-50" />
      <div className="scan-line" style={{ position: 'absolute' }} />
      <div className="scan-bracket left-3 top-3 border-l-2 border-t-2" />
      <div className="scan-bracket right-3 top-3 border-r-2 border-t-2" />
      <div className="scan-bracket bottom-3 left-3 border-b-2 border-l-2" />
      <div className="scan-bracket bottom-3 right-3 border-b-2 border-r-2" />
      <div className="absolute inset-x-4 bottom-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-6 w-6 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-400/10 text-cyan-300">
              <ScanLine className="h-3 w-3 animate-pulse" />
            </span>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-cyan-300">
                AI Vision scanning
              </p>
              <motion.p
                key={step}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-0.5 text-[9px] text-slate-400"
              >
                {SCAN_STEPS[step]}
              </motion.p>
            </div>
          </div>
          <span className="mono text-[8px] tracking-[0.12em] text-cyan-300/60">
            GEMINI 2.5
          </span>
        </div>
      </div>
    </div>
  )
}

function FormSection({
  step,
  title,
  hint,
  children,
  icon,
  className = '',
}: {
  step: string
  title: string
  hint?: string
  children: ReactNode
  icon?: ReactNode
  className?: string
}) {
  return (
    <section className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2.5">
        <span className="mono flex h-6 w-6 items-center justify-center rounded-lg border border-blue-400/15 bg-blue-500/[0.07] text-[9px] font-semibold text-blue-300">
          {step}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1.5 text-[12.5px] font-bold tracking-[-0.01em] text-slate-100">
            {icon}
            {title}
          </h3>
          {hint && <p className="mt-0.5 text-[10px] leading-snug text-slate-500">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

export function AddLogSheet({ open, request, state, onClose, actions }: AddLogSheetProps) {
  const toast = useToast()
  const [mode, setMode] = useState<Mode>('log')
  const [editLog, setEditLog] = useState<LogEntry | null>(null)
  const [categories, setCategories] = useState<CategoryKey[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [odometer, setOdometer] = useState('')
  /** true = servis tanpa KM: pakai odometer aktif sebagai perkiraan, bukan angka wajib. */
  const [useEstimatedKm, setUseEstimatedKm] = useState(false)
  const [date, setDate] = useState(todayInput())
  const [photos, setPhotos] = useState<Photo[]>([])
  const [note, setNote] = useState('')
  const [cost, setCost] = useState('')
  const [spec, setSpec] = useState('')
  const [intervalOverrides, setIntervalOverrides] = useState<
    Partial<Record<CategoryKey, IntervalOverride>>
  >({})
  const [setupOn, setSetupOn] = useState(false)
  const [setupFields, setSetupFields] = useState<Partial<Record<SetupFieldKey, string>>>({})
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [scanProvider, setScanProvider] = useState<'gemini' | 'demo' | null>(null)
  const [scanConfidence, setScanConfidence] = useState<number | null>(null)
  const [scanWarning, setScanWarning] = useState<string | null>(null)
  const [ocrUsed, setOcrUsed] = useState(false)
  const [isAddingDocs, setIsAddingDocs] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'parsing'>('idle')
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [voiceResult, setVoiceResult] = useState<VoiceIntent | null>(null)

  const speedoCameraRef = useRef<HTMLInputElement>(null)
  const speedoGalleryRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)
  const scanSequence = useRef(0)
  const voiceSequence = useRef(0)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    if (!open) {
      scanSequence.current += 1
      voiceSequence.current += 1
      cancelListening()
      setVoiceState('idle')
      setVoiceTranscript('')
      setVoiceError(null)
      setVoiceResult(null)
      return
    }
    if (!request) return

    const currentState = stateRef.current
    const editing = request.editLog ?? null
    const initialCategories = editing
      ? editing.categories
      : request.category
        ? [request.category]
        : request.preset
          ? (QUICK_PRESETS.find((preset) => preset.id === request.preset)?.categories ?? [])
          : []
    const nextMode: Mode = request.preset === 'kmOnly' ? 'km' : 'log'

    setMode(nextMode)
    setEditLog(editing)
    setCategories(editing ? editing.categories : initialCategories)
    setTags(editing ? editing.tags : [])
    setOdometer(String(editing ? editing.odometer : currentState.odometer.current))
    setUseEstimatedKm(editing?.odometerSource === 'estimated')
    setDate(editing ? editing.date : todayInput())
    setPhotos(editing ? editing.photos : [])
    setNote(editing ? editing.note : '')
    setCost(editing && editing.cost > 0 ? String(editing.cost) : '')
    setSpec(editing ? editing.spec : nextMode === 'log' ? prefillSpec(currentState, initialCategories) : '')
    setIntervalOverrides({})
    setSetupOn(editing ? editing.setupUpdated : false)
    setSetupFields({})
    setScanState('idle')
    setScanProvider(editing?.ocrProvider ?? null)
    setScanConfidence(null)
    setScanWarning(null)
    setOcrUsed(editing?.odometerSource === 'ocr')
    setIsAddingDocs(false)
    setFormError(null)
    setSaving(false)
    setVoiceState('idle')
    setVoiceTranscript('')
    setVoiceError(null)
    setVoiceResult(null)
    scanSequence.current += 1

    if (request.voice && !editing) {
      const sequence = ++voiceSequence.current
      window.setTimeout(() => {
        if (sequence === voiceSequence.current) void startVoiceCapture(sequence)
      }, 350)
    } else {
      voiceSequence.current += 1
    }
  }, [open, request])

  const odometerNumber = Number(odometer || 0)
  /** Angka yang benar-benar disimpan: perkiraan memakai KM aktif, bukan input kosong. */
  const savedOdometer = useEstimatedKm ? state.odometer.current : odometerNumber
  const formattedOdo = useEstimatedKm ? formatNumber(state.odometer.current) : odometer ? formatNumber(odometerNumber) : ''
  const today = todayInput()
  const isQuick = mode === 'km'
  const activePreset: PresetId | null = isQuick
    ? 'kmOnly'
    : (QUICK_PRESETS.find(
        (preset) =>
          preset.id !== 'kmOnly' &&
          preset.categories.length === categories.length &&
          preset.categories.every((category) => categories.includes(category)),
      )?.id ?? null)

  const docs = photos.filter((photo) => photo.kind === 'documentation')
  const speedoPhoto = photos.find((photo) => photo.kind === 'odometer') ?? null
  const scanning = scanState === 'scanning'
  const voiceBusy = voiceState !== 'idle'
  const busy = scanning || isAddingDocs || saving || voiceBusy
  const quickTooLow = isQuick && odometerNumber > 0 && odometerNumber < state.odometer.current
  const missingCategories = !isQuick && categories.length === 0
  const missingOdometer = !isQuick && !useEstimatedKm && odometerNumber <= 0
  const activeCategories = isQuick ? [] : categories
  const setupKeys = [
    ...new Set(activeCategories.flatMap((category) => RELEVANT_SETUP_FIELDS[category] ?? [])),
  ]

  const targetRows = categories.map((category) => {
    const def = CATEGORIES[category]
    const health = getComponentHealth(state, category)
    const rule = state.intervals[category]
    const override = intervalOverrides[category]
    const enabled = override ? override.enabled : rule.enabled !== false
    const interval = override?.km ?? rule.km
    const targetKM = enabled
      ? Math.max(0, (odometerNumber || state.odometer.current) + interval)
      : 0
    return {
      def,
      health,
      interval,
      enabled,
      targetKM,
      targetDate: enabled
        ? addDays(date || today, rule.days)
        : date || today,
    }
  })

  const setupFieldColumns = setupKeys.length > 2 && activeCategories.includes('cvt')

  function resetScanFeedback() {
    setScanWarning(null)
    setScanProvider(null)
    setScanConfidence(null)
    setScanState('idle')
    setOcrUsed(false)
    setFormError(null)
  }

  function applyPreset(presetId: PresetId) {
    const preset = QUICK_PRESETS.find((item) => item.id === presetId)
    if (!preset) return
    setFormError(null)
    setTags([])
    setIntervalOverrides({})
    setSetupOn(false)
    setSetupFields({})
    if (preset.id === 'kmOnly') {
      setMode('km')
      setCategories([])
      setSpec('')
      return
    }
    setMode('log')
    setEditLog(null)
    setCategories(preset.categories)
    setSpec(prefillSpec(state, preset.categories))
  }

  function switchToFullLog() {
    setMode('log')
    setFormError(null)
  }

  function toggleCategory(category: CategoryKey) {
    const exists = categories.includes(category)
    const next = exists
      ? categories.filter((item) => item !== category)
      : [...categories, category]
    setCategories(next)
    setFormError(null)
    if (!exists) {
      setIntervalOverrides((current) => ({
        ...current,
        [category]: current[category] ?? {
          km: state.intervals[category].km,
          enabled: state.intervals[category].enabled !== false,
        },
      }))
      if (!spec) setSpec(prefillSpec(state, next))
    }
    if (!next.includes('cvt')) setTags([])
    if (next.length === 0) setSetupOn(false)
  }

  function toggleTag(tag: string) {
    setTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    )
  }

  function setIntervalFor(category: CategoryKey, value: number) {
    // Memilih angka target = mengaktifkan kembali jadwal komponen ini.
    setIntervalOverrides((current) => ({ ...current, [category]: { km: value, enabled: true } }))
  }

  function setIntervalDisabled(category: CategoryKey) {
    // "Tidak memilih" = tanpa jadwal: pengingat komponen dinonaktifkan.
    setIntervalOverrides((current) => ({
      ...current,
      [category]: { km: current[category]?.km ?? state.intervals[category].km, enabled: false },
    }))
  }

  function nudgeOdometer(amount: number) {
    const base = odometerNumber || state.odometer.current
    setOdometer(String(Math.max(0, base + amount)))
    setFormError(null)
  }

  function useCurrentOdometer() {
    setOdometer(String(state.odometer.current))
    setOcrUsed(false)
    setFormError(null)
  }

  async function startVoiceCapture(sequence?: number) {
    const seq = sequence ?? ++voiceSequence.current
    if (voiceState !== 'idle') return
    if (!speechSupported()) {
      const message =
        'Input suara belum didukung browser ini. Gunakan Chrome/Edge terbaru (Android/PWA didukung).'
      setVoiceError(message)
      toast(message, { tone: 'error', title: 'Voice input tidak tersedia' })
      return
    }
    setVoiceError(null)
    setVoiceTranscript('')
    setVoiceResult(null)
    setVoiceState('listening')
    try {
      const transcript = await listenOnce()
      if (seq !== voiceSequence.current) return
      if (!transcript) {
        setVoiceState('idle')
        setVoiceError('Tidak ada suara terdeteksi. Coba ucapkan lagi dengan jelas.')
        return
      }
      setVoiceTranscript(transcript)
      setVoiceState('parsing')
      const intent = await parseVoiceIntent(transcript, state.settings, {
        currentOdometer: state.odometer.current,
        today: todayInput(),
      })
      if (seq !== voiceSequence.current) return
      applyVoiceIntent(intent)
      setVoiceResult(intent)
      setVoiceState('idle')
      setVoiceTranscript('')
      const labels = intent.categories.map((key) => CATEGORIES[key].shortLabel).join(' + ')
      toast(
        labels
          ? `${labels}${intent.odometer ? ` · ${formatNumber(intent.odometer)} KM` : ''} — periksa form lalu simpan.`
          : 'Sudah diisi dari ucapanmu — periksa form lalu simpan.',
        { tone: 'ai', title: `Suara diproses · ${voiceProviderLabel(intent)}` },
      )
    } catch (error) {
      if (seq !== voiceSequence.current) return
      const message =
        error instanceof Error ? error.message : 'Gagal memproses suara. Coba lagi.'
      setVoiceState('idle')
      setVoiceError(message)
      toast(message, { tone: 'error', title: 'Voice input gagal' })
    }
  }

  function applyVoiceIntent(intent: VoiceIntent) {
    setFormError(null)
    if (intent.categories.length > 0) {
      setMode('log')
      setCategories(intent.categories)
      setIntervalOverrides((current) => {
        const next = { ...current }
        for (const key of intent.categories) {
          next[key] = next[key] ?? {
            km: state.intervals[key].km,
            enabled: state.intervals[key].enabled !== false,
          }
        }
        return next
      })
      if (!spec) setSpec(prefillSpec(state, intent.categories))
    }
    if (intent.odometer) setOdometer(String(intent.odometer))
    if (intent.note) setNote(intent.note)
    if (intent.tags.length > 0 && (intent.categories.includes('cvt') || tags.length === 0)) {
      setTags(intent.tags)
    }
    if (intent.cost) setCost(String(intent.cost))
    if (intent.date) setDate(intent.date)
  }

  function cancelVoiceCapture() {
    voiceSequence.current += 1
    cancelListening()
    setVoiceState('idle')
    setVoiceTranscript('')
    setVoiceError(null)
    toast('Perekaman suara dibatalkan.', { tone: 'info' })
  }

  async function handleSpeedometerFile(file: File) {
    const sequence = ++scanSequence.current
    setScanState('scanning')
    setScanWarning(null)
    setScanProvider(null)
    setScanConfidence(null)
    setFormError(null)

    try {
      const compressed = await compressPhoto(file)
      if (sequence !== scanSequence.current) return
      const photo: Photo = {
        id: uid('photo'),
        dataUrl: compressed.dataUrl,
        kind: 'odometer',
        createdAt: nowIso(),
      }
      setPhotos((current) => [
        photo,
        ...current.filter((item) => item.kind !== 'odometer'),
      ])

      const result: OcrResult = await extractOdometer(
        compressed.dataUrl,
        state.settings,
        state.odometer.current,
      )
      if (sequence !== scanSequence.current) return

      setOdometer(String(result.odometer))
      setOcrUsed(true)
      setScanProvider(result.provider)
      setScanConfidence(result.confidence)
      setScanWarning(result.warning ?? null)
      setScanState('success')
      toast(
        result.provider === 'gemini'
          ? `Odometer terbaca: ${formatNumber(result.odometer)} KM. Cek sebelum simpan.`
          : `Scan demo: ${formatNumber(result.odometer)} KM. Koreksi jika perlu.`,
        {
          tone: result.warning ? 'info' : 'ai',
          title: result.provider === 'gemini' ? 'OCR selesai' : 'Mode demo',
        },
      )
    } catch (error) {
      if (sequence !== scanSequence.current) return
      setScanState('error')
      const message =
        error instanceof Error ? error.message : 'Gagal memproses foto spedometer.'
      setFormError(message)
      toast(message, { tone: 'error', title: 'Scan gagal' })
    }
  }

  async function handleDocFiles(files: FileList | File[]) {
    const available = 6 - photos.filter((photo) => photo.kind === 'documentation').length
    if (available <= 0) {
      toast('Maksimal 6 foto dokumentasi per log.', { tone: 'info' })
      return
    }
    const selected = Array.from(files).slice(0, available)
    setIsAddingDocs(true)
    const added: Photo[] = []
    const failures: string[] = []
    for (const file of selected) {
      try {
        const compressed = await compressPhoto(file)
        added.push({
          id: uid('photo'),
          dataUrl: compressed.dataUrl,
          kind: 'documentation',
          createdAt: nowIso(),
        })
      } catch (error) {
        failures.push(error instanceof Error ? error.message : 'Satu foto gagal diproses.')
      }
    }
    if (added.length > 0) {
      setPhotos((current) => [...current, ...added])
      toast(`${added.length} foto dokumentasi ditambahkan & dikompres ke WebP.`, {
        tone: 'success',
      })
    }
    if (failures.length > 0) {
      toast(failures[0], { tone: 'error' })
    }
    setIsAddingDocs(false)
  }

  function removePhoto(id: string) {
    setPhotos((current) => current.filter((photo) => photo.id !== id))
  }

  function buildSetupPatch(): Partial<Omit<SetupState, 'updatedAt'>> | undefined {
    if (!setupOn || setupKeys.length === 0) return undefined
    const patch: Partial<Omit<SetupState, 'updatedAt'>> = {}
    for (const key of setupKeys) {
      patch[key] = (setupFields[key] ?? state.setup[key]).trim()
    }
    return patch
  }

  function handleSave() {
    setFormError(null)
    if (busy) return
    if (!Number.isFinite(savedOdometer) || savedOdometer <= 0) {
      setFormError(
        useEstimatedKm
          ? 'KM aktif belum tersedia. Isi odometer dulu atau matikan "Servis tanpa KM".'
          : 'Isi odometer lebih dari 0 KM.',
      )
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setFormError('Tanggal servis belum valid.')
      return
    }
    if (isQuick) {
      if (odometerNumber < state.odometer.current) {
        setFormError(
          `Odometer tidak boleh lebih rendah dari KM aktif (${formatNumber(state.odometer.current)} KM).`,
        )
        return
      }
      setSaving(true)
      const accepted = actions.updateOdometerQuick({
        km: odometerNumber,
        date,
        photo: speedoPhoto,
        provider: scanProvider,
      })
      if (!accepted) {
        setSaving(false)
        setFormError('Odometer gagal diperbarui. Coba beberapa KM lebih tinggi.')
        return
      }
      toast(
        `Odometer diperbarui ke ${formatNumber(odometerNumber)} KM. Semua health bar sudah dihitung ulang.`,
        { tone: 'success', title: 'Gas terus!' },
      )
      onClose()
      window.setTimeout(() => setSaving(false), 400)
      return
    }

    if (categories.length === 0) {
      setFormError('Pilih minimal satu kategori servis atau gunakan Update KM Saja.')
      return
    }

    setSaving(true)
    const intervalsToApply: Partial<Record<CategoryKey, { km?: number; enabled?: boolean }>> = {}
    for (const category of categories) {
      const override = intervalOverrides[category]
      if (!override) continue
      const current = state.intervals[category]
      const patch: { km?: number; enabled?: boolean } = {}
      if (override.enabled !== (current.enabled !== false)) patch.enabled = override.enabled
      if (override.enabled && override.km !== current.km) patch.km = override.km
      if (patch.enabled !== undefined || patch.km !== undefined) {
        intervalsToApply[category] = patch
      }
    }
    const timestamp = nowIso()
    const entry: LogEntry = {
      id: editLog?.id ?? uid('log'),
      date,
      odometer: savedOdometer,
      categories,
      tags,
      note: note.trim(),
      cost: Math.max(0, Number(cost || 0)),
      spec: spec.trim(),
      photos,
      setupUpdated: setupOn && setupKeys.length > 0,
      odometerSource: useEstimatedKm ? 'estimated' : ocrUsed ? 'ocr' : 'manual',
      ocrProvider: ocrUsed ? (scanProvider ?? editLog?.ocrProvider) : undefined,
      createdAt: editLog?.createdAt ?? timestamp,
      updatedAt: editLog ? timestamp : undefined,
    }
    actions.saveLog(entry, {
      editing: Boolean(editLog),
      intervals: intervalsToApply,
      setupPatch: buildSetupPatch(),
    })
    const labels = categories.map((category) => CATEGORIES[category].shortLabel).join(' + ')
    toast(
      useEstimatedKm
        ? `${labels} dicatat tanpa KM — memakai ±${formatNumber(savedOdometer)} KM (perkiraan).`
        : `${labels} di ${formatNumber(savedOdometer)} KM. Target servis berikutnya sudah dihitung.`,
      {
        tone: 'success',
        title: editLog ? 'Log diperbarui' : 'Servis tersimpan',
      },
    )
    onClose()
    window.setTimeout(() => setSaving(false), 400)
  }

  const title = editLog
    ? 'Edit Log Servis'
    : isQuick
      ? 'Update KM Cepat'
      : 'Catat Servis'
  const eyebrow = editLog
    ? 'Rapikan catatan'
    : isQuick
      ? 'Quick scan · anti-lazy'
      : 'Quick entry · satu tangan'
  const sourceLabel =
    scanProvider === 'gemini'
      ? 'Gemini 2.5 Flash'
      : scanProvider === 'demo'
        ? 'Demo AI'
        : ocrUsed
          ? 'AI OCR'
          : null

  const saveLabel = isQuick
    ? 'Update Odometer'
    : editLog
      ? 'Simpan Perubahan'
      : `Simpan Servis · ${useEstimatedKm ? '±' : ''}${formatNumber(savedOdometer)} KM`
  const saveDisabled =
    busy || savedOdometer <= 0 || quickTooLow || (!isQuick && categories.length === 0)

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      eyebrow={eyebrow}
      accent={isQuick ? 'cyan' : 'blue'}
      headerRight={
        <span className="hidden items-center gap-1.5 rounded-full border border-cyan-400/15 bg-cyan-500/[0.06] px-2.5 py-1.5 text-[8px] font-bold uppercase tracking-[0.12em] text-cyan-300 sm:flex">
          <Sparkles className="h-3 w-3" />
          AI assist
        </span>
      }
      footer={
        <div className="space-y-2.5">
          {formError && (
            <div className="flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-500/[0.08] px-3 py-2 text-[10px] leading-relaxed text-red-300">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          {!formError && missingCategories && (
            <p className="flex items-center justify-center gap-1.5 text-[9px] text-amber-400/90">
              <Info className="h-3 w-3" />
              Pilih minimal satu kategori di atas.
            </p>
          )}
          {!formError && missingOdometer && (
            <p className="flex items-center justify-center gap-1.5 text-center text-[9px] text-amber-400/90">
              <Info className="h-3 w-3 shrink-0" />
              Isi odometer, atau aktifkan "Servis tanpa KM".
            </p>
          )}
          {!formError && quickTooLow && (
            <p className="flex items-center justify-center gap-1.5 text-[9px] text-amber-400/90">
              <Info className="h-3 w-3" />
              KM baru tidak boleh di bawah odometer aktif ({formatNumber(state.odometer.current)} KM).
            </p>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saveDisabled}
            className="btn-primary h-[52px] w-full rounded-2xl"
          >
            {busy ? (
              <LoaderCircle className="h-4.5 w-4.5 animate-spin" />
            ) : isQuick ? (
              <Zap className="h-4.5 w-4.5" />
            ) : (
              <Check className="h-4.5 w-4.5" strokeWidth={2.5} />
            )}
            {scanning
              ? 'AI sedang membaca…'
              : isAddingDocs
                ? 'Mengompres foto…'
                : saving
                  ? 'Menyimpan…'
                  : saveLabel}
          </button>
          <p className="flex items-center justify-center gap-1.5 text-center text-[9px] text-slate-500">
            <ShieldCheck className="h-3 w-3" />
            Tersimpan lokal di perangkat · bisa diedit kapan saja
          </p>
        </div>
      }
    >
      <div className="space-y-6">
        {editLog && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-cyan-400/15 bg-cyan-500/[0.05] px-3 py-2.5">
            <PencilLine className="h-4 w-4 shrink-0 text-cyan-300" />
            <p className="text-[10px] leading-relaxed text-slate-400">
              Mengedit log <span className="font-semibold text-slate-200">{formatDateLong(editLog.date)}</span>.
              Perubahan KM akan menghitung ulang kesehatan semua komponen.
            </p>
          </div>
        )}

        {!editLog && (
          <section className="space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Catat dengan suara
              </p>
              <p className="text-[9px] text-slate-500">ucap → AI isi form</p>
            </div>

            {voiceState === 'idle' && !voiceResult && (
              <button
                type="button"
                onClick={() => void startVoiceCapture()}
                disabled={busy}
                className="flex min-h-[64px] w-full items-center gap-3 rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/[0.07] p-3 text-left transition-colors hover:border-fuchsia-400/35 hover:bg-fuchsia-500/[0.1] disabled:opacity-50"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-fuchsia-400/25 bg-fuchsia-500/10 text-fuchsia-300">
                  <Mic className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-bold text-slate-100">
                    Ucapkan, mis. “ganti oli di 30 ribu”
                  </span>
                  <span className="mt-0.5 block text-[9.5px] leading-relaxed text-slate-500">
                    Gemini membaca kategori, KM, biaya & catatan dari ucapanmu.
                  </span>
                </span>
              </button>
            )}

            {voiceState === 'listening' && (
              <div className="relative overflow-hidden rounded-2xl border border-fuchsia-400/25 bg-fuchsia-500/[0.07] p-3.5">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/15 text-fuchsia-200">
                    <span className="absolute inset-0 animate-ping rounded-xl bg-fuchsia-400/20" />
                    <Mic className="relative h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10.5px] font-bold text-fuchsia-200">
                      Mendengarkan… bicara sekarang
                    </p>
                    <p className="mt-0.5 text-[9.5px] text-slate-400">
                      “pasang ring washer di kilometer 30 ribu dan ganti oli”
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={cancelVoiceCapture}
                    aria-label="Batalkan perekaman suara"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-400 transition hover:text-slate-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 flex h-6 items-end gap-1">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((bar) => (
                    <motion.span
                      key={bar}
                      className="w-1.5 rounded-full bg-fuchsia-400/70"
                      animate={{ height: ['6px', '22px', '10px', '18px', '6px'] }}
                      transition={{
                        duration: 0.9,
                        repeat: Infinity,
                        delay: bar * 0.08,
                        ease: 'easeInOut',
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {voiceState === 'parsing' && (
              <div className="flex items-center gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-500/[0.06] p-3.5">
                <LoaderCircle className="h-4.5 w-4.5 shrink-0 animate-spin text-cyan-300" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10.5px] font-bold text-cyan-200">
                    AI meracik data dari ucapan…
                  </p>
                  <p className="mt-0.5 truncate text-[9.5px] text-slate-400">
                    “{voiceTranscript}”
                  </p>
                </div>
              </div>
            )}

            {voiceResult && !voiceBusy && (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.06] p-3">
                <div className="flex items-start gap-2.5">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-emerald-200">
                      Terisi otomatis dari suara · {voiceProviderLabel(voiceResult)}
                    </p>
                    <p className="mt-1 break-words text-[9.5px] leading-relaxed text-slate-400">
                      “{voiceResult.transcript}”
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setVoiceResult(null)
                      setVoiceError(null)
                    }}
                    aria-label="Hapus hasil voice"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-400 transition hover:text-slate-200"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => void startVoiceCapture()}
                  disabled={busy}
                  className="mt-2.5 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-fuchsia-400/25 bg-fuchsia-500/10 text-[10.5px] font-bold text-fuchsia-200 transition hover:bg-fuchsia-500/[0.16] disabled:opacity-50"
                >
                  <Mic className="h-3.5 w-3.5" />
                  Ucapkan lagi
                </button>
              </div>
            )}

            {voiceError && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-500/[0.07] px-3 py-2.5">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
                <p className="text-[10px] leading-relaxed text-amber-200/90">{voiceError}</p>
              </div>
            )}
          </section>
        )}

        {!editLog && (
          isQuick ? (
            <section className="space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Mode cepat
                </p>
                <p className="text-[9px] text-slate-500">tanpa log servis</p>
              </div>
              <div className="flex min-h-[64px] items-center gap-3 rounded-2xl border border-white/[0.075] bg-white/[0.025] p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-300">
                  <Wrench className="h-4 w-4" />
                </span>
                <button
                  type="button"
                  onClick={switchToFullLog}
                  className="min-w-0 flex-1 py-1 text-left"
                >
                  <span className="block text-[11px] font-bold text-slate-100">
                    Catat servis lengkap
                  </span>
                  <span className="mt-0.5 block text-[9.5px] leading-relaxed text-slate-500">
                    Aktifkan untuk log servis, kategori, biaya, dan setup.
                  </span>
                </button>
                <ToggleSwitch
                  checked={false}
                  onChange={switchToFullLog}
                  label="Catat servis lengkap"
                />
              </div>
            </section>
          ) : (
            <section className="space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Mulai cepat
                </p>
                <p className="text-[9px] text-slate-500">pilih preset → isi otomatis</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_PRESETS.map((preset) => {
                  const Icon = preset.icon
                  const active = activePreset === preset.id
                  const tone =
                    preset.id === 'kmOnly'
                      ? 'from-cyan-500/15 to-blue-500/[0.04] text-cyan-300 border-cyan-300/30'
                      : 'from-blue-500/[0.12] to-transparent text-blue-300 border-blue-400/20'
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset.id)}
                      className={`relative flex min-h-[66px] items-start gap-2.5 overflow-hidden rounded-2xl border bg-gradient-to-br p-3 text-left transition-all active:scale-[0.985] ${
                        active
                          ? 'border-blue-400/60 bg-blue-500/[0.09] ring-selected'
                          : 'border-white/[0.075] hover:border-blue-400/25'
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border bg-gradient-to-br ${tone}`}
                      >
                        <Icon className="h-4 w-4" strokeWidth={2} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[10.5px] font-bold leading-tight text-slate-100">
                          {preset.label}
                        </span>
                        <span className="mt-1 block text-[9px] leading-tight text-slate-500">
                          {preset.hint}
                        </span>
                      </span>
                      {active && (
                        <span className="absolute right-2 top-2 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-500 text-white">
                          <Check className="h-2.5 w-2.5" strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </section>
          )
        )}

        <div className="flex flex-col gap-6">
        <FormSection
          step={isQuick ? '02' : '01'}
          className={isQuick ? 'order-2' : ''}
          title="Foto spedometer"
          hint="OCR otomatis membaca total ODO, bukan trip atau jam"
          icon={<ScanLine className="h-3.5 w-3.5 text-cyan-400/80" />}
        >
          <div
            className={`relative overflow-hidden rounded-2xl border ${
              speedoPhoto
                ? 'border-blue-400/20 bg-[#060d18]'
                : 'border-dashed border-cyan-400/25 bg-[#07131f]'
            }`}
          >
            {speedoPhoto ? (
              <div className="relative aspect-[16/10] w-full overflow-hidden">
                <img
                  src={speedoPhoto.dataUrl}
                  alt="Foto spedometer motor"
                  className={`h-full w-full object-cover transition duration-500 ${
                    scanning ? 'scale-105 blur-[1px] brightness-75' : ''
                  }`}
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#03080f]/85 via-transparent to-[#03080f]/30" />
                <div className="scan-bracket left-3 top-3 border-l-2 border-t-2" />
                <div className="scan-bracket right-3 top-3 border-r-2 border-t-2" />
                <div className="scan-bracket bottom-3 left-3 border-b-2 border-l-2" />
                <div className="scan-bracket bottom-3 right-3 border-b-2 border-r-2" />
                {scanning && <ScanOverlay withImage />}

                {!scanning && (
                  <>
                    <button
                      type="button"
                      onClick={() => removePhoto(speedoPhoto.id)}
                      className="absolute right-2.5 top-2.5 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white backdrop-blur-md transition hover:bg-black/75"
                      aria-label="Hapus foto spedometer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="absolute inset-x-3 bottom-2.5 z-10 flex items-end justify-between gap-2">
                      <div className="min-w-0">
                        {scanState === 'success' ? (
                          <div className="inline-flex max-w-full items-center gap-2 rounded-xl border border-cyan-300/25 bg-[#061b25]/90 px-2.5 py-2 backdrop-blur-md">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-400/15 text-cyan-300">
                              <ScanText className="h-3 w-3" />
                            </span>
                            <div className="min-w-0">
                              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-cyan-300">
                                Odometer terbaca
                              </p>
                              <p className="mono mt-0.5 truncate text-[13px] font-semibold text-white">
                                {formatNumber(odometerNumber)} KM
                              </p>
                            </div>
                            {sourceLabel && (
                              <span className="mono ml-1 shrink-0 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] text-slate-300">
                                {sourceLabel}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="rounded-full border border-white/10 bg-black/45 px-2 py-1 text-[9px] text-slate-300 backdrop-blur-sm">
                            Foto siap dipindai
                          </span>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        <button
                          type="button"
                          onClick={() => speedoGalleryRef.current?.click()}
                          className="flex h-11 min-w-11 items-center justify-center rounded-xl border border-white/15 bg-black/55 px-2.5 text-[10px] font-semibold text-white backdrop-blur-md transition hover:bg-black/75"
                        >
                          Ganti
                        </button>
                        <button
                          type="button"
                          onClick={() => speedoCameraRef.current?.click()}
                          className="flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl border border-cyan-300/25 bg-cyan-500/20 px-2.5 text-[10px] font-semibold text-cyan-100 backdrop-blur-md transition hover:bg-cyan-500/30"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Scan ulang
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="relative flex min-h-[168px] flex-col items-center justify-center px-5 py-7 text-center">
                <div className="field-grid absolute inset-0 opacity-40" />
                {scanning ? (
                  <>
                    <ScanOverlay />
                    <div className="relative z-20 flex flex-col items-center">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-500/10 text-cyan-300">
                        <ScanLine className="h-5 w-5 animate-pulse" />
                      </span>
                      <p className="mt-3 text-[11px] font-semibold text-cyan-200">Menyiapkan foto…</p>
                      <p className="mt-1 text-[9px] text-slate-500">Kompres WebP + AI Vision</p>
                    </div>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => speedoCameraRef.current?.click()}
                      className="relative z-10 flex h-14 w-14 items-center justify-center rounded-[20px] border border-cyan-300/30 bg-gradient-to-br from-cyan-500/20 to-blue-500/10 text-cyan-200 shadow-[0_0_35px_-8px_rgba(34,211,238,0.5)] transition hover:scale-[1.03] active:scale-[0.97]"
                      aria-label="Ambil foto spedometer"
                    >
                      <Camera className="h-6 w-6" strokeWidth={1.8} />
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-cyan-200/30 bg-[#06212a] text-cyan-300">
                        <Sparkles className="h-2.5 w-2.5" />
                      </span>
                    </button>
                    <p className="relative z-10 mt-3 text-[12px] font-bold text-white">
                      Scan spedometer
                    </p>
                    <p className="relative z-10 mt-1 max-w-[250px] text-[9.5px] leading-relaxed text-slate-500">
                      Foto panel digital. AI akan memisahkan angka ODO dari trip A/B dan jam.
                    </p>
                    <div className="relative z-10 mt-4 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => speedoCameraRef.current?.click()}
                        className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-cyan-300/20 bg-cyan-500/10 px-3.5 text-[10px] font-semibold text-cyan-200"
                      >
                        <Camera className="h-3.5 w-3.5" /> Kamera
                      </button>
                      <button
                        type="button"
                        onClick={() => speedoGalleryRef.current?.click()}
                        className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-[10px] font-semibold text-slate-300"
                      >
                        <ImagePlus className="h-3.5 w-3.5" /> Galeri
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-[9px] text-slate-500">
              <ScanText className="h-3 w-3 text-cyan-400/60" />
              Kompres otomatis · maks 1200px · WebP 75%
            </p>
            {scanState === 'success' && sourceLabel && (
              <span className="chip border-cyan-400/20 bg-cyan-500/[0.06] py-0.5 text-[8.5px] text-cyan-300">
                {sourceLabel}
                {scanConfidence !== null ? ` · ${Math.round(scanConfidence * 100)}%` : ''}
              </span>
            )}
          </div>

          {scanWarning && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-500/[0.06] px-3 py-2.5 text-[9px] leading-relaxed text-amber-200/90">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{scanWarning}</span>
            </div>
          )}

          <input
            ref={speedoCameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void handleSpeedometerFile(file)
              event.currentTarget.value = ''
            }}
          />
          <input
            ref={speedoGalleryRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void handleSpeedometerFile(file)
              event.currentTarget.value = ''
            }}
          />

          {!isQuick && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-300">
                  <ImagePlus className="h-3.5 w-3.5 text-slate-500" />
                  Dokumentasi
                  <span className="text-[9px] font-normal text-slate-600">
                    {docs.length}/6
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => docInputRef.current?.click()}
                  disabled={isAddingDocs || docs.length >= 6}
                  className="flex min-h-[44px] items-center gap-1 text-[10px] font-semibold text-blue-400 disabled:opacity-40"
                >
                  <Plus className="h-3 w-3" /> Tambah foto
                </button>
              </div>
              <div className="no-scrollbar flex gap-2 overflow-x-auto pb-0.5">
                {docs.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative h-[68px] w-[68px] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#0A1220]"
                  >
                    <img
                      src={photo.dataUrl}
                      alt="Dokumentasi servis"
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.id)}
                      className="absolute right-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-black/65 text-white backdrop-blur-sm"
                      aria-label="Hapus foto dokumentasi"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}
                {isAddingDocs && (
                  <div className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-500/[0.04]">
                    <LoaderCircle className="h-4 w-4 animate-spin text-cyan-300" />
                  </div>
                )}
                {docs.length < 6 && !isAddingDocs && (
                  <button
                    type="button"
                    onClick={() => docInputRef.current?.click()}
                    className="flex h-[68px] w-[68px] shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/15 bg-white/[0.02] text-slate-500 transition hover:border-blue-400/30 hover:text-blue-400"
                    aria-label="Tambah foto dokumentasi"
                  >
                    <ImagePlus className="h-4 w-4" />
                    <span className="text-[8.5px] font-medium">Tambah</span>
                  </button>
                )}
              </div>
              <input
                ref={docInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => {
                  if (event.target.files?.length) void handleDocFiles(event.target.files)
                  event.currentTarget.value = ''
                }}
              />
            </div>
          )}
        </FormSection>

        <FormSection
          step={isQuick ? '01' : '02'}
          className={isQuick ? 'order-1' : ''}
          title="Odometer & tanggal"
          hint={isQuick ? 'Isi angka KM terbaru, lalu simpan' : 'Angka AI bisa langsung dikoreksi dengan tombol cepat'}
          icon={<Wrench className="h-3.5 w-3.5 text-blue-400/80" />}
        >
          <div className="relative overflow-hidden rounded-2xl border border-blue-400/15 bg-[#070f1b] p-4">
            <div className="field-grid pointer-events-none absolute inset-0 opacity-30" />
            <div className="relative flex items-center justify-between gap-2">
              <label htmlFor="log-odometer" className="field-label mb-0">
                Odometer saat servis
              </label>
              {ocrUsed && (
                <span className="flex items-center gap-1 rounded-full border border-cyan-400/20 bg-cyan-500/[0.08] px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.1em] text-cyan-300">
                  <Sparkles className="h-2.5 w-2.5" />
                  AI terisi
                </span>
              )}
            </div>
            <div className="relative mt-2 flex items-center gap-2">
              <input
                id="log-odometer"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder={formatNumber(state.odometer.current)}
                value={formattedOdo}
                onChange={(event) => {
                  const digits = event.target.value.replace(/\D/g, '').slice(0, 7)
                  setOdometer(digits)
                  setFormError(null)
                }}
                className="mono w-full min-w-0 bg-transparent text-[38px] font-semibold leading-none tracking-[-0.05em] text-white outline-none placeholder:text-slate-700"
                aria-label="Odometer dalam kilometer"
              />
              <span className="mb-1.5 shrink-0 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[9px] font-bold tracking-[0.08em] text-slate-400">
                KM
              </span>
            </div>
            <div className="relative mt-2 flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => nudgeOdometer(10)}
                className="flex min-h-[44px] items-center gap-0.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-[11px] font-semibold text-slate-300 transition active:scale-95"
              >
                +10
              </button>
              <button
                type="button"
                onClick={() => nudgeOdometer(100)}
                className="flex min-h-[44px] items-center gap-0.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-[11px] font-semibold text-slate-300 transition active:scale-95"
              >
                +100
              </button>
              <button
                type="button"
                onClick={useCurrentOdometer}
                className="ml-auto flex min-h-[44px] items-center gap-1 rounded-lg px-2 text-[10px] font-medium text-slate-500 transition hover:text-slate-300"
              >
                <RotateCcw className="h-3 w-3" />
                KM aktif
              </button>
            </div>

            {!isQuick && (
              <div
                className={`relative mt-3 rounded-xl border p-3 transition ${
                  useEstimatedKm
                    ? 'border-amber-400/30 bg-amber-500/[0.06]'
                    : 'border-white/[0.07] bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-slate-200">Servis tanpa KM</p>
                    <p className="mt-0.5 text-[9.5px] leading-snug text-slate-500">
                      Lupa catat spedometer? Pakai KM aktif sebagai perkiraan.
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={useEstimatedKm}
                    onChange={(next) => {
                      setUseEstimatedKm(next)
                      setOdometer(String(state.odometer.current))
                      setFormError(null)
                    }}
                    label="Servis tanpa KM"
                  />
                </div>
                {useEstimatedKm && (
                  <p className="mt-2 flex items-start gap-1.5 text-[9.5px] leading-snug text-amber-300/90">
                    <Info className="mt-px h-3 w-3 shrink-0" />
                    Disimpan sebagai ±{formatNumber(state.odometer.current)} KM (perkiraan). Target
                    berikutnya dihitung dari situ, dan angka global tidak berubah.
                  </p>
                )}
              </div>
            )}
            {quickTooLow && (
              <p className="relative mt-2 text-[10px] text-amber-400">
                Lebih rendah dari odometer aktif ({formatNumber(state.odometer.current)} KM).
              </p>
            )}
            {!isQuick && odometerNumber > 0 && odometerNumber < state.odometer.current && (
              <p className="relative mt-2 text-[10px] text-amber-400/90">
                Odometer lebih rendah dari KM aktif. Data global tidak akan berkurang.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="log-date" className="field-label">
                Tanggal
              </label>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <input
                  id="log-date"
                  type="date"
                  value={date}
                  max={today}
                  onChange={(event) => {
                    setDate(event.target.value || today)
                    setFormError(null)
                  }}
                  className="field mono min-h-[46px] pl-9 text-[11px]"
                />
              </div>
            </div>
            <div className="flex flex-col justify-end">
              <p className="field-label">Preview</p>
              <div className="flex min-h-[46px] items-center rounded-2xl border border-white/[0.07] bg-white/[0.025] px-3">
                <p className="mono truncate text-[10px] text-slate-300">
                  {formatDateShort(date)}
                </p>
              </div>
            </div>
          </div>
        </FormSection>
        </div>

        {!isQuick && (
          <>
            <FormSection
              step="03"
              title="Kategori servis"
              hint="Bisa pilih beberapa komponen sekaligus"
              icon={<Tag className="h-3.5 w-3.5 text-blue-400/80" />}
            >
              <div className="flex flex-wrap gap-1.5">
                {LOG_CATEGORIES.map((key) => {
                  const def = CATEGORIES[key]
                  const Icon = def.icon
                  const selected = categories.includes(key)
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleCategory(key)}
                      className={`flex min-h-[44px] items-center gap-1.5 rounded-xl border px-3 text-[10px] font-semibold transition-all active:scale-[0.97] ${
                        selected
                          ? 'text-white'
                          : 'border-white/[0.08] bg-white/[0.025] text-slate-400 hover:border-white/15 hover:text-slate-200'
                      }`}
                      style={
                        selected
                          ? {
                              borderColor: `${def.accent}66`,
                              backgroundColor: `${def.accent}1f`,
                              boxShadow: `0 0 18px -8px ${def.accent}80`,
                            }
                          : undefined
                      }
                    >
                      <Icon
                        className="h-3.5 w-3.5"
                        style={{ color: selected ? def.accent : undefined }}
                      />
                      {def.label}
                      {selected && <Check className="h-3 w-3 text-cyan-300" strokeWidth={3} />}
                    </button>
                  )
                })}
              </div>

              {categories.includes('cvt') && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="overflow-hidden"
                >
                  <div className="mt-1 rounded-2xl border border-indigo-400/15 bg-indigo-500/[0.045] p-3">
                    <div className="flex items-center justify-between">
                      <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.13em] text-indigo-300/90">
                        <Sparkles className="h-3 w-3" />
                        Tag cepat CVT
                      </p>
                      <span className="text-[9px] text-slate-600">opsional</span>
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {CVT_QUICK_TAGS.map((tag) => {
                        const selected = tags.includes(tag)
                        return (
                          <button
                            key={tag}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => toggleTag(tag)}
                            className={`min-h-[44px] rounded-lg border px-3 text-[10px] font-medium transition ${
                              selected
                                ? 'border-indigo-300/40 bg-indigo-500/20 text-indigo-100'
                                : 'border-white/[0.07] bg-white/[0.025] text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            {tag}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </FormSection>

            <FormSection
              step="04"
              title="Target servis berikutnya"
              hint="Sekali tap — atau pilih Tidak memilih"
              icon={<Zap className="h-3.5 w-3.5 text-amber-400/80" />}
            >
              {targetRows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-center text-[10px] text-slate-600">
                  Pilih kategori dulu untuk melihat target otomatis.
                </div>
              ) : (
                <div className="space-y-2">
                  {targetRows.map((row) => {
                    const Icon = row.def.icon
                    const presetValues = [...new Set([...row.def.intervalPresets, row.interval])].sort(
                      (a, b) => a - b,
                    )
                    return (
                      <div
                        key={row.def.key}
                        className="rounded-2xl border border-white/[0.075] bg-[#0C1524]/80 p-3"
                      >
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="flex h-8 w-8 items-center justify-center rounded-xl border"
                              style={{
                                borderColor: `${row.def.accent}33`,
                                backgroundColor: `${row.def.accent}12`,
                                color: row.def.accent,
                              }}
                            >
                              <Icon className="h-4 w-4" />
                            </span>
                            <div>
                              <p className="text-[10.5px] font-bold text-slate-100">{row.def.label}</p>
                              <p className="mt-0.5 text-[9.5px] text-slate-500">
                                {row.health.lastKM !== null
                                  ? `Terakhir ${formatNumber(row.health.lastKM)} KM · ${formatDateShort(row.health.lastDate ?? '')}`
                                  : 'Belum ada riwayat servis'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-slate-600">
                              {row.enabled ? 'Target' : 'Jadwal'}
                            </p>
                            {row.enabled ? (
                              <p className="mono mt-0.5 text-[16px] font-semibold tracking-[-0.03em] text-white">
                                {formatNumber(row.targetKM)}
                                <span className="ml-1 font-sans text-[9px] font-medium text-slate-500">
                                  KM
                                </span>
                              </p>
                            ) : (
                              <p className="mt-0.5 text-[12px] font-semibold text-slate-500">
                                Tanpa jadwal
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            aria-pressed={!row.enabled}
                            onClick={() => setIntervalDisabled(row.def.key)}
                            className={`min-h-[44px] rounded-lg border px-2.5 text-[10px] font-medium transition ${
                              !row.enabled
                                ? 'border-slate-400/40 bg-slate-500/15 text-slate-300'
                                : 'border-white/[0.07] bg-white/[0.025] text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            Tidak memilih
                          </button>
                          {presetValues.map((value) => {
                            const active = row.enabled && row.interval === value
                            return (
                              <button
                                key={value}
                                type="button"
                                onClick={() => setIntervalFor(row.def.key, value)}
                                className={`mono min-h-[44px] rounded-lg border px-2.5 text-[10px] font-medium transition ${
                                  active
                                    ? 'border-blue-400/50 bg-blue-500/15 text-blue-200'
                                    : 'border-white/[0.07] bg-white/[0.025] text-slate-500 hover:text-slate-300'
                                }`}
                              >
                                +{formatNumber(value)}
                              </button>
                            )
                          })}
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/[0.05] pt-2">
                          <p className="text-[9px] text-slate-600">
                            {row.enabled
                              ? `Estimasi jadwal ${formatDateShort(row.targetDate)}`
                              : 'Tidak ada pengingat untuk komponen ini'}
                          </p>
                          <p className="text-[9px] text-slate-600">
                            {row.enabled ? (
                              <>
                                Aturan: {formatNumber(state.intervals[row.def.key].km)} KM /{' '}
                                {state.intervals[row.def.key].days} hari
                              </>
                            ) : (
                              'Tanpa jadwal'
                            )}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                  <p className="flex items-start gap-1.5 px-1 text-[9px] leading-relaxed text-slate-500">
                    <Info className="mt-0.5 h-2.5 w-2.5 shrink-0" />
                    Mengubah chip (termasuk “Tidak memilih”) juga memperbarui aturan interval
                    global komponen ini.
                  </p>
                </div>
              )}
            </FormSection>

            <FormSection
              step="05"
              title="Detail & setup"
              hint="Catatan, biaya, dan update spesifikasi aktif"
              icon={<ReceiptText className="h-3.5 w-3.5 text-blue-400/80" />}
            >
              <div className="space-y-2.5">
                <div>
                  <label className="field-label" htmlFor="log-spec">
                    Merek / spesifikasi part
                  </label>
                  <input
                    id="log-spec"
                    type="text"
                    value={spec}
                    onChange={(event) => setSpec(event.target.value.slice(0, 200))}
                    placeholder={
                      categories.includes('engineOil')
                        ? 'cth. Motul 5100 10W-40'
                        : categories.includes('cvt')
                          ? 'cth. Roller 10 g · Per 1.500 RPM'
                          : 'cth. Yamaha OEM'
                    }
                    className="field"
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="log-cost">
                    Biaya (opsional)
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-500">
                      Rp
                    </span>
                    <input
                      id="log-cost"
                      type="text"
                      inputMode="numeric"
                      value={cost ? formatNumber(Number(cost)) : ''}
                      onChange={(event) =>
                        setCost(event.target.value.replace(/\D/g, '').slice(0, 9))
                      }
                      placeholder="0"
                      className="field mono pl-9 text-[12px]"
                    />
                  </div>
                </div>
                <div>
                  <label className="field-label" htmlFor="log-note">
                    Catatan
                  </label>
                  <textarea
                    id="log-note"
                    rows={3}
                    value={note}
                    onChange={(event) => setNote(event.target.value.slice(0, 2000))}
                    placeholder="Kondisi part, keluhan sebelum servis, atau hasil test ride…"
                    className="field resize-none leading-relaxed"
                  />
                </div>
              </div>

              {setupKeys.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-cyan-400/15 bg-cyan-500/[0.04]">
                  <button
                    type="button"
                    onClick={() => setSetupOn((value) => !value)}
                    className="flex w-full items-center gap-3 p-3 text-left"
                    aria-pressed={setupOn}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-300">
                      <RefreshCw className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[10.5px] font-bold text-slate-100">
                        Update sebagai setup aktif
                      </span>
                      <span className="mt-0.5 block text-[8.5px] leading-relaxed text-slate-500">
                        Simpan part ini ke kartu spesifikasi motor.
                      </span>
                    </span>
                    <ToggleSwitch
                      checked={setupOn}
                      onChange={setSetupOn}
                      label="Update setup aktif"
                    />
                  </button>
                  {setupOn && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="border-t border-cyan-400/10 px-3 pb-3"
                    >
                      <div className={`mt-3 grid gap-2 ${setupFieldColumns ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {setupKeys.map((key) => {
                          const meta = SETUP_FIELD_META[key]
                          return (
                            <div key={key}>
                              <label className="field-label" htmlFor={`setup-${key}`}>
                                {meta.label}
                              </label>
                              <input
                                id={`setup-${key}`}
                                type="text"
                                value={setupFields[key] ?? state.setup[key]}
                                onChange={(event) =>
                                  setSetupFields((current) => ({
                                    ...current,
                                    [key]: event.target.value,
                                  }))
                                }
                                placeholder={meta.placeholder}
                                className="field"
                              />
                            </div>
                          )
                        })}
                      </div>
                      <p className="mt-2 flex items-center gap-1.5 text-[9px] text-slate-500">
                        <ShieldCheck className="h-2.5 w-2.5" />
                        Setup aktif lama akan diganti setelah disimpan.
                      </p>
                    </motion.div>
                  )}
                </div>
              )}
            </FormSection>
          </>
        )}

        {isQuick && (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-300">
                <Info className="h-3.5 w-3.5" />
              </span>
              <p className="text-[10px] font-semibold text-slate-200">Yang terjadi setelah simpan</p>
            </div>
            <ul className="mt-2.5 space-y-1.5 text-[9px] leading-relaxed text-slate-500">
              <li className="flex gap-2">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-cyan-400" />
                Odometer global diperbarui ke angka paling baru.
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-cyan-400" />
                Health bar dan prediksi KM semua komponen langsung dihitung ulang.
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-cyan-400" />
                Tersimpan sebagai update KM, tanpa membuat log servis penuh.
              </li>
            </ul>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.055] bg-white/[0.02] px-3.5 py-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400/80" />
            <div>
              <p className="text-[9px] font-semibold text-slate-300">Local-first & private</p>
              <p className="text-[8px] text-slate-600">
                Foto dikompres di perangkat. Tanpa upload kecuali OCR AI.
              </p>
            </div>
          </div>
          <span className="mono shrink-0 text-[9px] uppercase tracking-[0.1em] text-slate-600">
            {isQuick ? 'KM only' : `${categories.length} cat`}
          </span>
        </div>
      </div>
    </Sheet>
  )
}
