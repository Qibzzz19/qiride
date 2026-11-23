import { LOG_CATEGORIES } from '../data/categories'
import type { AppSettings, CategoryKey } from '../types'

export interface VoiceIntent {
  odometer: number | null
  categories: CategoryKey[]
  spec: string
  tags: string[]
  note: string
  cost: number | null
  date: string | null
  provider: 'gemini' | 'local'
  transcript: string
}

interface VoiceContext {
  currentOdometer: number
  today: string
}

/* ------------------------------------------------------------------ */
/* Speech recognition (Web Speech API)                                 */
/* ------------------------------------------------------------------ */

interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
}

interface SpeechRecognitionResultEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>
}

interface SpeechRecognitionErrorEventLike {
  error: string
}

type RecognitionCtor = new () => SpeechRecognitionLike

let activeRecognition: SpeechRecognitionLike | null = null

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const scope = window as unknown as Record<string, unknown>
  const ctor = (scope.SpeechRecognition ?? scope.webkitSpeechRecognition) as
    | RecognitionCtor
    | undefined
  return typeof ctor === 'function' ? ctor : null
}

export function speechSupported(): boolean {
  return getRecognitionCtor() !== null
}

const SPEECH_ERRORS: Record<string, string> = {
  'not-allowed':
    'Izin mikrofon ditolak. Izinkan mikrofon di pengaturan browser, lalu coba lagi.',
  service_not_found: 'Layanan pengenal suara tidak ditemukan di perangkat ini.',
  network: 'Pengenal suara butuh koneksi internet. Coba lagi saat online.',
  'no-speech': 'Tidak ada suara yang terdeteksi. Ucapan terlalu pendek atau terlalu pelan.',
  aborted: 'Perekaman suara dibatalkan.',
  'audio-capture': 'Mikrofon tidak bisa diakses. Pastikan tidak sedang dipakai aplikasi lain.',
}

export function cancelListening(): void {
  if (!activeRecognition) return
  try {
    activeRecognition.abort()
  } catch {
    /* noop */
  }
  activeRecognition = null
}

/**
 * Mulai sekali dengar (id-ID) dan kembalikan transkrip final.
 * Resolve '' jika sesi berakhir tanpa hasil.
 */
export function listenOnce(timeoutMs = 15_000): Promise<string> {
  const Ctor = getRecognitionCtor()
  if (!Ctor) {
    return Promise.reject(
      new Error('Perangkat ini belum mendukung input suara. Gunakan Chrome/Edge terbaru.'),
    )
  }

  cancelListening()

  return new Promise<string>((resolve, reject) => {
    const recognition = new Ctor()
    activeRecognition = recognition
    let settled = false

    const finish = (settle: () => void) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      try {
        recognition.stop()
      } catch {
        /* noop */
      }
      if (activeRecognition === recognition) activeRecognition = null
      settle()
    }

    const timer = window.setTimeout(() => finish(() => resolve('')), timeoutMs)

    recognition.lang = 'id-ID'
    recognition.interimResults = false
    recognition.continuous = false
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      const first = event.results[0]
      const transcript = first?.[0]?.transcript?.trim() ?? ''
      finish(() => resolve(transcript))
    }

    recognition.onerror = (event) => {
      const message = SPEECH_ERRORS[event.error] ?? `Gagal mengenali suara (${event.error}).`
      if (event.error === 'aborted') {
        finish(() => resolve(''))
        return
      }
      finish(() => reject(new Error(message)))
    }

    recognition.onend = () => finish(() => resolve(''))

    try {
      recognition.start()
    } catch (error) {
      finish(() =>
        reject(
          error instanceof Error
            ? error
            : new Error('Mikrofon tidak bisa dijalankan. Coba lagi.'),
        ),
      )
    }
  })
}

/* ------------------------------------------------------------------ */
/* Gemini intent parsing                                               */
/* ------------------------------------------------------------------ */

const VOICE_PROMPT_BASE = `Kamu adalah parser input suara untuk "MotoLog AI", aplikasi catatan servis motor berbahasa Indonesia.
Ubah transkrip ucapan pengguna menjadi data log servis terstruktur.

Kategori yang boleh dipakai (hanya kunci ini):
- engineOil = oli mesin ("ganti oli", "oli mesin") — TANPA kata "gardan"
- gearOil = oli gardan / gear oil / final drive
- cvt = servis CVT, roller, pulley, grease, per CVT, per sentri, boss, washer, "ring washer", kampas ganda
- vBelt = v-belt / van belt / fan belt
- brakePads = kampas rem / brake pad
- tires = ban depan / ban belakang / ganti ban
- coolant = coolant / air radiator

Aturan angka:
- "30 ribu", "tiga puluh ribu" dalam konteks km/kilometer/odometer/jarak = odometer 30000. Jangan tertukar dengan biaya.
- "85 ribu" atau "rp 85.000" dalam konteks biaya/harga/bayar = cost 85000.
- odometer = 0 jika tidak disebut, cost = 0 jika tidak disebut.

Aturan lain:
- date: "YYYY-MM-DD" hanya jika pengguna menyebut hari/tanggal; selain itu string kosong "" (aplikasi pakai hari ini).
- spec: produk/spesifikasi yang disebut (cth. "Motul 5100 10W-40"), jika tidak ada = "".
- tags: maksimal 4 tag aksi pendek berbahasa Indonesia (cth. "Ganti oli", "Pasang", "Bersih"), jika tidak ada = [].
- note: ringkasan padat dalam bahasa Indonesia, maksimal 2 kalimat, dari sudut pandang catatan servis. Jika tidak ada isi berarti = "".
- confidence: keyakinan 0..1.

Balas HANYA dengan JSON valid sesuai skema.`

