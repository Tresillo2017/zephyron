import sharp from 'sharp'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const publicDir = join(__dirname, '..', 'public')

// Read the SVG logo
const svgBuffer = readFileSync(join(publicDir, 'logo.svg'))

console.log('Generating optimized favicons with better sizing...')

// For favicons, we want the logo to fill more of the canvas
// Use a slight background and ensure the logo is prominent

// 16x16 - smallest, needs to be very clear
await sharp(svgBuffer)
  .resize(16, 16, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 }
  })
  .png()
  .toFile(join(publicDir, 'favicon-16x16.png'))
console.log('✓ Generated favicon-16x16.png')

// 32x32 - standard favicon
await sharp(svgBuffer)
  .resize(32, 32, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 }
  })
  .png()
  .toFile(join(publicDir, 'favicon-32x32.png'))
console.log('✓ Generated favicon-32x32.png')

// 180x180 - Apple touch icon
await sharp(svgBuffer)
  .resize(180, 180, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 }
  })
  .png()
  .toFile(join(publicDir, 'apple-touch-icon.png'))
console.log('✓ Generated apple-touch-icon.png')

// 192x192 - Android
await sharp(svgBuffer)
  .resize(192, 192, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 }
  })
  .png()
  .toFile(join(publicDir, 'favicon-192x192.png'))
console.log('✓ Generated favicon-192x192.png')

// 512x512 - high res
await sharp(svgBuffer)
  .resize(512, 512, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 }
  })
  .png()
  .toFile(join(publicDir, 'favicon-512x512.png'))
console.log('✓ Generated favicon-512x512.png')

console.log('✓ All favicons regenerated with optimized sizing!')
