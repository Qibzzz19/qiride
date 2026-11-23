import { CATEGORIES, DASHBOARD_CATEGORIES } from '../data/categories'
import type { CategoryDef, CategoryKey, GarageState, LogEntry } from '../types'
import { addDays, daysBetween, formatDateShort, formatDuration, todayInput } from './date'
import { clamp, formatNumber } from './format'

export type HealthTone = 'healthy' | 'due' | 'overdue' | 'unknown' | 'disabled'

export interface HealthTheme {
  label: string
  short: string
  text: string
  bg: string
  border: string
  dot: string
  badge: string
  iconBg: string
  hex: string
  gradientFrom: string
  gradientTo: string
  flash: string
}

export const HEALTH_THEME: Record<HealthTone, HealthTheme> = {
  healthy: {
    label: 'Optimal',
    short: 'AMAN',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-400/20',
    dot: 'bg-emerald-400',
    badge: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300',
    iconBg: 'bg-emerald-500/10',
    hex: '#10B981',
    gradientFrom: '#10B981',
    gradientTo: '#34D399',
    flash: 'rgba(16, 185, 129, 0.28)',
  },
  due: {
    label: 'Segera',
    short: 'SEGERA',
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-400/20',
    dot: 'bg-amber-400',
    badge: 'border-amber-400/20 bg-amber-500/10 text-amber-300',
    iconBg: 'bg-amber-500/10',
    hex: '#F59E0B',
    gradientFrom: '#F59E0B',
    gradientTo: '#FBBF24',
    flash: 'rgba(245, 158, 11, 0.28)',
  },
  overdue: {
    label: 'Terlambat',
    short: 'TELAT',
    text: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-400/20',
    dot: 'bg-red-400',
    badge: 'border-red-400/20 bg-red-500/10 text-red-300',
    iconBg: 'bg-red-500/10',
    hex: '#EF4444',
    gradientFrom: '#EF4444',
    gradientTo: '#F87171',
    flash: 'rgba(239, 68, 68, 0.3)',
  },
  unknown: {
    label: 'Belum ada data',
    short: 'N/A',
    text: 'text-slate-400',
    bg: 'bg-slate-500/10',
    border: 'border-slate-400/15',
    dot: 'bg-slate-500',
    badge: 'border-slate-400/15 bg-white/5 text-slate-400',
    iconBg: 'bg-slate-500/10',
    hex: '#64748B',
    gradientFrom: '#64748B',
    gradientTo: '#94A3B8',
    flash: 'rgba(100, 116, 139, 0.2)',
  },
  disabled: {
    label: 'Tanpa jadwal',
    short: 'NONAKTIF',
    text: 'text-slate-500',
    bg: 'bg-slate-600/10',
    border: 'border-slate-500/20',
    dot: 'bg-slate-500',
    badge: 'border-slate-500/25 bg-slate-600/15 text-slate-400',
    iconBg: 'bg-slate-600/10',
    hex: '#475569',
    gradientFrom: '#475569',
    gradientTo: '#64748B',
    flash: 'rgba(71, 85, 105, 0.22)',
  },
}

export interface ComponentHealth {
  category: CategoryDef
  lastLog: LogEntry | null
  lastKM: number | null
  lastDate: string | null
  intervalKM: number
  intervalDays: number
  drivenKM: number
  distanceHealth: number
  timeHealth: number
  health: number
  remainingKM: number
  remainingDays: number
  targetKM: number
  targetDate: string
  status: HealthTone
  daysSince: number
  urgency: number
}

function latestLogFor(logs: LogEntry[], category: CategoryKey): LogEntry | null {
  const matching = logs.filter((log) => log.categories.includes(category))
  if (matching.length === 0) return null
  return matching.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date)
    if (a.odometer !== b.odometer) return b.odometer - a.odometer
    return b.createdAt.localeCompare(a.createdAt)
  })[0]
}

function statusFor(
  hasLog: boolean,
  remainingKM: number,
  remainingDays: number,
): HealthTone {
  if (!hasLog) return 'unknown'
  if (remainingKM <= 0 || remainingDays <= 0) return 'overdue'
  if (remainingKM <= 300 || remainingDays <= 14) return 'due'
  return 'healthy'
}

