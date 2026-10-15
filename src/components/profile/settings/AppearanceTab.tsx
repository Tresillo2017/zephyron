import type { CSSProperties, ReactNode } from 'react'
import { BrushFilled, CheckFilled, DropFilled, EditFilled, FontFilled, PicFilled, Refresh1Filled } from '@mingcute/react/core-filled'
import {
  ACCENT_PRESETS, DEFAULT_ACCENT, LIGHT_THEMES, THEME_IDS, THEME_LABELS, useSettingsStore,
  type AvatarRadius, type FontChoice, type ThemeId,
} from '../../../stores/settingsStore'
import { Button, Section } from '../../bleh'
import { SettingChoices, SettingGroup, SettingRange, SettingRow, SettingSwitch } from './SettingPrimitives'

const ICON = 14
const FONT_OPTIONS: readonly { id: FontChoice; label: string }[] = [
  { id: 'font_2026', label: 'Geist' },
  { id: 'font_2025', label: 'Funnel Sans' },
  { id: 'hyperlegible', label: 'Atkinson Hyperlegible' },
]
const SHAPE_OPTIONS: readonly { id: AvatarRadius; label: string }[] = [
  { id: 'circle', label: 'Circle' },
  { id: 'squircle', label: 'Squircle' },
  { id: 'square', label: 'Square' },
]
const BRIGHT = THEME_IDS.filter((id) => LIGHT_THEMES.has(id))
const MOODY = THEME_IDS.filter((id) => !LIGHT_THEMES.has(id))
const PERCENT = (v: number) => `${Math.round(v * 100)}%`

/** 60x48 preview of one theme, drawn with that theme's own tokens (`.theme-scope`). */
function ThemeBubble({ id, selected, onSelect }: { id: ThemeId; selected: boolean; onSelect: () => void }) {
  const label = THEME_LABELS[id]
  return (
    <button type="button" role="radio" aria-checked={selected} aria-label={label} className="theme-bubble" onClick={onSelect}>
      <span className="theme-card">
        <span
          className="theme-card-inner theme-scope"
          data-bleh--theme={id}
          data-bleh--theme_type={LIGHT_THEMES.has(id) ? 'light' : 'dark'}
          style={{ '--bubble-bg': 'linear-gradient(135deg, oklch(var(--h4) / 80%), oklch(var(--h3) / 25%) 70%)' } as CSSProperties}
          aria-hidden="true"
        >
          <span className="theme-card-bg" />
          <span className="theme-mini">
            <span className="theme-mini-main">
              <span className="theme-mini-aa">Aa</span>
              <span className="theme-mini-line" style={{ width: 20 }} />
              <span className="theme-mini-line" style={{ width: 17 }} />
              <span className="theme-mini-line" style={{ width: 14 }} />
            </span>
            <span className="theme-mini-side" />
          </span>
        </span>
      </span>
      <strong className="theme-label">{label}</strong>
    </button>
  )
}

function ThemeRow({ title, ids, current, onPick }: { title: string; ids: readonly ThemeId[]; current: ThemeId; onPick: (id: ThemeId) => void }) {
  return (
    <SettingRow title={title} type="options" slot="none">
      <div className="theme-list" role="radiogroup" aria-label={title}>
        {ids.map((id) => (
          <ThemeBubble key={id} id={id} selected={current === id} onSelect={() => onPick(id)} />
        ))}
      </div>
    </SettingRow>
  )
}

/** Accent swatches: Default (reset), Custom (active when the hue/sat/lit do not match a preset), then the presets. */
function AccentSwatches() {
  const s = useSettingsStore((st) => st.settings)
  const setAccent = useSettingsStore((st) => st.setAccent)
  const resetAccent = useSettingsStore((st) => st.resetAccent)

  // A preset is only "matched" at the preset's own sat/lit, because presets are applied with the default sat/lit.
  const matched = s.accent_type === 'colour'
    ? ACCENT_PRESETS.find((p) => p.hue === s.hue && s.sat === DEFAULT_ACCENT.sat && s.lit === DEFAULT_ACCENT.lit)
    : undefined
  const customActive = s.accent_type === 'colour' && !matched

  return (
    <SettingRow title="Accent colour" body="Pick a preset, or fine-tune a custom accent below." type="options" slot="none">
      <div className="swatch-info" role="radiogroup" aria-label="Accent colour">
        <div className="swatches">
          <SwatchButton
            label="Default"
            selected={s.accent_type === 'default'}
            icon={<BrushFilled />}
            onSelect={() => resetAccent()}
            hue={DEFAULT_ACCENT.hue}
          />
          <SwatchButton
            label="Custom"
            selected={customActive}
            inactive={!customActive}
            icon={<EditFilled />}
            hue={s.hue}
            onSelect={() => setAccent(s.hue, s.sat, s.lit)}
          />
        </div>
        <span className="swatch-sep" aria-hidden="true" />
        <div className="swatches">
          {ACCENT_PRESETS.map((p) => (
            <SwatchButton
              key={p.id}
              label={p.label}
              hue={p.hue}
              selected={matched?.id === p.id}
              onSelect={() => setAccent(p.hue)}
            />
          ))}
        </div>
      </div>
    </SettingRow>
  )
}

