const DAY_MS = 86_400_000
const ID_LOCALE = 'id-ID'

export function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/** YYYY-MM-DD in the user's local timezone. */
export function toDateInput(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

export function todayInput(): string {
  return toDateInput(new Date())
}

/** Parse a date-only string as local midnight, never via UTC. */
export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return new Date()
  return new Date(year, month - 1, day)
}

export function parseDateValue(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return parseDateOnly(value)
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

export function addDays(value: string, amount: number): string {
  const date = parseDateOnly(value)
  date.setDate(date.getDate() + amount)
  return toDateInput(date)
}

export function addDaysToDate(date: Date, amount: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  next.setDate(next.getDate() + amount)
  return next
}

export function isoDaysAgo(days: number): string {
  return toDateInput(addDaysToDate(new Date(), -days))
}

export function isoDaysAhead(days: number): string {
  return toDateInput(addDaysToDate(new Date(), days))
}

function utcDayNumber(value: string | Date): number {
  const date = typeof value === 'string' ? parseDateValue(value) : value
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS
}

/** Calendar-day difference: positive when `to` is after `from`. */
export function daysBetween(from: string | Date, to: string | Date): number {
  return Math.round(utcDayNumber(to) - utcDayNumber(from))
}

export function daysSince(value: string): number {
  return Math.max(0, daysBetween(value, todayInput()))
}

export function daysUntil(value: string): number {
  return daysBetween(todayInput(), value)
}

export function formatDateShort(value: string): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat(ID_LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parseDateValue(value))
}

export function formatDateCompact(value: string): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat(ID_LOCALE, {
    day: '2-digit',
    month: 'short',
  }).format(parseDateValue(value))
}

export function formatDateLong(value: string): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat(ID_LOCALE, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parseDateValue(value))
}

export function formatMonthYear(value: string): string {
  return new Intl.DateTimeFormat(ID_LOCALE, {
    month: 'long',
    year: 'numeric',
  }).format(parseDateValue(value))
}

export function formatWeekday(value: string): string {
  return new Intl.DateTimeFormat(ID_LOCALE, { weekday: 'long' }).format(parseDateValue(value))
}

export function monthKey(value: string): string {
  return value.slice(0, 7)
}

export function formatRelativeDay(value: string): string {
  const diff = daysBetween(value, todayInput())
  if (diff === 0) return 'Hari ini'
  if (diff === 1) return 'Kemarin'
  if (diff === -1) return 'Besok'
  if (diff > 1) return `${diff} hari lalu`
  return `${Math.abs(diff)} hari lagi`
}

export function formatUpdatedAgo(timestamp: string): string {
  const diff = daysBetween(timestamp, new Date())
  if (diff <= 0) return 'Hari ini'
  if (diff === 1) return 'Kemarin'
  if (diff < 7) return `${diff} hari lalu`
  if (diff < 30) return `${Math.round(diff / 7)} minggu lalu`
  if (diff < 365) return `${Math.round(diff / 30)} bulan lalu`
  return `${Math.round(diff / 365)} tahun lalu`
}

export function formatDuration(days: number): string {
  if (days <= 0) return 'hari ini'
  if (days === 1) return 'besok'
  if (days < 14) return `${days} hari`
  if (days < 60) return `±${Math.round(days / 7)} minggu`
  return `±${Math.round(days / 30)} bulan`
}

export function formatRelativeToNow(timestamp: string): string {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return '—'
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60_000))
  if (minutes < 1) return 'baru saja'
  if (minutes < 60) return `${minutes} menit lalu`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} jam lalu`
  return formatUpdatedAgo(timestamp)
}

export function nowIso(): string {
  return new Date().toISOString()
}
