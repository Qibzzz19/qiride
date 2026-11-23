import sharp from 'sharp'
import { readFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const svg = await readFile(join(root, 'public', 'favicon.svg'))
const iconsDir = join(root, 'public', 'icons')
await mkdir(iconsDir, { recursive: true })

const targets = [
  { file: join(iconsDir, 'icon-192.png'), size: 192 },
  { file: join(iconsDir, 'icon-512.png'), size: 512 },
  { file: join(iconsDir, 'icon-maskable-512.png'), size: 512 },
  { file: join(root, 'public', 'apple-touch-icon.png'), size: 180 },
  { file: join(root, 'public', 'favicon-32.png'), size: 32 },
]

for (const target of targets) {
  await sharp(svg, { density: 384 })
    .resize(target.size, target.size, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toFile(target.file)
  console.log(`generated ${target.file}`)
}
