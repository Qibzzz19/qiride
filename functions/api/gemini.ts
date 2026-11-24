/**
 * Proxy AI Qiride — Cloudflare Pages Function.
 *
 * Dipasang di `/api/gemini` secara otomatis oleh Cloudflare Pages (folder
 * `functions/`). Tugasnya menampung API key Gemini di sisi server supaya
 * key TIDAK PERNAH dikirim ke browser.
 *
 * Dua kontrak (dua-duanya POST, JSON):
 *
 *   1. OCR spedometer
 *      req : { imageDataUrl: string, model?: string }
 *      res : { odometer: number, confidence: number, note?: string }
 *
 *   2. Parser suara
 *      req : { kind: 'voice', prompt: string, model?: string }
 *      res : { text: string }   ← JSON mentah dari Gemini, divalidasi client
 *
 * Environment (Cloudflare Pages → Settings → Environment variables):
 *   GEMINI_API_KEY  (wajib, rahasia / encrypt)
 *
 * Prompt & skema di-import dari shared/prompts.ts supaya identik dengan
 * yang dipakai client (tidak ada duplikasi yang bisa drift).
 */

import {
  OCR_PROMPT,
  OCR_SCHEMA,
  VOICE_SCHEMA,
} from '../../shared/prompts'
import { imageDataUrlParts } from '../../shared/data-url'

const DEFAULT_MODEL = 'gemini-3.5-flash-lite'
const ALLOWED_MODELS = new Set([
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
])
/** Urutan cadangan saat model utama sibuk (503/429). */
const MODEL_FALLBACK = [
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
]
/** Model lama yang sudah pensiun → arahkan ke model pengganti. */
const LEGACY_MODEL_MAP: Record<string, string> = {
  'gemini-2.5-flash': 'gemini-3.8-flash',
  'gemini-2.5-flash-lite': 'gemini-3.5-flash-lite',
  'gemini-2.0-flash': 'gemini-3.8-flash',
  'gemini-2.0-flash-lite': 'gemini-3.5-flash-lite',
}
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
const TIMEOUT_MS = 45_000
/** Batas aman foto terkompresi dari client (max 1200px, q0.75). */
const MAX_BODY_BYTES = 6 * 1024 * 1024

interface Env {
  GEMINI_API_KEY?: string
}

interface ProxyEvent {
  request: Request
  env: Env
}

interface GeminiPart {
  text?: string
  inline_data?: { mime_type: string; data: string }
}

interface GeminiPayload {
  candidates?: Array<{ content?: { parts?: GeminiPart[] } }>
  error?: { message?: string }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // Endpoint AI tidak boleh di-cache oleh browser/CDN.
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

function sanitizeModel(raw: unknown): string {
  const value = typeof raw === 'string' ? raw.trim() : ''
  const mapped = LEGACY_MODEL_MAP[value] ?? value
  return ALLOWED_MODELS.has(mapped) ? mapped : DEFAULT_MODEL
}

/** Panggil Gemini `:generateContent` dan kembalikan teks mentah tergabung. */
async function callGeminiText(
  body: Record<string, unknown>,
  model: string,
  apiKey: string,
  timeoutMs = TIMEOUT_MS,
): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(
      `${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        signal: controller.signal,
        body: JSON.stringify(body),
      },
    )

    const payload = (await response.json().catch(() => null)) as
      | GeminiPayload
      | null

    if (!response.ok || payload?.error) {
      const reason =
        payload?.error?.message ?? `Gemini HTTP ${response.status}`
      throw new Error(reason)
    }

    const text =
      payload?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? '')
        .join('')
        .trim() ?? ''

    if (!text) throw new Error('Gemini mengembalikan respons kosong.')
    return text
  } finally {
    clearTimeout(timer)
  }
}

function isRetryableMessage(message: string): boolean {
  return (
    /\b(429|500|502|503|504)\b/.test(message) ||
    /high demand|unavailable|overloaded|temporarily|try again later/i.test(message)
  )
}

/** Coba model utama, lalu turun ke model lain bila server Gemini sibuk. */
async function callGeminiWithFallback(
  body: Record<string, unknown>,
  preferredModel: string,
  apiKey: string,
): Promise<string> {
  const chain = [
    preferredModel,
    ...MODEL_FALLBACK.filter((model) => model !== preferredModel),
  ]
  let lastError: unknown = null
  for (const model of chain) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await callGeminiText(body, model, apiKey)
      } catch (error) {
        lastError = error
        const message = error instanceof Error ? error.message : String(error)
        if (!isRetryableMessage(message)) throw error
        // Timeout: langsung pindah ke model berikutnya, jangan ulangi model yang sama.
        if (/abort|timeout|timed out/i.test(message)) break
        if (attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 700))
        }
      }
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('Gemini tidak merespons.')
}

/** Ambil JSON pertama yang valid dari teks (tahan terhadap bungkus ```json). */
function extractJson(text: string): Record<string, unknown> | null {
  const clean = text
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim()
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

function asInteger(value: unknown): number | null {
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num)) return null
  return Math.round(num)
}

