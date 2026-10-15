import { create } from 'zustand'

/** Appearance settings, a trimmed port of bleh's registry. Mirrored to <html> as `data-bleh--<key>`. */
export type ThemeId = 'light' | 'ink' | 'rose_pine_dawn' | 'dark' | 'darker' | 'oled' | 'rose_pine' | 'kanagawa_dragon'
export type AccentType = 'default' | 'colour'
export type FontChoice = 'font_2026' | 'font_2025' | 'hyperlegible'
export type AvatarRadius = 'circle' | 'squircle' | 'square'

export interface Settings {
  theme: ThemeId
  accent_type: AccentType
  hue: number
  sat: number
  lit: number
  solarium: boolean
  noise: number
  sat_bg: number
  grid_glow: boolean
  font_serif: boolean
  font_choice: FontChoice
  avatar_radius: AvatarRadius
  compact: boolean
  reduced_motion: boolean
  show_scroller: boolean
  underline_links: boolean
}

export const THEME_IDS: readonly ThemeId[] = ['light', 'ink', 'rose_pine_dawn', 'dark', 'darker', 'oled', 'rose_pine', 'kanagawa_dragon']
export const LIGHT_THEMES: ReadonlySet<ThemeId> = new Set<ThemeId>(['light', 'ink', 'rose_pine_dawn'])
export const THEME_LABELS: Record<ThemeId, string> = {
  light: 'Light', ink: 'Ink', rose_pine_dawn: 'Rosé Pine Dawn', dark: 'Ash', darker: 'Darker',
  oled: 'Void', rose_pine: 'Rosé Pine', kanagawa_dragon: 'Kanagawa Dragon',
}

/** The default accent is Zephyron violet; --default-hue in tokens.css must match. */
export const DEFAULT_ACCENT = { hue: 285, sat: 1.28, lit: 0.9 } as const

export const DEFAULTS: Settings = {
  theme: 'dark',
  accent_type: 'default',
  ...DEFAULT_ACCENT,
  solarium: true,
  noise: 0.25,
  sat_bg: 1,
  grid_glow: true,
  font_serif: true,
  font_choice: 'font_2026',
  avatar_radius: 'circle',
  compact: false,
  reduced_motion: false,
  show_scroller: false,
  underline_links: false,
}

const STORAGE_KEY = 'zephyron_settings'
const LEGACY_THEME_KEY = 'zephyron_theme'
const ATTR = 'data-bleh--'
const LOW_LIT_CONTRAST = 0.3

const clamp = (v: unknown, d: number, min: number, max: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d

/** Drops unknown keys and wrong types so a stale or hand-edited blob can't break the UI. */
export function sanitize(raw: unknown): Settings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const bool = (k: keyof Settings) => (typeof r[k] === 'boolean' ? (r[k] as boolean) : (DEFAULTS[k] as boolean))
  const pick = <T extends string>(k: keyof Settings, allowed: readonly T[]) =>
    allowed.includes(r[k] as T) ? (r[k] as T) : (DEFAULTS[k] as T)
  return {
    theme: pick('theme', THEME_IDS),
    accent_type: pick('accent_type', ['default', 'colour'] as const),
    hue: clamp(r.hue, DEFAULTS.hue, 0, 360),
    sat: clamp(r.sat, DEFAULTS.sat, 0, 4),
    lit: clamp(r.lit, DEFAULTS.lit, 0, 1.5),
    solarium: bool('solarium'),
    noise: clamp(r.noise, DEFAULTS.noise, 0, 1),
    sat_bg: clamp(r.sat_bg, DEFAULTS.sat_bg, 0, 5),
    grid_glow: bool('grid_glow'),
    font_serif: bool('font_serif'),
    font_choice: pick('font_choice', ['font_2026', 'font_2025', 'hyperlegible'] as const),
    avatar_radius: pick('avatar_radius', ['circle', 'squircle', 'square'] as const),
    compact: bool('compact'),
    reduced_motion: bool('reduced_motion'),
    show_scroller: bool('show_scroller'),
    underline_links: bool('underline_links'),
  }
}

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw !== null) return sanitize(JSON.parse(raw))
    // First run after the bleh redesign: carry over the old theme / reduce-motion prefs.
    const legacy = JSON.parse(localStorage.getItem(LEGACY_THEME_KEY) ?? 'null') as { theme?: string; customHue?: number | null } | null
    const reduce = localStorage.getItem('reduceMotion') === 'true'
    return sanitize({
      ...(legacy?.theme ? { theme: legacy.theme } : {}),
      ...(typeof legacy?.customHue === 'number' ? { accent_type: 'colour', hue: legacy.customHue } : {}),
      reduced_motion: reduce,
    })
  } catch {
    return { ...DEFAULTS }
  }
}

