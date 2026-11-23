import type { GarageState, LogEntry, OdometerPoint, SetupState } from '../types'
import { addDaysToDate, nowIso, toDateInput } from '../lib/date'
import { createDefaultIntervals } from '../lib/state'
import { DEFAULT_OCR_MODEL } from '../lib/ocr'

function dateAgo(days: number): string {
  return toDateInput(addDaysToDate(new Date(), -days))
}

function timeAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString()
}

function makeLog(
  id: string,
  date: string,
  odometer: number,
  categories: LogEntry['categories'],
  values: Partial<Omit<LogEntry, 'id' | 'date' | 'odometer' | 'categories' | 'createdAt'>> = {},
): LogEntry {
  const daysAgo = Math.round((Date.now() - new Date(`${date}T12:00:00`).getTime()) / 86_400_000)
  return {
    id,
    date,
    odometer,
    categories,
    tags: values.tags ?? [],
    note: values.note ?? '',
    cost: values.cost ?? 0,
    spec: values.spec ?? '',
    photos: values.photos ?? [],
    setupUpdated: values.setupUpdated ?? false,
    odometerSource: values.odometerSource ?? 'manual',
    ocrProvider: values.ocrProvider,
    createdAt: timeAgo(Math.max(0, daysAgo)),
  }
}

export function buildSeedState(): GarageState {
  const currentKM = 18_450
  const updatedAt = timeAgo(2)

  const logs: LogEntry[] = [
    makeLog('seed_engine_oil_16520', dateAgo(40), 16_520, ['engineOil'], {
      tags: ['Ganti oli mesin', 'Filter oli'],
      note: 'Ganti oli mesin rutin. Mesin terasa lebih halus dan suhu stabil setelah ganti ke Motul 5100.',
      cost: 95_000,
      spec: 'Motul 5100 10W-40',
      setupUpdated: true,
    }),
    makeLog('seed_cvt_15900', dateAgo(50), 15_900, ['cvt'], {
      tags: ['Bersih CVT', 'Roller', 'Grease', 'Cek per CVT'],
      note: 'Servis CVT rutin: bersihkan rumah roller, ganti grease, cek per sentri dan ring pulley. Roller 10 g masih bulat.',
      cost: 85_000,
      spec: 'Kawahara 14° · Roller 10 g',
      setupUpdated: true,
    }),
    makeLog('seed_engine_oil_14650', dateAgo(120), 14_650, ['engineOil'], {
      tags: ['Ganti oli mesin', 'Filter oli'],
      note: 'Oli mesin dan filter oli diganti. Level oli dicek ulang setelah test ride.',
      cost: 95_000,
      spec: 'Motul 5100 10W-40',
    }),
    makeLog('seed_brake_11900', dateAgo(130), 11_900, ['brakePads'], {
      tags: ['Kampas rem depan', 'Bersih cakram'],
      note: 'Kampas rem depan diganti, cakram dibersihkan. Rem terasa lebih pakem.',
      cost: 145_000,
      spec: 'Aspira Carbon',
    }),
    makeLog('seed_gear_oil_12300', dateAgo(200), 12_300, ['gearOil'], {
      tags: ['Ganti oli gardan'],
      note: 'Ganti oli gardan. Suara gear saat tarikan rendah lebih halus.',
      cost: 35_000,
      spec: 'Yamalube Gear Oil 80W-90',
    }),
    makeLog('seed_coolant_9800', dateAgo(280), 9_800, ['coolant'], {
      tags: ['Flush radiator', 'Coolant baru'],
      note: 'Flush radiator dan isi coolant baru. Tidak ada kebocoran.',
      cost: 55_000,
      spec: 'Yamaha Coolant 50/50',
    }),
    makeLog('seed_vbelt_5200', dateAgo(300), 5_200, ['vBelt'], {
      tags: ['Ganti V-Belt', 'Cek ring pulley'],
      note: 'V-belt diganti, ring pulley dicek. Tarikan lebih responsif dan getaran hilang.',
      cost: 185_000,
      spec: 'Yamaha OEM V-Belt',
    }),
    makeLog('seed_tires_8000', dateAgo(410), 8_000, ['tires'], {
      tags: ['Ban depan', 'Ban belakang'],
      note: 'Pasang ban IRC Fasti depan & belakang. Langsung balancing.',
      cost: 560_000,
      spec: 'IRC Fasti 80/90-14 & 90/90-14',
    }),
  ]

  const history: OdometerPoint[] = [
    { date: dateAgo(90), km: 15_000, source: 'seed' },
    { date: dateAgo(60), km: 16_000, source: 'seed' },
    { date: dateAgo(30), km: 17_180, source: 'seed' },
    { date: dateAgo(10), km: 17_980, source: 'seed' },
    { date: dateAgo(2), km: currentKM, source: 'quick' },
  ]

  const setup: SetupState = {
    engineOil: 'Motul 5100 10W-40',
    gearOil: 'Yamalube Gear Oil 80W-90',
    coolant: 'Yamaha Coolant 50/50',
    cvtPulley: 'Kawahara 14°',
    cvtRoller: '10 g · 6 pcs',
    cvtPerCvt: '1.500 RPM',
    cvtPerSentri: '1.200 RPM',
    cvtBoss: 'Boss STD + 1 washer',
    vBelt: 'Yamaha OEM',
    frontTire: 'IRC Fasti 80/90-14',
    rearTire: 'IRC Fasti 90/90-14',
    brakePads: 'Aspira Carbon · depan',
    updatedAt: timeAgo(40),
  }

  return {
    version: 1,
    profile: {
      model: 'Vario 160 ABS',
      nickname: 'Si Hitam',
      plate: 'B 1846 MTL',
      year: 2024,
    },
    odometer: {
      current: currentKM,
      updatedAt,
      lastSource: 'quick',
    },
    odometerHistory: history,
    odometerUpdates: [
      {
        id: 'seed_km_update_18450',
        date: dateAgo(2),
        km: currentKM,
        photo: null,
        provider: null,
        createdAt: updatedAt,
      },
    ],
    setup,
    logs,
    intervals: createDefaultIntervals(),
    settings: {
      geminiApiKey: '',
      ocrModel: DEFAULT_OCR_MODEL,
    },
    createdAt: nowIso(),
  }
}
