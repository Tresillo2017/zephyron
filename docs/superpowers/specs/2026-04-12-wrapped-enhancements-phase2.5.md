# Wrapped Enhancements — Phase 2.5 Design

**Date:** 2026-04-12  
**Version:** 0.5.0-alpha  
**Status:** Draft

## Overview

Enhance the existing Wrapped image generation system with richer visualizations, monthly image generation, theme-aware customization, and social sharing features. Builds on Phase 2's foundation (annual Wrapped with Canvas API) and Phase 2&3's stats system (heatmaps, weekday patterns).

### Goals

1. **Richer annual Wrapped images** — Add heatmap and weekday pattern visualizations
2. **Monthly Wrapped images** — Generate shareable monthly summary images
3. **Theme-aware generation** — Use user's theme hue for personalized images
4. **Social sharing** — One-click sharing to Twitter/Instagram/Facebook
5. **Multiple aspect ratios** — Instagram Stories (1080x1920), Twitter (1200x630), Square (1080x1080)

## What's Already Built

✅ **Annual Wrapped generation** (`worker/lib/canvas-wrapped.ts`)
- 1080x1920 PNG with 7 cards (header, hours, top artist, top 5, discoveries, streak, footer)
- Cron job generates images on January 2 at 5am PT
- Images stored in R2 `WRAPPED_IMAGES` bucket
- Download endpoint `/api/wrapped/:year/download`

✅ **Stats system** (Profile Phase 2&3)
- Listening heatmap (7x24 hour grid)
- Weekday pattern (Sunday-Saturday breakdown)
- Top artists with hours
- All available via `/api/profile/:userId/stats`

✅ **Frontend UI**
- `WrappedPage.tsx` with download button
- `MonthlyWrappedPage.tsx` (no download yet)

## Phase 2.5 Enhancements

### Slice 1: Enhanced Annual Wrapped Images (2-3 days)

**Add visualization cards to existing Wrapped image:**

**New Card 8: Listening Heatmap** (after discoveries, before streak)
- Title: "YOUR LISTENING PATTERNS"
- 7x24 grid with gradient opacity based on session count
- Day labels (S M T W T F S)
- Hour markers at 00:00, 12:00, 24:00
- Dimensions: 1000x280 (fits between existing cards)

**New Card 9: Weekday Breakdown** (after heatmap, before streak)
- Title: "YOUR WEEK"
- 7 horizontal bars (Sunday-Saturday)
- Show hours per day with accent color
- Dimensions: 1000x240

**Updated layout:**
1. Header (y: 80-220)
2. Hours (y: 260-480)
3. Top Artist (y: 520-740)
4. Top 5 Artists (y: 780-1100)
5. Heatmap (y: 1140-1420) **NEW**
6. Weekday (y: 1460-1700) **NEW**
7. Discoveries + Streak (y: 1740-1960) — combined horizontal layout
8. Footer (y: 1980)

**Final dimensions: 1080x2020** (slightly taller to fit new cards)

**Backend changes:**
- Modify `worker/lib/canvas-wrapped.ts` → Add `drawHeatmapCard()` and `drawWeekdayCard()` functions
- Fetch heatmap/weekday data from stats calculation functions
- Extend `AnnualStats` interface with `heatmap: number[][]` and `weekday_hours: Record<string, number>`
- Update `generateAnnualStats` cron to calculate and pass these fields

**API changes:**
- None (stats already available, just need to pass to canvas generator)

---

### Slice 2: Monthly Wrapped Images (1-2 days)

**Generate downloadable images for monthly summaries:**

**Design:** Lighter, faster monthly design
- Dimensions: 1080x1350 (shorter than annual)
- 5 cards: Header, Hours, Top 3 Artists, Top Genre, Longest Set
- Similar visual style to annual but condensed
- Color: Use user's theme hue

**Cards:**
1. Header: "YOUR MONTH" + "April 2026"
2. Hours: Big number + "hours listened"
3. Top 3 Artists: Numbered list (no hours, just names)
4. Top Genre: Genre name with icon/emoji
5. Longest Set: Set title + artist name