function SwatchButton({ label, hue, selected, inactive, icon, onSelect }: {
  label: string; hue: number; selected: boolean; inactive?: boolean; icon?: ReactNode; onSelect: () => void
}) {
  return (
    <div className="swatch-item">
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        aria-label={label}
        className="swatch"
        data-inactive={inactive ? '' : undefined}
        style={inactive ? undefined : { background: `oklch(0.7 0.18 ${hue})` }}
        onClick={onSelect}
      >
        {icon ?? <CheckFilled className="swatch-check" />}
      </button>
      <span className="swatch-label" aria-hidden="true"><strong>{label}</strong></span>
    </div>
  )
}

/** Appearance tab: theme, accent, surfaces, typography, layout and motion. Every control writes to settingsStore. */
export function AppearanceTab() {
  const s = useSettingsStore((st) => st.settings)
  const set = useSettingsStore((st) => st.set)
  const setAccent = useSettingsStore((st) => st.setAccent)
  const reset = useSettingsStore((st) => st.reset)

  return (
    <>
      <Section title="Theme" icon={<BrushFilled size={ICON} />}>
        <SettingGroup>
          <ThemeRow title="Bright" ids={BRIGHT} current={s.theme} onPick={(id) => set('theme', id)} />
          <ThemeRow title="Moody" ids={MOODY} current={s.theme} onPick={(id) => set('theme', id)} />
        </SettingGroup>
        <SettingGroup>
          <SettingSwitch title="Enable solarium glass effects" body="Apply a see-through glassy material to many surfaces" checked={s.solarium} onChange={(v) => set('solarium', v)} />
          <SettingRange title="Noise overlay opacity" body="Apply a coat of subtle noise to add variation to solid backgrounds" value={s.noise} min={0} max={1} step={0.05} format={PERCENT} defaultValue={0.25} onChange={(v) => set('noise', v)} />
          <SettingRange title="Card background vibrancy" body="Bring some colour into your world (or reduce it)" value={s.sat_bg} min={0} max={5} step={0.2} format={(v) => `${Math.round(v * 100)}%`} defaultValue={1} onChange={(v) => set('sat_bg', v)} />
          <SettingSwitch title="Reflect colour below cards and avatars" body="Applies a glow below cards based on the primary colour" checked={s.grid_glow} onChange={(v) => set('grid_glow', v)} />
        </SettingGroup>
      </Section>

      <Section title="Accent" icon={<DropFilled size={ICON} />}>
        <SettingGroup>
          <AccentSwatches />
          <SettingRange title="Hue" value={s.hue} min={0} max={360} step={1} variant="hue" defaultValue={DEFAULT_ACCENT.hue} onChange={(v) => setAccent(v, s.sat, s.lit)} />
          <SettingRange title="Saturation" value={s.sat} min={0} max={4} step={0.02} format={(v) => v.toFixed(2)} defaultValue={DEFAULT_ACCENT.sat} onChange={(v) => setAccent(s.hue, v, s.lit)} />
          <SettingRange title="Lightness" value={s.lit} min={0} max={1.5} step={0.01} format={(v) => v.toFixed(2)} defaultValue={DEFAULT_ACCENT.lit} onChange={(v) => setAccent(s.hue, s.sat, v)} />
        </SettingGroup>
      </Section>

      <Section title="Typography" icon={<FontFilled size={ICON} />}>
        <SettingGroup>
          <SettingChoices title="Interface font" body="Choose the typeface used across Zephyron" value={s.font_choice} options={FONT_OPTIONS} onChange={(v) => set('font_choice', v)} />
          <SettingSwitch title="Use old-fashioned Serif font for some headings" body="Adds an italic serif to hero and section titles" checked={s.font_serif} onChange={(v) => set('font_serif', v)} />
        </SettingGroup>
      </Section>

      <Section title="Avatars and layout" icon={<PicFilled size={ICON} />}>
        <SettingGroup>
          <SettingChoices title="Profile avatar shape" body="Applies to every avatar, only visible to you" value={s.avatar_radius} options={SHAPE_OPTIONS} shapes onChange={(v) => set('avatar_radius', v)} />
          <SettingSwitch title="Compact mode" body="Tighter rows and spacing so more fits on screen" checked={s.compact} onChange={(v) => set('compact', v)} />
          <SettingSwitch title="Reduce motion in animations" body="Decreases the intensity of animations, hover effects, and other moving parts" checked={s.reduced_motion} onChange={(v) => set('reduced_motion', v)} />
          <SettingSwitch title="Show page scrollbar" body="Scrollbars are hidden by default; turn this on to bring the page scrollbar back" checked={s.show_scroller} onChange={(v) => set('show_scroller', v)} />
          <SettingSwitch title="Always underline links" body="Forces buttons, links, and other interactables to have an underline" checked={s.underline_links} onChange={(v) => set('underline_links', v)} />
        </SettingGroup>
      </Section>

      <div className="flex justify-end">
        <Button label="Reset appearance" icon={<Refresh1Filled />} size="sm" onClick={() => reset()} />
      </div>
    </>
  )
}