/* ------------------------------------------------------------------ */
/* Handler                                                             */
/* ------------------------------------------------------------------ */

export async function onRequestPost({
  request,
  env,
}: ProxyEvent): Promise<Response> {
  const apiKey = env.GEMINI_API_KEY?.trim()
  if (!apiKey) {
    return jsonResponse(
      {
        error:
          'GEMINI_API_KEY belum diatur di Cloudflare Pages → Settings → Environment variables.',
      },
      503,
    )
  }

  let raw: string
  try {
    raw = await request.text()
  } catch {
    return jsonResponse({ error: 'Body tidak terbaca.' }, 400)
  }
  if (raw.length > MAX_BODY_BYTES) {
    return jsonResponse({ error: 'Payload terlalu besar.' }, 413)
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(raw) as Record<string, unknown>
  } catch {
    return jsonResponse({ error: 'Body bukan JSON yang valid.' }, 400)
  }

  const model = sanitizeModel(payload.model)

  try {
    /* ---------- 2. Parser suara ---------- */
    if (payload.kind === 'voice') {
      const prompt = typeof payload.prompt === 'string' ? payload.prompt.trim() : ''
      if (!prompt) return jsonResponse({ error: 'Prompt kosong.' }, 400)
      if (prompt.length > 8_000) {
        return jsonResponse({ error: 'Prompt terlalu panjang.' }, 400)
      }

      const text = await callGeminiWithFallback(
        {
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 512,
            responseMimeType: 'application/json',
            responseSchema: VOICE_SCHEMA,
          },
        },
        model,
        apiKey,
      )

      if (!extractJson(text)) {
        return jsonResponse({ error: 'Respons AI bukan JSON valid.' }, 502)
      }
      return jsonResponse({ text })
    }

    /* ---------- 1. OCR spedometer ---------- */
    if (typeof payload.imageDataUrl !== 'string' || !payload.imageDataUrl) {
      return jsonResponse({ error: 'imageDataUrl wajib diisi.' }, 400)
    }

    const { mime, base64 } = imageDataUrlParts(payload.imageDataUrl)
    if (!mime.startsWith('image/')) {
      return jsonResponse({ error: 'Format foto tidak valid.' }, 400)
    }

    const text = await callGeminiWithFallback(
      {
        contents: [
          {
            role: 'user',
            parts: [
              { inline_data: { mime_type: mime, data: base64 } },
              { text: OCR_PROMPT },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 256,
          responseMimeType: 'application/json',
          responseSchema: OCR_SCHEMA,
        },
      },
      model,
      apiKey,
    )

    const parsed = extractJson(text)
    if (!parsed) return jsonResponse({ error: 'Respons AI bukan JSON valid.' }, 502)

    const odometer = asInteger(parsed.odometer)
    if (odometer === null || odometer <= 0) {
      return jsonResponse(
        {
          odometer: 0,
          confidence: 0,
          note:
            typeof parsed.note === 'string'
              ? parsed.note
              : 'Odometer tidak terbaca pada foto.',
        },
        200,
      )
    }

    const confidenceRaw = Number(parsed.confidence)
    return jsonResponse({
      odometer,
      confidence: Number.isFinite(confidenceRaw)
        ? Math.max(0, Math.min(1, confidenceRaw))
        : 0.75,
      note: typeof parsed.note === 'string' ? parsed.note : '',
    })
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'Gemini tidak merespons.'
    // 502 supaya client tahu ini gagal server (dan jatuh ke fallback lokal),
    // bukan masalah konfigurasi client.
    return jsonResponse({ error: message }, 502)
  }
}

/** CORS ringan: aman walau nanti app dipisah di domain lain. */
export function onRequestOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  })
}
