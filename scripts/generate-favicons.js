import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const publicDir = join(__dirname, '..', 'public')

// Read the SVG logo
const svgBuffer = readFileSync(join(publicDir, 'logo.svg'))

// Generate favicons in multiple sizes
const sizes = [16, 32, 180, 192, 512]

console.log('Generating favicons...')

for (const size of sizes) {
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(join(publicDir, `favicon-${size}x${size}.png`))
  console.log(`✓ Generated favicon-${size}x${size}.png`)
}

// Generate apple-touch-icon
await sharp(svgBuffer)
  .resize(180, 180)
  .png()
  .toFile(join(publicDir, 'apple-touch-icon.png'))
console.log('✓ Generated apple-touch-icon.png')

console.log('✓ All favicons generated successfully!')
