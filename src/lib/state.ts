import { CATEGORIES, isCategoryKey } from '../data/categories'
import type {
  CategoryKey,
  GarageState,
  IntervalMap,
  IntervalRule,
  LogEntry,
  OdometerPoint,
  OdometerUpdate,
  Photo,
  SetupState,
} from '../types'
import { nowIso, todayInput } from './date'

export function createDefaultIntervals(): IntervalMap {
  return Object.fromEntries(
    Object.values(CATEGORIES).map((category) => [
      category.key,
      { km: category.defaultIntervalKM, days: category.defaultIntervalDays, enabled: true },
    ]),
  ) as IntervalMap
}

export function intervalRuleIsValid(rule: IntervalRule | undefined): rule is IntervalRule {
  if (!rule) return false
  // Aturan nonaktif ("tidak memilih") selalu valid — angka km/days disimpan
  // sebagai referensi saat diaktifkan kembali.
  if (rule.enabled === false) return true
  return (
    Number.isFinite(rule.km) && Number.isFinite(rule.days) && rule.km > 0 && rule.days > 0
  )
}

export function sanitizePhoto(value: unknown): Photo | null {
  if (!value || typeof value !== 'object') return null
  const photo = value as Partial<Photo>
  if (typeof photo.id !== 'string' || typeof photo.dataUrl !== 'string') return null
  if (!/^data:image\/(?:webp|jpeg|jpg|png);base64,/i.test(photo.dataUrl)) return null
  const kind = photo.kind === 'odometer' ? 'odometer' : 'documentation'
  return {
    id: photo.id,
    dataUrl: photo.dataUrl,
    kind,
    createdAt: typeof photo.createdAt === 'string' ? photo.createdAt : nowIso(),
  }
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function numberValue(value: unknown, fallback = 0): number {
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function booleanValue(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function normalizeSetup(value: unknown): SetupState {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<SetupState>
  return {
    engineOil: stringValue(raw.engineOil),
    gearOil: stringValue(raw.gearOil),
    coolant: stringValue(raw.coolant),
    cvtPulley: stringValue(raw.cvtPulley),
    cvtRoller: stringValue(raw.cvtRoller),
    cvtPerCvt: stringValue(raw.cvtPerCvt),
    cvtPerSentri: stringValue(raw.cvtPerSentri),
    cvtBoss: stringValue(raw.cvtBoss),
    vBelt: stringValue(raw.vBelt),
    frontTire: stringValue(raw.frontTire),
    rearTire: stringValue(raw.rearTire),
    brakePads: stringValue(raw.brakePads),
    updatedAt: stringValue(raw.updatedAt, nowIso()),
  }
}

function normalizeIntervals(value: unknown): IntervalMap {
  const defaults = createDefaultIntervals()
  if (!value || typeof value !== 'object') return defaults
  const raw = value as Partial<Record<CategoryKey, Partial<IntervalRule>>>
  for (const key of Object.keys(CATEGORIES) as CategoryKey[]) {
    const candidate = raw[key]
    if (candidate) {
      const km = numberValue(candidate.km, defaults[key].km)
      const days = numberValue(candidate.days, defaults[key].days)
      defaults[key] = {
        km: Math.max(100, Math.round(km)),
        days: Math.max(1, Math.round(days)),
        // Data lama tanpa field `enabled` dianggap aktif.
        enabled: candidate.enabled !== false,
      }
    }
  }
  return defaults
}

function normalizeLog(value: unknown): LogEntry | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Partial<LogEntry>
  if (typeof raw.id !== 'string' || !raw.id) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw.date ?? '')) return null
  const odometer = Math.round(numberValue(raw.odometer))
  if (odometer <= 0 || odometer > 999_999) return null
  const categories = Array.isArray(raw.categories)
    ? raw.categories.filter((key): key is CategoryKey => typeof key === 'string' && isCategoryKey(key))
    : []
  if (categories.length === 0) return null
  const photos = Array.isArray(raw.photos)
    ? raw.photos.map(sanitizePhoto).filter((photo): photo is Photo => Boolean(photo))
    : []
  const tags = Array.isArray(raw.tags)
    ? raw.tags.filter((tag): tag is string => typeof tag === 'string').slice(0, 12)
    : []
  return {
    id: raw.id,
    date: raw.date ?? todayInput(),
    odometer,
    categories,
    tags,
    note: stringValue(raw.note).slice(0, 3000),
    cost: Math.max(0, Math.round(numberValue(raw.cost))),
    spec: stringValue(raw.spec).slice(0, 200),
    photos,
    setupUpdated: booleanValue(raw.setupUpdated),
    odometerSource:
      raw.odometerSource === 'ocr'
        ? 'ocr'
        : raw.odometerSource === 'estimated'
          ? 'estimated'
          : 'manual',
    ocrProvider:
      raw.ocrProvider === 'gemini' || raw.ocrProvider === 'demo' ? raw.ocrProvider : undefined,
    createdAt: stringValue(raw.createdAt, nowIso()),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
  }
}