function buildVoicePrompt(context: VoiceContext): string {
  return `${VOICE_PROMPT_BASE}

Konteks:
- Odometer aktif saat ini: ${context.currentOdometer} KM
- Hari ini: ${context.today}`
}

const VOICE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    odometer: { type: 'INTEGER' },
    categories: { type: 'ARRAY', items: { type: 'STRING' } },
    spec: { type: 'STRING' },
    tags: { type: 'ARRAY', items: { type: 'STRING' } },
    note: { type: 'STRING' },
    cost: { type: 'INTEGER' },
    date: { type: 'STRING' },
    confidence: { type: 'NUMBER' },
  },
  required: ['odometer', 'categories', 'spec', 'tags', 'note', 'cost', 'date', 'confidence'],
} as const

function extractJson(text: string): Record<string, unknown> | null {
  const clean = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  try {
    return JSON.parse(clean) as Record<string, unknown>
  } catch {
    const first = clean.indexOf('{')
    const last = clean.lastIndexOf('}')
    if (first < 0 || last <= first) return null
    try {
      return JSON.parse(clean.slice(first, last + 1)) as Record<string, unknown>
    } catch {
      return null
    }
  }
}

function sanitizeCategories(value: unknown): CategoryKey[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<CategoryKey>()
  for (const item of value) {
    if (typeof item !== 'string') continue
    const key = item.trim() as CategoryKey
    if ((LOG_CATEGORIES as string[]).includes(key)) seen.add(key)
  }
  return LOG_CATEGORIES.filter((key) => seen.has(key))
}

function sanitizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const tags: string[] = []
  for (const item of value) {
    if (typeof item !== 'string') continue
    const tag = item.trim()
    if (tag && tag.length <= 40 && !tags.includes(tag)) tags.push(tag)
    if (tags.length >= 4) break
  }
  return tags
}

function sanitizeKm(value: unknown): number | null {
  const raw =
    typeof value === 'string' ? Number(value.replace(/[^\d]/g, '')) : typeof value === 'number' ? value : Number.NaN
  if (!Number.isFinite(raw)) return null
  const rounded = Math.round(raw)
  if (rounded <= 0 || rounded > 999_999) return null
  return rounded
}

function sanitizeCost(value: unknown): number | null {
  const raw = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(raw) || raw <= 0) return null
  return Math.min(Math.round(raw), 100_000_000)
}

function sanitizeDate(value: unknown, today: string): string | null {
  if (typeof value !== 'string') return null
  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})$/)
  if (!match) return null
  const date = match[1]
  if (date > today) return null
  return date
}

function sanitizeText(value: unknown, max = 400): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, max)
}

async function callGeminiVoice(
  transcript: string,
  settings: AppSettings,
  context: VoiceContext,
): Promise<VoiceIntent> {
  const model = /^[a-zA-Z0-9._-]+$/.test(settings.ocrModel.trim())
    ? settings.ocrModel.trim()
    : 'gemini-2.5-flash'
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 30_000)
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(settings.geminiApiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `${buildVoicePrompt(context)}\n\nTranskrip: "${transcript}"` }] }],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 512,
            responseMimeType: 'application/json',
            responseSchema: VOICE_SCHEMA,
          },
        }),
      },
    )

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null
      throw new Error(payload?.error?.message ?? `HTTP ${response.status}`)
    }

    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }
    const text =
      payload.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? '')
        .join('')
        .trim() ?? ''
    const parsed = extractJson(text)
    if (!parsed) throw new Error('Respons AI tidak berbentuk JSON.')

    return {
      odometer: sanitizeKm(parsed.odometer),
      categories: sanitizeCategories(parsed.categories),
      spec: sanitizeText(parsed.spec, 120),
      tags: sanitizeTags(parsed.tags),
      note: sanitizeText(parsed.note),
      cost: sanitizeCost(parsed.cost),
      date: sanitizeDate(parsed.date, context.today),
      provider: 'gemini',
      transcript,
    }
  } finally {
    window.clearTimeout(timeout)
  }
}

/* ------------------------------------------------------------------ */
/* Local heuristic fallback (offline / tanpa API key)                  */
/* ------------------------------------------------------------------ */

