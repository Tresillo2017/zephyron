/**
 * Canvas-based Wrapped image generation for annual listening stats
 * Generates a 1080x1920 PNG showing user's annual listening statistics
 */

import { createCanvas, GlobalFonts, Image as _Image } from '@napi-rs/canvas'
import type { Env } from '../types'

// Try to register Geist fonts (optional - fallback to system fonts)
try {
  GlobalFonts.registerFromPath('worker/assets/fonts/Geist-Bold.woff2', 'Geist Bold')
  GlobalFonts.registerFromPath('worker/assets/fonts/Geist-Regular.woff2', 'Geist')
} catch (error) {
  console.warn('Failed to load custom fonts, will use system fallback:', error)
}

export interface AnnualStats {
  year: number
  total_seconds: number
  top_artists: string // JSON array string
  top_genre: string | null
  longest_streak_days: number
  discoveries_count: number
}

interface GenerateResult {
  success: boolean
  r2_key: string
}

/**
 * Generate a wrapped image showing annual listening statistics
 * Canvas dimensions: 1080x1920
 * Uploads to R2 bucket at wrapped/{year}/{userId}.png
 */
export async function generateWrappedImage(
  userId: string,
  stats: AnnualStats,
  env: Env
): Promise<GenerateResult> {
  const canvas = createCanvas(1080, 1920)
  const ctx = canvas.getContext('2d')

  // Colors (Tailwind purple shades)
  const bgGradientStart = '#1a0b2e' // Dark purple
  const bgGradientEnd = '#0a0a0a' // Black
  const primaryText = '#ffffff' // White
  const accentText = '#a78bfa' // Purple accent
  const cardBg = 'hsl(255, 20%, 15%)'

  // Setup background gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, 1920)
  gradient.addColorStop(0, bgGradientStart)
  gradient.addColorStop(1, bgGradientEnd)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 1080, 1920)

  // Helper function to draw rounded rectangle
  function drawRoundedRect(
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number,
    fill = true
  ) {
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + w - radius, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
    ctx.lineTo(x + w, y + h - radius)
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
    ctx.lineTo(x + radius, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
    if (fill) {
      ctx.fill()
    }
  }

  // Helper to draw card background
  function drawCard(x: number, y: number, w: number, h: number) {
    ctx.fillStyle = cardBg
    drawRoundedRect(x, y, w, h, 12, true)

    // Inset border
    ctx.strokeStyle = 'hsl(255, 20%, 20%)'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  // Helper for centered text
  function drawCenteredText(text: string, x: number, y: number, font: string, color: string) {
    ctx.fillStyle = color
    ctx.font = font
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, x, y)
  }

  // Helper for left-aligned text
  function drawLeftText(text: string, x: number, y: number, font: string, color: string) {
    ctx.fillStyle = color
    ctx.font = font
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, x, y)
  }

  const padding = 40
  const cardWidth = 1080 - padding * 2

  // ═════════════════════════════════════════════════════════════════
  // 1. HEADER CARD (y: 80-240)
  // ═════════════════════════════════════════════════════════════════
  drawCard(padding, 80, cardWidth, 140)
  drawCenteredText('ZEPHYRON', 540, 130, '700 48px Geist, sans-serif', primaryText)
  drawCenteredText(`YOUR ${stats.year} WRAPPED`, 540, 185, '500 32px Geist, sans-serif', accentText)

  // ═════════════════════════════════════════════════════════════════
  // 2. HOURS CARD (y: 280-520)
  // ═════════════════════════════════════════════════════════════════
  drawCard(padding, 280, cardWidth, 220)
  const hours = Math.floor(stats.total_seconds / 3600)
  drawCenteredText(hours.toString(), 540, 350, '700 72px Geist, sans-serif', accentText)
  drawCenteredText('HOURS LISTENED', 540, 440, '500 28px Geist, sans-serif', primaryText)

  // ═════════════════════════════════════════════════════════════════
  // 3. TOP ARTIST CARD (y: 560-800)
  // ═════════════════════════════════════════════════════════════════
  let topArtists: string[] = []
  try {
    topArtists = JSON.parse(stats.top_artists || '[]')
  } catch (error) {
    console.warn('Failed to parse top_artists:', error)
    topArtists = []
  }

  const validArtists = topArtists.filter(Boolean)

  if (validArtists.length > 0) {
    drawCard(padding, 560, cardWidth, 220)
    drawCenteredText('YOUR TOP ARTIST', 540, 600, '500 24px Geist, sans-serif', accentText)

    const topArtist = validArtists[0]
    const truncated = topArtist.length > 35 ? topArtist.substring(0, 32) + '...' : topArtist
    drawCenteredText(truncated, 540, 700, '700 40px Geist, sans-serif', primaryText)
  }

  // ═════════════════════════════════════════════════════════════════
  // 4. TOP 5 ARTISTS CARD (y: 840-1180)
  // ═════════════════════════════════════════════════════════════════
  if (validArtists.length > 1) {
    drawCard(padding, 840, cardWidth, 320)
    drawLeftText('TOP 5 ARTISTS', padding + 30, 880, '500 24px Geist, sans-serif', accentText)

    const displayCount = Math.min(validArtists.length, 5)
    const startY = 930
    const lineHeight = 56

    for (let i = 0; i < displayCount; i++) {
      const y = startY + i * lineHeight
      const artist = validArtists[i]
      const truncated = artist.length > 40 ? artist.substring(0, 37) + '...' : artist

      // Rank number
      drawLeftText(`${i + 1}.`, padding + 30, y, '600 20px Geist Mono, monospace', accentText)
      // Artist name
      drawLeftText(truncated, padding + 80, y, '500 20px Geist, sans-serif', primaryText)
    }
  }

  // ═════════════════════════════════════════════════════════════════
  // 5. DISCOVERIES CARD (y: 1220-1420)
  // ═════════════════════════════════════════════════════════════════
  drawCard(padding, 1220, cardWidth, 180)
  drawCenteredText(stats.discoveries_count.toString(), 540, 1285, '700 56px Geist, sans-serif', accentText)
  drawCenteredText('NEW ARTISTS DISCOVERED', 540, 1350, '500 24px Geist, sans-serif', primaryText)

  // ═════════════════════════════════════════════════════════════════
  // 6. STREAK CARD (y: 1460-1720)
  // ═════════════════════════════════════════════════════════════════
  drawCard(padding, 1460, cardWidth, 240)
  drawCenteredText(stats.longest_streak_days.toString(), 540, 1540, '700 72px Geist, sans-serif', accentText)
  drawCenteredText('DAY STREAK', 540, 1630, '500 28px Geist, sans-serif', primaryText)

  // Genre label if available
  if (stats.top_genre) {
    const truncatedGenre = stats.top_genre.length > 20 ? stats.top_genre.substring(0, 17) + '...' : stats.top_genre
    drawCenteredText(`${truncatedGenre.toUpperCase()} LOVER`, 540, 1690, '400 18px Geist, sans-serif', accentText)
  }

  // ═════════════════════════════════════════════════════════════════
  // 7. FOOTER (y: 1840)
  // ═════════════════════════════════════════════════════════════════
  drawCenteredText('zephyron.app', 540, 1880, '400 16px Geist, sans-serif', accentText)

  // Convert to buffer
  const buffer = canvas.toBuffer('image/png')

  // Upload to R2
  const r2Key = `wrapped/${stats.year}/${userId}.png`
  await env.WRAPPED_IMAGES.put(r2Key, buffer, {
    httpMetadata: {
      contentType: 'image/png',
    },
  })

  return {
    success: true,
    r2_key: r2Key,
  }
}