**Backend changes:**
- Create `worker/lib/canvas-monthly-wrapped.ts` (new file)
- Function: `generateMonthlyWrappedImage(userId, stats, env)` → returns R2 key
- Add to monthly stats cron job (`worker/cron/monthly-stats.ts`)
- New table: `monthly_wrapped_images` (or reuse `wrapped_images` with month column)

**Database changes:**
```sql
-- Option 1: Separate table
CREATE TABLE monthly_wrapped_images (
  user_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  r2_key TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, year, month)
);

-- Option 2: Extend wrapped_images
ALTER TABLE wrapped_images ADD COLUMN month INTEGER DEFAULT NULL;
-- year=2026, month=NULL → annual
-- year=2026, month=4 → April 2026
```

**API changes:**
- Update `GET /api/wrapped/monthly/:yearMonth` to include `image_url` field
- Add `GET /api/wrapped/monthly/:yearMonth/download` endpoint
- Frontend: Add download button to `MonthlyWrappedPage.tsx`

---

### Slice 3: Theme-Aware Generation (1 day)

**Use user's theme hue for personalized Wrapped images:**

**Backend changes:**
- Update `generateWrappedImage()` to accept optional `hue` parameter (0-360)
- Replace hardcoded purple colors with HSL calculations:
  ```typescript
  const hue = userHue ?? 255 // default violet
  const accentColor = `hsl(${hue}, 70%, 65%)`
  const cardBg = `hsl(${hue}, 20%, 15%)`
  const borderColor = `hsl(${hue}, 20%, 20%)`
  ```
- Fetch user's hue setting from `user_preferences` table (if exists) or user table
- Pass hue to canvas generator in cron jobs

**Database changes:**
```sql
-- Store user's theme preference
ALTER TABLE user ADD COLUMN theme_hue INTEGER DEFAULT 255;
-- Or create user_preferences table if more settings planned
```

**API changes:**
- Update `PATCH /api/profile/settings` to accept `theme_hue` field
- Frontend: Add "Use this color for your Wrapped" checkbox in theme settings

**Cron changes:**
- Query user's `theme_hue` before generating image
- Pass to `generateWrappedImage(userId, stats, env, hue)`

---

### Slice 4: Social Sharing (1-2 days)

**One-click sharing to social platforms:**

**Frontend changes:**
- Add share buttons to `WrappedPage.tsx` below download button:
  - Twitter/X: Opens composer with image URL + text
  - Facebook: Opens share dialog
  - Copy Link: Copies shareable URL to clipboard
  - Download: Existing functionality

**Share button layout:**
```tsx
<div className="flex justify-center gap-3 pt-4">
  <Button variant="secondary" onClick={handleShareTwitter}>
    <TwitterIcon /> Share to X
  </Button>
  <Button variant="secondary" onClick={handleShareFacebook}>
    <FacebookIcon /> Share to Facebook
  </Button>
  <Button variant="ghost" onClick={handleCopyLink}>
    <LinkIcon /> Copy Link
  </Button>
  <Button variant="primary" onClick={handleDownload}>
    <DownloadIcon /> Download
  </Button>
</div>
```

**Shareable URL:**
- Public route: `/wrapped/:year/:userId` (new page)
- Shows user's Wrapped data if profile is public
- Meta tags for social preview (Open Graph, Twitter Cards)
- Image preview URL: `/api/wrapped/:year/preview/:userId` (public endpoint)

**Backend changes:**
- Add public endpoint: `GET /api/wrapped/:year/preview/:userId`
  - Returns 403 if profile is private
  - Returns 404 if no image exists
  - Returns image with proper cache headers
  - No auth required (public sharing)

**Frontend changes:**
- Create `src/pages/PublicWrappedPage.tsx` at `/wrapped/:year/:userId`
- Add Open Graph meta tags dynamically
- Show full Wrapped stats if profile is public

**Privacy considerations:**
- Only generate shareable URL if user's profile is public
- Show privacy warning before sharing
- "Make profile public to share" prompt if private

---

### Slice 5: Multiple Aspect Ratios (2 days)

**Generate images in multiple formats for different platforms:**

**Formats:**
1. **Stories** (1080x1920) — Instagram/Facebook Stories (current default)
2. **Twitter** (1200x630) — Twitter/X card format (horizontal)
3. **Square** (1080x1080) — Instagram feed post

