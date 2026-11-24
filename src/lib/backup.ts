import { CATEGORIES, isCategoryKey } from '../data/categories'
import type { CategoryKey, GarageState } from '../types'
import { normalizeGarageState } from './state'

interface BackupPayload {
  app: 'motolog-ai'
  version: 1
  exportedAt: string
  data: GarageState
}

function csvCell(value: string | number): string {
  let text = String(value ?? '')
  if (/^[=+\-@]/.test(text)) text = `'${text}`
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 4000)
}

function stamp(): string {
  const date = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function exportJsonBackup(state: GarageState): string {
  const payload: BackupPayload = {
    app: 'motolog-ai',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: state,
  }
  const filename = `qiride-backup-${stamp()}.json`
  downloadBlob(
    filename,
    new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
  )
  return filename
}

export function exportLogsCsv(state: GarageState): string {
  const header = [
    'tanggal',
    'odometer_km',
    'kategori',
    'tag',
    'spesifikasi_part',
    'biaya_idr',
    'catatan',
    'jumlah_foto',
    'setup_diperbarui',
  ]
  const rows = [...state.logs]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((log) =>
      [
        log.date,
        log.odometer,
        log.categories.map((key) => CATEGORIES[key].label).join(' | '),
        log.tags.join(' | '),
        log.spec,
        log.cost,
        log.note.replace(/\r?\n/g, ' '),
        log.photos.length,
        log.setupUpdated ? 'ya' : 'tidak',
      ]
        .map(csvCell)
        .join(','),
    )
  const csv = `\uFEFF${header.join(',')}\r\n${rows.join('\r\n')}\r\n`
  const filename = `qiride-logbook-${stamp()}.csv`
  downloadBlob(filename, new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  return filename
}

export async function parseBackupFile(file: File): Promise<GarageState> {
  if (file.size > 40 * 1024 * 1024) {
    throw new Error('File backup lebih dari 40 MB. Pisahkan foto atau gunakan backup yang lebih kecil.')
  }
  const text = await file.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('File bukan JSON yang valid.')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Struktur backup tidak dikenali.')
  }

  const payload = parsed as { app?: string; data?: unknown }
  const rawState =
    payload.app === 'motolog-ai' && payload.data && typeof payload.data === 'object'
      ? payload.data
      : parsed

  const state = normalizeGarageState(rawState)
  if (!state) {
    throw new Error('Data backup tidak memiliki odometer atau struktur Qiride yang valid.')
  }

  // Ensure every known category survived normalization.
  for (const key of Object.keys(CATEGORIES) as CategoryKey[]) {
    if (!state.intervals[key]) state.intervals[key] = { km: 2000, days: 60, enabled: true }
  }
  state.logs = state.logs.filter(
    (log) => log.categories.length > 0 && log.categories.every((key) => isCategoryKey(key)),
  )
  return state
}

export function backupSizeLabel(state: GarageState): string {
  const bytes = new Blob([JSON.stringify(state)]).size
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