export function getComponentHealth(
  state: GarageState,
  category: CategoryKey,
  today = todayInput(),
): ComponentHealth {
  const def = CATEGORIES[category]
  const rule = state.intervals[category]
  const intervalKM = Math.max(1, rule.km)
  const intervalDays = Math.max(1, rule.days)
  const lastLog = latestLogFor(state.logs, category)
  const currentKM = Math.max(0, state.odometer.current)

  // "Tidak memilih" / nonaktif: komponen tidak dihitung targetnya sama sekali.
  if (rule.enabled === false) {
    return {
      category: def,
      lastLog,
      lastKM: lastLog?.odometer ?? null,
      lastDate: lastLog?.date ?? null,
      intervalKM,
      intervalDays,
      drivenKM: 0,
      distanceHealth: 100,
      timeHealth: 100,
      health: 100,
      remainingKM: 0,
      remainingDays: 0,
      targetKM: 0,
      targetDate: today,
      status: 'disabled',
      daysSince: lastLog ? Math.max(0, daysBetween(lastLog.date, today)) : 0,
      urgency: 999,
    }
  }

  if (!lastLog) {
    return {
      category: def,
      lastLog: null,
      lastKM: null,
      lastDate: null,
      intervalKM,
      intervalDays,
      drivenKM: 0,
      distanceHealth: 100,
      timeHealth: 100,
      health: 100,
      remainingKM: intervalKM,
      remainingDays: intervalDays,
      targetKM: currentKM + intervalKM,
      targetDate: addDays(today, intervalDays),
      status: 'unknown',
      daysSince: 0,
      urgency: 999,
    }
  }

  const drivenKM = Math.max(0, currentKM - lastLog.odometer)
  const daysSince = Math.max(0, daysBetween(lastLog.date, today))
  const distanceHealth = clamp(100 - (drivenKM / intervalKM) * 100, 0, 100)
  const timeHealth = clamp(100 - (daysSince / intervalDays) * 100, 0, 100)
  const health = Math.min(distanceHealth, timeHealth)
  const remainingKM = lastLog.odometer + intervalKM - currentKM
  const remainingDays = intervalDays - daysSince
  const targetKM = lastLog.odometer + intervalKM
  const targetDate = addDays(lastLog.date, intervalDays)
  const status = statusFor(true, remainingKM, remainingDays)
  const kmRatio = remainingKM / intervalKM
  const timeRatio = remainingDays / intervalDays
  const urgency = status === 'overdue' ? Math.min(kmRatio, timeRatio) - 2 : Math.min(kmRatio, timeRatio)

  return {
    category: def,
    lastLog,
    lastKM: lastLog.odometer,
    lastDate: lastLog.date,
    intervalKM,
    intervalDays,
    drivenKM,
    distanceHealth,
    timeHealth,
    health,
    remainingKM,
    remainingDays,
    targetKM,
    targetDate,
    status,
    daysSince,
    urgency,
  }
}

export function getAllHealth(
  state: GarageState,
  keys: CategoryKey[] = Object.keys(CATEGORIES) as CategoryKey[],
): ComponentHealth[] {
  return keys.map((key) => getComponentHealth(state, key))
}

export function getDashboardHealth(state: GarageState): ComponentHealth[] {
  // Dashboard & banner hanya menampilkan komponen dengan jadwal aktif.
  return getAllHealth(state, DASHBOARD_CATEGORIES).filter(
    (health) => health.status !== 'disabled',
  )
}

export function sortByUrgency(healths: ComponentHealth[]): ComponentHealth[] {
  const isInactive = (status: HealthTone) => status === 'unknown' || status === 'disabled'
  return [...healths].sort((a, b) => {
    if (isInactive(a.status) && !isInactive(b.status)) return 1
    if (isInactive(b.status) && !isInactive(a.status)) return -1
    if (a.urgency !== b.urgency) return a.urgency - b.urgency
    return a.remainingKM - b.remainingKM
  })
}

export function getPriority(healths: ComponentHealth[]): ComponentHealth | null {
  const known = healths.filter(
    (item) => item.status !== 'unknown' && item.status !== 'disabled',
  )
  if (known.length === 0) return null
  return sortByUrgency(known)[0]
}

export function averageKmPerDay(state: GarageState): number {
  const points = [...state.odometerHistory]
    .filter((point) => point.km >= 0)
    .sort((a, b) => a.date.localeCompare(b.date))
  if (points.length < 2) return 38

  const lastPoint = points[points.length - 1]
  const cutoff = addDays(todayInput(), -60)
  const windowPoints = points.filter((point) => point.date >= cutoff)
  const firstPoint =
    windowPoints.length >= 2 && windowPoints[windowPoints.length - 1].date !== lastPoint.date
      ? windowPoints[0]
      : points[0]

  const daySpan = Math.max(1, daysBetween(firstPoint.date, lastPoint.date))
  const kmSpan = lastPoint.km - firstPoint.km
  if (kmSpan <= 0) return 38
  return clamp(Math.round(kmSpan / daySpan), 5, 300)
}

export function estimateDaysForKm(remainingKM: number, avgKmPerDay: number): number {
  if (remainingKM <= 0) return 0
  return Math.max(1, Math.ceil(remainingKM / Math.max(avgKmPerDay, 1)))
}