function setOrRemove(root: HTMLElement, name: string, value: string | null) {
  if (value === null) root.removeAttribute(name)
  else root.setAttribute(name, value)
}

/** Writes every setting to <html>. Idempotent; index.html's prepaint script mirrors it. */
export function applySettings(s: Settings, root: HTMLElement = document.documentElement) {
  const type = LIGHT_THEMES.has(s.theme) ? 'light' : 'dark'
  root.setAttribute(`${ATTR}theme`, s.theme)
  root.setAttribute(`${ATTR}theme_type`, type)
  root.setAttribute('data-theme', type)

  const bubble = (key: keyof Settings) =>
    setOrRemove(root, ATTR + key, s[key] === DEFAULTS[key] ? null : String(s[key]))
  for (const key of ['solarium', 'grid_glow', 'font_serif', 'font_choice', 'avatar_radius', 'compact', 'reduced_motion', 'show_scroller', 'underline_links'] as const) bubble(key)

  const css = (name: string, value: number, def: number) =>
    value === def ? root.style.removeProperty(`--${name}`) : root.style.setProperty(`--${name}`, String(value))
  css('noise-opacity', s.noise, DEFAULTS.noise)
  css('sat-bg', s.sat_bg, DEFAULTS.sat_bg)

  const accented = s.accent_type !== 'default'
  for (const channel of ['hue', 'sat', 'lit'] as const) {
    if (accented) root.style.setProperty(`--${channel}-user`, String(s[channel]))
    else root.style.removeProperty(`--${channel}-user`)
  }
  root.classList.toggle('increase-btn-contrast', accented && s.lit <= LOW_LIT_CONTRAST)
  root.classList.toggle('reduce-motion', s.reduced_motion)
}

/** Only values that differ from the defaults are stored, so new defaults reach existing users. */
function persist(s: Settings) {
  const diff = Object.fromEntries(Object.entries(s).filter(([k, v]) => v !== DEFAULTS[k as keyof Settings]))
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(diff)) } catch { /* storage full or blocked */ }
}

interface SettingsState {
  settings: Settings
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  setAccent: (hue: number, sat?: number, lit?: number) => void
  resetAccent: () => void
  reset: () => void
}

const initial = load()
applySettings(initial)

export const useSettingsStore = create<SettingsState>((set) => {
  const update = (patch: Partial<Settings>) =>
    set((state) => {
      const settings = sanitize({ ...state.settings, ...patch })
      applySettings(settings)
      persist(settings)
      return { settings }
    })
  return {
    settings: initial,
    set: (key, value) => update({ [key]: value }),
    setAccent: (hue, sat = DEFAULT_ACCENT.sat, lit = DEFAULT_ACCENT.lit) => update({ accent_type: 'colour', hue, sat, lit }),
    resetAccent: () => update({ accent_type: 'default', ...DEFAULT_ACCENT }),
    reset: () => update({ ...DEFAULTS }),
  }
})

/** Accent presets as oklch hues (sat/lit stay at the bleh defaults). */
export const ACCENT_PRESETS: { id: string; label: string; hue: number }[] = [
  { id: 'violet', label: 'Violet', hue: 285 },
  { id: 'blue', label: 'Blue', hue: 250 },
  { id: 'cyan', label: 'Cyan', hue: 215 },
  { id: 'teal', label: 'Teal', hue: 185 },
  { id: 'green', label: 'Green', hue: 150 },
  { id: 'yellow', label: 'Yellow', hue: 100 },
  { id: 'orange', label: 'Orange', hue: 60 },
  { id: 'red', label: 'Red', hue: 25 },
  { id: 'pink', label: 'Pink', hue: 350 },
  { id: 'rose', label: 'Rose', hue: 8 },
]
