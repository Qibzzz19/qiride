import {
  Cog,
  Disc3,
  Droplets,
  Infinity as BeltIcon,
  Orbit,
  ThermometerSnowflake,
  CircleDashed,
  Zap,
  Droplet,
} from 'lucide-react'
import type { CategoryDef, CategoryGroup, CategoryKey, QuickPreset } from '../types'

export const CATEGORIES: Record<CategoryKey, CategoryDef> = {
  engineOil: {
    key: 'engineOil',
    label: 'Oli Mesin',
    shortLabel: 'Oli Mesin',
    group: 'oli',
    description: 'Pelumasan utama mesin',
    accent: '#3B82F6',
    icon: Droplets,
    defaultIntervalKM: 2000,
    defaultIntervalDays: 60,
    intervalPresets: [1500, 2000, 2500, 3000],
  },
  gearOil: {
    key: 'gearOil',
    label: 'Oli Gardan',
    shortLabel: 'Oli Gardan',
    group: 'oli',
    description: 'Pelumasan gardan & final drive',
    accent: '#22D3EE',
    icon: Cog,
    defaultIntervalKM: 6000,
    defaultIntervalDays: 180,
    intervalPresets: [4000, 6000, 8000, 10000],
  },
  cvt: {
    key: 'cvt',
    label: 'Servis CVT',
    shortLabel: 'CVT',
    group: 'cvt',
    description: 'Kebersihan & tuning CVT',
    accent: '#818CF8',
    icon: Orbit,
    defaultIntervalKM: 3000,
    defaultIntervalDays: 90,
    intervalPresets: [2000, 3000, 4000, 5000],
  },
  vBelt: {
    key: 'vBelt',
    label: 'V-Belt',
    shortLabel: 'V-Belt',
    group: 'cvt',
    description: 'Sabuk penggerak CVT',
    accent: '#38BDF8',
    icon: BeltIcon,
    defaultIntervalKM: 24000,
    defaultIntervalDays: 720,
    intervalPresets: [16000, 20000, 24000, 28000],
  },
  brakePads: {
    key: 'brakePads',
    label: 'Kampas Rem',
    shortLabel: 'Rem',
    group: 'kaki',
    description: 'Kampas & sistem pengereman',
    accent: '#A78BFA',
    icon: Disc3,
    defaultIntervalKM: 10000,
    defaultIntervalDays: 365,
    intervalPresets: [6000, 8000, 10000, 12000],
  },
  tires: {
    key: 'tires',
    label: 'Ban',
    shortLabel: 'Ban',
    group: 'kaki',
    description: 'Ban depan & belakang',
    accent: '#94A3B8',
    icon: CircleDashed,
    defaultIntervalKM: 20000,
    defaultIntervalDays: 1095,
    intervalPresets: [12000, 16000, 20000, 24000],
  },
  coolant: {
    key: 'coolant',
    label: 'Coolant',
    shortLabel: 'Coolant',
    group: 'other',
    description: 'Cairan radiator & suhu mesin',
    accent: '#67E8F9',
    icon: ThermometerSnowflake,
    defaultIntervalKM: 12000,
    defaultIntervalDays: 730,
    intervalPresets: [8000, 12000, 16000, 20000],
  },
}

export const CATEGORY_LIST = Object.values(CATEGORIES)

export const DASHBOARD_CATEGORIES: CategoryKey[] = [
  'engineOil',
  'gearOil',
  'cvt',
  'vBelt',
  'brakePads',
  'coolant',
]

export const LOG_CATEGORIES: CategoryKey[] = [
  'engineOil',
  'gearOil',
  'cvt',
  'vBelt',
  'brakePads',
  'tires',
  'coolant',
]

export const CATEGORY_GROUPS: { key: HistoryFilterKey; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'oli', label: 'Oli' },
  { key: 'cvt', label: 'CVT' },
  { key: 'kaki', label: 'Kaki-kaki' },
  { key: 'other', label: 'Lainnya' },
]

type HistoryFilterKey = 'all' | CategoryGroup

export const CATEGORY_GROUP_LABELS: Record<CategoryGroup, string> = {
  oli: 'Oli',
  cvt: 'CVT',
  kaki: 'Kaki-kaki',
  other: 'Lainnya',
}

export const QUICK_PRESETS: QuickPreset[] = [
  {
    id: 'engineOil',
    label: 'Ganti Oli Mesin',
    hint: '+2.000 KM · 2 bulan',
    icon: Droplet,
    tone: 'blue',
    categories: ['engineOil'],
  },
  {
    id: 'engineGear',
    label: 'Oli Mesin + Gardan',
    hint: 'Interval terpisah',
    icon: Cog,
    tone: 'cyan',
    categories: ['engineOil', 'gearOil'],
  },
  {
    id: 'cvt',
    label: 'Servis & Tuning CVT',
    hint: 'Tag cepat · +3.000 KM',
    icon: Orbit,
    tone: 'indigo',
    categories: ['cvt'],
  },
  {
    id: 'kmOnly',
    label: 'Update KM Saja',
    hint: '2 detik · AI scan',
    icon: Zap,
    tone: 'rapid',
    categories: [],
  },
]

export const CVT_QUICK_TAGS = [
  'Bersih CVT',
  'Roller',
  'Per CVT',
  'Per Sentri',
  'V-Belt',
  'Ring Pulley',
]

export function categoryFor(key: CategoryKey): CategoryDef {
  return CATEGORIES[key]
}

export function isCategoryKey(value: string): value is CategoryKey {
  return value in CATEGORIES
}
