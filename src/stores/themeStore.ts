import { create } from 'zustand'

type ThemeName = 'dark' | 'darker' | 'oled' | 'light'
type AccentName = 'violet' | 'blue' | 'cyan' | 'teal' | 'green' | 'yellow' | 'orange' | 'red' | 'pink' | 'rose'

interface ThemeState {
  theme: ThemeName
  accent: AccentName
  customHue: number | null
  setTheme: (theme: ThemeName) => void
  setAccent: (accent: AccentName) => void
  setCustomHue: (hue: number) => void
}

const STORAGE_KEY = 'zephyron_theme'

function loadPrefs(): { theme: ThemeName; accent: AccentName; customHue: number | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { theme: 'dark', accent: 'violet', customHue: null }
}

function applyToDOM(theme: ThemeName, accent: AccentName, customHue: number | null) {
  const root = document.documentElement

  // Theme
  if (theme === 'dark') {
    root.removeAttribute('data-theme')
  } else {
    root.setAttribute('data-theme', theme)
  }

  // Accent
  if (customHue !== null) {
    root.removeAttribute('data-accent')
    root.style.setProperty('--hue', String(customHue))
  } else {
    root.setAttribute('data-accent', accent)
    root.style.removeProperty('--hue')
  }

  // Persist
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme, accent, customHue }))
}

// Apply on load before React mounts
const initial = loadPrefs()
applyToDOM(initial.theme, initial.accent, initial.customHue)

export const useThemeStore = create<ThemeState>((set) => ({
  ...initial,

  setTheme: (theme) => {
    set((s) => {
      applyToDOM(theme, s.accent, s.customHue)
      return { theme }
    })
  },

  setAccent: (accent) => {
    set((s) => {
      applyToDOM(s.theme, accent, null)
      return { accent, customHue: null }
    })
  },

  setCustomHue: (hue) => {
    set((s) => {
      applyToDOM(s.theme, s.accent, hue)
      return { customHue: hue }
    })
  },
}))

export const THEMES: { id: ThemeName; label: string; description: string }[] = [
  { id: 'dark', label: 'Dark', description: 'Default dark theme' },
  { id: 'darker', label: 'Darker', description: 'Deeper blacks, less contrast' },
  { id: 'oled', label: 'OLED', description: 'True black for AMOLED screens' },
  { id: 'light', label: 'Light', description: 'Light mode for daytime' },
]

export const ACCENTS: { id: AccentName; label: string; hue: number }[] = [
  { id: 'violet', label: 'Violet', hue: 255 },
  { id: 'blue', label: 'Blue', hue: 220 },
  { id: 'cyan', label: 'Cyan', hue: 190 },
  { id: 'teal', label: 'Teal', hue: 170 },
  { id: 'green', label: 'Green', hue: 145 },
  { id: 'yellow', label: 'Yellow', hue: 50 },
  { id: 'orange', label: 'Orange', hue: 25 },
  { id: 'red', label: 'Red', hue: 0 },
  { id: 'pink', label: 'Pink', hue: 330 },
  { id: 'rose', label: 'Rose', hue: 350 },
]