const CATEGORY_PHRASES: Array<{ key: CategoryKey; pattern: RegExp }> = [
  { key: 'gearOil', pattern: /oli\s+gardan|gear\s*oil|oli\s+final|gardan/i },
  {
    key: 'cvt',
    pattern:
      /\bcvt\b|roller|pulley|grease|per\s+sentri|per\s+cvt|boss|washer|ring\s*washer|kampas\s+ganda|rumah\s+roller/i,
  },
  { key: 'vBelt', pattern: /v[\s-]?belt|van\s+belt|fan\s+belt/i },
  { key: 'brakePads', pattern: /kampas\s+rem|brake\s*pad|rem\s+depan|rem\s+belakang/i },
  { key: 'engineOil', pattern: /ganti\s+oli|oli\s+mesin|oli\s+motor|engine\s*oil|ganti\s+oil/i },
  { key: 'tires', pattern: /\bban\b|ganti\s+ban|tire/i },
  { key: 'coolant', pattern: /coolant|air\s+radiator|\bradiator\b/i },
]

function localParseOdometer(text: string): number | null {
  const mentionsKm = /(kilometer|km|odometer|odo|jarak)/i.test(text)
  const ribu = text.match(/(\d+(?:[.,]\d+)?)\s*(?:rb|ribu)\b/i)
  if (ribu && mentionsKm) {
    const value = Math.round(parseFloat(ribu[1].replace(',', '.')) * 1000)
    if (value >= 1_000 && value <= 999_999) return value
  }
  if (!mentionsKm) return null
  const plain = text.match(/\d{1,3}(?:[.\s]\d{3})+|\d{4,6}/g)
  if (!plain) return null
  const values = plain
    .map((token) => Number(token.replace(/[.\s]/g, '')))
    .filter((value) => Number.isFinite(value) && value >= 1_000 && value <= 999_999)
  if (values.length === 0) return null
  return Math.max(...values)
}

function localParseCost(text: string): number | null {
  const mentionsCost = /(biaya|harga|bayar|cukup|rp\.?)/i.test(text)
  if (!mentionsCost) return null
  const ribu = text.match(/(\d+(?:[.,]\d+)?)\s*(?:rb|ribu)\b/i)
  if (ribu) {
    const value = Math.round(parseFloat(ribu[1].replace(',', '.')) * 1000)
    if (value > 0 && value <= 100_000_000) return value
  }
  const rp = text.match(/rp\.?\s*(\d{1,3}(?:[.,]\d{3})+|\d{4,9})/i)
  if (rp) {
    const value = Number(rp[1].replace(/[.,]/g, ''))
    if (Number.isFinite(value) && value > 0 && value <= 100_000_000) return value
  }
  return null
}

function localParseSpec(text: string): string {
  const known = text.match(/\b(motul|yamalube|endless|kawahara|aspira|mpr|ipone|castrol|shell|ahm|yk)\b[^,.]*/i)
  return known ? known[0].trim().replace(/\s+/g, ' ').slice(0, 120) : ''
}

function localParseVoice(transcript: string, context: VoiceContext): VoiceIntent {
  const text = transcript.trim()
  const categories = CATEGORY_PHRASES.filter((entry) => entry.pattern.test(text)).map(
    (entry) => entry.key,
  )

  const tagRules: Array<{ match: RegExp; tag: string }> = [
    { match: /ganti/i, tag: 'Ganti' },
    { match: /bersih/i, tag: 'Bersih' },
    { match: /pasang|pemasangan/i, tag: 'Pasang' },
    { match: /setel|stel/i, tag: 'Setel' },
    { match: /cek|periksa/i, tag: 'Cek' },
    { match: /tambah/i, tag: 'Tambah' },
  ]
  const tags = tagRules.filter((rule) => rule.match.test(text)).map((rule) => rule.tag).slice(0, 4)

  return {
    odometer: localParseOdometer(text),
    categories,
    spec: localParseSpec(text),
    tags,
    note: text.slice(0, 400),
    cost: localParseCost(text),
    date: null,
    provider: 'local',
    transcript: text,
  }
}

/**
 * Parse ucapan menjadi struktur log. Pakai Gemini jika API key tersedia,
 * selalu jatuh ke parser lokal bila gagal/offline agar fitur tetap hidup.
 */
export async function parseVoiceIntent(
  transcript: string,
  settings: AppSettings,
  context: VoiceContext,
): Promise<VoiceIntent> {
  const text = transcript.trim()
  if (!text) throw new Error('Transkrip kosong.')

  if (settings.geminiApiKey.trim()) {
    try {
      return await callGeminiVoice(text, settings, context)
    } catch {
      /* jatuh ke parser lokal */
    }
  }
  await new Promise((resolve) => window.setTimeout(resolve, 350))
  return localParseVoice(text, context)
}

export function voiceProviderLabel(intent: VoiceIntent): string {
  return intent.provider === 'gemini' ? 'Gemini 2.5 Flash' : 'Parser lokal'
}