function normalizeHistory(value: unknown): OdometerPoint[] {
  if (!Array.isArray(value)) return []
  const byDate = new Map<string, OdometerPoint>()
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const raw = item as Partial<OdometerPoint>
    const date = typeof raw.date === 'string' ? raw.date : ''
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
    const km = Math.round(numberValue(raw.km, -1))
    if (km < 0 || km > 999_999) continue
    const source =
      raw.source === 'seed' ||
      raw.source === 'quick' ||
      raw.source === 'service' ||
      raw.source === 'manual'
        ? raw.source
        : 'manual'
    const existing = byDate.get(date)
    if (!existing || km > existing.km) {
      byDate.set(date, { date, km, source })
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
}

function normalizeOdometerUpdates(value: unknown): OdometerUpdate[] {
  if (!Array.isArray(value)) return []
  const output: OdometerUpdate[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const raw = item as Partial<OdometerUpdate>
    if (typeof raw.id !== 'string') continue
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw.date ?? '')) continue
    const km = Math.round(numberValue(raw.km))
    if (km <= 0 || km > 999_999) continue
    output.push({
      id: raw.id,
      date: raw.date ?? todayInput(),
      km,
      photo: sanitizePhoto(raw.photo),
      provider:
        raw.provider === 'gemini' || raw.provider === 'demo' ? raw.provider : null,
      createdAt: stringValue(raw.createdAt, nowIso()),
    })
  }
  return output.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
}

export function normalizeGarageState(value: unknown): GarageState | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Partial<GarageState>
  if (!raw.odometer || typeof raw.odometer !== 'object') return null
  const odometerCurrent = Math.round(numberValue(raw.odometer.current, 0))
  if (odometerCurrent <= 0 || odometerCurrent > 999_999) return null

  const logs = Array.isArray(raw.logs)
    ? raw.logs.map(normalizeLog).filter((log): log is LogEntry => Boolean(log))
    : []

  const profileRaw = (
    raw.profile && typeof raw.profile === 'object' ? raw.profile : {}
  ) as Partial<GarageState['profile']>
  const settingsRaw = (
    raw.settings && typeof raw.settings === 'object' ? raw.settings : {}
  ) as Partial<GarageState['settings']>
  const odometerHistory = normalizeHistory(raw.odometerHistory)

  const updatedAt = stringValue(raw.odometer.updatedAt, nowIso())
  const updatedDate = /^\d{4}-\d{2}-\d{2}/.test(updatedAt)
    ? updatedAt.slice(0, 10)
    : todayInput()
  if (!odometerHistory.some((point) => point.date === updatedDate && point.km === odometerCurrent)) {
    odometerHistory.push({
      date: updatedDate,
      km: odometerCurrent,
      source:
        raw.odometer.lastSource === 'seed' ||
        raw.odometer.lastSource === 'quick' ||
        raw.odometer.lastSource === 'service'
          ? raw.odometer.lastSource
          : 'manual',
    })
    odometerHistory.sort((a, b) => a.date.localeCompare(b.date))
  }

  return {
    version: 1,
    profile: {
      model: stringValue(profileRaw.model, 'Motor Saya'),
      nickname: stringValue(profileRaw.nickname, ''),
      plate: stringValue(profileRaw.plate, ''),
      year: Math.max(1990, Math.round(numberValue(profileRaw.year, new Date().getFullYear()))),
    },
    odometer: {
      current: odometerCurrent,
      updatedAt,
      lastSource:
        raw.odometer.lastSource === 'seed' ||
        raw.odometer.lastSource === 'quick' ||
        raw.odometer.lastSource === 'service'
          ? raw.odometer.lastSource
          : 'manual',
    },
    odometerHistory,
    odometerUpdates: normalizeOdometerUpdates(raw.odometerUpdates),
    setup: normalizeSetup(raw.setup),
    logs,
    intervals: normalizeIntervals(raw.intervals),
    settings: {
      geminiApiKey: stringValue(settingsRaw.geminiApiKey),
      ocrModel: stringValue(settingsRaw.ocrModel, 'gemini-2.5-flash'),
    },
    createdAt: stringValue(raw.createdAt, nowIso()),
  }
}

export function appendOdometerPoint(
  history: OdometerPoint[],
  point: OdometerPoint,
): OdometerPoint[] {
  const filtered = history.filter((item) => item.date !== point.date)
  filtered.push(point)
  return filtered.sort((a, b) => a.date.localeCompare(b.date))
}

export function serviceStats(state: GarageState): {
  totalSpend: number
  monthSpend: number
  totalLogs: number
  photoCount: number
} {
  const monthPrefix = todayInput().slice(0, 7)
  return state.logs.reduce(
    (acc, log) => {
      acc.totalSpend += log.cost
      if (log.date.startsWith(monthPrefix)) acc.monthSpend += log.cost
      acc.totalLogs += 1
      acc.photoCount += log.photos.length
      return acc
    },
    { totalSpend: 0, monthSpend: 0, totalLogs: 0, photoCount: 0 },
  )
}
