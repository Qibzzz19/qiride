/**
 * Parser data URL gambar — dipakai client (kompresi foto) dan
 * proxy server (memecah foto sebelum dikirim ke Gemini).
 * Murni, tanpa API browser, aman di-bundle dua arah.
 */
export function imageDataUrlParts(dataUrl: string): { mime: string; base64: string } {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl)
  if (!match) throw new Error('Format foto tidak valid.')
  return { mime: match[1], base64: match[2] }
}
