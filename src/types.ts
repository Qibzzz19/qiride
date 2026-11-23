import type { LucideIcon } from 'lucide-react'

export type AppTab = 'home' | 'history' | 'garage' | 'settings'

export type CategoryKey =
  | 'engineOil'
  | 'gearOil'
  | 'cvt'
  | 'vBelt'
  | 'brakePads'
  | 'tires'
  | 'coolant'


export type CategoryGroup = 'oli' | 'cvt' | 'kaki' | 'other'

export type HistoryFilter = 'all' | CategoryGroup

export interface CategoryDef {
  key: CategoryKey
  label: string
  shortLabel: string
  group: CategoryGroup
  description: string
  accent: string
  icon: LucideIcon
  defaultIntervalKM: number
  defaultIntervalDays: number
  intervalPresets: number[]
}

export type PhotoKind = 'odometer' | 'documentation'

export interface Photo {
  id: string
  dataUrl: string
  kind: PhotoKind
  createdAt: string
}

export interface Profile {
  model: string
  nickname: string
  plate: string
  year: number
}

export type OdometerSource = 'seed' | 'quick' | 'service' | 'manual'

export interface OdometerPoint {
  date: string
  km: number
  source: OdometerSource
}

export interface OdometerUpdate {
  id: string
  date: string
  km: number
  photo: Photo | null
  provider: 'gemini' | 'demo' | null
  createdAt: string
}

export interface SetupState {
  engineOil: string
  gearOil: string
  coolant: string
  cvtPulley: string
  cvtRoller: string
  cvtPerCvt: string
  cvtPerSentri: string
  cvtBoss: string
  vBelt: string
  frontTire: string
  rearTire: string
  brakePads: string
  updatedAt: string
}

export type SetupFieldKey = Exclude<keyof SetupState, 'updatedAt'>

export interface IntervalRule {
  km: number
  days: number
  /** false = "tidak memilih" / tanpa jadwal — komponen tidak dihitung pengingatnya. */
  enabled: boolean
}

export type IntervalMap = Record<CategoryKey, IntervalRule>

export interface LogEntry {
  id: string
  date: string
  odometer: number
  categories: CategoryKey[]
  tags: string[]
  note: string
  cost: number
  spec: string
  photos: Photo[]
  setupUpdated: boolean
  /** 'estimated' = servis tanpa KM: memakai odometer aktif terakhir sebagai perkiraan. */
  odometerSource: 'manual' | 'ocr' | 'estimated'
  ocrProvider?: 'gemini' | 'demo'
  createdAt: string
  updatedAt?: string
}

export interface AppSettings {
  geminiApiKey: string
  ocrModel: string
}

export interface GarageState {
  version: 1
  profile: Profile
  odometer: {
    current: number
    updatedAt: string
    lastSource: OdometerSource
  }
  odometerHistory: OdometerPoint[]
  odometerUpdates: OdometerUpdate[]
  setup: SetupState
  logs: LogEntry[]
  intervals: IntervalMap
  settings: AppSettings
  createdAt: string
}

export type PresetId = 'engineOil' | 'engineGear' | 'cvt' | 'kmOnly'

export interface QuickPreset {
  id: PresetId
  label: string
  hint: string
  icon: LucideIcon
  tone: 'blue' | 'cyan' | 'indigo' | 'rapid'
  categories: CategoryKey[]
}

export interface AddSheetRequest {
  session: number
  preset?: PresetId | null
  category?: CategoryKey | null
  editLog?: LogEntry | null
  voice?: boolean
}