**Backend changes:**
- Update `generateWrappedImage()` to accept `format` parameter
- Create format-specific layouts:
  - Stories: Existing 1080x1920 vertical layout
  - Twitter: Horizontal 1200x630 with 3-4 key stats side-by-side
  - Square: 1080x1080 grid layout (2x2 cards)
- Store all 3 formats in R2:
  - `wrapped/2026/{userId}-stories.png`
  - `wrapped/2026/{userId}-twitter.png`
  - `wrapped/2026/{userId}-square.png`
- Generate all formats in cron job

**Database changes:**
```sql
ALTER TABLE wrapped_images ADD COLUMN format TEXT DEFAULT 'stories';
-- Or store all formats in single JSON column
ALTER TABLE wrapped_images ADD COLUMN r2_keys TEXT; -- JSON: {stories: "...", twitter: "...", square: "..."}
```

**API changes:**
- `GET /api/wrapped/:year/download?format=stories|twitter|square`
- Default to `stories` if format not specified

**Frontend changes:**
- Add format selector to `WrappedPage.tsx`:
  ```tsx
  <TabBar
    tabs={[
      { id: 'stories', label: 'Stories (9:16)' },
      { id: 'square', label: 'Square (1:1)' },
      { id: 'twitter', label: 'Twitter (1.91:1)' }
    ]}
    activeTab={selectedFormat}
    onTabChange={setSelectedFormat}
  />
  ```
- Show preview of selected format
- Download button uses selected format

---

## Implementation Priority

**Recommended order:**

1. **Slice 1** (Enhanced Annual Images) — Most immediate value, showcases new stats
2. **Slice 2** (Monthly Images) — Increases engagement frequency
3. **Slice 3** (Theme-Aware) — Nice personalization touch
4. **Slice 4** (Social Sharing) — Growth/virality feature
5. **Slice 5** (Multiple Formats) — Polish, can be deferred

**MVP: Slices 1-3** (4-6 days total)
**Full Phase 2.5: All slices** (7-10 days total)

---

## Technical Considerations

### Canvas Rendering Performance
- Each image generation takes ~200-500ms
- Annual cron processes all users sequentially
- For 1000 users: ~5-8 minutes total
- Within cron job time limits (10 minutes)
- Multiple formats: 3x time, still acceptable

### Font Loading
- Current implementation tries to load Geist from `worker/assets/fonts/`
- Falls back to system fonts if not found
- Consider embedding fonts as base64 for reliability

### R2 Storage
- Annual Wrapped: ~500KB per user per year (3 formats = 1.5MB)
- Monthly Wrapped: ~300KB per user per month (3 formats = 900KB)
- 1000 users, 1 year: 1.5GB annual + 10.8GB monthly = ~12GB total
- R2 pricing: $0.015/GB/month = ~$0.18/month
- Very affordable

### Caching Strategy
- Wrapped images never change once generated
- Cache-Control: `public, max-age=31536000` (1 year)
- CloudFlare CDN will cache R2 responses
- No need for separate CDN

---

## Success Metrics

**Phase 2.5 Completion Criteria:**
- [ ] Annual Wrapped includes heatmap and weekday cards
- [ ] Monthly Wrapped images generate automatically on 1st of month
- [ ] Images use user's theme hue for personalization
- [ ] Share buttons work for Twitter, Facebook, copy link
- [ ] Public Wrapped pages render with proper Open Graph tags
- [ ] Download button offers 3 format options
- [ ] All images < 600KB per format
- [ ] Cron jobs complete within time limits
- [ ] Privacy controls respected (no sharing if profile private)

**User Experience Goals:**
- Users share Wrapped images on social media
- Monthly Wrapped drives consistent engagement
- Images feel personal and on-brand
- Download process is < 3 seconds
- Formats look good on all target platforms

**Technical Goals:**
- Image generation < 500ms per format
- R2 storage costs < $1/month for 1000 users
- No canvas rendering errors
- Font loading reliable (no missing glyphs)
- Cron jobs maintain 99.9% success rate

---

## Open Questions

