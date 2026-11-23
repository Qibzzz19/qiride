export interface CompressedImage {
  dataUrl: string
  width: number
  height: number
  originalBytes: number
  bytes: number
  mime: string
}

const MAX_WIDTH = 1200
const MAX_HEIGHT = 1600
const QUALITY = 0.75
const MAX_INPUT_BYTES = 24 * 1024 * 1024

type BitmapSource = ImageBitmap | HTMLImageElement

async function loadBitmap(file: File): Promise<BitmapSource> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      // Fall back to an <img> decoder (also handles some unsupported bitmap paths).
    }
  }

  const url = URL.createObjectURL(file)
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('Gambar tidak bisa dibuka di browser ini.'))
      image.src = url
    })
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 5000)
  }
}

function sourceSize(source: BitmapSource): { width: number; height: number } {
  if (source instanceof ImageBitmap) {
    return { width: source.width, height: source.height }
  }
  return { width: source.naturalWidth, height: source.naturalHeight }
}

function approximateBytes(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] ?? ''
  return Math.round((base64.length * 3) / 4)
}

export async function compressPhoto(file: File): Promise<CompressedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('File harus berupa foto (JPG, PNG, WEBP, atau HEIC).')
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('Ukuran foto terlalu besar. Maksimal 24 MB.')
  }

  const source = await loadBitmap(file)
  const { width: sourceWidth, height: sourceHeight } = sourceSize(source)
  if (!sourceWidth || !sourceHeight) {
    throw new Error('Ukuran foto tidak terbaca. Coba foto lain.')
  }

  const widthScale = MAX_WIDTH / sourceWidth
  const heightScale = MAX_HEIGHT / sourceHeight
  const scale = Math.min(1, widthScale, heightScale)
  const targetWidth = Math.max(1, Math.round(sourceWidth * scale))
  const targetHeight = Math.max(1, Math.round(sourceHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas tidak tersedia di perangkat ini.')

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, targetWidth, targetHeight)
  if ('close' in source && typeof source.close === 'function') source.close()

  let dataUrl = canvas.toDataURL('image/webp', QUALITY)
  let mime = 'image/webp'
  if (!dataUrl.startsWith('data:image/webp')) {
    dataUrl = canvas.toDataURL('image/jpeg', 0.8)
    mime = 'image/jpeg'
  }

  return {
    dataUrl,
    width: targetWidth,
    height: targetHeight,
    originalBytes: file.size,
    bytes: approximateBytes(dataUrl),
    mime,
  }
}

export function imageDataUrlParts(dataUrl: string): { mime: string; base64: string } {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl)
  if (!match) throw new Error('Format foto tidak valid.')
  return { mime: match[1], base64: match[2] }
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB'
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
