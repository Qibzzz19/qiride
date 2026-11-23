const idNumber = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 })
const idCurrency = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0'
  return idNumber.format(Math.round(value))
}

export function formatKm(value: number): string {
  return `${formatNumber(Math.max(0, value))}`
}

export function formatKmSigned(value: number): string {
  if (value < 0) return `-${formatNumber(Math.abs(value))}`
  return formatNumber(value)
}

export function formatCurrency(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return 'Rp 0'
  return idCurrency.format(Math.round(value)).replace(/\u00a0/g, ' ')
}

export function formatCurrencyCompact(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return 'Rp 0'
  if (value >= 1_000_000) {
    return `Rp ${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(value / 1_000_000)} jt`
  }
  if (value >= 10_000) {
    return `Rp ${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(value / 1000)} rb`
  }
  return formatCurrency(value)
}

export function formatPercent(value: number): string {
  return `${Math.round(clamp(value, 0, 100))}%`
}

export function pluralID(count: number, word: string): string {
  return `${count} ${word}`
}

export function uid(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

export function formatDigitsWithSeparator(value: string): string {
  const digits = digitsOnly(value).slice(0, 7)
  if (!digits) return ''
  return formatNumber(Number(digits))
}

export function formatDateNumericInput(value: string): string {
  return value
}

export function safeInt(value: string | number, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(/[^\d]/g, ''))
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback
}
