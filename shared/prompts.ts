/**
 * Prompt & skema Gemini yang dipakai BERSAMA oleh:
 *   - client  (src/lib/ocr.ts, src/lib/voice.ts)  → panggilan langsung / mode demo
 *   - server  (functions/api/gemini.ts)           → proxy Cloudflare Pages
 *
 * Satu sumber ke truth supaya tidak ada prompt yang drift antara client & server.
 * Modul ini bebas dependensi (hanya string) sehingga aman di-bundle dua arah.
 */

/* ------------------------------------------------------------------ */
/* OCR spedometer                                                      */
/* ------------------------------------------------------------------ */

export const OCR_PROMPT = `You are a precision odometer OCR engine for motorcycle instrument clusters.
Analyze the photo and extract ONLY the motorcycle's TOTAL ODOMETER (ODO), in kilometres.

Critical rules:
- Distinguish TOTAL ODOMETER from TRIP A / TRIP B, clock/time, speed, fuel range, temperature, and RPM.
- On digital clusters, the total odometer is usually the large persistent number, often labeled "ODO" or shown with "KM". Trip meters are normally smaller, labeled TRIP/A/B, or have a reset dot.
- On the Yamaha Vario 160 negative-LCD cluster, do not confuse the total ODO with the smaller trip meter or the clock.
- The total odometer is usually the biggest number, has no decimal separator, and cannot go backwards.
- Ignore glare, reflections, and partially visible digits. Do not hallucinate digits you cannot see.
- If the image does not clearly show the odometer, return odometer = 0 and explain in note.
- Return digits only as an integer (no dots, commas, "KM", or text).
- Return confidence between 0 and 1.

Return JSON with exactly: { "odometer": number, "confidence": number, "note": string }`

export const OCR_SCHEMA = {
  type: 'OBJECT',
  properties: {
    odometer: { type: 'INTEGER' },
    confidence: { type: 'NUMBER' },
    note: { type: 'STRING' },
  },
  required: ['odometer', 'confidence', 'note'],
} as const

/* ------------------------------------------------------------------ */
/* Input suara                                                         */
/* ------------------------------------------------------------------ */

export const VOICE_PROMPT_BASE = `Kamu adalah parser input suara untuk "Qiride", aplikasi catatan servis motor berbahasa Indonesia.
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

/** Konteks minimal yang dibutuhkan untuk membangun prompt suara. */
export interface VoicePromptContext {
  currentOdometer: number
  today: string
}

export function buildVoicePrompt(context: VoicePromptContext): string {
  return `${VOICE_PROMPT_BASE}

Konteks:
- Odometer aktif saat ini: ${context.currentOdometer} KM
- Hari ini: ${context.today}`
}

export const VOICE_SCHEMA = {
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