1. **Monthly image generation trigger:** Run monthly cron on the 2nd (like annual) or 1st?
   - Recommendation: 2nd at 6am PT (gives stragglers time to finish month)

2. **Format selection UI:** Tabs, dropdown, or radio buttons?
   - Recommendation: Horizontal tab bar (consistent with rest of app)

3. **Public Wrapped URLs:** Should we show other users' Wrapped in-app or just via share?
   - Recommendation: In-app discovery for public profiles (browse others' Wrapped)

4. **Heatmap card complexity:** 7x24 grid might be hard to read at image scale
   - Recommendation: Test readability, may need larger cells or simplified version

5. **Social auth for direct posting:** Should we add Twitter OAuth to post directly?
   - Recommendation: Phase 3 feature, links are good enough for Phase 2.5

---

## Appendix: Canvas Code Patterns

### Drawing Heatmap Card

```typescript
function drawHeatmapCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  data: number[][],
  accentColor: string
) {
  // Card background
  drawCard(x, y, w, h)
  
  // Title
  drawCenteredText('YOUR LISTENING PATTERNS', x + w/2, y + 30, '500 20px Geist', '#888')
  
  // Grid dimensions
  const gridX = x + 50
  const gridY = y + 70
  const cellWidth = (w - 100) / 24
  const cellHeight = 20
  
  // Day labels
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  
  // Find max for opacity scaling
  const maxValue = Math.max(...data.flat())
  
  // Draw grid
  for (let day = 0; day < 7; day++) {
    // Day label
    drawLeftText(days[day], gridX - 20, gridY + day * cellHeight + cellHeight/2, '400 12px Geist', '#666')
    
    for (let hour = 0; hour < 24; hour++) {
      const value = data[day][hour]
      const opacity = maxValue > 0 ? value / maxValue : 0
      
      ctx.fillStyle = `hsl(${accentColor}, ${opacity})`
      ctx.fillRect(
        gridX + hour * cellWidth,
        gridY + day * cellHeight,
        cellWidth - 1,
        cellHeight - 1
      )
    }
  }
  
  // Hour markers
  drawCenteredText('00:00', gridX, gridY + 7 * cellHeight + 20, '400 10px Geist Mono', '#666')
  drawCenteredText('12:00', gridX + 12 * cellWidth, gridY + 7 * cellHeight + 20, '400 10px Geist Mono', '#666')
  drawCenteredText('24:00', gridX + 24 * cellWidth, gridY + 7 * cellHeight + 20, '400 10px Geist Mono', '#666')
}
```

### Drawing Weekday Card

```typescript
function drawWeekdayCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  weekdayData: { day: string; hours: number }[],
  accentColor: string
) {
  // Card background
  drawCard(x, y, w, h)
  
  // Title
  drawCenteredText('YOUR WEEK', x + w/2, y + 30, '500 20px Geist', '#888')
  
  const barX = x + 80
  const barY = y + 70
  const barWidth = w - 160
  const barHeight = 20
  const barSpacing = 8
  
  const maxHours = Math.max(...weekdayData.map(d => d.hours))
  
  weekdayData.forEach((item, index) => {
    const yPos = barY + index * (barHeight + barSpacing)
    
    // Day label
    drawLeftText(item.day, x + 30, yPos + barHeight/2, '500 14px Geist', '#ccc')
    
    // Background bar
    ctx.fillStyle = '#222'
    ctx.fillRect(barX, yPos, barWidth, barHeight)
    
    // Filled bar
    const fillWidth = maxHours > 0 ? (item.hours / maxHours) * barWidth : 0
    ctx.fillStyle = accentColor
    ctx.fillRect(barX, yPos, fillWidth, barHeight)
    
    // Hours label
    drawLeftText(`${item.hours}h`, barX + barWidth + 10, yPos + barHeight/2, '500 14px Geist Mono', accentColor)
  })
}
```

---

## References

- Phase 2 Spec: `docs/superpowers/specs/2026-04-09-analytics-wrapped-design.md`
- Profile Phase 2&3 Spec: `docs/superpowers/specs/2026-04-11-profile-phase2-3-design.md`
- Existing Canvas Code: `worker/lib/canvas-wrapped.ts`
- Annual Cron: `worker/cron/annual-stats.ts`