export interface Recommendation {
  title: string
  body: string
  targetKM: number
  remainingKM: number
  remainingDays: number
  estimatedDays: number | null
  urgentBy: 'km' | 'time' | 'both' | 'none'
}

export function buildRecommendation(
  health: ComponentHealth,
  avgKmPerDay: number,
): Recommendation {
  const { category, remainingKM, remainingDays, targetKM, status, targetDate } = health
  const kmDays = estimateDaysForKm(remainingKM, avgKmPerDay)
  const overdueKm = Math.max(0, -remainingKM)
  const overdueDays = Math.max(0, -remainingDays)

  if (status === 'unknown') {
    return {
      title: `Mulai catat ${category.label.toLowerCase()}`,
      body: 'Belum ada riwayat servis. Catat sekali supaya MotoLog AI bisa memprediksi jadwal berikutnya.',
      targetKM: health.targetKM,
      remainingKM: health.remainingKM,
      remainingDays: health.remainingDays,
      estimatedDays: null,
      urgentBy: 'none',
    }
  }

  if (status === 'disabled') {
    return {
      title: `${category.label} tanpa jadwal`,
      body: 'Pengingat komponen ini nonaktif ("tidak memilih"). Aktifkan lagi di Setelan bila ingin memantau target servisnya.',
      targetKM: 0,
      remainingKM: 0,
      remainingDays: 0,
      estimatedDays: null,
      urgentBy: 'none',
    }
  }

  if (status === 'overdue') {
    const urgentBy = overdueKm > 0 && overdueDays > 0 ? 'both' : overdueDays > 0 ? 'time' : 'km'
    const title =
      overdueKm > 0
        ? `${category.label} sudah telat ${formatNumber(overdueKm)} KM`
        : `${category.label} telat ${overdueDays} hari`
    const parts: string[] = []
    if (overdueKm > 0) parts.push(`target ${formatNumber(targetKM)} KM sudah terlewat ${formatNumber(overdueKm)} KM`)
    if (overdueDays > 0) parts.push(`jadwal ${formatDateShort(targetDate)} juga sudah lewat ${overdueDays} hari`)
    return {
      title,
      body: `${parts.join(' dan ')}. Sebaiknya ganti sekarang supaya performa tetap aman.`,
      targetKM,
      remainingKM,
      remainingDays,
      estimatedDays: 0,
      urgentBy,
    }
  }

  if (status === 'due') {
    const urgentBy = kmDays <= remainingDays ? 'km' : 'time'
    const title =
      remainingKM <= 300
        ? `${category.label} tinggal ${formatNumber(remainingKM)} KM lagi`
        : `${category.label} masuk jadwal servis`
    const timeNote =
      remainingDays <= 45
        ? ` Batas waktunya ${remainingDays <= 0 ? 'sudah lewat' : `tinggal ${formatDuration(remainingDays)}`}.`
        : ''
    return {
      title,
      body: `Target ${formatNumber(targetKM)} KM. Dengan rata-rata ${formatNumber(avgKmPerDay)} km/hari, sekitar ${formatDuration(kmDays)} lagi.${timeNote}`,
      targetKM,
      remainingKM,
      remainingDays,
      estimatedDays: kmDays,
      urgentBy,
    }
  }

  return {
    title: `${category.label} masih di zona aman`,
    body: `Sisa ${formatNumber(remainingKM)} KM menuju target ${formatNumber(targetKM)} KM. Terakhir servis ${formatDateShort(health.lastDate ?? '')}.`,
    targetKM,
    remainingKM,
    remainingDays,
    estimatedDays: kmDays,
    urgentBy: 'none',
  }
}

export function remainingKmLabel(health: ComponentHealth): string {
  if (health.status === 'unknown') return 'Belum ada data'
  if (health.status === 'disabled') return 'Tanpa jadwal'
  if (health.remainingKM < 0) return `Telat ${formatNumber(Math.abs(health.remainingKM))} KM`
  return `Sisa ${formatNumber(health.remainingKM)} KM`
}

export function remainingDaysLabel(health: ComponentHealth): string {
  if (health.status === 'unknown') return '—'
  if (health.status === 'disabled') return 'Nonaktif'
  if (health.remainingDays < 0) return `Telat ${Math.abs(health.remainingDays)} hari`
  if (health.remainingDays === 0) return 'Hari ini'
  return `${health.remainingDays} hari lagi`
}

export function getOverallSummary(healths: ComponentHealth[]): {
  overdue: number
  due: number
  healthy: number
  unknown: number
  disabled: number
} {
  return healths.reduce(
    (acc, health) => {
      acc[health.status] += 1
      return acc
    },
    { overdue: 0, due: 0, healthy: 0, unknown: 0, disabled: 0 },
  )
}
