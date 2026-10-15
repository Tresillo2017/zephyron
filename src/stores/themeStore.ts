import { useSettingsStore, ACCENT_PRESETS, THEME_IDS, THEME_LABELS, DEFAULT_ACCENT, type ThemeId } from './settingsStore'

/** Facade over settingsStore for components that predate the bleh port (theme + accent only). */
type AccentName = typeof ACCENT_PRESETS[number]['id']

export function useThemeStore() {
  const settings = useSettingsStore((s) => s.settings)
  const set = useSettingsStore((s) => s.set)
  const setAccentHue = useSettingsStore((s) => s.setAccent)
  const resetAccent = useSettingsStore((s) => s.resetAccent)

  const preset = ACCENT_PRESETS.find((a) => a.hue === settings.hue)
  return {
    theme: settings.theme,
    accent: (settings.accent_type === 'default' ? 'violet' : preset?.id ?? 'violet') as AccentName,
    customHue: settings.accent_type === 'default' || preset ? null : settings.hue,
    setTheme: (theme: ThemeId) => set('theme', theme),
    setAccent: (id: AccentName) => {
      const a = ACCENT_PRESETS.find((p) => p.id === id)
      if (!a || a.hue === DEFAULT_ACCENT.hue) resetAccent()
      else setAccentHue(a.hue)
    },
    setCustomHue: (hue: number) => setAccentHue(hue),
  }
}

export const THEMES = THEME_IDS.map((id) => ({ id, label: THEME_LABELS[id], description: '' }))
export const ACCENTS = ACCENT_PRESETS
