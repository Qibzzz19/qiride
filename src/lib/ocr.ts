import { imageDataUrlParts } from './image'
import type { AppSettings } from '../types'
import { OCR_PROMPT, OCR_SCHEMA } from '../../shared/prompts'

export const DEFAULT_OCR_MODEL = 'gemini-2.5-flash'

export interface OcrResult {
  odometer: number
  confidence: number
  provider: 'gemini' | 'demo'
  warning?: string
  rawText?: string
}

interface OcrSettings {
  geminiApiKey: string
  ocrModel: string
}

interface ProxyResponse {
  odometer?: unknown
  confidence?: unknown
  note?: unknown
}

const GEMINI_PROMPT = OCR_PROMPT

const proxyUrl = (import.meta.env.VITE_GEMINI_PROXY_URL as string | undefined)?.trim()

function sanitizeModel(model: string): string {
  const candidate = (model || DEFAULT_OCR_MODEL).trim()
  return /^[a-zA-Z0-9._-]+$/.test(candidate) ? candidate : DEFAULT_OCR_MODEL
}

function sanitizeOdometer(value: unknown): number | null {
  const raw =
    typeof value === 'string'
      ? Number(value.replace(/[^\d]/g, ''))
      : typeof value === 'number'
        ? value
        : Number.NaN
  if (!Number.isFinite(raw)) return null
  const rounded = Math.round(raw)
  if (rounded < 1 || rounded > 999_999) return null
  return rounded
}

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

function demoReading(currentKM: number): OcrResult {
  const increment = Math.floor(18 + Math.random() * 118)
  const base = currentKM > 0 ? currentKM : 18_450
  return {
    odometer: Math.round(base + increment),
    confidence: 0.72,
    provider: 'demo',
    warning:
      'Mode demo aktif. Angka diestimasi dari odometer terakhir — koreksi manual atau tambahkan API key Gemini di Setelan untuk OCR asli.',
    rawText: 'demo-mode',
  }
}

async function callGemini(
  imageDataUrl: string,
  settings: OcrSettings,
  timeoutMs = 35_000,
): Promise<OcrResult> {
  const { mime, base64 } = imageDataUrlParts(imageDataUrl)
  const model = sanitizeModel(settings.ocrModel)
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(settings.geminiApiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ inline_data: { mime_type: mime, data: base64 } }, { text: GEMINI_PROMPT }],
            },
          ],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 256,
            responseMimeType: 'application/json',
            responseSchema: OCR_SCHEMA,
          },
        }),
      },
    )

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null
      const message = payload?.error?.message ?? `HTTP ${response.status}`
      throw new Error(message)
    }

    const payload = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> }
        finishReason?: string
      }>
    }
    const text =
      payload.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? '')
        .join('')
        .trim() ?? ''
    const parsed = extractJson(text)
    const odometer = sanitizeOdometer(parsed?.odometer)
    if (!odometer) {
      throw new Error('Angka odometer tidak terbaca jelas dari foto ini.')
    }
    const confidenceRaw = Number(parsed?.confidence)
    const confidence = Number.isFinite(confidenceRaw)
      ? Math.max(0, Math.min(1, confidenceRaw))
      : 0.75

    return {
      odometer,
      confidence,
      provider: 'gemini',
      rawText: text,
    }
  } finally {
    window.clearTimeout(timeout)
  }
}

async function callProxy(imageDataUrl: string, settings: OcrSettings): Promise<OcrResult> {
  if (!proxyUrl) throw new Error('Proxy OCR tidak dikonfigurasi.')
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 35_000)
  try {
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        imageDataUrl,
        model: sanitizeModel(settings.ocrModel),
      }),
    })
    if (!response.ok) throw new Error(`Proxy OCR gagal (HTTP ${response.status}).`)
    const payload = (await response.json()) as ProxyResponse
    const odometer = sanitizeOdometer(payload.odometer)
    if (!odometer) throw new Error('Proxy OCR tidak mengembalikan angka odometer.')
    const confidenceRaw = Number(payload.confidence)
    return {
      odometer,
      confidence: Number.isFinite(confidenceRaw)
        ? Math.max(0, Math.min(1, confidenceRaw))
        : 0.75,
      provider: 'gemini',
    }
  } finally {
    window.clearTimeout(timeout)
  }
}

export async function extractOdometer(
  imageDataUrl: string,
  settings: OcrSettings,
  fallbackKM: number,
): Promise<OcrResult> {
  if (proxyUrl) {
    try {
      return await callProxy(imageDataUrl, settings)
    } catch (error) {
      if (!settings.geminiApiKey) {
        const demo = demoReading(fallbackKM)
        return {
          ...demo,
          warning: `Proxy OCR tidak tersedia. ${demo.warning ?? ''}`,
        }
      }
    }
  }

  if (settings.geminiApiKey.trim()) {
    try {
      return await callGemini(imageDataUrl, settings)
    } catch (error) {
      const demo = demoReading(fallbackKM)
      const reason =
        error instanceof DOMException && error.name === 'AbortError'
          ? 'Gemini timeout.'
          : error instanceof Error
            ? error.message
            : 'Gemini tidak merespons.'
      return {
        ...demo,
        warning: `OCR Gemini gagal: ${reason} Menampilkan perkiraan demo — cek & koreksi angka manual.`,
      }
    }
  }

  // Demo delay keeps the cockpit scanning animation readable.
  await new Promise((resolve) => window.setTimeout(resolve, 2100))
  return demoReading(fallbackKM)
}

export function ocrModeLabel(settings: AppSettings): string {
  if (proxyUrl) return 'Proxy OCR'
  if (settings.geminiApiKey.trim()) return `Gemini · ${sanitizeModel(settings.ocrModel)}`
  return 'Demo mode'
}

export function ocrConfigured(settings: AppSettings): boolean {
  return Boolean(proxyUrl || settings.geminiApiKey.trim())
}

export { proxyUrl as configuredOcrProxy }
